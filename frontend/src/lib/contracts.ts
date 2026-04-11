// Simplified ABI fragments – only the functions used by the frontend

export const AI_NFT_COLLECTION_ABI = [
  // Read
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function mintFee() view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function royaltyInfo(uint256 tokenId, uint256 salePrice) view returns (address receiver, uint256 royaltyAmount)",
  // Write
  "function mint(string memory _tokenURI) payable returns (uint256)",
  "function setMintFee(uint256 _fee)",
  "function setApprovalForAll(address operator, bool approved)",
  "function approve(address to, uint256 tokenId)",
  // Events
  "event NFTMinted(uint256 indexed tokenId, address indexed creator, string tokenURI)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
] as const;

export const NFT_MARKETPLACE_ABI = [
  // Read
  "function platformFee() view returns (uint256)",
  "function pendingPlatformFees() view returns (uint256)",
  "function listings(uint256) view returns (address seller, address nftContract, uint256 tokenId, uint256 price, bool active)",
  "function auctions(uint256) view returns (address seller, address nftContract, uint256 tokenId, uint256 startPrice, uint256 highestBid, address highestBidder, uint256 endTime, bool active)",
  // Write
  "function listItem(address nftContract, uint256 tokenId, uint256 price)",
  "function buyItem(uint256 listingId) payable",
  "function cancelListing(uint256 listingId)",
  "function createAuction(address nftContract, uint256 tokenId, uint256 startPrice, uint256 duration)",
  "function placeBid(uint256 auctionId) payable",
  "function endAuction(uint256 auctionId)",
  // Events
  "event ItemListed(uint256 indexed listingId, address indexed seller, address indexed nftContract, uint256 tokenId, uint256 price)",
  "event ItemSold(uint256 indexed listingId, address indexed buyer, address indexed nftContract, uint256 tokenId, uint256 price)",
  "event AuctionCreated(uint256 indexed auctionId, address indexed seller, address indexed nftContract, uint256 tokenId, uint256 startPrice, uint256 endTime)",
  "event BidPlaced(uint256 indexed auctionId, address indexed bidder, uint256 amount)",
  "event AuctionEnded(uint256 indexed auctionId, address indexed winner, uint256 amount)",
] as const;

/** Contract addresses per chainId */
export const CONTRACT_ADDRESSES: Record<
  number,
  { nftCollection: string; marketplace: string }
> = {
  // Localhost (Hardhat)
  31337: {
    nftCollection:
      process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS || "",
    marketplace:
      process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS || "",
  },
  // Sepolia
  11155111: {
    nftCollection:
      process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS || "",
    marketplace:
      process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS || "",
  },
  // Polygon Amoy
  80002: {
    nftCollection:
      process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS || "",
    marketplace:
      process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS || "",
  },
  // BNB Testnet
  97: {
    nftCollection:
      process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS || "",
    marketplace:
      process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS || "",
  },
};
