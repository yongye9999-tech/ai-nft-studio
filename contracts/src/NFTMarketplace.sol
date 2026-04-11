// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title NFTMarketplace
 * @author AI NFT Studio
 * @notice Marketplace for listing, buying, and auctioning ERC721 NFTs with
 *         ERC2981 royalty support and a configurable platform fee.
 */
contract NFTMarketplace is Ownable, ReentrancyGuard {

    // ────────────────────────────────────────────────────────────────────────
    // Types
    // ────────────────────────────────────────────────────────────────────────

    /// @notice Fixed-price listing
    struct Listing {
        address seller;
        address nftContract;
        uint256 tokenId;
        uint256 price;
        bool active;
    }

    /// @notice English auction
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

    // ────────────────────────────────────────────────────────────────────────
    // State
    // ────────────────────────────────────────────────────────────────────────

    /// @notice Platform fee in basis points (250 = 2.5%)
    uint256 public platformFee = 250;

    /// @notice Accumulated platform fees available for withdrawal
    uint256 public pendingPlatformFees;

    /// @notice Listing counter
    uint256 private _nextListingId;

    /// @notice Auction counter
    uint256 private _nextAuctionId;

    /// @dev listingId → Listing
    mapping(uint256 => Listing) public listings;

    /// @dev auctionId → Auction
    mapping(uint256 => Auction) public auctions;

    // ────────────────────────────────────────────────────────────────────────
    // Events
    // ────────────────────────────────────────────────────────────────────────

    /// @notice Emitted when an NFT is listed for a fixed price
    event ItemListed(
        uint256 indexed listingId,
        address indexed seller,
        address indexed nftContract,
        uint256 tokenId,
        uint256 price
    );

    /// @notice Emitted when a listed NFT is purchased
    event ItemSold(
        uint256 indexed listingId,
        address indexed buyer,
        address indexed nftContract,
        uint256 tokenId,
        uint256 price
    );

    /// @notice Emitted when a listing is cancelled by the seller
    event ItemCanceled(uint256 indexed listingId, address indexed seller);

    /// @notice Emitted when an auction is created
    event AuctionCreated(
        uint256 indexed auctionId,
        address indexed seller,
        address indexed nftContract,
        uint256 tokenId,
        uint256 startPrice,
        uint256 endTime
    );

    /// @notice Emitted when a bid is placed on an auction
    event BidPlaced(
        uint256 indexed auctionId,
        address indexed bidder,
        uint256 amount
    );

    /// @notice Emitted when an auction is finalised
    event AuctionEnded(
        uint256 indexed auctionId,
        address indexed winner,
        uint256 amount
    );

    // ────────────────────────────────────────────────────────────────────────
    // Constructor
    // ────────────────────────────────────────────────────────────────────────

    constructor() Ownable(msg.sender) {}

    // ────────────────────────────────────────────────────────────────────────
    // Fixed-price Listings
    // ────────────────────────────────────────────────────────────────────────

    /**
     * @notice List an NFT for a fixed price.
     * @dev Caller must have approved this contract to transfer the token.
     * @param nftContract Address of the ERC721 contract
     * @param tokenId Token ID to list
     * @param price Listing price in wei (must be > 0)
     */
    function listItem(address nftContract, uint256 tokenId, uint256 price) external {
        require(price > 0, "NFTMarketplace: price must be > 0");
        require(
            IERC721(nftContract).ownerOf(tokenId) == msg.sender,
            "NFTMarketplace: not token owner"
        );
        require(
            IERC721(nftContract).isApprovedForAll(msg.sender, address(this)) ||
            IERC721(nftContract).getApproved(tokenId) == address(this),
            "NFTMarketplace: marketplace not approved"
        );

        _nextListingId++;
        uint256 listingId = _nextListingId;

        listings[listingId] = Listing({
            seller: msg.sender,
            nftContract: nftContract,
            tokenId: tokenId,
            price: price,
            active: true
        });

        emit ItemListed(listingId, msg.sender, nftContract, tokenId, price);
    }

    /**
     * @notice Purchase a listed NFT.
     * @dev Distributes royalties (ERC2981), platform fee, and seller proceeds.
     * @param listingId ID of the active listing
     */
    function buyItem(uint256 listingId) external payable nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.active, "NFTMarketplace: listing not active");
        require(msg.value >= listing.price, "NFTMarketplace: insufficient payment");
        require(msg.sender != listing.seller, "NFTMarketplace: seller cannot buy");

        listing.active = false;

        uint256 salePrice = listing.price;
        address seller = listing.seller;

        // Calculate platform fee
        uint256 platformCut = (salePrice * platformFee) / 10_000;
        pendingPlatformFees += platformCut;

        // Calculate royalty (ERC2981 if supported)
        uint256 royaltyAmount = 0;
        address royaltyReceiver = address(0);
        if (_supportsERC2981(listing.nftContract)) {
            (royaltyReceiver, royaltyAmount) = IERC2981(listing.nftContract)
                .royaltyInfo(listing.tokenId, salePrice);
        }

        // Cap combined fees to protect seller
        if (platformCut + royaltyAmount > salePrice) {
            royaltyAmount = salePrice - platformCut;
        }

        uint256 sellerProceeds = salePrice - platformCut - royaltyAmount;

        // Transfer NFT
        IERC721(listing.nftContract).safeTransferFrom(seller, msg.sender, listing.tokenId);

        // Pay royalty
        if (royaltyAmount > 0 && royaltyReceiver != address(0)) {
            (bool royaltySuccess, ) = payable(royaltyReceiver).call{value: royaltyAmount}("");
            require(royaltySuccess, "NFTMarketplace: royalty payment failed");
        }

        // Pay seller
        if (sellerProceeds > 0) {
            (bool sellerSuccess, ) = payable(seller).call{value: sellerProceeds}("");
            require(sellerSuccess, "NFTMarketplace: seller payment failed");
        }

        // Refund overpayment
        if (msg.value > salePrice) {
            (bool refundSuccess, ) = payable(msg.sender).call{value: msg.value - salePrice}("");
            require(refundSuccess, "NFTMarketplace: refund failed");
        }

        emit ItemSold(listingId, msg.sender, listing.nftContract, listing.tokenId, salePrice);
    }

    /**
     * @notice Cancel an active listing.
     * @param listingId ID of the listing to cancel
     */
    function cancelListing(uint256 listingId) external {
        Listing storage listing = listings[listingId];
        require(listing.active, "NFTMarketplace: listing not active");
        require(listing.seller == msg.sender || msg.sender == owner(), "NFTMarketplace: not seller");

        listing.active = false;
        emit ItemCanceled(listingId, msg.sender);
    }

    // ────────────────────────────────────────────────────────────────────────
    // Auctions
    // ────────────────────────────────────────────────────────────────────────

    /**
     * @notice Create an English auction for an NFT.
     * @dev Caller must have approved this contract to transfer the token.
     * @param nftContract Address of the ERC721 contract
     * @param tokenId Token ID to auction
     * @param startPrice Minimum opening bid in wei
     * @param duration Auction duration in seconds
     */
    function createAuction(
        address nftContract,
        uint256 tokenId,
        uint256 startPrice,
        uint256 duration
    ) external {
        require(startPrice > 0, "NFTMarketplace: start price must be > 0");
        require(duration > 0, "NFTMarketplace: duration must be > 0");
        require(
            IERC721(nftContract).ownerOf(tokenId) == msg.sender,
            "NFTMarketplace: not token owner"
        );
        require(
            IERC721(nftContract).isApprovedForAll(msg.sender, address(this)) ||
            IERC721(nftContract).getApproved(tokenId) == address(this),
            "NFTMarketplace: marketplace not approved"
        );

        // Lock NFT in marketplace
        IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);

        _nextAuctionId++;
        uint256 auctionId = _nextAuctionId;

        auctions[auctionId] = Auction({
            seller: msg.sender,
            nftContract: nftContract,
            tokenId: tokenId,
            startPrice: startPrice,
            highestBid: 0,
            highestBidder: address(0),
            endTime: block.timestamp + duration,
            active: true
        });

        emit AuctionCreated(auctionId, msg.sender, nftContract, tokenId, startPrice, block.timestamp + duration);
    }

    /**
     * @notice Place a bid on an active auction.
     * @dev Bid must exceed current highest bid and meet start price.
     *      Previous highest bidder is automatically refunded.
     * @param auctionId ID of the auction
     */
    function placeBid(uint256 auctionId) external payable nonReentrant {
        Auction storage auction = auctions[auctionId];
        require(auction.active, "NFTMarketplace: auction not active");
        require(block.timestamp < auction.endTime, "NFTMarketplace: auction ended");
        require(msg.value >= auction.startPrice, "NFTMarketplace: below start price");
        require(msg.value > auction.highestBid, "NFTMarketplace: bid too low");
        require(msg.sender != auction.seller, "NFTMarketplace: seller cannot bid");

        // Refund previous highest bidder
        address previousBidder = auction.highestBidder;
        uint256 previousBid = auction.highestBid;

        auction.highestBid = msg.value;
        auction.highestBidder = msg.sender;

        if (previousBidder != address(0) && previousBid > 0) {
            (bool refundSuccess, ) = payable(previousBidder).call{value: previousBid}("");
            require(refundSuccess, "NFTMarketplace: refund to previous bidder failed");
        }

        emit BidPlaced(auctionId, msg.sender, msg.value);
    }

    /**
     * @notice Finalise an auction after its end time.
     * @dev Anyone can call this once the auction has expired.
     *      Distributes royalties, platform fee, and seller proceeds.
     * @param auctionId ID of the auction to end
     */
    function endAuction(uint256 auctionId) external nonReentrant {
        Auction storage auction = auctions[auctionId];
        require(auction.active, "NFTMarketplace: auction not active");
        require(block.timestamp >= auction.endTime, "NFTMarketplace: auction still ongoing");

        auction.active = false;

        if (auction.highestBidder == address(0)) {
            // No bids — return NFT to seller
            IERC721(auction.nftContract).safeTransferFrom(
                address(this), auction.seller, auction.tokenId
            );
            emit AuctionEnded(auctionId, address(0), 0);
            return;
        }

        uint256 salePrice = auction.highestBid;
        address seller = auction.seller;
        address winner = auction.highestBidder;

        // Platform fee
        uint256 platformCut = (salePrice * platformFee) / 10_000;
        pendingPlatformFees += platformCut;

        // Royalty
        uint256 royaltyAmount = 0;
        address royaltyReceiver = address(0);
        if (_supportsERC2981(auction.nftContract)) {
            (royaltyReceiver, royaltyAmount) = IERC2981(auction.nftContract)
                .royaltyInfo(auction.tokenId, salePrice);
        }

        if (platformCut + royaltyAmount > salePrice) {
            royaltyAmount = salePrice - platformCut;
        }

        uint256 sellerProceeds = salePrice - platformCut - royaltyAmount;

        // Transfer NFT to winner
        IERC721(auction.nftContract).safeTransferFrom(address(this), winner, auction.tokenId);

        // Pay royalty
        if (royaltyAmount > 0 && royaltyReceiver != address(0)) {
            (bool royaltySuccess, ) = payable(royaltyReceiver).call{value: royaltyAmount}("");
            require(royaltySuccess, "NFTMarketplace: royalty payment failed");
        }

        // Pay seller
        if (sellerProceeds > 0) {
            (bool sellerSuccess, ) = payable(seller).call{value: sellerProceeds}("");
            require(sellerSuccess, "NFTMarketplace: seller payment failed");
        }

        emit AuctionEnded(auctionId, winner, salePrice);
    }

    // ────────────────────────────────────────────────────────────────────────
    // Admin
    // ────────────────────────────────────────────────────────────────────────

    /**
     * @notice Update the platform fee
     * @dev Only callable by the contract owner. Maximum 10% (1000 bp).
     * @param _fee New fee in basis points
     */
    function setPlatformFee(uint256 _fee) external onlyOwner {
        require(_fee <= 1000, "NFTMarketplace: fee too high");
        platformFee = _fee;
    }

    /**
     * @notice Withdraw accumulated platform fees
     * @dev Only callable by the contract owner
     */
    function withdraw() external onlyOwner nonReentrant {
        uint256 amount = pendingPlatformFees;
        require(amount > 0, "NFTMarketplace: nothing to withdraw");
        pendingPlatformFees = 0;
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "NFTMarketplace: withdraw failed");
    }

    // ────────────────────────────────────────────────────────────────────────
    // Helpers
    // ────────────────────────────────────────────────────────────────────────

    /**
     * @dev Check whether a contract supports ERC2981 (royalty standard).
     */
    function _supportsERC2981(address nftContract) internal view returns (bool) {
        try IERC165(nftContract).supportsInterface(type(IERC2981).interfaceId) returns (bool supported) {
            return supported;
        } catch {
            return false;
        }
    }

    // Allow contract to receive NFTs for auction escrow
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }
}
