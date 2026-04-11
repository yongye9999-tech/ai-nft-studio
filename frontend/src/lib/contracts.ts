// Contract addresses — update after deployment
export const NFT_COLLECTION_ADDRESS =
  process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS ||
  "0x0000000000000000000000000000000000000000";

export const NFT_MARKETPLACE_ADDRESS =
  process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS ||
  "0x0000000000000000000000000000000000000000";

// AINFTCollection ABI (subset used by frontend)
export const NFT_COLLECTION_ABI = [
  // Read
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function mintFee() view returns (uint256)",
  "function defaultRoyaltyBps() view returns (uint96)",
  "function royaltyInfo(uint256 tokenId, uint256 salePrice) view returns (address, uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function isApprovedForAll(address owner, address operator) view returns (bool)",
  "function getApproved(uint256 tokenId) view returns (address)",
  // Write
  "function mintNFT(string calldata tokenURI, address royaltyReceiver, uint96 royaltyBps) payable returns (uint256)",
  "function setApprovalForAll(address operator, bool approved)",
  "function approve(address to, uint256 tokenId)",
  "function safeTransferFrom(address from, address to, uint256 tokenId)",
  // Events
  "event NFTMinted(uint256 indexed tokenId, address indexed creator, string tokenURI, uint96 royaltyBps)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
  "event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)",
] as const;

// NFTMarketplace ABI (subset used by frontend)
export const NFT_MARKETPLACE_ABI = [
  // Read
  "function listings(uint256 listingId) view returns (uint256 listingId, address nftContract, uint256 tokenId, address seller, uint256 price, uint8 status, uint256 createdAt)",
  "function auctions(uint256 auctionId) view returns (uint256 auctionId, address nftContract, uint256 tokenId, address seller, uint256 startingPrice, uint256 reservePrice, uint256 currentBid, address currentBidder, uint256 endTime, uint8 status, uint256 createdAt)",
  "function totalListings() view returns (uint256)",
  "function totalAuctions() view returns (uint256)",
  "function platformFeeBps() view returns (uint256)",
  "function platformAddress() view returns (address)",
  "function pendingWithdrawals(address user) view returns (uint256)",
  "function isAuctionEnded(uint256 auctionId) view returns (bool)",
  // Write
  "function listItem(address nftContract, uint256 tokenId, uint256 price) returns (uint256)",
  "function buyItem(uint256 listingId) payable",
  "function cancelListing(uint256 listingId)",
  "function updateListingPrice(uint256 listingId, uint256 newPrice)",
  "function createAuction(address nftContract, uint256 tokenId, uint256 startingPrice, uint256 reservePrice, uint256 duration) returns (uint256)",
  "function placeBid(uint256 auctionId) payable",
  "function endAuction(uint256 auctionId)",
  "function cancelAuction(uint256 auctionId)",
  "function withdrawPending()",
  // Events
  "event ItemListed(uint256 indexed listingId, address indexed nftContract, uint256 indexed tokenId, address seller, uint256 price)",
  "event ItemSold(uint256 indexed listingId, address indexed nftContract, uint256 indexed tokenId, address seller, address buyer, uint256 price, uint256 platformFee, uint256 royaltyAmount)",
  "event ListingCancelled(uint256 indexed listingId, address indexed seller)",
  "event AuctionCreated(uint256 indexed auctionId, address indexed nftContract, uint256 indexed tokenId, address seller, uint256 startingPrice, uint256 reservePrice, uint256 endTime)",
  "event BidPlaced(uint256 indexed auctionId, address indexed bidder, uint256 amount)",
  "event AuctionEnded(uint256 indexed auctionId, address indexed winner, uint256 finalPrice, uint256 platformFee, uint256 royaltyAmount)",
] as const;

// Supported chains
export const SUPPORTED_CHAIN_IDS = {
  HARDHAT: 31337,
  SEPOLIA: 11155111,
  POLYGON_AMOY: 80002,
  BNB_TESTNET: 97,
} as const;

export const CHAIN_NAMES: Record<number, string> = {
  31337: "Localhost",
  11155111: "Sepolia Testnet",
  80002: "Polygon Amoy",
  97: "BNB Testnet",
};

export const BLOCK_EXPLORERS: Record<number, string> = {
  11155111: "https://sepolia.etherscan.io",
  80002: "https://amoy.polygonscan.com",
  97: "https://testnet.bscscan.com",
};
