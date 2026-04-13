// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title NFTMarketplace
 * @notice A decentralized marketplace for buying, selling, and auctioning ERC721 NFTs.
 * @dev Supports fixed-price listings and timed auctions. Royalties are paid out via ERC2981
 *      on every completed sale. The platform retains a tiered fee on each transaction
 *      (3% for <0.1 ETH, 2.5% for 0.1–1 ETH, 2% for >1 ETH). All three fee tiers can be
 *      updated via a 48-hour timelock. New sellers get one free first sale.
 *      Platform fees are split across three real sub-balances: treasury (60%), rewards pool (30%),
 *      and ops fund (10%) — each withdrawable independently.
 *      Bid refunds use the pull-payment pattern (pendingReturns / withdrawBid()) to prevent a
 *      malicious bidder contract from blocking all subsequent bids by rejecting ETH.
 *      A Pausable mechanism allows the owner to halt all market operations in an emergency,
 *      including endAuction.
 *      A token may not be simultaneously listed and auctioned.
 *      Auction structs and listing structs are deleted from storage after use to refund gas.
 *      Auctions are capped at MAX_AUCTION_DURATION to prevent indefinitely locked NFTs.
 *      The owner may force-delist any listing or cancel any auction (e.g. for DMCA compliance);
 *      these emit distinct ForcedDelisted / ForcedAuctionCancelled events.
 */
