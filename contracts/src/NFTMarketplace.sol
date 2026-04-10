// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title NFTMarketplace
 * @author yongye9999-tech
 * @notice Decentralized NFT marketplace supporting fixed-price listings and auctions.
 *         Automatically distributes royalties (ERC2981) and platform fees on every sale.
 * @dev Uses ReentrancyGuard on all payment functions to prevent re-entrancy attacks.
 */
contract NFTMarketplace is ReentrancyGuard, Ownable {
    // ============================================================
    //                          STRUCTS
    // ============================================================

    /// @notice Represents a fixed-price listing on the marketplace.
    struct Listing {
        address seller;
        address nftContract;
        uint256 tokenId;
        uint256 price;
        bool active;
    }

    /// @notice Represents an auction on the marketplace.
    struct Auction {
        address seller;
        address nftContract;
        uint256 tokenId;
        uint256 minPrice;
        uint256 highestBid;
        address highestBidder;
        uint256 endTime;
        bool active;
    }

    // ============================================================
    //                          STATE
    // ============================================================

    /// @notice Platform fee in basis points (e.g. 250 = 2.5%)
    uint256 public platformFee;

    /// @notice Auto-incrementing listing ID counter
    uint256 private _listingId;

    /// @notice Auto-incrementing auction ID counter
    uint256 private _auctionId;

    /// @notice Mapping from listing ID to Listing struct
    mapping(uint256 => Listing) public listings;

    /// @notice Mapping from auction ID to Auction struct
    mapping(uint256 => Auction) public auctions;

    // ============================================================
    //                          EVENTS
    // ============================================================

    /// @notice Emitted when an NFT is listed for sale.
    event ItemListed(
        uint256 indexed listingId,
        address indexed seller,
        address indexed nftContract,
        uint256 tokenId,
        uint256 price
    );

    /// @notice Emitted when a listed NFT is sold.
    event ItemSold(
        uint256 indexed listingId,
        address indexed buyer,
        address indexed nftContract,
        uint256 tokenId,
        uint256 price
    );

    /// @notice Emitted when a listing is cancelled.
    event ItemCanceled(uint256 indexed listingId, address indexed seller);

    /// @notice Emitted when an auction is created.
    event AuctionCreated(
        uint256 indexed auctionId,
        address indexed seller,
        address indexed nftContract,
        uint256 tokenId,
        uint256 minPrice,
        uint256 endTime
    );

    /// @notice Emitted when a bid is placed on an auction.
    event BidPlaced(
        uint256 indexed auctionId,
        address indexed bidder,
        uint256 amount
    );

    /// @notice Emitted when an auction ends.
    event AuctionEnded(
        uint256 indexed auctionId,
        address indexed winner,
        uint256 amount
    );

    // ============================================================
    //                        CONSTRUCTOR
    // ============================================================

    /**
     * @notice Deploy a new NFTMarketplace.
     * @param _platformFee Platform fee in basis points (e.g. 250 = 2.5%).
     */
    constructor(uint256 _platformFee) Ownable(msg.sender) {
        require(_platformFee <= 1000, "NFTMarketplace: fee too high");
        platformFee = _platformFee;
    }

    // ============================================================
    //                    FIXED-PRICE LISTING
    // ============================================================

    /**
     * @notice List an NFT for sale at a fixed price.
     * @dev Transfers the NFT to the marketplace contract.
     *      Caller must have approved this contract before calling.
     * @param nftContract Address of the ERC721 contract.
     * @param tokenId     Token ID to list.
     * @param price       Sale price in wei.
     * @return listingId The created listing ID.
     */
    function listItem(
        address nftContract,
        uint256 tokenId,
        uint256 price
    ) external nonReentrant returns (uint256) {
        require(price > 0, "NFTMarketplace: price must be > 0");
        IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);

        uint256 id = _listingId;
        _listingId++;

        listings[id] = Listing({
            seller: msg.sender,
            nftContract: nftContract,
            tokenId: tokenId,
            price: price,
            active: true
        });

        emit ItemListed(id, msg.sender, nftContract, tokenId, price);
        return id;
    }

    /**
     * @notice Buy a listed NFT at its fixed price.
     * @dev Distributes royalties (ERC2981), platform fee, and seller proceeds.
     * @param listingId The ID of the listing to purchase.
     */
    function buyItem(uint256 listingId) external payable nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.active, "NFTMarketplace: listing not active");
        require(msg.value >= listing.price, "NFTMarketplace: insufficient payment");

        listing.active = false;

        _distributeFunds(
            listing.nftContract,
            listing.tokenId,
            listing.seller,
            listing.price
        );

        IERC721(listing.nftContract).transferFrom(address(this), msg.sender, listing.tokenId);

        emit ItemSold(listingId, msg.sender, listing.nftContract, listing.tokenId, listing.price);

        // Refund excess payment
        uint256 excess = msg.value - listing.price;
        if (excess > 0) {
            (bool refundSuccess, ) = msg.sender.call{value: excess}("");
            require(refundSuccess, "NFTMarketplace: refund failed");
        }
    }

    /**
     * @notice Cancel a fixed-price listing and reclaim the NFT.
     * @param listingId The listing to cancel.
     */
    function cancelListing(uint256 listingId) external nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.active, "NFTMarketplace: listing not active");
        require(listing.seller == msg.sender, "NFTMarketplace: not seller");

        listing.active = false;
        IERC721(listing.nftContract).transferFrom(address(this), msg.sender, listing.tokenId);

        emit ItemCanceled(listingId, msg.sender);
    }

    // ============================================================
    //                          AUCTION
    // ============================================================

    /**
     * @notice Create an English auction for an NFT.
     * @dev Transfers the NFT to the marketplace contract.
     *      Caller must have approved this contract before calling.
     * @param nftContract Address of the ERC721 contract.
     * @param tokenId     Token ID to auction.
     * @param minPrice    Minimum starting bid in wei.
     * @param duration    Auction duration in seconds.
     * @return auctionId The created auction ID.
     */
    function createAuction(
        address nftContract,
        uint256 tokenId,
        uint256 minPrice,
        uint256 duration
    ) external nonReentrant returns (uint256) {
        require(minPrice > 0, "NFTMarketplace: minPrice must be > 0");
        require(duration > 0, "NFTMarketplace: duration must be > 0");

        IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);

        uint256 id = _auctionId;
        _auctionId++;

        uint256 endTime = block.timestamp + duration;

        auctions[id] = Auction({
            seller: msg.sender,
            nftContract: nftContract,
            tokenId: tokenId,
            minPrice: minPrice,
            highestBid: 0,
            highestBidder: address(0),
            endTime: endTime,
            active: true
        });

        emit AuctionCreated(id, msg.sender, nftContract, tokenId, minPrice, endTime);
        return id;
    }

    /**
     * @notice Place a bid on an active auction.
     * @dev Refunds the previous highest bidder automatically.
     * @param auctionId The ID of the auction.
     */
    function placeBid(uint256 auctionId) external payable nonReentrant {
        Auction storage auction = auctions[auctionId];
        require(auction.active, "NFTMarketplace: auction not active");
        require(block.timestamp < auction.endTime, "NFTMarketplace: auction ended");
        require(msg.value > auction.highestBid, "NFTMarketplace: bid too low");
        require(msg.value >= auction.minPrice, "NFTMarketplace: below minimum price");

        address previousBidder = auction.highestBidder;
        uint256 previousBid = auction.highestBid;

        auction.highestBid = msg.value;
        auction.highestBidder = msg.sender;

        // Refund previous highest bidder
        if (previousBidder != address(0)) {
            (bool success, ) = previousBidder.call{value: previousBid}("");
            require(success, "NFTMarketplace: refund failed");
        }

        emit BidPlaced(auctionId, msg.sender, msg.value);
    }

    /**
     * @notice End an auction and transfer NFT to winner, distributing funds.
     * @dev Can be called by anyone after the auction end time.
     * @param auctionId The ID of the auction to end.
     */
    function endAuction(uint256 auctionId) external nonReentrant {
        Auction storage auction = auctions[auctionId];
        require(auction.active, "NFTMarketplace: auction not active");
        require(block.timestamp >= auction.endTime, "NFTMarketplace: auction not ended");

        auction.active = false;

        if (auction.highestBidder != address(0)) {
            // Distribute funds: royalty → platform fee → seller
            _distributeFunds(
                auction.nftContract,
                auction.tokenId,
                auction.seller,
                auction.highestBid
            );

            // Transfer NFT to winner
            IERC721(auction.nftContract).transferFrom(
                address(this),
                auction.highestBidder,
                auction.tokenId
            );

            emit AuctionEnded(auctionId, auction.highestBidder, auction.highestBid);
        } else {
            // No bids: return NFT to seller
            IERC721(auction.nftContract).transferFrom(
                address(this),
                auction.seller,
                auction.tokenId
            );

            emit AuctionEnded(auctionId, address(0), 0);
        }
    }

    // ============================================================
    //                       OWNER FUNCTIONS
    // ============================================================

    /**
     * @notice Update the platform fee.
     * @param _fee New platform fee in basis points (max 1000 = 10%).
     */
    function setPlatformFee(uint256 _fee) external onlyOwner {
        require(_fee <= 1000, "NFTMarketplace: fee too high");
        platformFee = _fee;
    }

    /**
     * @notice Withdraw accumulated platform fees to the owner.
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "NFTMarketplace: nothing to withdraw");
        (bool success, ) = owner().call{value: balance}("");
        require(success, "NFTMarketplace: withdraw failed");
    }

    // ============================================================
    //                      INTERNAL HELPERS
    // ============================================================

    /**
     * @dev Distribute sale proceeds: royalties → platform fee → seller.
     * @param nftContract The NFT contract address (checked for ERC2981).
     * @param tokenId     The token ID.
     * @param seller      The seller address.
     * @param salePrice   Total sale price in wei.
     */
    function _distributeFunds(
        address nftContract,
        uint256 tokenId,
        address seller,
        uint256 salePrice
    ) internal {
        uint256 royaltyAmount = 0;
        address royaltyReceiver = address(0);

        // Check ERC2981 royalty
        if (IERC2981(nftContract).supportsInterface(type(IERC2981).interfaceId)) {
            (royaltyReceiver, royaltyAmount) = IERC2981(nftContract).royaltyInfo(tokenId, salePrice);
        }

        uint256 platformAmount = (salePrice * platformFee) / 10000;
        uint256 sellerAmount = salePrice - royaltyAmount - platformAmount;

        // Pay royalty
        if (royaltyAmount > 0 && royaltyReceiver != address(0)) {
            (bool royaltySuccess, ) = royaltyReceiver.call{value: royaltyAmount}("");
            require(royaltySuccess, "NFTMarketplace: royalty payment failed");
        }

        // Pay seller
        if (sellerAmount > 0) {
            (bool sellerSuccess, ) = seller.call{value: sellerAmount}("");
            require(sellerSuccess, "NFTMarketplace: seller payment failed");
        }

        // Platform fee stays in contract balance, withdrawn via withdraw()
    }
}
