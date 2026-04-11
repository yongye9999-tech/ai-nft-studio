"use client";

import { useState, useEffect } from "react";
import NFTCard from "@/components/NFTCard";
import { useWeb3 } from "@/components/Web3Provider";
import { useMarketplace } from "@/hooks/useContract";

interface NFTItem {
  listingId: number;
  tokenId: number;
  name: string;
  description: string;
  image: string;
  price: string;
  seller: string;
  nftContract: string;
}

export default function MarketplacePage() {
  const { account } = useWeb3();
  const { marketplace } = useMarketplace();
  const [items, setItems] = useState<NFTItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [buying, setBuying] = useState<number | null>(null);

  useEffect(() => {
    // In a real deployment, load listings from the contract.
    // For demo purposes we show placeholder data.
    const demoItems: NFTItem[] = [
      {
        listingId: 1,
        tokenId: 1,
        name: "赛博朋克都市 #001",
        description: "AI 生成的赛博朋克风格城市夜景",
        image: "https://ipfs.io/ipfs/QmYx6GsYAKnNzZ9A6NvEkVPQQJH7bRVPxk1v5MKtL2Aw1q",
        price: "0.1",
        seller: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
        nftContract: process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS || "",
      },
      {
        listingId: 2,
        tokenId: 2,
        name: "水彩幻境 #002",
        description: "柔和水彩风格的奇幻场景",
        image: "https://ipfs.io/ipfs/QmYx6GsYAKnNzZ9A6NvEkVPQQJH7bRVPxk1v5MKtL2Aw1q",
        price: "0.05",
        seller: "0x53d284357ec70cE289D6D64134DfAc8E511c8a3D",
        nftContract: process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS || "",
      },
    ];
    setItems(demoItems);
    setLoading(false);
  }, [marketplace]);

  const handleBuy = async (item: NFTItem) => {
    if (!marketplace || !account) {
      alert("请先连接钱包");
      return;
    }
    try {
      setBuying(item.listingId);
      const { ethers } = await import("ethers");
      const price = ethers.parseEther(item.price);
      const tx = await marketplace.buyItem(item.listingId, { value: price });
      await tx.wait();
      alert(`购买成功！NFT #${item.tokenId} 已转入你的钱包。`);
      setItems((prev) => prev.filter((i) => i.listingId !== item.listingId));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      alert(`购买失败：${message}`);
    } finally {
      setBuying(null);
    }
  };

  const filtered = items.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-extrabold text-white mb-3">🏪 NFT 交易市场</h1>
        <p className="text-gray-400">浏览、购买和出售 AI 生成的 NFT 作品。平台手续费仅 2.5%。</p>
      </div>

      {/* Search */}
      <div className="mb-8 max-w-xl mx-auto">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索 NFT 名称或描述..."
          className="input-dark"
        />
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-4xl mb-4 animate-spin">⏳</div>
          <p>加载市场数据中...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-4">🔍</div>
          <p>暂无符合条件的 NFT</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((item) => (
            <NFTCard
              key={item.listingId}
              name={item.name}
              description={item.description}
              image={item.image}
              price={item.price}
              creator={item.seller}
              onAction={() => handleBuy(item)}
              actionLabel={buying === item.listingId ? "处理中..." : "立即购买"}
              actionDisabled={buying === item.listingId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
