// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AINFTCollection
 * @author AI NFT Studio
 * @notice ERC721 NFT合约，支持ERC2981版税标准，AI生成NFT
 * @dev 继承 ERC721URIStorage + ERC2981 + Ownable + ReentrancyGuard
 */
contract AINFTCollection is ERC721URIStorage, ERC2981, Ownable, ReentrancyGuard {
    /// @notice 当前token ID计数器
    uint256 private _tokenIdCounter;

    /// @notice 铸造费用 (默认 0.01 ETH)
    uint256 public mintFee;

    /// @notice 默认版税比例 (基点, 500 = 5%)
    uint96 public defaultRoyaltyBps;

    /// @notice 最大供应量 (0 = 无限制)
    uint256 public maxSupply;

    /// @notice 平台地址 (接收铸造费)
    address payable public platformAddress;

    // ============ 事件 / Events ============

    /// @notice NFT铸造事件
    event NFTMinted(
        uint256 indexed tokenId,
        address indexed creator,
        string tokenURI,
        uint96 royaltyBps
    );

    /// @notice 铸造费更新事件
    event MintFeeUpdated(uint256 oldFee, uint256 newFee);

    /// @notice 默认版税更新事件
    event DefaultRoyaltyUpdated(uint96 oldBps, uint96 newBps);

    // ============ 修饰符 / Modifiers ============

    /**
     * @dev 检查铸造费是否足够
     */
    modifier sufficientFee() {
        require(msg.value >= mintFee, "AINFTCollection: Insufficient mint fee");
        _;
    }

    /**
     * @dev 检查供应量是否未超限
     */
    modifier supplyNotExceeded() {
        if (maxSupply > 0) {
            require(
                _tokenIdCounter < maxSupply,
                "AINFTCollection: Max supply reached"
            );
        }
        _;
    }

    // ============ 构造函数 / Constructor ============

    /**
     * @notice 初始化NFT合约
     * @param name_ NFT集合名称
     * @param symbol_ NFT符号
     * @param mintFee_ 铸造费用 (wei)
     * @param defaultRoyaltyBps_ 默认版税比例 (基点)
     * @param maxSupply_ 最大供应量 (0=无限制)
     * @param platformAddress_ 平台钱包地址
     */
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 mintFee_,
        uint96 defaultRoyaltyBps_,
        uint256 maxSupply_,
        address payable platformAddress_
    ) ERC721(name_, symbol_) Ownable(msg.sender) {
        require(platformAddress_ != address(0), "AINFTCollection: Invalid platform address");
        require(defaultRoyaltyBps_ <= 1000, "AINFTCollection: Royalty too high (max 10%)");

        mintFee = mintFee_;
        defaultRoyaltyBps = defaultRoyaltyBps_;
        maxSupply = maxSupply_;
        platformAddress = platformAddress_;

        // 设置合约默认版税接收地址为 owner
        _setDefaultRoyalty(msg.sender, defaultRoyaltyBps_);
    }

    // ============ 核心功能 / Core Functions ============

    /**
     * @notice 铸造AI生成的NFT
     * @param tokenURI_ IPFS元数据URI
     * @param royaltyReceiver 版税接收地址
     * @param royaltyBps 版税比例 (基点, 0=使用默认值)
     * @return tokenId 新铸造的Token ID
     */
    function mintNFT(
        string calldata tokenURI_,
        address royaltyReceiver,
        uint96 royaltyBps
    )
        external
        payable
        nonReentrant
        sufficientFee
        supplyNotExceeded
        returns (uint256)
    {
        require(bytes(tokenURI_).length > 0, "AINFTCollection: Empty token URI");
        require(royaltyReceiver != address(0), "AINFTCollection: Invalid royalty receiver");

        uint96 effectiveRoyalty = royaltyBps == 0 ? defaultRoyaltyBps : royaltyBps;
        require(effectiveRoyalty <= 1000, "AINFTCollection: Royalty too high (max 10%)");

        ++_tokenIdCounter;
        uint256 newTokenId = _tokenIdCounter;

        _safeMint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, tokenURI_);
        _setTokenRoyalty(newTokenId, royaltyReceiver, effectiveRoyalty);

        // 退还多余费用
        if (msg.value > mintFee) {
            (bool refundSuccess, ) = payable(msg.sender).call{value: msg.value - mintFee}("");
            require(refundSuccess, "AINFTCollection: Refund failed");
        }

        emit NFTMinted(newTokenId, msg.sender, tokenURI_, effectiveRoyalty);
        return newTokenId;
    }

    /**
     * @notice Owner铸造 (无需费用，用于空投/赠品)
     * @param to 接收地址
     * @param tokenURI_ IPFS元数据URI
     * @param royaltyReceiver 版税接收地址
     * @param royaltyBps 版税比例
     * @return tokenId 新铸造的Token ID
     */
    function ownerMint(
        address to,
        string calldata tokenURI_,
        address royaltyReceiver,
        uint96 royaltyBps
    ) external onlyOwner supplyNotExceeded returns (uint256) {
        require(to != address(0), "AINFTCollection: Invalid recipient");
        require(bytes(tokenURI_).length > 0, "AINFTCollection: Empty token URI");
        require(royaltyBps <= 1000, "AINFTCollection: Royalty too high (max 10%)");

        ++_tokenIdCounter;
        uint256 newTokenId = _tokenIdCounter;

        _safeMint(to, newTokenId);
        _setTokenURI(newTokenId, tokenURI_);
        _setTokenRoyalty(newTokenId, royaltyReceiver, royaltyBps);

        emit NFTMinted(newTokenId, to, tokenURI_, royaltyBps);
        return newTokenId;
    }

    // ============ 管理功能 / Admin Functions ============

    /**
     * @notice 更新铸造费用
     * @param newFee 新的铸造费用 (wei)
     */
    function setMintFee(uint256 newFee) external onlyOwner {
        uint256 oldFee = mintFee;
        mintFee = newFee;
        emit MintFeeUpdated(oldFee, newFee);
    }

    /**
     * @notice 更新默认版税
     * @param receiver 版税接收地址
     * @param royaltyBps 版税比例 (基点)
     */
    function setDefaultRoyalty(address receiver, uint96 royaltyBps) external onlyOwner {
        require(royaltyBps <= 1000, "AINFTCollection: Royalty too high (max 10%)");
        uint96 oldBps = defaultRoyaltyBps;
        defaultRoyaltyBps = royaltyBps;
        _setDefaultRoyalty(receiver, royaltyBps);
        emit DefaultRoyaltyUpdated(oldBps, royaltyBps);
    }

    /**
     * @notice 提取合约内的ETH到平台地址
     */
    function withdraw() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "AINFTCollection: No balance to withdraw");
        (bool success, ) = platformAddress.call{value: balance}("");
        require(success, "AINFTCollection: Withdrawal failed");
    }

    /**
     * @notice 更新平台地址
     * @param newPlatformAddress 新平台地址
     */
    function setPlatformAddress(address payable newPlatformAddress) external onlyOwner {
        require(newPlatformAddress != address(0), "AINFTCollection: Invalid address");
        platformAddress = newPlatformAddress;
    }

    // ============ 查询功能 / View Functions ============

    /**
     * @notice 获取当前已铸造总量
     * @return 已铸造NFT数量
     */
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter;
    }

    /**
     * @notice 检查接口支持 (ERC721 + ERC2981)
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
