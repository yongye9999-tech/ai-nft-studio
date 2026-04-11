// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title NFTMarketplace
 * @notice A decentralized marketplace for buying, selling, and auctioning ERC721 NFTs.
 * @dev Supports fixed-price listings and timed auctions. Royalties are paid out via ERC2981
 *      on every completed sale. The platform retains a 2.5% fee on each transaction.
 */
contract NFTMarketplace is Ownable, ReentrancyGuard {
    // ─── Constants ────────────────────────────────────────────────────────────

    /// @notice Platform fee in basis points (250 = 2.5%).
    uint256 public platformFee = 250;

    /// @dev Denominator for basis-point calculations.
    uint256 private constant FEE_DENOMINATOR = 10_000;

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

    /// @dev Accumulated platform fees available for withdrawal by the owner.
    uint256 public accumulatedFees;

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

    /// @notice Emitted when a listing is cancelled by the seller.
    event ListingCancelled(address indexed nftContract, uint256 indexed tokenId);

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

    /// @notice Emitted when an auction ends and the NFT is transferred (or returned).
    event AuctionEnded(
        address indexed winner,
        address indexed nftContract,
        uint256 indexed tokenId,
        uint256 finalPrice
    );

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor() Ownable(msg.sender) {}

    // ─── Fixed-Price Listing ──────────────────────────────────────────────────

    /**
     * @notice Lists an NFT for fixed-price sale on the marketplace.
     * @dev The marketplace must be approved to transfer the token before calling this function.
     * @param nftContract Address of the ERC721 token contract.
     * @param tokenId     ID of the token to list.
     * @param price       Sale price in wei (must be > 0).
     */
    function listItem(
        address nftContract,
        uint256 tokenId,
        uint256 price
    ) external nonReentrant {
        require(price > 0, "Marketplace: price must be > 0");
        IERC721 nft = IERC721(nftContract);
        require(nft.ownerOf(tokenId) == msg.sender, "Marketplace: not token owner");
        require(
            nft.isApprovedForAll(msg.sender, address(this)) ||
                nft.getApproved(tokenId) == address(this),
            "Marketplace: marketplace not approved"
        );
        require(!_listings[nftContract][tokenId].active, "Marketplace: already listed");

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
     * @param nftContract Address of the ERC721 token contract.
     * @param tokenId     ID of the token to purchase.
     */
    function buyItem(address nftContract, uint256 tokenId) external payable nonReentrant {
        Listing storage listing = _listings[nftContract][tokenId];
        require(listing.active, "Marketplace: not listed");
        require(msg.value >= listing.price, "Marketplace: insufficient payment");

        listing.active = false;

        uint256 price = listing.price;
        address seller = listing.seller;

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
     * @dev Only the original seller may cancel.
     * @param nftContract Address of the ERC721 token contract.
     * @param tokenId     ID of the listed token.
     */
    function cancelListing(address nftContract, uint256 tokenId) external nonReentrant {
        Listing storage listing = _listings[nftContract][tokenId];
        require(listing.active, "Marketplace: not listed");
        require(listing.seller == msg.sender, "Marketplace: not the seller");

        listing.active = false;

        emit ListingCancelled(nftContract, tokenId);
    }

    // ─── Auction ──────────────────────────────────────────────────────────────

    /**
     * @notice Creates a timed auction for an NFT.
     * @dev The marketplace must be approved before calling. Duration is in seconds.
     * @param nftContract Address of the ERC721 token contract.
     * @param tokenId     ID of the token to auction.
     * @param startPrice  Minimum first-bid amount in wei.
     * @param duration    Auction duration in seconds (must be > 0).
     */
    function createAuction(
        address nftContract,
        uint256 tokenId,
        uint256 startPrice,
        uint256 duration
    ) external nonReentrant {
        require(duration > 0, "Marketplace: duration must be > 0");
        require(startPrice > 0, "Marketplace: startPrice must be > 0");
        IERC721 nft = IERC721(nftContract);
        require(nft.ownerOf(tokenId) == msg.sender, "Marketplace: not token owner");
        require(
            nft.isApprovedForAll(msg.sender, address(this)) ||
                nft.getApproved(tokenId) == address(this),
            "Marketplace: marketplace not approved"
        );
        require(!_auctions[nftContract][tokenId].active, "Marketplace: auction already active");

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
     * @dev Bid must exceed both the start price and the current highest bid.
     *      The previous highest bidder is immediately refunded.
     * @param nftContract Address of the ERC721 token contract.
     * @param tokenId     ID of the auctioned token.
     */
    function placeBid(address nftContract, uint256 tokenId) external payable nonReentrant {
        Auction storage auction = _auctions[nftContract][tokenId];
        require(auction.active, "Marketplace: no active auction");
        require(block.timestamp < auction.endTime, "Marketplace: auction ended");
        require(msg.value >= auction.startPrice, "Marketplace: bid below start price");
        require(msg.value > auction.highestBid, "Marketplace: bid too low");

        // Refund previous highest bidder
        if (auction.highestBidder != address(0)) {
            uint256 prevBid = auction.highestBid;
            address prevBidder = auction.highestBidder;
            auction.highestBid = 0;
            auction.highestBidder = address(0);
            (bool refundSuccess, ) = payable(prevBidder).call{value: prevBid}("");
            require(refundSuccess, "Marketplace: refund to prev bidder failed");
        }

        auction.highestBid = msg.value;
        auction.highestBidder = msg.sender;

        emit BidPlaced(msg.sender, nftContract, tokenId, msg.value);
    }

    /**
     * @notice Finalises an auction after its end time has passed.
     * @dev Anyone may call this. If there were no bids the NFT stays with the seller.
     *      If there was a winning bid, royalties and platform fees are distributed and
     *      the NFT is transferred to the highest bidder.
     * @param nftContract Address of the ERC721 token contract.
     * @param tokenId     ID of the auctioned token.
     */
    function endAuction(address nftContract, uint256 tokenId) external nonReentrant {
        Auction storage auction = _auctions[nftContract][tokenId];
        require(auction.active, "Marketplace: no active auction");
        require(block.timestamp >= auction.endTime, "Marketplace: auction not yet ended");

        auction.active = false;

        address winner = auction.highestBidder;
        uint256 finalPrice = auction.highestBid;
        address seller = auction.seller;

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

    // ─── Owner Functions ──────────────────────────────────────────────────────

    /**
     * @notice Updates the platform fee rate.
     * @param newFee New fee in basis points (max 1000 = 10%).
     */
    function setPlatformFee(uint256 newFee) external onlyOwner {
        require(newFee <= 1000, "Marketplace: fee cannot exceed 10%");
        platformFee = newFee;
    }

    /**
     * @notice Withdraws accumulated platform fees to the owner.
     */
    function withdrawFees() external onlyOwner nonReentrant {
        uint256 amount = accumulatedFees;
        require(amount > 0, "Marketplace: no fees to withdraw");
        accumulatedFees = 0;
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "Marketplace: withdrawal failed");
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
     * @dev Distributes a sale payment: deducts royalties (ERC2981) and platform fee,
     *      sends the remainder to the seller, and accumulates the platform fee.
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

        // Check ERC2981 royalty
        try IERC2981(nftContract).royaltyInfo(tokenId, salePrice) returns (
            address receiver,
            uint256 amount
        ) {
            if (receiver != address(0) && amount > 0 && receiver != seller) {
                royaltyReceiver = receiver;
                royaltyAmount = amount;
            }
        } catch {}

        uint256 fee = (salePrice * platformFee) / FEE_DENOMINATOR;
        uint256 sellerProceeds = salePrice - fee - royaltyAmount;

        accumulatedFees += fee;

        if (royaltyAmount > 0 && royaltyReceiver != address(0)) {
            (bool royaltySuccess, ) = payable(royaltyReceiver).call{value: royaltyAmount}("");
            require(royaltySuccess, "Marketplace: royalty transfer failed");
        }

        (bool sellerSuccess, ) = payable(seller).call{value: sellerProceeds}("");
        require(sellerSuccess, "Marketplace: seller transfer failed");
    }
}
