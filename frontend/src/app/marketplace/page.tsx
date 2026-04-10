// src/app/marketplace/page.tsx — NFT Marketplace page for AI+NFT Studio
// Displays all active listings with search/filter, and allows buying NFTs.

"use client";

import { useState, useEffect, useCallback } from "react";
import NFTCard from "@/components/NFTCard";
import { useMarketplace, type ListingItem } from "@/hooks/useMarketplace";

const SORT_OPTIONS = [
  { value: "newest", label: "最新上架" },
  { value: "price_asc", label: "价格从低到高" },
  { value: "price_desc", label: "价格从高到低" },
];

export default function MarketplacePage() {
  const { getListedItems, buyItem } = useMarketplace();
  const [items, setItems] = useState<ListingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [buying, setBuying] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getListedItems();
      setItems(data);
    } catch {
      setError("加载市场数据失败，请刷新重试");
    } finally {
      setLoading(false);
    }
  }, [getListedItems]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleBuy = async (item: ListingItem) => {
    setBuying(item.listingId);
    setError(null);
    setSuccessMsg(null);
    try {
      await buyItem(item.listingId, item.priceEth);
      setSuccessMsg(`🎉 成功购买 "${item.name}"！`);
      fetchItems();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "购买失败，请重试");
    } finally {
      setBuying(null);
    }
  };

  // Filter and sort
  const filtered = items
    .filter((i) =>
      search.trim()
        ? i.name.toLowerCase().includes(search.toLowerCase()) ||
          i.seller.toLowerCase().includes(search.toLowerCase())
        : true
    )
    .sort((a, b) => {
      if (sort === "price_asc") return parseFloat(a.priceEth) - parseFloat(b.priceEth);
      if (sort === "price_desc") return parseFloat(b.priceEth) - parseFloat(a.priceEth);
      return b.listingId - a.listingId; // newest
    });

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
            <span className="gradient-text">NFT 市场</span>
          </h1>
          <p className="text-gray-400 text-lg">探索 AI 创作的独特数字艺术，支持 ERC-2981 版税</p>
        </div>

        {/* Search & Filter bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
            <input
              className="input-field pl-11"
              placeholder="搜索 NFT 名称或创作者地址..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="input-field sm:w-48"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            onClick={fetchItems}
            className="btn-secondary px-6"
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : "🔄 刷新"}
          </button>
        </div>

        {/* Status messages */}
        {error && (
          <div className="glass-card p-4 border-red-700/40 text-red-400 mb-6">❌ {error}</div>
        )}
        {successMsg && (
          <div className="glass-card p-4 border-green-700/40 text-green-400 mb-6">{successMsg}</div>
        )}

        {/* NFT Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-32">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-purple-600/20 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-400">加载中...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-32">
            <div className="text-6xl mb-4">🏪</div>
            <p className="text-gray-400 text-xl mb-2">
              {search ? "没有找到匹配的 NFT" : "市场暂无在售 NFT"}
            </p>
            <p className="text-gray-600">
              {search ? "尝试其他搜索词" : "成为第一个在市场上架的创作者！"}
            </p>
          </div>
        ) : (
          <>
            <p className="text-gray-500 text-sm mb-6">
              共找到 <span className="text-purple-400 font-medium">{filtered.length}</span> 件 NFT
            </p>
            <div className="nft-grid">
              {filtered.map((item) => (
                <NFTCard
                  key={item.listingId}
                  name={item.name}
                  imageUrl={item.imageUrl}
                  priceEth={item.priceEth}
                  creator={item.seller}
                  action="buy"
                  loading={buying === item.listingId}
                  onAction={() => handleBuy(item)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