contract NFTMarketplace is Ownable, Pausable, ReentrancyGuard {
    // ─── Fee Configuration ────────────────────────────────────────────────────

    /// @notice Mid-tier platform fee in basis points (250 = 2.5%, applies to 0.1–1 ETH sales).
    uint256 public platformFee = 250;

    /// @notice Small-sale fee in basis points (300 = 3%, applies when salePrice < 0.1 ETH).
    uint256 public feeRateLow = 300;

    /// @notice Large-sale fee in basis points (200 = 2%, applies when salePrice > 1 ETH).
    uint256 public feeRateHigh = 200;

    /// @dev Denominator for basis-point calculations.
    uint256 private constant FEE_DENOMINATOR = 10_000;

    /// @notice Maximum allowed auction duration to prevent indefinitely locked NFTs.
    uint256 public constant MAX_AUCTION_DURATION = 30 days;

    /// @notice Delay before a proposed fee change takes effect (48 hours).
    uint256 public constant FEE_TIMELOCK_DELAY = 48 hours;

    // ─── Fee Timelock State ───────────────────────────────────────────────────

    /// @notice Pending new mid-tier platform fee waiting for timelock to expire.
    uint256 public pendingPlatformFee;
    /// @notice Timestamp after which pendingPlatformFee may be applied (0 = no pending change).
    uint256 public platformFeeChangeTime;

    /// @notice Pending new low-tier fee rate waiting for timelock to expire.
    uint256 public pendingFeeRateLow;
    /// @notice Timestamp after which pendingFeeRateLow may be applied (0 = no pending change).
    uint256 public feeRateLowChangeTime;

    /// @notice Pending new high-tier fee rate waiting for timelock to expire.
    uint256 public pendingFeeRateHigh;
    /// @notice Timestamp after which pendingFeeRateHigh may be applied (0 = no pending change).
    uint256 public feeRateHighChangeTime;

    // ─── Minimum Bid Increment ────────────────────────────────────────────────

    /// @notice Minimum increment over the current highest bid, in basis points.
    ///         Default is 100 (1%). A bid must exceed the current highest bid by at least
    ///         (currentHighestBid * minBidIncrementBps / 10_000).
    uint256 public minBidIncrementBps = 100;

    // ─── Data Structures ──────────────────────────────────────────────────────

    /**
     * @notice Represents a fixed-price listing on the marketplace.
     * @param seller      Address of the NFT owner who created the listing.
     * @param nftContract Address of the ERC721 contract.
     * @param tokenId     Token ID within the ERC721 contract.
     * @param price       Asking price in wei.
     * @param active      True while the listing is still available for purchase.
     */
    struct Listing {
        address seller;
        address nftContract;
        uint256 tokenId;
        uint256 price;
        bool active;
    }

    /**
     * @notice Represents a timed auction on the marketplace.
     * @param seller         Address of the NFT owner who created the auction.
     * @param nftContract    Address of the ERC721 contract.
     * @param tokenId        Token ID within the ERC721 contract.
     * @param startPrice     Minimum opening bid in wei.
     * @param highestBid     Current highest bid in wei (0 if no bids yet).
     * @param highestBidder  Address of the current highest bidder (zero if no bids).
     * @param endTime        Unix timestamp when the auction closes.
     * @param active         True while the auction has not yet been finalised.
     */
    struct Auction {
        address seller;
        address nftContract;
        uint256 tokenId;
        uint256 startPrice;
        uint256 highestBid;
        address highestBidder;
        uint256 endTime;
        bool active;
    }

    // ─── Storage ──────────────────────────────────────────────────────────────

    /// @dev listings[nftContract][tokenId] => Listing
    mapping(address => mapping(uint256 => Listing)) private _listings;

    /// @dev auctions[nftContract][tokenId] => Auction
    mapping(address => mapping(uint256 => Auction)) private _auctions;

    /// @notice Total accumulated platform fees (sum of all three sub-balances).
    uint256 public accumulatedFees;

    /// @notice Treasury sub-balance (60% of each platform fee). Withdrawable via withdrawFees().
    uint256 public treasuryBalance;

    /// @notice Creator rewards pool sub-balance (30% of each platform fee).
    ///         Withdrawable independently via withdrawRewardsPool().
    uint256 public rewardsPoolBalance;

    /// @notice Operations fund sub-balance (10% of each platform fee).
    ///         Withdrawable independently via withdrawOpsFund().
    uint256 public opsFundBalance;

    /// @notice Sellers who are entitled to one fee-free first sale.
    /// @dev Granted by the owner; consumed automatically on first sale.
    mapping(address => bool) public firstSaleFreeGranted;

    /// @notice Pending bid returns claimable by outbid or cancelled-auction bidders.
    ///         Pull-payment pattern: bidders call withdrawBid() to retrieve their ETH.
    mapping(address => uint256) public pendingReturns;

    // ─── Events ───────────────────────────────────────────────────────────────

    /// @notice Emitted when an NFT is listed for fixed-price sale.
    event ItemListed(
        address indexed seller,
        address indexed nftContract,
        uint256 indexed tokenId,
        uint256 price
    );

    /// @notice Emitted when a fixed-price sale is completed.
    event ItemSold(
        address indexed buyer,
        address indexed nftContract,
        uint256 indexed tokenId,
        uint256 price
    );

    /// @notice Emitted when a listing is cancelled voluntarily by the seller.
    event ListingCancelled(address indexed nftContract, uint256 indexed tokenId);

    /// @notice Emitted when a listing is force-removed by the owner (distinct from voluntary cancel).
    event ForcedDelisted(address indexed nftContract, uint256 indexed tokenId);

    /// @notice Emitted when a new auction is created.
    event AuctionCreated(
        address indexed seller,
        address indexed nftContract,
        uint256 indexed tokenId,
        uint256 startPrice,
        uint256 endTime
    );

    /// @notice Emitted when a new bid is placed on an auction.
    event BidPlaced(
        address indexed bidder,
        address indexed nftContract,
        uint256 indexed tokenId,
        uint256 bidAmount
    );

    /// @notice Emitted when an outbid amount is stored for pull-payment retrieval.
    event BidReturnPending(address indexed bidder, uint256 amount);

    /// @notice Emitted when an auction ends and the NFT is transferred (or returned).
    event AuctionEnded(
        address indexed winner,
        address indexed nftContract,
        uint256 indexed tokenId,
        uint256 finalPrice
    );

    /// @notice Emitted when an active auction is voluntarily cancelled (no such path exists yet,
    ///         reserved for future seller-cancel functionality).
    event AuctionCancelled(address indexed nftContract, uint256 indexed tokenId);

    /// @notice Emitted when an active auction is force-cancelled by the owner.
    event ForcedAuctionCancelled(address indexed nftContract, uint256 indexed tokenId);

    /// @notice Emitted when a new mid-tier platform fee is proposed (subject to 48-hour timelock).
    event PlatformFeeProposed(uint256 newFee, uint256 executeAfter);

    /// @notice Emitted when a proposed platform fee is applied after the timelock.
    event PlatformFeeUpdated(uint256 newFee);

    /// @notice Emitted when a new low-tier fee rate is proposed.
    event FeeRateLowProposed(uint256 newFee, uint256 executeAfter);

    /// @notice Emitted when the proposed low-tier fee rate is applied after the timelock.
    event FeeRateLowUpdated(uint256 newFee);

    /// @notice Emitted when a new high-tier fee rate is proposed.
    event FeeRateHighProposed(uint256 newFee, uint256 executeAfter);

    /// @notice Emitted when the proposed high-tier fee rate is applied after the timelock.
    event FeeRateHighUpdated(uint256 newFee);

    /// @notice Emitted when the minimum bid increment is updated.
    event MinBidIncrementUpdated(uint256 newBps);

    /// @notice Emitted when treasury fees are withdrawn by the owner.
    event FeesWithdrawn(uint256 amount);

    /// @notice Emitted when rewards pool fees are withdrawn by the owner.
    event RewardsWithdrawn(uint256 amount);

    /// @notice Emitted when ops fund fees are withdrawn by the owner.
    event OpsFundWithdrawn(uint256 amount);

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor() Ownable(msg.sender) {}

    // ─── Fixed-Price Listing ──────────────────────────────────────────────────

    /**
     * @notice Lists an NFT for fixed-price sale on the marketplace.
     * @dev The marketplace must be approved to transfer the token before calling this function.
     *      A token that has an active auction cannot be simultaneously listed.
     *      Reverts when the contract is paused.
     * @param nftContract Address of the ERC721 token contract.
     * @param tokenId     ID of the token to list.
     * @param price       Sale price in wei (must be > 0).
     */
    function listItem(
        address nftContract,
        uint256 tokenId,
        uint256 price
    ) external nonReentrant whenNotPaused {
        require(price > 0, "Marketplace: price must be > 0");
        IERC721 nft = IERC721(nftContract);
        require(nft.ownerOf(tokenId) == msg.sender, "Marketplace: not token owner");
        require(
            nft.isApprovedForAll(msg.sender, address(this)) ||
                nft.getApproved(tokenId) == address(this),
            "Marketplace: marketplace not approved"
        );
        require(!_listings[nftContract][tokenId].active, "Marketplace: already listed");
        require(!_auctions[nftContract][tokenId].active, "Marketplace: token already in auction");

        _listings[nftContract][tokenId] = Listing({
            seller: msg.sender,
            nftContract: nftContract,
            tokenId: tokenId,
            price: price,
            active: true
        });

        emit ItemListed(msg.sender, nftContract, tokenId, price);
    }

    /**
     * @notice Purchases a listed NFT at its fixed price.
     * @dev Distributes royalties (ERC2981), platform fee, and seller proceeds.
     *      Excess ETH is refunded to the buyer.
     *      Reverts when the contract is paused.
     * @param nftContract Address of the ERC721 token contract.
     * @param tokenId     ID of the token to purchase.
     */
    function buyItem(address nftContract, uint256 tokenId) external payable nonReentrant whenNotPaused {
        Listing storage listing = _listings[nftContract][tokenId];
        require(listing.active, "Marketplace: not listed");
        require(msg.value >= listing.price, "Marketplace: insufficient payment");

        uint256 price = listing.price;
        address seller = listing.seller;

        // Effects: deactivate and clear storage (gas refund)
        delete _listings[nftContract][tokenId];

        // Distribute proceeds
        _distributePayment(nftContract, tokenId, seller, price);

        // Transfer NFT to buyer
        IERC721(nftContract).safeTransferFrom(seller, msg.sender, tokenId);

        // Refund excess
        uint256 excess = msg.value - price;
        if (excess > 0) {
            (bool refundSuccess, ) = payable(msg.sender).call{value: excess}("");
            require(refundSuccess, "Marketplace: refund failed");
        }

        emit ItemSold(msg.sender, nftContract, tokenId, price);
    }

    /**
     * @notice Cancels an active fixed-price listing.
     * @dev Only the original seller may cancel. Clears storage to refund gas.
     * @param nftContract Address of the ERC721 token contract.
     * @param tokenId     ID of the listed token.
     */
    function cancelListing(address nftContract, uint256 tokenId) external nonReentrant {
        Listing storage listing = _listings[nftContract][tokenId];
        require(listing.active, "Marketplace: not listed");
        require(listing.seller == msg.sender, "Marketplace: not the seller");

        delete _listings[nftContract][tokenId];

        emit ListingCancelled(nftContract, tokenId);
    }

    /**
     * @notice Force-removes an active listing regardless of who created it.
     * @dev Owner-only emergency function for DMCA compliance or abuse prevention.
     *      Emits ForcedDelisted (distinct from voluntary ListingCancelled).
     * @param nftContract Address of the ERC721 token contract.
     * @param tokenId     ID of the listed token.
     */
    function delistItem(address nftContract, uint256 tokenId) external onlyOwner {
        require(_listings[nftContract][tokenId].active, "Marketplace: not listed");

        delete _listings[nftContract][tokenId];

        emit ForcedDelisted(nftContract, tokenId);
    }

    // ─── Auction ──────────────────────────────────────────────────────────────

    /**
     * @notice Creates a timed auction for an NFT.
     * @dev The marketplace must be approved before calling. Duration is in seconds.
     *      Duration must not exceed MAX_AUCTION_DURATION (30 days).
     *      A token that has an active fixed-price listing cannot be simultaneously auctioned.
     *      Reverts when the contract is paused.
     * @param nftContract Address of the ERC721 token contract.
     * @param tokenId     ID of the token to auction.
     * @param startPrice  Minimum first-bid amount in wei.
     * @param duration    Auction duration in seconds (must be > 0 and <= MAX_AUCTION_DURATION).
     */
    function createAuction(
        address nftContract,
        uint256 tokenId,
        uint256 startPrice,
        uint256 duration
    ) external nonReentrant whenNotPaused {
        require(duration > 0, "Marketplace: duration must be > 0");
        require(duration <= MAX_AUCTION_DURATION, "Marketplace: duration exceeds maximum");
        require(startPrice > 0, "Marketplace: startPrice must be > 0");
        IERC721 nft = IERC721(nftContract);
        require(nft.ownerOf(tokenId) == msg.sender, "Marketplace: not token owner");
        require(
            nft.isApprovedForAll(msg.sender, address(this)) ||
                nft.getApproved(tokenId) == address(this),
            "Marketplace: marketplace not approved"
        );
        require(!_auctions[nftContract][tokenId].active, "Marketplace: auction already active");
        require(!_listings[nftContract][tokenId].active, "Marketplace: token already listed");

        uint256 endTime = block.timestamp + duration;

        _auctions[nftContract][tokenId] = Auction({
            seller: msg.sender,
            nftContract: nftContract,
            tokenId: tokenId,
            startPrice: startPrice,
            highestBid: 0,
            highestBidder: address(0),
            endTime: endTime,
            active: true
        });

        emit AuctionCreated(msg.sender, nftContract, tokenId, startPrice, endTime);
    }

    /**
     * @notice Places a bid on an active auction.
     * @dev Bid must meet the start price and exceed the current highest bid by at least
     *      minBidIncrementBps (default 1%). The previous highest bidder's funds are stored
     *      in pendingReturns (pull pattern) — they must call withdrawBid() to retrieve their ETH.
     *      This prevents a malicious bidder contract from permanently blocking the auction by
     *      rejecting ETH refunds.
     *      Reverts when the contract is paused.
     * @param nftContract Address of the ERC721 token contract.
     * @param tokenId     ID of the auctioned token.
     */
    function placeBid(address nftContract, uint256 tokenId) external payable nonReentrant whenNotPaused {
        Auction storage auction = _auctions[nftContract][tokenId];
        require(auction.active, "Marketplace: no active auction");
        require(block.timestamp < auction.endTime, "Marketplace: auction ended");
        require(msg.value >= auction.startPrice, "Marketplace: bid below start price");

        // Enforce minimum increment above the current highest bid
        if (auction.highestBid > 0) {
            uint256 minNextBid = auction.highestBid +
                (auction.highestBid * minBidIncrementBps) / FEE_DENOMINATOR;
            require(msg.value >= minNextBid, "Marketplace: bid increment too low");
        } else {
            require(msg.value > auction.highestBid, "Marketplace: bid too low");
        }

        // Store previous highest bid for pull-payment retrieval
        if (auction.highestBidder != address(0)) {
            pendingReturns[auction.highestBidder] += auction.highestBid;
            emit BidReturnPending(auction.highestBidder, auction.highestBid);
        }

        auction.highestBid = msg.value;
        auction.highestBidder = msg.sender;

        emit BidPlaced(msg.sender, nftContract, tokenId, msg.value);
    }

    /**
     * @notice Withdraws any pending bid return stored for the caller.
     * @dev Pull-payment pattern for outbid / cancelled-auction refunds.
     *      Resets the pending amount before transfer (CEI).
     */
    function withdrawBid() external nonReentrant {
        uint256 amount = pendingReturns[msg.sender];
        require(amount > 0, "Marketplace: no pending returns");
        pendingReturns[msg.sender] = 0;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Marketplace: bid withdrawal failed");
    }

    /**
     * @notice Finalises an auction after its end time has passed.
     * @dev Anyone may call this. If there were no bids the NFT stays with the seller.
     *      If there was a winning bid, royalties and platform fees are distributed and
     *      the NFT is transferred to the highest bidder.
     *      Clears auction storage to refund gas.
     *      Reverts when the contract is paused.
     * @param nftContract Address of the ERC721 token contract.
     * @param tokenId     ID of the auctioned token.
     */
    function endAuction(address nftContract, uint256 tokenId) external nonReentrant whenNotPaused {
        Auction storage auction = _auctions[nftContract][tokenId];
        require(auction.active, "Marketplace: no active auction");
        require(block.timestamp >= auction.endTime, "Marketplace: auction not yet ended");

        address winner = auction.highestBidder;
        uint256 finalPrice = auction.highestBid;
        address seller = auction.seller;

        // Effects: clear storage before external calls (gas refund)
        delete _auctions[nftContract][tokenId];

        if (winner == address(0)) {
            // No bids – auction concluded without a sale
            emit AuctionEnded(address(0), nftContract, tokenId, 0);
            return;
        }

        // Distribute payment
        _distributePayment(nftContract, tokenId, seller, finalPrice);

        // Transfer NFT to winner
        IERC721(nftContract).safeTransferFrom(seller, winner, tokenId);

        emit AuctionEnded(winner, nftContract, tokenId, finalPrice);
    }

    /**
     * @notice Force-cancels an active auction and stores the highest bid for pull withdrawal.
     * @dev Owner-only emergency function for DMCA compliance or abuse prevention.
     *      If there is a current highest bid, the bidder's ETH is added to pendingReturns
     *      (pull pattern) — the bidder must call withdrawBid() to retrieve it.
     *      Emits ForcedAuctionCancelled (distinct from voluntary AuctionCancelled).
     *      Clears auction storage to refund gas.
     * @param nftContract Address of the ERC721 token contract.
     * @param tokenId     ID of the auctioned token.
     */
    function cancelAuction(address nftContract, uint256 tokenId) external onlyOwner nonReentrant {
        Auction storage auction = _auctions[nftContract][tokenId];
        require(auction.active, "Marketplace: no active auction");

        // Store highest bid for pull-payment retrieval
        if (auction.highestBidder != address(0)) {
            pendingReturns[auction.highestBidder] += auction.highestBid;
            emit BidReturnPending(auction.highestBidder, auction.highestBid);
        }

        delete _auctions[nftContract][tokenId];

        emit ForcedAuctionCancelled(nftContract, tokenId);
    }

    // ─── Owner Functions ──────────────────────────────────────────────────────

    /**
     * @notice Proposes a new mid-tier platform fee, subject to a 48-hour timelock.
     * @dev The change does not take effect until executePlatformFee() is called after the delay.
     * @param newFee New mid-tier fee in basis points (max 500 = 5%).
     */
    function proposePlatformFee(uint256 newFee) external onlyOwner {
        require(newFee <= 500, "Marketplace: fee cannot exceed 5%");
        pendingPlatformFee = newFee;
        platformFeeChangeTime = block.timestamp + FEE_TIMELOCK_DELAY;
        emit PlatformFeeProposed(newFee, platformFeeChangeTime);
    }

    /**
     * @notice Applies the previously proposed mid-tier fee after the 48-hour timelock has elapsed.
     * @dev Reverts if no fee change is pending or the timelock has not yet expired.
     */
    function executePlatformFee() external onlyOwner {
        require(platformFeeChangeTime != 0, "Marketplace: no pending fee change");
        require(block.timestamp >= platformFeeChangeTime, "Marketplace: timelock not expired");
        uint256 newFee = pendingPlatformFee;
        platformFee = newFee;
        pendingPlatformFee = 0;
        platformFeeChangeTime = 0;
        emit PlatformFeeUpdated(newFee);
    }

    /**
     * @notice Proposes a new small-sale fee rate, subject to a 48-hour timelock.
     * @param newFee New low-tier fee in basis points (max 500 = 5%).
     */
    function proposeFeeRateLow(uint256 newFee) external onlyOwner {
        require(newFee <= 500, "Marketplace: low fee cannot exceed 5%");
        pendingFeeRateLow = newFee;
        feeRateLowChangeTime = block.timestamp + FEE_TIMELOCK_DELAY;
        emit FeeRateLowProposed(newFee, feeRateLowChangeTime);
    }

    /**
     * @notice Applies the proposed small-sale fee after the 48-hour timelock has elapsed.
     */
    function executeFeeRateLow() external onlyOwner {
        require(feeRateLowChangeTime != 0, "Marketplace: no pending low fee change");
        require(block.timestamp >= feeRateLowChangeTime, "Marketplace: timelock not expired");
        uint256 newFee = pendingFeeRateLow;
        feeRateLow = newFee;
        pendingFeeRateLow = 0;
        feeRateLowChangeTime = 0;
        emit FeeRateLowUpdated(newFee);
    }

    /**
     * @notice Proposes a new large-sale fee rate, subject to a 48-hour timelock.
     * @param newFee New high-tier fee in basis points (max 500 = 5%).
     */
    function proposeFeeRateHigh(uint256 newFee) external onlyOwner {
        require(newFee <= 500, "Marketplace: high fee cannot exceed 5%");
        pendingFeeRateHigh = newFee;
        feeRateHighChangeTime = block.timestamp + FEE_TIMELOCK_DELAY;
        emit FeeRateHighProposed(newFee, feeRateHighChangeTime);
    }

    /**
     * @notice Applies the proposed large-sale fee after the 48-hour timelock has elapsed.
     */
    function executeFeeRateHigh() external onlyOwner {
        require(feeRateHighChangeTime != 0, "Marketplace: no pending high fee change");
        require(block.timestamp >= feeRateHighChangeTime, "Marketplace: timelock not expired");
        uint256 newFee = pendingFeeRateHigh;
        feeRateHigh = newFee;
        pendingFeeRateHigh = 0;
        feeRateHighChangeTime = 0;
        emit FeeRateHighUpdated(newFee);
    }

    /**
     * @notice Updates the minimum bid increment (in basis points).
     * @param bps New increment in basis points (0–1000, i.e. 0–10%).
     */
    function setMinBidIncrement(uint256 bps) external onlyOwner {
        require(bps <= 1000, "Marketplace: increment cannot exceed 10%");
        minBidIncrementBps = bps;
        emit MinBidIncrementUpdated(bps);
    }

    /**
     * @notice Grants one free first-sale (zero platform fee) to the specified sellers.
     * @dev The benefit is consumed on the seller's next completed sale. Owner-only.
     * @param sellers Array of seller addresses to grant the benefit to.
     */
    function grantFirstSaleFree(address[] calldata sellers) external onlyOwner {
        for (uint256 i = 0; i < sellers.length; i++) {
            firstSaleFreeGranted[sellers[i]] = true;
        }
    }

    /**
     * @notice Pauses all listing, buying, bidding, and auction-ending operations.
     * @dev Callable only by the owner. Use in emergency situations.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpauses marketplace operations.
     * @dev Callable only by the owner.
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Withdraws the treasury portion (60%) of accumulated platform fees to the owner.
     * @dev Use withdrawRewardsPool() and withdrawOpsFund() to withdraw the other sub-balances.
     */
    function withdrawFees() external onlyOwner nonReentrant {
        uint256 amount = treasuryBalance;
        require(amount > 0, "Marketplace: no fees to withdraw");
        accumulatedFees -= amount;
        treasuryBalance = 0;
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "Marketplace: withdrawal failed");
        emit FeesWithdrawn(amount);
    }

    /**
     * @notice Withdraws the creator rewards pool (30%) of accumulated platform fees to the owner.
     */
    function withdrawRewardsPool() external onlyOwner nonReentrant {
        uint256 amount = rewardsPoolBalance;
        require(amount > 0, "Marketplace: no rewards to withdraw");
        accumulatedFees -= amount;
        rewardsPoolBalance = 0;
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "Marketplace: withdrawal failed");
        emit RewardsWithdrawn(amount);
    }

    /**
     * @notice Withdraws the operations fund (10%) of accumulated platform fees to the owner.
     */
    function withdrawOpsFund() external onlyOwner nonReentrant {
        uint256 amount = opsFundBalance;
        require(amount > 0, "Marketplace: no ops balance to withdraw");
        accumulatedFees -= amount;
        opsFundBalance = 0;
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "Marketplace: withdrawal failed");
        emit OpsFundWithdrawn(amount);
    }

    // ─── View Functions ───────────────────────────────────────────────────────

    /**
     * @notice Returns the details of a fixed-price listing.
     * @param nftContract Address of the ERC721 token contract.
     * @param tokenId     Token ID.
     * @return The Listing struct for the given token.
     */
    function getListing(
        address nftContract,
        uint256 tokenId
    ) external view returns (Listing memory) {
        return _listings[nftContract][tokenId];
    }

    /**
     * @notice Returns the details of an active or completed auction.
     * @param nftContract Address of the ERC721 token contract.
     * @param tokenId     Token ID.
     * @return The Auction struct for the given token.
     */
    function getAuction(
        address nftContract,
        uint256 tokenId
    ) external view returns (Auction memory) {
        return _auctions[nftContract][tokenId];
    }

    // ─── Internal Helpers ─────────────────────────────────────────────────────

    /**
     * @dev Distributes a sale payment: deducts royalties (ERC2981) and a tiered platform fee,
     *      sends the remainder to the seller, and accumulates the platform fee into three real
     *      sub-balances: treasury (60%), rewards pool (30%), ops fund (10%).
     *      Sellers who have been granted a first-sale-free benefit pay zero platform fee
     *      on this transaction; the benefit is consumed immediately.
     *      If the ERC2981 royalty query returns an amount that would exceed the safe margin
     *      (royaltyAmount + fee > salePrice), the royalty is silently skipped to prevent a
     *      malicious NFT contract from blocking sales.
     * @param nftContract Address of the ERC721 token contract (may implement ERC2981).
     * @param tokenId     Token ID being sold.
     * @param seller      Address of the seller.
     * @param salePrice   Total sale price in wei.
     */
    function _distributePayment(
        address nftContract,
        uint256 tokenId,
        address seller,
        uint256 salePrice
    ) internal {
        uint256 royaltyAmount = 0;
        address royaltyReceiver = address(0);

        // Determine effective platform fee first so we can validate royalty bounds
        uint256 fee = 0;
        if (firstSaleFreeGranted[seller]) {
            firstSaleFreeGranted[seller] = false;
        } else {
            fee = _getEffectiveFee(salePrice);
        }

        // Check ERC2981 royalty; skip if it would cause underflow
        try IERC2981(nftContract).royaltyInfo(tokenId, salePrice) returns (
            address receiver,
            uint256 amount
        ) {
            if (
                receiver != address(0) &&
                amount > 0 &&
                receiver != seller &&
                amount + fee <= salePrice  // underflow guard
            ) {
                royaltyReceiver = receiver;
                royaltyAmount = amount;
            }
        } catch {}

        uint256 sellerProceeds = salePrice - fee - royaltyAmount;

        // Update fee-split accounting into real sub-balances
        if (fee > 0) {
            uint256 rewards = (fee * 30) / 100;
            uint256 ops = (fee * 10) / 100;
            uint256 treasury = fee - rewards - ops;
            accumulatedFees += fee;
            rewardsPoolBalance += rewards;
            opsFundBalance += ops;
            treasuryBalance += treasury;
        }

        if (royaltyAmount > 0 && royaltyReceiver != address(0)) {
            (bool royaltySuccess, ) = payable(royaltyReceiver).call{value: royaltyAmount}("");
            require(royaltySuccess, "Marketplace: royalty transfer failed");
        }

        (bool sellerSuccess, ) = payable(seller).call{value: sellerProceeds}("");
        require(sellerSuccess, "Marketplace: seller transfer failed");
    }

    /**
     * @dev Returns the tiered platform fee for a given sale price:
     *      <0.1 ETH  → feeRateLow  (default 3%)
     *      ≤1 ETH    → platformFee (default 2.5%)
     *      >1 ETH    → feeRateHigh (default 2%)
     * @param salePrice Sale price in wei.
     * @return fee Platform fee in wei.
     */
    function _getEffectiveFee(uint256 salePrice) internal view returns (uint256) {
        uint256 rate;
        if (salePrice > 1 ether) {
            rate = feeRateHigh;
        } else if (salePrice >= 0.1 ether) {
            rate = platformFee;
        } else {
            rate = feeRateLow;
        }
        return (salePrice * rate) / FEE_DENOMINATOR;
    }
}
