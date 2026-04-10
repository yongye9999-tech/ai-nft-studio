// src/app/profile/page.tsx — User profile page for AI+NFT Studio
// Shows My Collection, My Creations, and My Listings with stats.

"use client";

import { useState, useEffect, useCallback } from "react";
import NFTCard from "@/components/NFTCard";
import { useWallet } from "@/hooks/useWallet";
import { useNFTContract, type NFTItem } from "@/hooks/useNFTContract";
import { useMarketplace, type ListingItem } from "@/hooks/useMarketplace";

type Tab = "collection" | "creations" | "listings";

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: "collection", label: "我的收藏", emoji: "🖼️" },
  { id: "creations", label: "我的创作", emoji: "✨" },
  { id: "listings", label: "我的挂单", emoji: "🏷️" },
];

export default function ProfilePage() {
  const { account, isConnected, shortAddress, connect } = useWallet();
  const { getMyNFTs } = useNFTContract();
  const { getMyListings } = useMarketplace();
  const [activeTab, setActiveTab] = useState<Tab>("collection");
  const [myNFTs, setMyNFTs] = useState<NFTItem[]>([]);
  const [myListings, setMyListings] = useState<ListingItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!isConnected) return;
    setLoading(true);
    try {
      const [nfts, listings] = await Promise.all([getMyNFTs(), getMyListings()]);
      setMyNFTs(nfts);
      setMyListings(listings);
    } catch {
      // silently fail; user sees empty state
    } finally {
      setLoading(false);
    }
  }, [isConnected, getMyNFTs, getMyListings]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-8xl mb-6">👛</div>
          <h2 className="text-3xl font-bold mb-4">连接钱包</h2>
          <p className="text-gray-400 mb-8">连接你的 Web3 钱包以查看你的 NFT 和创作记录</p>
          <button onClick={connect} className="btn-primary text-lg px-8 py-4">
            连接钱包
          </button>
        </div>
      </div>
    );
  }

  const stats = [
    { label: "持有 NFT", value: myNFTs.length },
    { label: "在售挂单", value: myListings.length },
    { label: "总创作", value: myNFTs.length },
  ];

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Profile header */}
        <div className="glass-card p-8 mb-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center text-4xl flex-shrink-0">
              🦄
            </div>
            <div className="text-center sm:text-left flex-1">
              <h1 className="text-2xl font-bold mb-1">{shortAddress}</h1>
              <p className="text-gray-500 text-sm font-mono mb-4">{account}</p>
              {/* Stats */}
              <div className="flex gap-8 justify-center sm:justify-start">
                {stats.map((s) => (
                  <div key={s.label} className="text-center">
                    <div className="text-2xl font-bold gradient-text">{s.value}</div>
                    <div className="text-gray-500 text-xs mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-purple-800/20 pb-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 rounded-t-xl font-medium text-sm transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-purple-900/50 text-purple-200 border border-purple-700/50 border-b-transparent"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {tab.emoji} {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-purple-600/20 border-t-purple-500 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {activeTab === "collection" && (
              <NFTGrid
                items={myNFTs}
                emptyMsg="你还没有 NFT，去市场购买或创作吧！"
                action="view"
              />
            )}
            {activeTab === "creations" && (
              <NFTGrid
                items={myNFTs}
                emptyMsg="你还没有创作任何 NFT，去创作页面开始吧！"
                action="list"
              />
            )}
            {activeTab === "listings" && (
              <ListingsGrid items={myListings} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────

function NFTGrid({
  items,
  emptyMsg,
  action,
}: {
  items: NFTItem[];
  emptyMsg: string;
  action: "view" | "list";
}) {
  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">🖼️</div>
        <p className="text-gray-400">{emptyMsg}</p>
      </div>
    );
  }

  return (
    <div className="nft-grid">
      {items.map((item) => (
        <NFTCard
          key={item.tokenId}
          name={item.name}
          imageUrl={item.imageUrl}
          priceEth={item.priceEth ?? null}
          creator={item.creator}
          action={action}
          onAction={() => {}}
        />
      ))}
    </div>
  );
}

function ListingsGrid({ items }: { items: ListingItem[] }) {
  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">🏷️</div>
        <p className="text-gray-400">你还没有在售挂单</p>
      </div>
    );
  }

  return (
    <div className="nft-grid">
      {items.map((item) => (
        <NFTCard
          key={item.listingId}
          name={item.name}
          imageUrl={item.imageUrl}
          priceEth={item.priceEth}
          creator={item.seller}
          action="cancel"
          onAction={() => {}}
        />
      ))}
    </div>
  );
}
