// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

/**
 * @dev Test helper: ERC721 NFT that reports an excessive ERC2981 royalty (150% of sale price)
 *      to verify that NFTMarketplace's bounds check skips the royalty rather than reverting.
 */
contract MockHighRoyaltyNFT is ERC721, IERC2981 {
    uint256 private _nextTokenId = 1;

    constructor() ERC721("MockHighRoyalty", "MHR") {}

    function mint(address to) external returns (uint256 tokenId) {
        tokenId = _nextTokenId++;
        _mint(to, tokenId);
    }

    /// @dev Returns royalty = 150% of salePrice (deliberately excessive).
    function royaltyInfo(uint256, uint256 salePrice) external pure override returns (address, uint256) {
        return (address(0xdead), (salePrice * 15_000) / 10_000);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, IERC165)
        returns (bool)
    {
        return interfaceId == type(IERC2981).interfaceId || super.supportsInterface(interfaceId);
    }
}
