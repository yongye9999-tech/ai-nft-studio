"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import toast from "react-hot-toast";
import { Search, Filter, Grid, List, Loader2, ShoppingCart, Gavel } from "lucide-react";
import { NFTCard } from "@/components/NFTCard";
import { NFT_MARKETPLACE_ABI, NFT_MARKETPLACE_ADDRESS, NFT_COLLECTION_ABI, NFT_COLLECTION_ADDRESS } from "@/lib/contracts";

interface NFTListing {
  listingId: number;
  tokenId: number;
  seller: string;
  price: bigint;
  status: number;
  nftContract: string;
  name?: string;
  image?: string;
  description?: string;
}

const SORT_OPTIONS = [
  { value: "newest", label: "最新上架" },
  { value: "price_asc", label: "价格从低到高" },
  { value: "price_desc", label: "价格从高到低" },
];

export default function MarketplacePage() {
  const [listings, setListings] = useState<NFTListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeTab, setActiveTab] = useState<"listings" | "auctions">("listings");

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const provider = new ethers.JsonRpcProvider(
        process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545"
      );

      const marketplace = new ethers.Contract(
        NFT_MARKETPLACE_ADDRESS,
        NFT_MARKETPLACE_ABI,
        provider
      );
      const nftContract = new ethers.Contract(
        NFT_COLLECTION_ADDRESS,
        NFT_COLLECTION_ABI,
        provider
      );

      const totalListings = await marketplace.totalListings().catch(() => 0n);
      const fetchedListings: NFTListing[] = [];

      for (let i = 1; i <= Number(totalListings); i++) {
        try {
          const listing = await marketplace.listings(i);
          if (listing.status === 0n) {
            // Active
            let name = `AI NFT #${listing.tokenId}`;
            let image = "";
            let description = "";

            try {
              const tokenURI = await nftContract.tokenURI(listing.tokenId);
              if (tokenURI.startsWith("ipfs://")) {
                const ipfsGateway = tokenURI.replace(
                  "ipfs://",
                  "https://gateway.pinata.cloud/ipfs/"
                );
                const metaRes = await fetch(ipfsGateway);
                if (metaRes.ok) {
                  const meta = await metaRes.json();
                  name = meta.name || name;
                  image = meta.image?.replace("ipfs://", "https://gateway.pinata.cloud/ipfs/") || "";
                  description = meta.description || "";
                }
              }
            } catch {
              // Use defaults
            }

            fetchedListings.push({
              listingId: i,
              tokenId: Number(listing.tokenId),
              seller: listing.seller,
              price: listing.price,
              status: Number(listing.status),
              nftContract: listing.nftContract,
              name,
              image,
              description,
            });
          }
        } catch {
          // Skip invalid listing
        }
      }

      setListings(fetchedListings);
    } catch (err) {
      console.error("Failed to fetch listings:", err);
      // Show demo data in dev mode
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async (listingId: number, price: bigint) => {
    if (!window.ethereum) {
      toast.error("请安装MetaMask钱包");
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum as ethers.Eip1193Provider);
      const signer = await provider.getSigner();
      const marketplace = new ethers.Contract(
        NFT_MARKETPLACE_ADDRESS,
        NFT_MARKETPLACE_ABI,
        signer
      );

      const tx = await marketplace.buyItem(listingId, { value: price });
      toast.loading("⏳ 交易确认中...", { id: `buy-${listingId}` });
      await tx.wait();
      toast.dismiss(`buy-${listingId}`);
      toast.success("🎉 购买成功！");
      fetchListings();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "购买失败";
      toast.error(message);
    }
  };

  const filteredListings = listings.filter((l) =>
    l.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedListings = [...filteredListings].sort((a, b) => {
    if (sortBy === "price_asc") return Number(a.price - b.price);
    if (sortBy === "price_desc") return Number(b.price - a.price);
    return b.listingId - a.listingId; // newest
  });

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black gradient-text mb-3">NFT 交易市场</h1>
          <p className="text-gray-400 text-lg">发现、购买、竞拍独特的AI生成NFT作品</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          {[
            { id: "listings", label: "固定价格", icon: ShoppingCart },
            { id: "auctions", label: "拍卖", icon: Gavel },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as "listings" | "auctions")}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                activeTab === id
                  ? "bg-indigo-600 text-white"
                  : "glass text-gray-400 hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索NFT名称..."
              className="input pl-10"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="input bg-white/5 min-w-[160px]"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-gray-900">
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-3 rounded-xl border transition-all ${
                viewMode === "grid" ? "border-indigo-500 bg-indigo-500/20" : "glass border-white/10"
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-3 rounded-xl border transition-all ${
                viewMode === "list" ? "border-indigo-500 bg-indigo-500/20" : "glass border-white/10"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            <span className="ml-3 text-gray-400">加载市场数据...</span>
          </div>
        ) : sortedListings.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">🎨</div>
            <h3 className="text-xl font-bold text-white mb-2">暂无上架NFT</h3>
            <p className="text-gray-500 mb-6">
              {activeTab === "listings" ? "还没有固定价格上架的NFT" : "还没有进行中的拍卖"}
            </p>
            <a href="/create" className="btn-primary inline-flex items-center gap-2">
              去创作第一个NFT →
            </a>
          </div>
        ) : (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                : "space-y-4"
            }
          >
            {sortedListings.map((listing) => (
              <NFTCard
                key={listing.listingId}
                listingId={listing.listingId}
                tokenId={listing.tokenId}
                name={listing.name || `AI NFT #${listing.tokenId}`}
                image={listing.image || ""}
                description={listing.description || ""}
                price={listing.price}
                seller={listing.seller}
                onBuy={() => handleBuy(listing.listingId, listing.price)}
                viewMode={viewMode}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
