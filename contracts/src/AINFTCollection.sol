// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title AINFTCollection
 * @author AI NFT Studio Contributors
 * @notice ERC-721 NFT collection contract for AI-generated artwork.
 *         Each token stores its metadata URI on-chain (ERC721URIStorage).
 *         Supports ERC-2981 royalty standard so secondary-market platforms
 *         can automatically route royalty payments back to the creator.
 * @dev Inherits OpenZeppelin ERC721URIStorage, ERC2981, and Ownable.
 *      Token IDs are auto-incremented starting from 1.
 */

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AINFTCollection is ERC721, ERC721URIStorage, ERC2981, Ownable {
    // ─────────────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────────────

    /// @notice Auto-incrementing token ID counter (starts at 1).
    uint256 private _nextTokenId;

    /// @notice Fee (in wei) required to mint one NFT.
    uint256 public mintFee;

    // ─────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────

    /**
     * @notice Emitted when a new NFT is minted.
     * @param tokenId  The newly assigned token ID.
     * @param creator  Address that minted the token.
     * @param tokenURI IPFS URI pointing to the token metadata JSON.
     */
    event NFTMinted(
        uint256 indexed tokenId,
        address indexed creator,
        string tokenURI
    );

    /**
     * @notice Emitted when the owner updates the mint fee.
     * @param oldFee Previous fee in wei.
     * @param newFee New fee in wei.
     */
    event MintFeeUpdated(uint256 oldFee, uint256 newFee);

    // ─────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────

    /**
     * @param name_     ERC-721 collection name (e.g. "AI NFT Studio").
     * @param symbol_   ERC-721 collection symbol (e.g. "AINFT").
     * @param _mintFee  Initial mint fee in wei.
     */
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 _mintFee
    ) ERC721(name_, symbol_) Ownable(msg.sender) {
        mintFee = _mintFee;
        // Default royalty: 5% to deployer
        _setDefaultRoyalty(msg.sender, 500);
    }

    // ─────────────────────────────────────────────────────────────
    // Minting
    // ─────────────────────────────────────────────────────────────

    /**
     * @notice Mint a new NFT. Caller must send exactly `mintFee` wei.
     * @dev    The caller becomes both the owner and the royalty recipient
     *         for this specific token (token-level royalty override).
     *         Token IDs begin at 1.
     * @param  _tokenURI  Full IPFS URI (ipfs://CID) of the metadata JSON.
     * @return tokenId    The newly minted token ID.
     */
    function mint(string memory _tokenURI)
        external
        payable
        returns (uint256 tokenId)
    {
        require(msg.value >= mintFee, "AINFTCollection: insufficient mint fee");

        _nextTokenId++;
        tokenId = _nextTokenId;

        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, _tokenURI);
        // Set per-token royalty to the minter at 5%
        _setTokenRoyalty(tokenId, msg.sender, 500);

        emit NFTMinted(tokenId, msg.sender, _tokenURI);

        // Refund excess ETH
        uint256 excess = msg.value - mintFee;
        if (excess > 0) {
            (bool ok, ) = msg.sender.call{value: excess}("");
            require(ok, "AINFTCollection: refund failed");
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Owner Admin
    // ─────────────────────────────────────────────────────────────

    /**
     * @notice Update the mint fee. Only callable by the contract owner.
     * @param _fee New mint fee in wei.
     */
    function setMintFee(uint256 _fee) external onlyOwner {
        emit MintFeeUpdated(mintFee, _fee);
        mintFee = _fee;
    }

    /**
     * @notice Set the default royalty for the entire collection.
     * @param receiver     Royalty recipient address.
     * @param feeNumerator Royalty in basis points (e.g. 500 = 5%).
     */
    function setDefaultRoyalty(address receiver, uint96 feeNumerator)
        external
        onlyOwner
    {
        _setDefaultRoyalty(receiver, feeNumerator);
    }

    /**
     * @notice Withdraw accumulated mint fees to the owner.
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "AINFTCollection: nothing to withdraw");
        (bool ok, ) = owner().call{value: balance}("");
        require(ok, "AINFTCollection: withdraw failed");
    }

    // ─────────────────────────────────────────────────────────────
    // View Helpers
    // ─────────────────────────────────────────────────────────────

    /**
     * @notice Returns the total number of tokens minted so far.
     */
    function totalSupply() external view returns (uint256) {
        return _nextTokenId;
    }

    // ─────────────────────────────────────────────────────────────
    // Overrides required by Solidity
    // ─────────────────────────────────────────────────────────────

    /// @inheritdoc ERC721URIStorage
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    /// @inheritdoc ERC721URIStorage
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
