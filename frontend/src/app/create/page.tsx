"use client";

import { useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { ethers } from "ethers";
import toast from "react-hot-toast";
import { Sparkles, Upload, Zap, Image as ImageIcon, Loader2, ExternalLink } from "lucide-react";
import { ConnectWallet } from "@/components/ConnectWallet";
import { AI_STYLES, AI_ENGINES } from "@/lib/ai-engines";
import { NFT_COLLECTION_ABI, NFT_COLLECTION_ADDRESS } from "@/lib/contracts";

type GenerationStatus = "idle" | "generating" | "uploading" | "minting" | "success";

interface GeneratedArt {
  imageUrl: string;
  prompt: string;
  style: string;
  engine: string;
}

export default function CreatePage() {
  const { address, isConnected } = useAccount();

  const [prompt, setPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("cyberpunk");
  const [selectedEngine, setSelectedEngine] = useState("huggingface");
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [generatedArt, setGeneratedArt] = useState<GeneratedArt | null>(null);
  const [ipfsUri, setIpfsUri] = useState("");
  const [mintedTokenId, setMintedTokenId] = useState<number | null>(null);
  const [nftName, setNftName] = useState("");
  const [nftDescription, setNftDescription] = useState("");
  const [royaltyBps, setRoyaltyBps] = useState(500);

  const generateArt = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error("请输入创作提示词");
      return;
    }

    setStatus("generating");
    setGeneratedArt(null);
    setIpfsUri("");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, style: selectedStyle, engine: selectedEngine }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "AI生成失败");
      }

      const data = await response.json();
      setGeneratedArt({
        imageUrl: data.imageUrl,
        prompt: data.prompt,
        style: selectedStyle,
        engine: selectedEngine,
      });
      toast.success("🎨 AI创作完成！");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "生成失败，请重试";
      toast.error(message);
      setStatus("idle");
      return;
    }

    setStatus("idle");
  }, [prompt, selectedStyle, selectedEngine]);

  const uploadToIPFS = useCallback(async () => {
    if (!generatedArt) return;
    if (!nftName.trim()) {
      toast.error("请输入NFT名称");
      return;
    }

    setStatus("uploading");
    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: generatedArt.imageUrl,
          name: nftName,
          description: nftDescription || generatedArt.prompt,
          attributes: [
            { trait_type: "AI Engine", value: generatedArt.engine },
            { trait_type: "Art Style", value: generatedArt.style },
            { trait_type: "Prompt", value: generatedArt.prompt },
          ],
        }),
      });

      if (!response.ok) throw new Error("IPFS上传失败");

      const data = await response.json();
      setIpfsUri(data.metadataUri);
      toast.success("📦 已上传至IPFS！");
      setStatus("idle");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "IPFS上传失败";
      toast.error(message);
      setStatus("idle");
    }
  }, [generatedArt, nftName, nftDescription]);

  const mintNFT = useCallback(async () => {
    if (!ipfsUri || !address) return;

    setStatus("minting");
    try {
      const provider = new ethers.BrowserProvider(window.ethereum as ethers.Eip1193Provider);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(NFT_COLLECTION_ADDRESS, NFT_COLLECTION_ABI, signer);

      const mintFee = await contract.mintFee();
      const tx = await contract.mintNFT(ipfsUri, address, royaltyBps, { value: mintFee });
      toast.loading("⏳ 交易确认中...", { id: "mint-tx" });

      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log: ethers.Log) => {
          try {
            const parsed = contract.interface.parseLog(log);
            return parsed?.name === "NFTMinted";
          } catch {
            return false;
          }
        }
      );

      if (event) {
        const parsed = contract.interface.parseLog(event);
        setMintedTokenId(Number(parsed?.args[0]));
      }

      toast.dismiss("mint-tx");
      toast.success("🎉 NFT铸造成功！");
      setStatus("success");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "铸造失败";
      toast.error(message);
      setStatus("idle");
    }
  }, [ipfsUri, address, royaltyBps]);

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6">🎨</div>
          <h1 className="text-3xl font-bold text-white mb-4">连接钱包开始创作</h1>
          <p className="text-gray-400 mb-8">请先连接你的Web3钱包，开始AI NFT创作之旅</p>
          <ConnectWallet />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black gradient-text mb-3">AI NFT 创作工坊</h1>
          <p className="text-gray-400 text-lg">输入创意 → AI生图 → IPFS上传 → 链上铸造</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Input Panel */}
          <div className="space-y-6">
            {/* Prompt Input */}
            <div className="card">
              <label className="block text-sm font-medium text-gray-300 mb-3">
                <Sparkles className="inline w-4 h-4 mr-1 text-purple-400" />
                创作提示词 *
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="描述你想要的艺术效果，例如：一只赛博朋克风格的猫咪，霓虹灯背景，未来感十足..."
                className="input resize-none h-28"
              />
            </div>

            {/* Art Style */}
            <div className="card">
              <label className="block text-sm font-medium text-gray-300 mb-3">
                🎨 艺术风格
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {AI_STYLES.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(style.id)}
                    className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                      selectedStyle === style.id
                        ? "border-indigo-500 bg-indigo-500/20 text-indigo-300"
                        : "border-white/10 hover:border-white/30 text-gray-400"
                    }`}
                  >
                    <span className="block text-xl mb-1">{style.emoji}</span>
                    {style.name}
                  </button>
                ))}
              </div>
            </div>

            {/* AI Engine */}
            <div className="card">
              <label className="block text-sm font-medium text-gray-300 mb-3">
                🤖 AI引擎
              </label>
              <div className="grid grid-cols-2 gap-3">
                {AI_ENGINES.map((engine) => (
                  <button
                    key={engine.id}
                    onClick={() => setSelectedEngine(engine.id)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      selectedEngine === engine.id
                        ? "border-indigo-500 bg-indigo-500/20"
                        : "border-white/10 hover:border-white/30"
                    }`}
                  >
                    <div className="font-medium text-white text-sm">{engine.name}</div>
                    <div className="text-xs text-gray-500 mt-1">{engine.desc}</div>
                    {engine.free && (
                      <span className="tag mt-2">免费</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={generateArt}
              disabled={status === "generating" || !prompt.trim()}
              className="btn-primary w-full text-lg py-4 flex items-center justify-center gap-2"
            >
              {status === "generating" ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  AI生成中...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  开始生成
                </>
              )}
            </button>
          </div>

          {/* Right: Preview & Mint Panel */}
          <div className="space-y-6">
            {/* Preview */}
            <div className="card min-h-[300px] flex items-center justify-center">
              {generatedArt ? (
                <div className="w-full">
                  <img
                    src={generatedArt.imageUrl}
                    alt={generatedArt.prompt}
                    className="w-full rounded-xl object-cover max-h-[400px]"
                  />
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    {generatedArt.engine} · {AI_STYLES.find(s => s.id === generatedArt.style)?.name}
                  </p>
                </div>
              ) : (
                <div className="text-center text-gray-600">
                  <ImageIcon className="w-16 h-16 mx-auto mb-3 opacity-30" />
                  <p>AI生成的图像将在此展示</p>
                </div>
              )}
            </div>

            {/* NFT Metadata */}
            {generatedArt && (
              <div className="card space-y-4">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  NFT信息
                </h3>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">NFT名称 *</label>
                  <input
                    value={nftName}
                    onChange={(e) => setNftName(e.target.value)}
                    placeholder="我的AI创作 #1"
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">描述</label>
                  <textarea
                    value={nftDescription}
                    onChange={(e) => setNftDescription(e.target.value)}
                    placeholder="这是一幅AI创作的..."
                    className="input resize-none h-20"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    版税比例: {(royaltyBps / 100).toFixed(1)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    step="50"
                    value={royaltyBps}
                    onChange={(e) => setRoyaltyBps(Number(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                  <div className="flex justify-between text-xs text-gray-600 mt-1">
                    <span>0%</span><span>5%</span><span>10%</span>
                  </div>
                </div>

                {/* Upload to IPFS */}
                {!ipfsUri ? (
                  <button
                    onClick={uploadToIPFS}
                    disabled={status === "uploading" || !nftName.trim()}
                    className="btn-secondary w-full flex items-center justify-center gap-2"
                  >
                    {status === "uploading" ? (
                      <><Loader2 className="w-4 h-4 animate-spin" />上传IPFS中...</>
                    ) : (
                      <><Upload className="w-4 h-4" />上传至IPFS</>
                    )}
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-sm">
                      <p className="text-green-400 font-medium mb-1">✅ IPFS上传成功</p>
                      <p className="text-gray-400 text-xs break-all">{ipfsUri}</p>
                    </div>

                    {status !== "success" ? (
                      <button
                        onClick={mintNFT}
                        disabled={status === "minting"}
                        className="btn-primary w-full flex items-center justify-center gap-2"
                      >
                        {status === "minting" ? (
                          <><Loader2 className="w-4 h-4 animate-spin" />铸造中...</>
                        ) : (
                          <><Zap className="w-4 h-4" />铸造NFT</>
                        )}
                      </button>
                    ) : (
                      <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-center">
                        <p className="text-2xl mb-2">🎉</p>
                        <p className="text-indigo-300 font-bold">NFT铸造成功！</p>
                        {mintedTokenId !== null && (
                          <p className="text-gray-400 text-sm mt-1">Token ID: #{mintedTokenId}</p>
                        )}
                        <a
                          href="/marketplace"
                          className="inline-flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300 mt-2"
                        >
                          前往市场 <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
