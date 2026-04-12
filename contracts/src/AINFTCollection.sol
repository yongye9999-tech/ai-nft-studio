// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AINFTCollection
 * @notice ERC721 NFT collection contract with royalty support (ERC2981) for AI-generated artwork.
 * @dev Combines ERC721URIStorage for per-token metadata, ERC2981 for royalties, Ownable for admin
 *      control, and ReentrancyGuard to protect mint() against reentrancy attacks.
 *      Users pay a mintFee to mint; proceeds and royalties can be withdrawn by the owner.
 */
contract AINFTCollection is ERC721, ERC721URIStorage, ERC2981, Ownable, ReentrancyGuard {
    /// @notice Counter tracking the total number of minted tokens (also serves as next token ID).
    uint256 public tokenCounter;

    /// @notice Fee in wei required to mint one NFT. Defaults to 0.01 ETH.
    uint256 public mintFee;

    /// @notice Maximum number of tokens that can ever be minted in this collection.
    uint256 public maxSupply;

    // ─── Events ──────────────────────────────────────────────────────────────

    /// @notice Emitted when a new NFT is minted.
    /// @param to       The address that receives the newly minted token.
    /// @param tokenId  The ID of the newly minted token.
    /// @param tokenURI The metadata URI of the newly minted token.
    event NFTMinted(address indexed to, uint256 indexed tokenId, string tokenURI);

    /// @notice Emitted when the mint fee is updated.
    /// @param newFee The updated fee value in wei.
    event MintFeeUpdated(uint256 newFee);

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
     * @dev Caller must send at least `mintFee` wei. Any excess ETH is refunded to the caller.
     *      Token ID is auto-incremented starting from 1.
     * @param to       Address that will own the minted token.
     * @param uri      Metadata URI (typically an IPFS link to a JSON file).
     * @return tokenId The ID of the newly minted token.
     */
    function mint(address to, string memory uri) external payable nonReentrant returns (uint256 tokenId) {
        require(msg.value >= mintFee, "AINFTCollection: insufficient mint fee");
        require(tokenCounter < maxSupply, "AINFTCollection: max supply reached");

        // Effects: update state before any external calls
        tokenCounter++;
        tokenId = tokenCounter;
        _setTokenURI(tokenId, uri);

        // Refund any excess payment before calling external contracts (CEI pattern)
        uint256 excess = msg.value - mintFee;
        if (excess > 0) {
            (bool refundSuccess, ) = payable(msg.sender).call{value: excess}("");
            require(refundSuccess, "AINFTCollection: refund failed");
        }

        _safeMint(to, tokenId);

        emit NFTMinted(to, tokenId, uri);
    }

    // ─── Owner-Only Functions ─────────────────────────────────────────────────

    /**
     * @notice Updates the per-mint fee.
     * @param fee New fee in wei. Set to 0 to allow free minting.
     */
    function setMintFee(uint256 fee) external onlyOwner {
        mintFee = fee;
        emit MintFeeUpdated(fee);
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
