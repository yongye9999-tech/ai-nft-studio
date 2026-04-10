"use client";

import { useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { NFTCard } from "@/components/NFTCard";

export default function ProfilePage() {
  const { account, isConnected } = useWallet();
  const [activeTab, setActiveTab] = useState<"collection" | "creations">("collection");

  if (!isConnected) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">👛</div>
          <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
          <p className="text-gray-400">Connect your wallet to view your NFT collection</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 px-6 pb-20">
      <div className="max-w-7xl mx-auto">
        {/* Profile Header */}
        <div className="card p-8 mb-8">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-3xl">
              🎨
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">My Profile</h1>
              <p className="text-gray-400 font-mono text-sm">{account}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/10">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">0</p>
              <p className="text-sm text-gray-400">NFTs Owned</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">0</p>
              <p className="text-sm text-gray-400">Created</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">0 ETH</p>
              <p className="text-sm text-gray-400">Earned</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setActiveTab("collection")}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              activeTab === "collection"
                ? "bg-brand-600 text-white"
                : "bg-white/5 text-gray-400 hover:text-white"
            }`}
          >
            My Collection
          </button>
          <button
            onClick={() => setActiveTab("creations")}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              activeTab === "creations"
                ? "bg-brand-600 text-white"
                : "bg-white/5 text-gray-400 hover:text-white"
            }`}
          >
            My Creations
          </button>
        </div>

        {/* Empty State */}
        <div className="text-center py-20">
          <div className="text-6xl mb-4">
            {activeTab === "collection" ? "🖼️" : "✨"}
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            {activeTab === "collection" ? "No NFTs in Collection" : "No Creations Yet"}
          </h3>
          <p className="text-gray-400 mb-6">
            {activeTab === "collection"
              ? "Buy NFTs from the marketplace to build your collection"
              : "Create your first AI-generated NFT"}
          </p>
          <a
            href={activeTab === "collection" ? "/marketplace" : "/create"}
            className="btn-primary inline-block"
          >
            {activeTab === "collection" ? "Browse Marketplace" : "Start Creating"}
          </a>
        </div>
      </div>
    </div>
  );
}
