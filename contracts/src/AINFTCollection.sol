// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AINFTCollection
 * @author AI NFT Studio
 * @notice ERC721 NFT collection with ERC2981 royalty support for AI-generated artwork.
 * @dev Inherits ERC721URIStorage for per-token URI and ERC2981 for on-chain royalties.
 */
contract AINFTCollection is ERC721, ERC721URIStorage, ERC2981, Ownable {
    /// @notice Auto-incrementing token ID counter
    uint256 private _nextTokenId;

    /// @notice Fee (in wei) required to mint one NFT
    uint256 public mintFee;

    /// @notice Emitted when a new NFT is minted
    /// @param tokenId The newly minted token ID
    /// @param creator The address of the minting creator
    /// @param tokenURI The metadata URI associated with the token
    event NFTMinted(uint256 indexed tokenId, address indexed creator, string tokenURI);

    /// @notice Emitted when the mint fee is updated
    /// @param oldFee Previous mint fee
    /// @param newFee New mint fee
    event MintFeeUpdated(uint256 oldFee, uint256 newFee);

    /**
     * @notice Deploy the NFT collection contract
     * @param _name Collection name
     * @param _symbol Collection symbol
     * @param _mintFee Initial mint fee in wei
     * @param _royaltyReceiver Address to receive royalty payments
     * @param _royaltyFeeNumerator Royalty percentage in basis points (e.g. 500 = 5%)
     */
    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _mintFee,
        address _royaltyReceiver,
        uint96 _royaltyFeeNumerator
    ) ERC721(_name, _symbol) Ownable(msg.sender) {
        mintFee = _mintFee;
        _setDefaultRoyalty(_royaltyReceiver, _royaltyFeeNumerator);
    }

    /**
     * @notice Mint a new AI-generated NFT
     * @dev Caller must send at least `mintFee` wei. Token ID starts at 1.
     * @param _tokenURI IPFS URI pointing to the ERC721 metadata JSON
     * @return tokenId The ID of the newly minted token
     */
    function mint(string memory _tokenURI) external payable returns (uint256) {
        require(msg.value >= mintFee, "AINFTCollection: insufficient mint fee");

        _nextTokenId++;
        uint256 tokenId = _nextTokenId;

        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, _tokenURI);

        emit NFTMinted(tokenId, msg.sender, _tokenURI);
        return tokenId;
    }

    /**
     * @notice Update the mint fee
     * @dev Only callable by the contract owner
     * @param _fee New mint fee in wei
     */
    function setMintFee(uint256 _fee) external onlyOwner {
        uint256 oldFee = mintFee;
        mintFee = _fee;
        emit MintFeeUpdated(oldFee, _fee);
    }

    /**
     * @notice Update the default royalty for the collection
     * @dev Only callable by the contract owner
     * @param receiver Address to receive royalty payments
     * @param feeNumerator Royalty in basis points (e.g. 500 = 5%)
     */
    function setDefaultRoyalty(address receiver, uint96 feeNumerator) external onlyOwner {
        _setDefaultRoyalty(receiver, feeNumerator);
    }

    /**
     * @notice Withdraw accumulated mint fees to the owner
     * @dev Only callable by the contract owner
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "AINFTCollection: nothing to withdraw");
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "AINFTCollection: withdraw failed");
    }

    /**
     * @notice Returns the total number of tokens minted so far
     */
    function totalSupply() external view returns (uint256) {
        return _nextTokenId;
    }

    // ────────────────────────────────────────────────────────────────────────
    // Overrides required by Solidity for multiple inheritance
    // ────────────────────────────────────────────────────────────────────────

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
