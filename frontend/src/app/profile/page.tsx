"use client";

import { useState } from "react";
import NFTCard from "@/components/NFTCard";
import { useWeb3 } from "@/components/Web3Provider";

type Tab = "collected" | "created";

const demoNFTs = [
  {
    name: "赛博朋克都市 #001",
    description: "AI 生成的赛博朋克风格城市夜景",
    image: "https://ipfs.io/ipfs/QmYx6GsYAKnNzZ9A6NvEkVPQQJH7bRVPxk1v5MKtL2Aw1q",
    price: "0.1",
    creator: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    tab: "collected" as Tab,
  },
  {
    name: "水彩幻境 #002",
    description: "柔和水彩风格的奇幻场景",
    image: "https://ipfs.io/ipfs/QmYx6GsYAKnNzZ9A6NvEkVPQQJH7bRVPxk1v5MKtL2Aw1q",
    price: "0.05",
    creator: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    tab: "created" as Tab,
  },
];

export default function ProfilePage() {
  const { account } = useWeb3();
  const [activeTab, setActiveTab] = useState<Tab>("collected");

  const filtered = demoNFTs.filter((n) => n.tab === activeTab);

  if (!account) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-6">🔒</div>
        <h2 className="text-2xl font-bold text-white mb-3">请先连接钱包</h2>
        <p className="text-gray-400">连接钱包后即可查看你的 NFT 收藏和创作记录。</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* Profile header */}
      <div className="glass rounded-2xl p-6 mb-10 flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl">
          🧑‍🎨
        </div>
        <div>
          <p className="text-gray-400 text-sm">已连接地址</p>
          <p className="text-white font-mono font-semibold">
            {account.slice(0, 6)}...{account.slice(-4)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 mb-8">
        {(["collected", "created"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === tab
                ? "border-b-2 border-purple-500 text-purple-400"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {tab === "collected" ? "我的收藏" : "我的创作"}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-5xl mb-4">📭</div>
          <p>暂无 {activeTab === "collected" ? "收藏" : "创作"} 记录</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((nft, i) => (
            <NFTCard
              key={i}
              name={nft.name}
              description={nft.description}
              image={nft.image}
              price={nft.price}
              creator={nft.creator}
            />
          ))}
        </div>
      )}
    </div>
  );
}
