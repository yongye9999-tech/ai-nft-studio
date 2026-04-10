// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AINFTCollection
 * @author yongye9999-tech
 * @notice ERC721 NFT collection with ERC2981 royalty support for AI-generated artwork.
 * @dev Combines ERC721URIStorage for per-token URI and ERC2981 for royalty standard.
 */
contract AINFTCollection is ERC721, ERC721URIStorage, ERC2981, Ownable {
    // ============================================================
    //                          STATE
    // ============================================================

    /// @notice Auto-incrementing token ID counter
    uint256 private _nextTokenId;

    /// @notice Fee required to mint one NFT (default: 0.001 ether)
    uint256 public mintFee;

    /// @notice Maps tokenId to the original creator address
    mapping(uint256 => address) private _creators;

    // ============================================================
    //                          EVENTS
    // ============================================================

    /**
     * @notice Emitted when a new NFT is minted.
     * @param tokenId  The newly minted token ID.
     * @param creator  The address that minted the token.
     * @param tokenURI The IPFS URI of the token metadata.
     */
    event NFTMinted(uint256 indexed tokenId, address indexed creator, string tokenURI);

    /**
     * @notice Emitted when the mint fee is updated.
     * @param newFee The new mint fee in wei.
     */
    event MintFeeUpdated(uint256 newFee);

    // ============================================================
    //                        CONSTRUCTOR
    // ============================================================

    /**
     * @notice Deploy a new AINFTCollection.
     * @param name_                  The ERC721 collection name.
     * @param symbol_                The ERC721 collection symbol.
     * @param defaultRoyaltyFraction Royalty fraction in basis points (e.g. 500 = 5%).
     */
    constructor(
        string memory name_,
        string memory symbol_,
        uint96 defaultRoyaltyFraction
    ) ERC721(name_, symbol_) Ownable(msg.sender) {
        mintFee = 0.001 ether;
        _setDefaultRoyalty(msg.sender, defaultRoyaltyFraction);
    }

    // ============================================================
    //                       MINT FUNCTION
    // ============================================================

    /**
     * @notice Mint a new AI-generated NFT.
     * @dev Caller must send at least `mintFee` in ETH.
     *      Stores creator address and token URI on-chain.
     * @param uri The IPFS metadata URI for the token.
     * @return tokenId The ID of the newly minted token.
     */
    function mint(string memory uri) external payable returns (uint256) {
        require(msg.value >= mintFee, "AINFTCollection: insufficient mint fee");

        uint256 tokenId = _nextTokenId;
        _nextTokenId++;

        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, uri);
        _creators[tokenId] = msg.sender;

        emit NFTMinted(tokenId, msg.sender, uri);

        return tokenId;
    }

    // ============================================================
    //                       OWNER FUNCTIONS
    // ============================================================

    /**
     * @notice Update the mint fee.
     * @param _fee New mint fee in wei.
     */
    function setMintFee(uint256 _fee) external onlyOwner {
        mintFee = _fee;
        emit MintFeeUpdated(_fee);
    }

    /**
     * @notice Update the default royalty for all tokens.
     * @param receiver Address that receives royalties.
     * @param fraction Royalty fraction in basis points (e.g. 500 = 5%).
     */
    function setDefaultRoyalty(address receiver, uint96 fraction) external onlyOwner {
        _setDefaultRoyalty(receiver, fraction);
    }

    /**
     * @notice Withdraw all accumulated ETH (mint fees) to the owner.
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "AINFTCollection: nothing to withdraw");
        (bool success, ) = owner().call{value: balance}("");
        require(success, "AINFTCollection: withdraw failed");
    }

    // ============================================================
    //                        VIEW FUNCTIONS
    // ============================================================

    /**
     * @notice Get the original creator of a token.
     * @param tokenId The token ID to query.
     * @return The creator address.
     */
    function getCreator(uint256 tokenId) external view returns (address) {
        return _creators[tokenId];
    }

    /**
     * @notice Get the total number of minted tokens.
     * @return Total minted count.
     */
    function totalMinted() external view returns (uint256) {
        return _nextTokenId;
    }

    // ============================================================
    //                        OVERRIDES
    // ============================================================

    /**
     * @dev Override required by Solidity for ERC721 + ERC721URIStorage.
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721, ERC721URIStorage) returns (address) {
        return super._update(to, tokenId, auth);
    }

    /**
     * @dev Override tokenURI to use ERC721URIStorage.
     */
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    /**
     * @dev Override supportsInterface for ERC721 + ERC721URIStorage + ERC2981.
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
