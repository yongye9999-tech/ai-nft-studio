// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title NFTMarketplace
 * @author AI NFT Studio Contributors
 * @notice Decentralized NFT marketplace supporting fixed-price listings and
 *         English-style timed auctions. Automatically distributes ERC-2981
 *         royalties to creators on each sale.
 * @dev    Integrates with any ERC-721 + ERC-2981 compliant NFT contract.
 *         Platform fee is in basis points (default 250 = 2.5%).
 */

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract NFTMarketplace is Ownable, ReentrancyGuard {
    // ─────────────────────────────────────────────────────────────
    // Types
    // ─────────────────────────────────────────────────────────────

    /// @notice Represents a fixed-price listing.
    struct Listing {
        address seller;
        address nftContract;
        uint256 tokenId;
        uint256 price;   // in wei
        bool    active;
    }

    /// @notice Represents a timed English auction.
    struct Auction {
        address seller;
        address nftContract;
        uint256 tokenId;
        uint256 startPrice;    // minimum opening bid in wei
        uint256 highestBid;
        address highestBidder;
        uint256 endTime;       // Unix timestamp
        bool    ended;
    }

    // ─────────────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────────────

    /// @notice Platform fee in basis points (250 = 2.5%).
    uint256 public platformFee;

    uint256 private _listingCounter;
    uint256 private _auctionCounter;

    /// @dev listingId => Listing
    mapping(uint256 => Listing) public listings;
    /// @dev auctionId => Auction
    mapping(uint256 => Auction) public auctions;

    // ─────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────

    event ItemListed(
        uint256 indexed listingId,
        address indexed seller,
        address indexed nftContract,
        uint256 tokenId,
        uint256 price
    );
    event ItemSold(
        uint256 indexed listingId,
        address indexed buyer,
        uint256 price
    );
    event ItemCanceled(uint256 indexed listingId);

    event AuctionCreated(
        uint256 indexed auctionId,
        address indexed seller,
        address indexed nftContract,
        uint256 tokenId,
        uint256 startPrice,
        uint256 endTime
    );
    event BidPlaced(
        uint256 indexed auctionId,
        address indexed bidder,
        uint256 amount
    );
    event AuctionEnded(
        uint256 indexed auctionId,
        address indexed winner,
        uint256 amount
    );
    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);

    // ─────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────

    constructor() Ownable(msg.sender) {
        platformFee = 250; // 2.5%
    }

    // ─────────────────────────────────────────────────────────────
    // Fixed-Price Listings
    // ─────────────────────────────────────────────────────────────

    /**
     * @notice List an NFT for sale at a fixed price.
     * @dev    Caller must have approved this contract to transfer the NFT.
     * @param  nftContract  Address of the ERC-721 contract.
     * @param  tokenId      Token ID to sell.
     * @param  price        Sale price in wei (must be > 0).
     * @return listingId    Unique listing identifier.
     */
    function listItem(
        address nftContract,
        uint256 tokenId,
        uint256 price
    ) external returns (uint256 listingId) {
        require(price > 0, "NFTMarketplace: price must be > 0");
        IERC721 nft = IERC721(nftContract);
        require(nft.ownerOf(tokenId) == msg.sender, "NFTMarketplace: not token owner");
        require(
            nft.isApprovedForAll(msg.sender, address(this)) ||
            nft.getApproved(tokenId) == address(this),
            "NFTMarketplace: marketplace not approved"
        );

        _listingCounter++;
        listingId = _listingCounter;

        listings[listingId] = Listing({
            seller:      msg.sender,
            nftContract: nftContract,
            tokenId:     tokenId,
            price:       price,
            active:      true
        });

        emit ItemListed(listingId, msg.sender, nftContract, tokenId, price);
    }

    /**
     * @notice Buy a listed NFT at its fixed price.
     * @dev    Distributes royalties (ERC-2981) and platform fee, then
     *         transfers remaining proceeds to the seller.
     * @param  listingId  The ID of the listing to purchase.
     */
    function buyItem(uint256 listingId) external payable nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.active, "NFTMarketplace: listing not active");
        require(msg.value >= listing.price, "NFTMarketplace: insufficient payment");

        listing.active = false;

        uint256 salePrice = listing.price;
        address seller    = listing.seller;

        // ── Royalty distribution ──────────────────────────────────
        uint256 royaltyAmount = 0;
        address royaltyReceiver;
        if (IERC165(listing.nftContract).supportsInterface(type(IERC2981).interfaceId)) {
            (royaltyReceiver, royaltyAmount) = IERC2981(listing.nftContract)
                .royaltyInfo(listing.tokenId, salePrice);
            if (royaltyAmount > 0 && royaltyReceiver != address(0)) {
                (bool ok, ) = royaltyReceiver.call{value: royaltyAmount}("");
                require(ok, "NFTMarketplace: royalty transfer failed");
            } else {
                royaltyAmount = 0;
            }
        }

        // ── Platform fee ──────────────────────────────────────────
        uint256 fee = (salePrice * platformFee) / 10_000;

        // ── Seller proceeds ───────────────────────────────────────
        uint256 sellerProceeds = salePrice - royaltyAmount - fee;
        (bool sent, ) = seller.call{value: sellerProceeds}("");
        require(sent, "NFTMarketplace: seller transfer failed");

        // ── Transfer NFT ──────────────────────────────────────────
        IERC721(listing.nftContract).safeTransferFrom(
            seller,
            msg.sender,
            listing.tokenId
        );

        // Refund excess payment
        uint256 excess = msg.value - salePrice;
        if (excess > 0) {
            (bool refunded, ) = msg.sender.call{value: excess}("");
            require(refunded, "NFTMarketplace: refund failed");
        }

        emit ItemSold(listingId, msg.sender, salePrice);
    }

    /**
     * @notice Cancel an active listing. Only the seller can cancel.
     * @param listingId  The listing to cancel.
     */
    function cancelListing(uint256 listingId) external {
        Listing storage listing = listings[listingId];
        require(listing.active, "NFTMarketplace: listing not active");
        require(listing.seller == msg.sender, "NFTMarketplace: not seller");

        listing.active = false;
        emit ItemCanceled(listingId);
    }

    // ─────────────────────────────────────────────────────────────
    // Auctions
    // ─────────────────────────────────────────────────────────────

    /**
     * @notice Create a timed English auction.
     * @dev    Caller must approve this contract to transfer the NFT.
     * @param  nftContract  ERC-721 contract address.
     * @param  tokenId      Token to auction.
     * @param  startPrice   Minimum opening bid in wei.
     * @param  duration     Auction length in seconds.
     * @return auctionId    Unique auction identifier.
     */
    function createAuction(
        address nftContract,
        uint256 tokenId,
        uint256 startPrice,
        uint256 duration
    ) external returns (uint256 auctionId) {
        require(startPrice > 0, "NFTMarketplace: startPrice must be > 0");
        require(duration >= 60, "NFTMarketplace: duration too short");

        IERC721 nft = IERC721(nftContract);
        require(nft.ownerOf(tokenId) == msg.sender, "NFTMarketplace: not token owner");
        require(
            nft.isApprovedForAll(msg.sender, address(this)) ||
            nft.getApproved(tokenId) == address(this),
            "NFTMarketplace: marketplace not approved"
        );

        _auctionCounter++;
        auctionId = _auctionCounter;

        uint256 endTime = block.timestamp + duration;
        auctions[auctionId] = Auction({
            seller:         msg.sender,
            nftContract:    nftContract,
            tokenId:        tokenId,
            startPrice:     startPrice,
            highestBid:     0,
            highestBidder:  address(0),
            endTime:        endTime,
            ended:          false
        });

        // Escrow the NFT in the marketplace
        nft.transferFrom(msg.sender, address(this), tokenId);

        emit AuctionCreated(auctionId, msg.sender, nftContract, tokenId, startPrice, endTime);
    }

    /**
     * @notice Place a bid on an active auction.
     * @dev    Bid must exceed the current highest bid and the start price.
     *         Previous highest bidder is refunded automatically.
     * @param auctionId  The auction to bid on.
     */
    function placeBid(uint256 auctionId) external payable nonReentrant {
        Auction storage auction = auctions[auctionId];
        require(!auction.ended, "NFTMarketplace: auction ended");
        require(block.timestamp < auction.endTime, "NFTMarketplace: auction expired");
        require(msg.value >= auction.startPrice, "NFTMarketplace: bid below start price");
        require(msg.value > auction.highestBid, "NFTMarketplace: bid too low");

        // Refund previous highest bidder
        if (auction.highestBidder != address(0)) {
            (bool refunded, ) = auction.highestBidder.call{value: auction.highestBid}("");
            require(refunded, "NFTMarketplace: refund to previous bidder failed");
        }

        auction.highestBid    = msg.value;
        auction.highestBidder = msg.sender;

        emit BidPlaced(auctionId, msg.sender, msg.value);
    }

    /**
     * @notice Settle an ended auction. Anyone may call this after expiry.
     * @dev    Distributes royalties, platform fee, and proceeds to seller.
     *         If no bids were placed, the NFT is returned to the seller.
     * @param auctionId  The auction to settle.
     */
    function endAuction(uint256 auctionId) external nonReentrant {
        Auction storage auction = auctions[auctionId];
        require(!auction.ended, "NFTMarketplace: already ended");
        require(block.timestamp >= auction.endTime, "NFTMarketplace: not yet ended");

        auction.ended = true;

        if (auction.highestBidder == address(0)) {
            // No bids — return NFT to seller
            IERC721(auction.nftContract).safeTransferFrom(
                address(this),
                auction.seller,
                auction.tokenId
            );
            emit AuctionEnded(auctionId, address(0), 0);
            return;
        }

        uint256 salePrice = auction.highestBid;
        address winner    = auction.highestBidder;

        // ── Royalty ──────────────────────────────────────────────
        uint256 royaltyAmount = 0;
        address royaltyReceiver;
        if (IERC165(auction.nftContract).supportsInterface(type(IERC2981).interfaceId)) {
            (royaltyReceiver, royaltyAmount) = IERC2981(auction.nftContract)
                .royaltyInfo(auction.tokenId, salePrice);
            if (royaltyAmount > 0 && royaltyReceiver != address(0)) {
                (bool ok, ) = royaltyReceiver.call{value: royaltyAmount}("");
                require(ok, "NFTMarketplace: royalty transfer failed");
            } else {
                royaltyAmount = 0;
            }
        }

        // ── Platform fee ──────────────────────────────────────────
        uint256 fee = (salePrice * platformFee) / 10_000;

        // ── Seller proceeds ───────────────────────────────────────
        uint256 sellerProceeds = salePrice - royaltyAmount - fee;
        (bool sent, ) = auction.seller.call{value: sellerProceeds}("");
        require(sent, "NFTMarketplace: seller transfer failed");

        // ── Transfer NFT to winner ────────────────────────────────
        IERC721(auction.nftContract).safeTransferFrom(
            address(this),
            winner,
            auction.tokenId
        );

        emit AuctionEnded(auctionId, winner, salePrice);
    }

    // ─────────────────────────────────────────────────────────────
    // Owner Admin
    // ─────────────────────────────────────────────────────────────

    /**
     * @notice Update the platform fee. Must not exceed 10% (1000 bps).
     * @param _fee New fee in basis points.
     */
    function setPlatformFee(uint256 _fee) external onlyOwner {
        require(_fee <= 1_000, "NFTMarketplace: fee too high");
        emit PlatformFeeUpdated(platformFee, _fee);
        platformFee = _fee;
    }

    /**
     * @notice Withdraw accumulated platform fees to the owner.
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "NFTMarketplace: nothing to withdraw");
        (bool ok, ) = owner().call{value: balance}("");
        require(ok, "NFTMarketplace: withdraw failed");
    }

    // ─────────────────────────────────────────────────────────────
    // View helpers
    // ─────────────────────────────────────────────────────────────

    /// @notice Returns the total number of listings ever created.
    function listingCount() external view returns (uint256) {
        return _listingCounter;
    }

    /// @notice Returns the total number of auctions ever created.
    function auctionCount() external view returns (uint256) {
        return _auctionCounter;
    }
}
