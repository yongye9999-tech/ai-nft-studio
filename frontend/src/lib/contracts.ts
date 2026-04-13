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
  'function owner() external view returns (address)',
  'function paused() external view returns (bool)',
  'function pause() external',
  'function unpause() external',
  'function setMintFee(uint256 fee) external',
  'function setDefaultRoyalty(address receiver, uint96 feeNumerator) external',
  'function setFreeMintList(address[] calldata creators, bool status) external',
  'function setMintFeeDiscount(address creator, uint256 discountBps) external',
  'function setBatchMintFeeDiscount(address[] calldata creators, uint256 discountBps) external',
  'function freeMintList(address) external view returns (bool)',
  'function mintFeeDiscount(address) external view returns (uint256)',
  'function withdraw() external',
  'function approve(address to, uint256 tokenId) external',
  'function setApprovalForAll(address operator, bool approved) external',
  'function isApprovedForAll(address owner, address operator) external view returns (bool)',
  // Creator milestone incentives
  'function creatorMintCount(address) external view returns (uint256)',
  'function milestonesClaimed(address) external view returns (uint8)',
  'function milestoneReward1() external view returns (uint256)',
  'function milestoneReward2() external view returns (uint256)',
  'function milestoneReward3() external view returns (uint256)',
  'function MILESTONE_THRESHOLD_1() external view returns (uint256)',
  'function MILESTONE_THRESHOLD_2() external view returns (uint256)',
  'function MILESTONE_THRESHOLD_3() external view returns (uint256)',
  'function claimMilestoneReward() external',
  'function setMilestoneRewards(uint256 r1, uint256 r2, uint256 r3) external',
  'event NFTMinted(address indexed to, uint256 indexed tokenId, string tokenURI)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
  'event FreeMintListUpdated(address indexed creator, bool status)',
  'event MintFeeDiscountUpdated(address indexed creator, uint256 discountBps)',
  'event MilestoneRewardClaimed(address indexed creator, uint256 amount)',
] as const

export const NFT_MARKETPLACE_ABI = [
  'function listItem(address nftContract, uint256 tokenId, uint256 price) external',
  'function buyItem(address nftContract, uint256 tokenId) external payable',
  'function cancelListing(address nftContract, uint256 tokenId) external',
  'function delistItem(address nftContract, uint256 tokenId) external',
  'function createAuction(address nftContract, uint256 tokenId, uint256 startPrice, uint256 duration) external',
  'function placeBid(address nftContract, uint256 tokenId) external payable',
  'function endAuction(address nftContract, uint256 tokenId) external',
  'function cancelAuction(address nftContract, uint256 tokenId) external',
  'function getListing(address nftContract, uint256 tokenId) external view returns (tuple(address seller, address nftContract, uint256 tokenId, uint256 price, bool active))',
  'function getAuction(address nftContract, uint256 tokenId) external view returns (tuple(address seller, address nftContract, uint256 tokenId, uint256 startPrice, uint256 highestBid, address highestBidder, uint256 endTime, bool active))',
  'function platformFee() external view returns (uint256)',
  'function feeRateLow() external view returns (uint256)',
  'function feeRateHigh() external view returns (uint256)',
  'function accumulatedFees() external view returns (uint256)',
  'function rewardsPoolBalance() external view returns (uint256)',
  'function opsFundBalance() external view returns (uint256)',
  'function pendingPlatformFee() external view returns (uint256)',
  'function platformFeeChangeTime() external view returns (uint256)',
  'function firstSaleFreeGranted(address) external view returns (bool)',
  'function owner() external view returns (address)',
  'function paused() external view returns (bool)',
  'function pause() external',
  'function unpause() external',
  'function proposePlatformFee(uint256 newFee) external',
  'function executePlatformFee() external',
  'function grantFirstSaleFree(address[] calldata sellers) external',
  'function withdrawFees() external',
  'function MAX_AUCTION_DURATION() external view returns (uint256)',
  'function FEE_TIMELOCK_DELAY() external view returns (uint256)',
  'event ItemListed(address indexed seller, address indexed nftContract, uint256 indexed tokenId, uint256 price)',
  'event ItemSold(address indexed buyer, address indexed nftContract, uint256 indexed tokenId, uint256 price)',
  'event ListingCancelled(address indexed nftContract, uint256 indexed tokenId)',
  'event AuctionCreated(address indexed seller, address indexed nftContract, uint256 indexed tokenId, uint256 startPrice, uint256 endTime)',
  'event BidPlaced(address indexed bidder, address indexed nftContract, uint256 indexed tokenId, uint256 bidAmount)',
  'event AuctionEnded(address indexed winner, address indexed nftContract, uint256 indexed tokenId, uint256 finalPrice)',
  'event AuctionCancelled(address indexed nftContract, uint256 indexed tokenId)',
  'event PlatformFeeProposed(uint256 newFee, uint256 executeAfter)',
  'event PlatformFeeUpdated(uint256 newFee)',
  'event FeesWithdrawn(uint256 amount)',
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
  42161: {
    // Arbitrum One
    AINFTCollection: process.env.NEXT_PUBLIC_AINFT_COLLECTION_ARBITRUM ?? '',
    NFTMarketplace: process.env.NEXT_PUBLIC_NFT_MARKETPLACE_ARBITRUM ?? '',
  },
  8453: {
    // Base Mainnet
    AINFTCollection: process.env.NEXT_PUBLIC_AINFT_COLLECTION_BASE ?? '',
    NFTMarketplace: process.env.NEXT_PUBLIC_NFT_MARKETPLACE_BASE ?? '',
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
