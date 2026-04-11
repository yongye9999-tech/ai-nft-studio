"use client";

import { useState } from "react";
import AIGenerator from "@/components/AIGenerator";
import MintButton from "@/components/MintButton";
import { useWeb3 } from "@/components/Web3Provider";

export default function CreatePage() {
  const { account } = useWeb3();
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [nftName, setNftName] = useState("");
  const [nftDescription, setNftDescription] = useState("");
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("cyberpunk");

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-extrabold text-white mb-3">
          🎨 AI 创作工作室
        </h1>
        <p className="text-gray-400">
          输入你的创意描述，选择艺术风格，让 AI 生成独特作品，然后一键铸造为 NFT。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: AI Generator */}
        <AIGenerator
          prompt={prompt}
          setPrompt={setPrompt}
          style={style}
          setStyle={setStyle}
          onImageGenerated={setGeneratedImage}
        />

        {/* Right: NFT Details + Mint */}
        <div className="glass rounded-2xl p-6 flex flex-col gap-5">
          <h2 className="text-xl font-bold text-white">NFT 详情</h2>

          {/* Preview */}
          <div className="rounded-xl overflow-hidden bg-white/5 aspect-square flex items-center justify-center border border-white/10">
            {generatedImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={generatedImage}
                alt="Generated NFT"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-gray-500 text-sm">图片将在此处预览</span>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              NFT 名称 *
            </label>
            <input
              type="text"
              value={nftName}
              onChange={(e) => setNftName(e.target.value)}
              placeholder="例如：赛博朋克城市夜景 #1"
              className="input-dark"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              NFT 描述
            </label>
            <textarea
              value={nftDescription}
              onChange={(e) => setNftDescription(e.target.value)}
              placeholder="描述你的 NFT 作品..."
              rows={3}
              className="input-dark resize-none"
            />
          </div>

          {!account && (
            <p className="text-yellow-400 text-sm text-center py-2 bg-yellow-400/10 rounded-lg border border-yellow-400/20">
              ⚠️ 请先连接钱包才能铸造 NFT
            </p>
          )}

          <MintButton
            imageUrl={generatedImage}
            name={nftName}
            description={nftDescription}
            prompt={prompt}
            style={style}
          />
        </div>
      </div>
    </div>
  );
}
