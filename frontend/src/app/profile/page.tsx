"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { ethers } from "ethers";
import { ConnectWallet } from "@/components/ConnectWallet";
import { NFT_COLLECTION_ABI, NFT_COLLECTION_ADDRESS } from "@/lib/contracts";
import { User, ImageIcon, TrendingUp, Copy, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";

interface UserNFT {
  tokenId: number;
  name: string;
  image: string;
  description: string;
  tokenURI: string;
}

export default function ProfilePage() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<"created" | "owned">("owned");
  const [nfts, setNfts] = useState<UserNFT[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalMinted, setTotalMinted] = useState(0);

  useEffect(() => {
    if (isConnected && address) {
      fetchUserNFTs();
    }
  }, [isConnected, address]);

  const fetchUserNFTs = async () => {
    if (!address) return;
    setLoading(true);

    try {
      const provider = new ethers.JsonRpcProvider(
        process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545"
      );
      const contract = new ethers.Contract(NFT_COLLECTION_ADDRESS, NFT_COLLECTION_ABI, provider);

      const total = await contract.totalSupply().catch(() => 0n);
      setTotalMinted(Number(total));

      const userNFTs: UserNFT[] = [];

      for (let i = 1; i <= Number(total); i++) {
        try {
          const owner = await contract.ownerOf(i);
          if (owner.toLowerCase() === address.toLowerCase()) {
            const tokenURI = await contract.tokenURI(i);
            let name = `AI NFT #${i}`;
            let image = "";
            let description = "";

            if (tokenURI.startsWith("ipfs://")) {
              const ipfsGateway = tokenURI.replace("ipfs://", "https://gateway.pinata.cloud/ipfs/");
              try {
                const res = await fetch(ipfsGateway);
                if (res.ok) {
                  const meta = await res.json();
                  name = meta.name || name;
                  image = meta.image?.replace("ipfs://", "https://gateway.pinata.cloud/ipfs/") || "";
                  description = meta.description || "";
                }
              } catch {
                // Use defaults
              }
            }

            userNFTs.push({ tokenId: i, name, image, description, tokenURI });
          }
        } catch {
          // Skip
        }
      }

      setNfts(userNFTs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success("地址已复制");
    }
  };

  const shortAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6">👤</div>
          <h1 className="text-3xl font-bold text-white mb-4">连接钱包查看主页</h1>
          <p className="text-gray-400 mb-8">请先连接你的Web3钱包，查看你的NFT收藏</p>
          <ConnectWallet />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Profile Header */}
        <div className="glass rounded-3xl p-8 mb-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
              <User className="w-12 h-12 text-white" />
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl font-bold text-white mb-2">我的创作空间</h1>
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <span className="text-gray-400 font-mono text-sm">
                  {address ? shortAddress(address) : ""}
                </span>
                <button onClick={copyAddress} className="text-gray-600 hover:text-gray-300 transition-colors">
                  <Copy className="w-4 h-4" />
                </button>
                <a
                  href={`https://sepolia.etherscan.io/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-indigo-400 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-6">
              <div className="text-center">
                <div className="text-3xl font-black gradient-text">{nfts.length}</div>
                <div className="text-sm text-gray-400">持有NFT</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-black gradient-text">{totalMinted}</div>
                <div className="text-sm text-gray-400">总铸造量</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          {[
            { id: "owned", label: "我的收藏", icon: ImageIcon },
            { id: "created", label: "创作统计", icon: TrendingUp },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as "created" | "owned")}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                activeTab === id ? "bg-indigo-600 text-white" : "glass text-gray-400 hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* NFT Grid */}
        {activeTab === "owned" && (
          <>
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <div className="spinner mr-3" />
                <span className="text-gray-400">加载中...</span>
              </div>
            ) : nfts.length === 0 ? (
              <div className="text-center py-24">
                <div className="text-6xl mb-4">🎨</div>
                <h3 className="text-xl font-bold text-white mb-2">还没有NFT</h3>
                <p className="text-gray-500 mb-6">去创作你的第一个AI NFT吧！</p>
                <a href="/create" className="btn-primary inline-flex items-center gap-2">
                  开始创作 →
                </a>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {nfts.map((nft) => (
                  <div key={nft.tokenId} className="nft-card group">
                    <div className="aspect-square bg-gradient-to-br from-indigo-900/50 to-purple-900/50">
                      {nft.image ? (
                        <img
                          src={nft.image}
                          alt={nft.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-12 h-12 text-gray-600" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-white truncate">{nft.name}</h3>
                      <p className="text-gray-500 text-xs mt-1">Token ID: #{nft.tokenId}</p>
                      {nft.description && (
                        <p className="text-gray-400 text-sm mt-2 line-clamp-2">{nft.description}</p>
                      )}
                      <div className="flex gap-2 mt-3">
                        <a
                          href={`/marketplace`}
                          className="btn-secondary text-xs py-2 px-3 flex-1 text-center"
                        >
                          上架出售
                        </a>
                        <a
                          href={nft.tokenURI.replace("ipfs://", "https://ipfs.io/ipfs/")}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 glass rounded-xl hover:border-indigo-500/30 border border-transparent"
                        >
                          <ExternalLink className="w-4 h-4 text-gray-400" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Stats Tab */}
        {activeTab === "created" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: "持有NFT数量", value: nfts.length.toString(), icon: "🎨" },
              { label: "平台总铸造量", value: totalMinted.toString(), icon: "⚡" },
              { label: "版税收益", value: "查询中", icon: "💰" },
            ].map((stat) => (
              <div key={stat.label} className="card text-center">
                <div className="text-4xl mb-3">{stat.icon}</div>
                <div className="text-3xl font-black gradient-text mb-1">{stat.value}</div>
                <div className="text-gray-400 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
