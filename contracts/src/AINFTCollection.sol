// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AINFTCollection
 * @notice ERC721 NFT collection contract with royalty support (ERC2981) for AI-generated artwork.
 * @dev Combines ERC721URIStorage for per-token metadata, ERC2981 for royalties, Ownable for admin
 *      control, ReentrancyGuard to protect mint() against reentrancy attacks, and Pausable to
 *      allow the owner to halt minting in an emergency.
 *      Users pay a mintFee to mint; proceeds and royalties can be withdrawn by the owner.
 *      Early creators can be added to a free-mint whitelist or granted a percentage discount.
 */
contract AINFTCollection is ERC721, ERC721URIStorage, ERC2981, Ownable, Pausable, ReentrancyGuard {
    /// @notice Counter tracking the total number of minted tokens (also serves as next token ID).
    uint256 public tokenCounter;

    /// @notice Fee in wei required to mint one NFT. Defaults to 0.01 ETH.
    uint256 public mintFee;

    /// @notice Maximum number of tokens that can ever be minted in this collection.
    uint256 public maxSupply;

    /// @notice Addresses that may mint for free (early-creator whitelist).
    mapping(address => bool) public freeMintList;

    /// @notice Per-address mint fee discount in basis points (10 000 = 100% off, i.e. free).
    ///         Only applied when the address is NOT in freeMintList.
    mapping(address => uint256) public mintFeeDiscount;

    // ─── Events ──────────────────────────────────────────────────────────────

    /// @notice Emitted when a new NFT is minted.
    /// @param to       The address that receives the newly minted token.
    /// @param tokenId  The ID of the newly minted token.
    /// @param tokenURI The metadata URI of the newly minted token.
    event NFTMinted(address indexed to, uint256 indexed tokenId, string tokenURI);

    /// @notice Emitted when the mint fee is updated.
    /// @param newFee The updated fee value in wei.
    event MintFeeUpdated(uint256 newFee);

    /// @notice Emitted when the free-mint whitelist is updated for one or more addresses.
    /// @param creator Address whose free-mint status changed.
    /// @param status  True if added to whitelist, false if removed.
    event FreeMintListUpdated(address indexed creator, bool status);

    /// @notice Emitted when a per-address mint fee discount is set.
    /// @param creator     Address whose discount was updated.
    /// @param discountBps New discount in basis points (0–10 000).
    event MintFeeDiscountUpdated(address indexed creator, uint256 discountBps);

    /// @notice Emitted when ETH is withdrawn from the contract.
    /// @param to     Recipient address.
    /// @param amount Amount withdrawn in wei.
    event Withdrawn(address indexed to, uint256 amount);

    // ─── Constructor ─────────────────────────────────────────────────────────

    /**
     * @notice Deploys the AINFTCollection contract.
     * @dev Sets default royalty to 5% paid to the deployer.
     * @param name_      ERC721 collection name.
     * @param symbol_    ERC721 collection symbol.
     * @param _mintFee   Initial mint fee in wei (0 to disable fee).
     * @param _maxSupply Maximum number of tokens that can be minted.
     */
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 _mintFee,
        uint256 _maxSupply
    ) ERC721(name_, symbol_) Ownable(msg.sender) {
        mintFee = _mintFee;
        maxSupply = _maxSupply;
        // Default royalty: 5% to the deployer
        _setDefaultRoyalty(msg.sender, 500);
    }

    // ─── Public / External Functions ─────────────────────────────────────────

    /**
     * @notice Mints a new NFT to the specified address.
     * @dev Caller must send at least the effective mint fee (after any discount or whitelist).
     *      Any excess ETH is refunded after all state changes and token transfer (strict CEI).
     *      Token ID is auto-incremented starting from 1.
     *      Reverts when the contract is paused.
     * @param to       Address that will own the minted token.
     * @param uri      Metadata URI (typically an IPFS link to a JSON file).
     * @return tokenId The ID of the newly minted token.
     */
    function mint(
        address to,
        string memory uri
    ) external payable nonReentrant whenNotPaused returns (uint256 tokenId) {
        // Compute the effective fee for this caller
        uint256 effectiveFee;
        if (freeMintList[msg.sender]) {
            effectiveFee = 0;
        } else {
            uint256 discountBps = mintFeeDiscount[msg.sender];
            effectiveFee = mintFee - (mintFee * discountBps) / 10_000;
        }

        require(msg.value >= effectiveFee, "AINFTCollection: insufficient mint fee");
        require(tokenCounter < maxSupply, "AINFTCollection: max supply reached");

        // Effects: update state before any external calls
        tokenCounter++;
        tokenId = tokenCounter;
        _setTokenURI(tokenId, uri);

        // Emit event before external calls (strict CEI — events are Effects)
        emit NFTMinted(to, tokenId, uri);

        // Interaction 1: transfer token (may call onERC721Received on recipient)
        _safeMint(to, tokenId);

        // Interaction 2: refund excess payment last
        uint256 excess = msg.value - effectiveFee;
        if (excess > 0) {
            (bool refundSuccess, ) = payable(msg.sender).call{value: excess}("");
            require(refundSuccess, "AINFTCollection: refund failed");
        }
    }

    // ─── Owner-Only Functions ─────────────────────────────────────────────────

    /**
     * @notice Updates the per-mint fee.
     * @param fee New fee in wei. Set to 0 to allow free minting for everyone.
     */
    function setMintFee(uint256 fee) external onlyOwner {
        mintFee = fee;
        emit MintFeeUpdated(fee);
    }

    /**
     * @notice Adds or removes addresses from the free-mint whitelist.
     * @dev Intended for early-creator incentive programmes.
     * @param creators Array of addresses to update.
     * @param status   True to whitelist (free mint), false to remove.
     */
    function setFreeMintList(address[] calldata creators, bool status) external onlyOwner {
        for (uint256 i = 0; i < creators.length; i++) {
            freeMintList[creators[i]] = status;
            emit FreeMintListUpdated(creators[i], status);
        }
    }

    /**
     * @notice Sets a per-address mint fee discount.
     * @dev discountBps is in basis points. 10 000 = 100% discount (effectively free).
     *      Only applied when the address is NOT already in freeMintList.
     * @param creator     Address to receive the discount.
     * @param discountBps Discount in basis points (0–10 000).
     */
    function setMintFeeDiscount(address creator, uint256 discountBps) external onlyOwner {
        require(discountBps <= 10_000, "AINFTCollection: discount cannot exceed 100%");
        mintFeeDiscount[creator] = discountBps;
        emit MintFeeDiscountUpdated(creator, discountBps);
    }

    /**
     * @notice Sets (or overrides) the default ERC2981 royalty for the entire collection.
     * @dev feeNumerator is in basis points (e.g., 500 = 5%). Max is 10% (1000) enforced by caller convention.
     * @param receiver     Address that receives royalty payments.
     * @param feeNumerator Royalty rate in basis points (1 basis point = 0.01%).
     */
    function setDefaultRoyalty(address receiver, uint96 feeNumerator) external onlyOwner {
        require(feeNumerator <= 1000, "AINFTCollection: royalty cannot exceed 10%");
        _setDefaultRoyalty(receiver, feeNumerator);
    }

    /**
     * @notice Pauses all minting operations.
     * @dev Callable only by the owner. Use in emergency situations.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpauses minting operations.
     * @dev Callable only by the owner.
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Withdraws all accumulated ETH (from mint fees) to the owner's address.
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "AINFTCollection: nothing to withdraw");
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "AINFTCollection: withdraw failed");
        emit Withdrawn(owner(), balance);
    }

    // ─── Overrides ────────────────────────────────────────────────────────────

    /**
     * @dev Resolves multiple inheritance: ERC721URIStorage overrides tokenURI.
     */
    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    /**
     * @dev Resolves multiple inheritance: ERC721URIStorage overrides _burn to clear token URI.
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721) returns (address) {
        return super._update(to, tokenId, auth);
    }

    /**
     * @dev Declares support for ERC721, ERC721URIStorage, and ERC2981 interfaces.
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721URIStorage, ERC2981) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
