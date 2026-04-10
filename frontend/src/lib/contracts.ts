// src/lib/contracts.ts — Contract ABIs and address mapping for AI+NFT Studio
// Exports simplified ABIs for used functions and a helper to look up addresses by chainId.

// ── AINFTCollection ABI ───────────────────────────────────────
export const AINFT_ABI = [
  // ERC-721
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function balanceOf(address owner) view returns (uint256)",
  "function approve(address to, uint256 tokenId)",
  "function setApprovalForAll(address operator, bool approved)",
  "function isApprovedForAll(address owner, address operator) view returns (bool)",
  "function transferFrom(address from, address to, uint256 tokenId)",
  "function safeTransferFrom(address from, address to, uint256 tokenId)",
  // ERC-2981
  "function royaltyInfo(uint256 tokenId, uint256 salePrice) view returns (address receiver, uint256 royaltyAmount)",
  "function supportsInterface(bytes4 interfaceId) view returns (bool)",
  // AINFTCollection specific
  "function mint(string memory _tokenURI) payable returns (uint256)",
  "function mintFee() view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function setMintFee(uint256 _fee)",
  "function setDefaultRoyalty(address receiver, uint96 feeNumerator)",
  "function withdraw()",
  "function owner() view returns (address)",
  // Events
  "event NFTMinted(uint256 indexed tokenId, address indexed creator, string tokenURI)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
  "event MintFeeUpdated(uint256 oldFee, uint256 newFee)",
] as const;

// ── NFTMarketplace ABI ────────────────────────────────────────
export const MARKETPLACE_ABI = [
  // Fixed-price listings
  "function listItem(address nftContract, uint256 tokenId, uint256 price) returns (uint256)",
  "function buyItem(uint256 listingId) payable",
  "function cancelListing(uint256 listingId)",
  "function listings(uint256 listingId) view returns (address seller, address nftContract, uint256 tokenId, uint256 price, bool active)",
  "function listingCount() view returns (uint256)",
  // Auctions
  "function createAuction(address nftContract, uint256 tokenId, uint256 startPrice, uint256 duration) returns (uint256)",
  "function placeBid(uint256 auctionId) payable",
  "function endAuction(uint256 auctionId)",
  "function auctions(uint256 auctionId) view returns (address seller, address nftContract, uint256 tokenId, uint256 startPrice, uint256 highestBid, address highestBidder, uint256 endTime, bool ended)",
  "function auctionCount() view returns (uint256)",
  // Admin
  "function platformFee() view returns (uint256)",
  "function setPlatformFee(uint256 _fee)",
  "function withdraw()",
  // Events
  "event ItemListed(uint256 indexed listingId, address indexed seller, address indexed nftContract, uint256 tokenId, uint256 price)",
  "event ItemSold(uint256 indexed listingId, address indexed buyer, uint256 price)",
  "event ItemCanceled(uint256 indexed listingId)",
  "event AuctionCreated(uint256 indexed auctionId, address indexed seller, address indexed nftContract, uint256 tokenId, uint256 startPrice, uint256 endTime)",
  "event BidPlaced(uint256 indexed auctionId, address indexed bidder, uint256 amount)",
  "event AuctionEnded(uint256 indexed auctionId, address indexed winner, uint256 amount)",
] as const;

// ── Address mapping ───────────────────────────────────────────

interface ContractAddresses {
  ainft: string;
  marketplace: string;
}

const CONTRACT_ADDRESSES: Record<number, ContractAddresses> = {
  // Localhost (overridden by env if present)
  31337: {
    ainft: process.env.NEXT_PUBLIC_AINFT_CONTRACT_ADDRESS || "",
    marketplace: process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS || "",
  },
  // Sepolia
  11155111: {
    ainft: process.env.NEXT_PUBLIC_AINFT_CONTRACT_ADDRESS || "",
    marketplace: process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS || "",
  },
  // Polygon Amoy
  80002: {
    ainft: process.env.NEXT_PUBLIC_AINFT_CONTRACT_ADDRESS || "",
    marketplace: process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS || "",
  },
  // BNB Testnet
  97: {
    ainft: process.env.NEXT_PUBLIC_AINFT_CONTRACT_ADDRESS || "",
    marketplace: process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS || "",
  },
};

/**
 * Returns the contract address for the given chain and contract name.
 * Returns an empty string if the chain is not configured; callers should
 * validate the returned address before use.
 */
export function getContractAddress(
  chainId: number,
  contract: "ainft" | "marketplace"
): string {
  const addresses = CONTRACT_ADDRESSES[chainId];
  if (!addresses) {
    // Fallback to env-provided addresses for unknown chains
    return contract === "ainft"
      ? process.env.NEXT_PUBLIC_AINFT_CONTRACT_ADDRESS || ""
      : process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS || "";
  }
  return addresses[contract];
}

export type { ContractAddresses };
