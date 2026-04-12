import { ethers, type BrowserProvider, type JsonRpcSigner, type ContractRunner } from 'ethers'

// ── ABIs ─────────────────────────────────────────────────────────────────────

export const AINFT_COLLECTION_ABI = [
  'function mint(address to, string memory uri) external payable returns (uint256)',
  'function tokenCounter() external view returns (uint256)',
  'function mintFee() external view returns (uint256)',
  'function maxSupply() external view returns (uint256)',
  'function ownerOf(uint256 tokenId) external view returns (address)',
  'function tokenURI(uint256 tokenId) external view returns (string)',
  'function royaltyInfo(uint256 tokenId, uint256 salePrice) external view returns (address, uint256)',
  'function setMintFee(uint256 fee) external',
  'function setDefaultRoyalty(address receiver, uint96 feeNumerator) external',
  'function withdraw() external',
  'function approve(address to, uint256 tokenId) external',
  'function setApprovalForAll(address operator, bool approved) external',
  'function isApprovedForAll(address owner, address operator) external view returns (bool)',
  'event NFTMinted(address indexed to, uint256 indexed tokenId, string tokenURI)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
] as const

export const NFT_MARKETPLACE_ABI = [
  'function listItem(address nftContract, uint256 tokenId, uint256 price) external',
  'function buyItem(address nftContract, uint256 tokenId) external payable',
  'function cancelListing(address nftContract, uint256 tokenId) external',
  'function createAuction(address nftContract, uint256 tokenId, uint256 startPrice, uint256 duration) external',
  'function placeBid(address nftContract, uint256 tokenId) external payable',
  'function endAuction(address nftContract, uint256 tokenId) external',
  'function getListing(address nftContract, uint256 tokenId) external view returns (tuple(address seller, address nftContract, uint256 tokenId, uint256 price, bool active))',
  'function getAuction(address nftContract, uint256 tokenId) external view returns (tuple(address seller, address nftContract, uint256 tokenId, uint256 startPrice, uint256 highestBid, address highestBidder, uint256 endTime, bool active))',
  'function platformFee() external view returns (uint256)',
  'function accumulatedFees() external view returns (uint256)',
  'function withdrawFees() external',
  'event ItemListed(address indexed seller, address indexed nftContract, uint256 indexed tokenId, uint256 price)',
  'event ItemSold(address indexed buyer, address indexed nftContract, uint256 indexed tokenId, uint256 price)',
  'event ListingCancelled(address indexed nftContract, uint256 indexed tokenId)',
  'event AuctionCreated(address indexed seller, address indexed nftContract, uint256 indexed tokenId, uint256 startPrice, uint256 endTime)',
  'event BidPlaced(address indexed bidder, address indexed nftContract, uint256 indexed tokenId, uint256 bidAmount)',
  'event AuctionEnded(address indexed winner, address indexed nftContract, uint256 indexed tokenId, uint256 finalPrice)',
] as const

// ── Contract Addresses by chainId ─────────────────────────────────────────────

interface ChainAddresses {
  AINFTCollection: string
  NFTMarketplace: string
}

export const CONTRACT_ADDRESSES: Record<number, ChainAddresses> = {
  31337: {
    // localhost — updated after `deploy:local`
    AINFTCollection: process.env.NEXT_PUBLIC_AINFT_COLLECTION_LOCAL ?? '',
    NFTMarketplace: process.env.NEXT_PUBLIC_NFT_MARKETPLACE_LOCAL ?? '',
  },
  1: {
    // Ethereum Mainnet
    AINFTCollection: process.env.NEXT_PUBLIC_AINFT_COLLECTION_MAINNET ?? '',
    NFTMarketplace: process.env.NEXT_PUBLIC_NFT_MARKETPLACE_MAINNET ?? '',
  },
  137: {
    // Polygon Mainnet
    AINFTCollection: process.env.NEXT_PUBLIC_AINFT_COLLECTION_POLYGON ?? '',
    NFTMarketplace: process.env.NEXT_PUBLIC_NFT_MARKETPLACE_POLYGON ?? '',
  },
  11155111: {
    // Sepolia
    AINFTCollection: process.env.NEXT_PUBLIC_AINFT_COLLECTION_SEPOLIA ?? '',
    NFTMarketplace: process.env.NEXT_PUBLIC_NFT_MARKETPLACE_SEPOLIA ?? '',
  },
  80002: {
    // Polygon Amoy
    AINFTCollection: process.env.NEXT_PUBLIC_AINFT_COLLECTION_AMOY ?? '',
    NFTMarketplace: process.env.NEXT_PUBLIC_NFT_MARKETPLACE_AMOY ?? '',
  },
  97: {
    // BNB Testnet
    AINFTCollection: process.env.NEXT_PUBLIC_AINFT_COLLECTION_BSC ?? '',
    NFTMarketplace: process.env.NEXT_PUBLIC_NFT_MARKETPLACE_BSC ?? '',
  },
}

// ── Helper functions ──────────────────────────────────────────────────────────

export function getContractAddresses(chainId: number): ChainAddresses | null {
  return CONTRACT_ADDRESSES[chainId] ?? null
}

export function getAINFTCollection(
  chainId: number,
  signerOrProvider: ContractRunner
): ethers.Contract | null {
  const addresses = getContractAddresses(chainId)
  if (!addresses?.AINFTCollection) return null
  return new ethers.Contract(addresses.AINFTCollection, AINFT_COLLECTION_ABI, signerOrProvider)
}

export function getNFTMarketplace(
  chainId: number,
  signerOrProvider: ContractRunner
): ethers.Contract | null {
  const addresses = getContractAddresses(chainId)
  if (!addresses?.NFTMarketplace) return null
  return new ethers.Contract(addresses.NFTMarketplace, NFT_MARKETPLACE_ABI, signerOrProvider)
}

export type { BrowserProvider, JsonRpcSigner }
