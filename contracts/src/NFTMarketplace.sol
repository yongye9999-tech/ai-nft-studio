// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title NFTMarketplace
 * @author AI NFT Studio
 * @notice NFT交易市场，支持上架/购买/拍卖，集成ERC2981版税自动分配
 * @dev 平台收取2.5%手续费，版税自动分配给创作者
 */
contract NFTMarketplace is Ownable, ReentrancyGuard {
    // ============ 常量 / Constants ============

    /// @notice 费率基点分母 (10000 = 100%)
    uint256 public constant FEE_DENOMINATOR = 10000;

    // ============ 状态变量 / State Variables ============

    /// @notice 上架ID计数器
    uint256 private _listingIdCounter;

    /// @notice 拍卖ID计数器
    uint256 private _auctionIdCounter;

    /// @notice 平台手续费 (基点, 250 = 2.5%)
    uint256 public platformFeeBps;

    /// @notice 平台收款地址
    address payable public platformAddress;

    // ============ 数据结构 / Data Structures ============

    /// @notice 上架状态枚举
    enum ListingStatus { Active, Sold, Cancelled }

    /// @notice 拍卖状态枚举
    enum AuctionStatus { Active, Ended, Cancelled }

    /// @notice NFT上架信息
    struct Listing {
        uint256 listingId;
        address nftContract;
        uint256 tokenId;
        address payable seller;
        uint256 price;
        ListingStatus status;
        uint256 createdAt;
    }

    /// @notice 拍卖信息
    struct Auction {
        uint256 auctionId;
        address nftContract;
        uint256 tokenId;
        address payable seller;
        uint256 startingPrice;
        uint256 reservePrice;
        uint256 currentBid;
        address payable currentBidder;
        uint256 endTime;
        AuctionStatus status;
        uint256 createdAt;
    }

    /// @notice listingId => Listing
    mapping(uint256 => Listing) public listings;

    /// @notice auctionId => Auction
    mapping(uint256 => Auction) public auctions;

    /// @notice 用户待领取余额 (出价被超越后可提取)
    mapping(address => uint256) public pendingWithdrawals;

    // ============ 事件 / Events ============

    event ItemListed(
        uint256 indexed listingId,
        address indexed nftContract,
        uint256 indexed tokenId,
        address seller,
        uint256 price
    );

    event ItemSold(
        uint256 indexed listingId,
        address indexed nftContract,
        uint256 indexed tokenId,
        address seller,
        address buyer,
        uint256 price,
        uint256 platformFee,
        uint256 royaltyAmount
    );

    event ListingCancelled(uint256 indexed listingId, address indexed seller);

    event ListingPriceUpdated(uint256 indexed listingId, uint256 oldPrice, uint256 newPrice);

    event AuctionCreated(
        uint256 indexed auctionId,
        address indexed nftContract,
        uint256 indexed tokenId,
        address seller,
        uint256 startingPrice,
        uint256 reservePrice,
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
        uint256 finalPrice,
        uint256 platformFee,
        uint256 royaltyAmount
    );

    event AuctionCancelled(uint256 indexed auctionId, address indexed seller);

    event PlatformFeeUpdated(uint256 oldBps, uint256 newBps);

    // ============ 修饰符 / Modifiers ============

    modifier listingExists(uint256 listingId) {
        require(listings[listingId].seller != address(0), "NFTMarketplace: Listing not found");
        _;
    }

    modifier auctionExists(uint256 auctionId) {
        require(auctions[auctionId].seller != address(0), "NFTMarketplace: Auction not found");
        _;
    }

    // ============ 构造函数 / Constructor ============

    /**
     * @notice 初始化市场合约
     * @param platformFeeBps_ 平台手续费基点 (250 = 2.5%)
     * @param platformAddress_ 平台收款地址
     */
    constructor(uint256 platformFeeBps_, address payable platformAddress_) Ownable(msg.sender) {
        require(platformAddress_ != address(0), "NFTMarketplace: Invalid platform address");
        require(platformFeeBps_ <= 500, "NFTMarketplace: Fee too high (max 5%)");

        platformFeeBps = platformFeeBps_;
        platformAddress = platformAddress_;
    }

    // ============ 上架功能 / Listing Functions ============

    /**
     * @notice 上架NFT出售
     * @param nftContract NFT合约地址
     * @param tokenId Token ID
     * @param price 售价 (wei)
     * @return listingId 上架ID
     */
    function listItem(
        address nftContract,
        uint256 tokenId,
        uint256 price
    ) external nonReentrant returns (uint256) {
        require(nftContract != address(0), "NFTMarketplace: Invalid NFT contract");
        require(price > 0, "NFTMarketplace: Price must be > 0");

        IERC721 nft = IERC721(nftContract);
        require(nft.ownerOf(tokenId) == msg.sender, "NFTMarketplace: Not token owner");
        require(
            nft.isApprovedForAll(msg.sender, address(this)) ||
            nft.getApproved(tokenId) == address(this),
            "NFTMarketplace: Marketplace not approved"
        );

        _listingIdCounter++;
        uint256 listingId = _listingIdCounter;

        listings[listingId] = Listing({
            listingId: listingId,
            nftContract: nftContract,
            tokenId: tokenId,
            seller: payable(msg.sender),
            price: price,
            status: ListingStatus.Active,
            createdAt: block.timestamp
        });

        emit ItemListed(listingId, nftContract, tokenId, msg.sender, price);
        return listingId;
    }

    /**
     * @notice 购买上架的NFT
     * @param listingId 上架ID
     */
    function buyItem(uint256 listingId)
        external
        payable
        nonReentrant
        listingExists(listingId)
    {
        Listing storage listing = listings[listingId];
        require(listing.status == ListingStatus.Active, "NFTMarketplace: Listing not active");
        require(msg.value >= listing.price, "NFTMarketplace: Insufficient payment");
        require(msg.sender != listing.seller, "NFTMarketplace: Seller cannot buy own listing");

        listing.status = ListingStatus.Sold;

        (uint256 platformFee, uint256 royaltyAmount, uint256 sellerAmount) =
            _calculatePayouts(listing.nftContract, listing.tokenId, listing.price);

        // 转移NFT
        IERC721(listing.nftContract).safeTransferFrom(listing.seller, msg.sender, listing.tokenId);

        // 分配资金
        _distributeFunds(listing.nftContract, listing.tokenId, listing.seller, platformFee, royaltyAmount, sellerAmount);

        // 退还多余ETH
        if (msg.value > listing.price) {
            (bool refundSuccess, ) = payable(msg.sender).call{value: msg.value - listing.price}("");
            require(refundSuccess, "NFTMarketplace: Refund failed");
        }

        emit ItemSold(
            listingId,
            listing.nftContract,
            listing.tokenId,
            listing.seller,
            msg.sender,
            listing.price,
            platformFee,
            royaltyAmount
        );
    }

    /**
     * @notice 取消上架
     * @param listingId 上架ID
     */
    function cancelListing(uint256 listingId)
        external
        nonReentrant
        listingExists(listingId)
    {
        Listing storage listing = listings[listingId];
        require(listing.status == ListingStatus.Active, "NFTMarketplace: Listing not active");
        require(listing.seller == msg.sender || owner() == msg.sender, "NFTMarketplace: Unauthorized");

        listing.status = ListingStatus.Cancelled;
        emit ListingCancelled(listingId, listing.seller);
    }

    /**
     * @notice 更新上架价格
     * @param listingId 上架ID
     * @param newPrice 新价格 (wei)
     */
    function updateListingPrice(uint256 listingId, uint256 newPrice)
        external
        nonReentrant
        listingExists(listingId)
    {
        Listing storage listing = listings[listingId];
        require(listing.status == ListingStatus.Active, "NFTMarketplace: Listing not active");
        require(listing.seller == msg.sender, "NFTMarketplace: Not seller");
        require(newPrice > 0, "NFTMarketplace: Price must be > 0");

        uint256 oldPrice = listing.price;
        listing.price = newPrice;
        emit ListingPriceUpdated(listingId, oldPrice, newPrice);
    }

    // ============ 拍卖功能 / Auction Functions ============

    /**
     * @notice 创建拍卖
     * @param nftContract NFT合约地址
     * @param tokenId Token ID
     * @param startingPrice 起拍价 (wei)
     * @param reservePrice 保留价/底价 (wei, 0=无底价)
     * @param duration 拍卖时长 (秒)
     * @return auctionId 拍卖ID
     */
    function createAuction(
        address nftContract,
        uint256 tokenId,
        uint256 startingPrice,
        uint256 reservePrice,
        uint256 duration
    ) external nonReentrant returns (uint256) {
        require(nftContract != address(0), "NFTMarketplace: Invalid NFT contract");
        require(startingPrice > 0, "NFTMarketplace: Starting price must be > 0");
        require(duration >= 1 hours && duration <= 30 days, "NFTMarketplace: Invalid duration");

        IERC721 nft = IERC721(nftContract);
        require(nft.ownerOf(tokenId) == msg.sender, "NFTMarketplace: Not token owner");
        require(
            nft.isApprovedForAll(msg.sender, address(this)) ||
            nft.getApproved(tokenId) == address(this),
            "NFTMarketplace: Marketplace not approved"
        );

        _auctionIdCounter++;
        uint256 auctionId = _auctionIdCounter;

        auctions[auctionId] = Auction({
            auctionId: auctionId,
            nftContract: nftContract,
            tokenId: tokenId,
            seller: payable(msg.sender),
            startingPrice: startingPrice,
            reservePrice: reservePrice,
            currentBid: 0,
            currentBidder: payable(address(0)),
            endTime: block.timestamp + duration,
            status: AuctionStatus.Active,
            createdAt: block.timestamp
        });

        emit AuctionCreated(
            auctionId,
            nftContract,
            tokenId,
            msg.sender,
            startingPrice,
            reservePrice,
            block.timestamp + duration
        );
        return auctionId;
    }

    /**
     * @notice 对拍卖出价
     * @param auctionId 拍卖ID
     */
    function placeBid(uint256 auctionId)
        external
        payable
        nonReentrant
        auctionExists(auctionId)
    {
        Auction storage auction = auctions[auctionId];
        require(auction.status == AuctionStatus.Active, "NFTMarketplace: Auction not active");
        require(block.timestamp < auction.endTime, "NFTMarketplace: Auction ended");
        require(msg.sender != auction.seller, "NFTMarketplace: Seller cannot bid");

        uint256 minBid = auction.currentBid == 0
            ? auction.startingPrice
            : auction.currentBid + (auction.currentBid / 100); // 最低加价1%

        require(msg.value >= minBid, "NFTMarketplace: Bid too low");

        // 将之前出价人的资金存入待领取余额
        if (auction.currentBidder != address(0)) {
            pendingWithdrawals[auction.currentBidder] += auction.currentBid;
        }

        auction.currentBid = msg.value;
        auction.currentBidder = payable(msg.sender);

        emit BidPlaced(auctionId, msg.sender, msg.value);
    }

    /**
     * @notice 结束拍卖并分配NFT及资金
     * @param auctionId 拍卖ID
     */
    function endAuction(uint256 auctionId)
        external
        nonReentrant
        auctionExists(auctionId)
    {
        Auction storage auction = auctions[auctionId];
        require(auction.status == AuctionStatus.Active, "NFTMarketplace: Auction not active");
        require(block.timestamp >= auction.endTime, "NFTMarketplace: Auction still ongoing");

        auction.status = AuctionStatus.Ended;

        if (auction.currentBidder == address(0) ||
            (auction.reservePrice > 0 && auction.currentBid < auction.reservePrice)) {
            // 无有效出价或未达保留价 - 拍卖流拍
            emit AuctionEnded(auctionId, address(0), 0, 0, 0);
            return;
        }

        (uint256 platformFee, uint256 royaltyAmount, uint256 sellerAmount) =
            _calculatePayouts(auction.nftContract, auction.tokenId, auction.currentBid);

        // 转移NFT给最高出价者
        IERC721(auction.nftContract).safeTransferFrom(
            auction.seller,
            auction.currentBidder,
            auction.tokenId
        );

        // 分配资金
        _distributeFunds(
            auction.nftContract,
            auction.tokenId,
            auction.seller,
            platformFee,
            royaltyAmount,
            sellerAmount
        );

        emit AuctionEnded(
            auctionId,
            auction.currentBidder,
            auction.currentBid,
            platformFee,
            royaltyAmount
        );
    }

    /**
     * @notice 卖方取消拍卖 (仅在无出价时可取消)
     * @param auctionId 拍卖ID
     */
    function cancelAuction(uint256 auctionId)
        external
        nonReentrant
        auctionExists(auctionId)
    {
        Auction storage auction = auctions[auctionId];
        require(auction.status == AuctionStatus.Active, "NFTMarketplace: Auction not active");
        require(
            auction.seller == msg.sender || owner() == msg.sender,
            "NFTMarketplace: Unauthorized"
        );
        require(auction.currentBidder == address(0), "NFTMarketplace: Cannot cancel with active bids");

        auction.status = AuctionStatus.Cancelled;
        emit AuctionCancelled(auctionId, auction.seller);
    }

    // ============ 提款功能 / Withdrawal Functions ============

    /**
     * @notice 提取被超越的出价资金
     */
    function withdrawPending() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "NFTMarketplace: Nothing to withdraw");

        pendingWithdrawals[msg.sender] = 0;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "NFTMarketplace: Withdrawal failed");
    }

    // ============ 管理功能 / Admin Functions ============

    /**
     * @notice 更新平台手续费
     * @param newFeeBps 新手续费基点 (max 500 = 5%)
     */
    function setPlatformFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= 500, "NFTMarketplace: Fee too high (max 5%)");
        uint256 oldBps = platformFeeBps;
        platformFeeBps = newFeeBps;
        emit PlatformFeeUpdated(oldBps, newFeeBps);
    }

    /**
     * @notice 更新平台收款地址
     * @param newPlatformAddress 新地址
     */
    function setPlatformAddress(address payable newPlatformAddress) external onlyOwner {
        require(newPlatformAddress != address(0), "NFTMarketplace: Invalid address");
        platformAddress = newPlatformAddress;
    }

    // ============ 内部函数 / Internal Functions ============

    /**
     * @dev 计算各方收益分配
     * @return platformFee 平台手续费
     * @return royaltyAmount 版税金额
     * @return sellerAmount 卖方收益
     */
    function _calculatePayouts(
        address nftContract,
        uint256 tokenId,
        uint256 salePrice
    ) internal view returns (uint256 platformFee, uint256 royaltyAmount, uint256 sellerAmount) {
        platformFee = (salePrice * platformFeeBps) / FEE_DENOMINATOR;

        // 尝试获取ERC2981版税信息
        try IERC2981(nftContract).royaltyInfo(tokenId, salePrice) returns (
            address,
            uint256 royalty
        ) {
            royaltyAmount = royalty;
        } catch {
            royaltyAmount = 0;
        }

        require(platformFee + royaltyAmount <= salePrice, "NFTMarketplace: Fees exceed sale price");
        sellerAmount = salePrice - platformFee - royaltyAmount;
    }

    /**
     * @dev 执行资金分配转账
     */
    function _distributeFunds(
        address nftContract,
        uint256 tokenId,
        address payable seller,
        uint256 platformFee,
        uint256 royaltyAmount,
        uint256 sellerAmount
    ) internal {
        // 平台手续费
        if (platformFee > 0) {
            (bool pfSuccess, ) = platformAddress.call{value: platformFee}("");
            require(pfSuccess, "NFTMarketplace: Platform fee transfer failed");
        }

        // 版税
        if (royaltyAmount > 0) {
            try IERC2981(nftContract).royaltyInfo(tokenId, royaltyAmount * FEE_DENOMINATOR) returns (
                address royaltyReceiver,
                uint256
            ) {
                if (royaltyReceiver != address(0)) {
                    (bool royaltySuccess, ) = payable(royaltyReceiver).call{value: royaltyAmount}("");
                    require(royaltySuccess, "NFTMarketplace: Royalty transfer failed");
                }
            } catch {
                // 如果无法获取版税接收者，将版税归入卖方
                sellerAmount += royaltyAmount;
            }
        }

        // 卖方收益
        if (sellerAmount > 0) {
            (bool sellerSuccess, ) = seller.call{value: sellerAmount}("");
            require(sellerSuccess, "NFTMarketplace: Seller payment failed");
        }
    }

    // ============ 查询功能 / View Functions ============

    /**
     * @notice 获取活跃上架总数
     */
    function totalListings() external view returns (uint256) {
        return _listingIdCounter;
    }

    /**
     * @notice 获取拍卖总数
     */
    function totalAuctions() external view returns (uint256) {
        return _auctionIdCounter;
    }

    /**
     * @notice 检查拍卖是否已结束
     */
    function isAuctionEnded(uint256 auctionId) external view returns (bool) {
        return block.timestamp >= auctions[auctionId].endTime;
    }
}
