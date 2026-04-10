import { Contract, JsonRpcSigner, BrowserProvider } from "ethers";

// ============================================================
//                    ABI Definitions
// ============================================================

export const AINFT_COLLECTION_ABI = [
  "function mint(string memory uri) external payable returns (uint256)",
  "function mintFee() external view returns (uint256)",
  "function totalMinted() external view returns (uint256)",
  "function tokenURI(uint256 tokenId) external view returns (string memory)",
  "function getCreator(uint256 tokenId) external view returns (address)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function approve(address to, uint256 tokenId) external",
  "event NFTMinted(uint256 indexed tokenId, address indexed creator, string tokenURI)",
];

export const NFT_MARKETPLACE_ABI = [
  "function listItem(address nftContract, uint256 tokenId, uint256 price) external returns (uint256)",
  "function buyItem(uint256 listingId) external payable",
  "function cancelListing(uint256 listingId) external",
  "function createAuction(address nftContract, uint256 tokenId, uint256 minPrice, uint256 duration) external returns (uint256)",
  "function placeBid(uint256 auctionId) external payable",
  "function endAuction(uint256 auctionId) external",
  "function platformFee() external view returns (uint256)",
  "function listings(uint256 listingId) external view returns (address seller, address nftContract, uint256 tokenId, uint256 price, bool active)",
  "function auctions(uint256 auctionId) external view returns (address seller, address nftContract, uint256 tokenId, uint256 minPrice, uint256 highestBid, address highestBidder, uint256 endTime, bool active)",
  "event ItemListed(uint256 indexed listingId, address indexed seller, address indexed nftContract, uint256 tokenId, uint256 price)",
  "event ItemSold(uint256 indexed listingId, address indexed buyer, address indexed nftContract, uint256 tokenId, uint256 price)",
];

// ============================================================
//                  Contract Addresses
// ============================================================

export interface ContractAddresses {
  aiNftCollection: string;
  nftMarketplace: string;
}

export const CONTRACT_ADDRESSES: Record<number, ContractAddresses> = {
  // Ethereum Sepolia
  11155111: {
    aiNftCollection: process.env.NEXT_PUBLIC_AINFT_COLLECTION_SEPOLIA || "",
    nftMarketplace: process.env.NEXT_PUBLIC_NFT_MARKETPLACE_SEPOLIA || "",
  },
  // Polygon Amoy
  80002: {
    aiNftCollection: process.env.NEXT_PUBLIC_AINFT_COLLECTION_AMOY || "",
    nftMarketplace: process.env.NEXT_PUBLIC_NFT_MARKETPLACE_AMOY || "",
  },
  // Hardhat local
  31337: {
    aiNftCollection: process.env.NEXT_PUBLIC_AINFT_COLLECTION_LOCAL || "",
    nftMarketplace: process.env.NEXT_PUBLIC_NFT_MARKETPLACE_LOCAL || "",
  },
};

// ============================================================
//                  Helper Functions
// ============================================================

export function getAddresses(chainId: number): ContractAddresses | null {
  return CONTRACT_ADDRESSES[chainId] || null;
}

export function getAINFTContract(
  chainId: number,
  signerOrProvider: JsonRpcSigner | BrowserProvider
): Contract | null {
  const addresses = getAddresses(chainId);
  if (!addresses?.aiNftCollection) return null;
  return new Contract(addresses.aiNftCollection, AINFT_COLLECTION_ABI, signerOrProvider);
}

export function getMarketplaceContract(
  chainId: number,
  signerOrProvider: JsonRpcSigner | BrowserProvider
): Contract | null {
  const addresses = getAddresses(chainId);
  if (!addresses?.nftMarketplace) return null;
  return new Contract(addresses.nftMarketplace, NFT_MARKETPLACE_ABI, signerOrProvider);
}
