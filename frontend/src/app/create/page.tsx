// src/app/create/page.tsx — AI Creation page for AI+NFT Studio
// Users enter a prompt, choose style/engine, generate an AI image, then mint it as NFT.

"use client";

import { useState } from "react";
import Image from "next/image";
import MintButton from "@/components/MintButton";
import { uploadImage, uploadMetadata } from "@/lib/ipfs";

const STYLES = [
  { id: "cyberpunk", label: "赛博朋克", emoji: "🌆" },
  { id: "watercolor", label: "水彩画", emoji: "🎨" },
  { id: "oil_painting", label: "油画", emoji: "🖼️" },
  { id: "pixel_art", label: "像素艺术", emoji: "👾" },
  { id: "anime", label: "动漫风格", emoji: "✨" },
  { id: "3d_render", label: "3D 渲染", emoji: "💎" },
];

const ENGINES = [
  { id: "huggingface", label: "HuggingFace (Stable Diffusion XL)", icon: "🤗" },
  { id: "openai", label: "OpenAI (DALL-E 3)", icon: "🧠" },
];

export default function CreatePage() {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("cyberpunk");
  const [engine, setEngine] = useState("huggingface");
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [nftName, setNftName] = useState("");
  const [nftDescription, setNftDescription] = useState("");
  const [tokenURI, setTokenURI] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ── Generate AI image ────────────────────────────────────────
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("请输入创作描述");
      return;
    }
    setError(null);
    setSuccessMsg(null);
    setGenerating(true);
    setImageUrl(null);
    setTokenURI(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, style, engine }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "生成失败");
      }

      const data = await res.json();

      if (data.imageBase64) {
        const blob = await (await fetch(`data:image/png;base64,${data.imageBase64}`)).blob();
        setImageBlob(blob);
        setImageUrl(`data:image/png;base64,${data.imageBase64}`);
      } else if (data.imageUrl) {
        setImageUrl(data.imageUrl);
        const blobRes = await fetch(data.imageUrl);
        setImageBlob(await blobRes.blob());
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "图像生成出错，请重试");
    } finally {
      setGenerating(false);
    }
  };

  // ── Upload to IPFS and prepare tokenURI ──────────────────────
  const handlePrepareUpload = async () => {
    if (!imageBlob) return;
    if (!nftName.trim()) { setError("请输入 NFT 名称"); return; }

    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("image", imageBlob, "ai-nft.png");
      formData.append("name", nftName);
      formData.append("description", nftDescription || prompt);
      formData.append(
        "attributes",
        JSON.stringify([
          { trait_type: "Style", value: style },
          { trait_type: "Engine", value: engine },
          { trait_type: "Prompt", value: prompt.slice(0, 100) },
        ])
      );

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error((await res.json()).error || "上传失败");

      const { tokenURI: uri } = await res.json();
      setTokenURI(uri);
      setSuccessMsg("✅ 元数据已上传到 IPFS，可以铸造 NFT 了！");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "IPFS 上传失败");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
            <span className="gradient-text">AI 艺术创作</span>
          </h1>
          <p className="text-gray-400 text-lg">用文字描述你的想象，让 AI 为你生成独一无二的艺术作品</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-10">
          {/* ── Left: Controls ─────────────────────────────── */}
          <div className="space-y-6">
            {/* Prompt */}
            <div className="glass-card p-6">
              <label className="block text-sm font-medium text-purple-300 mb-3">
                📝 创作描述 (Prompt)
              </label>
              <textarea
                className="input-field resize-none h-32"
                placeholder="例如：一位赛博朋克风格的猫咪，霓虹灯背景，超高清细节..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                maxLength={500}
              />
              <div className="text-right text-xs text-gray-600 mt-1">{prompt.length}/500</div>
            </div>

            {/* Style selector */}
            <div className="glass-card p-6">
              <label className="block text-sm font-medium text-purple-300 mb-3">🎨 艺术风格</label>
              <div className="grid grid-cols-3 gap-3">
                {STYLES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStyle(s.id)}
                    className={`p-3 rounded-xl border text-sm font-medium transition-all duration-200 ${
                      style === s.id
                        ? "border-purple-500 bg-purple-900/50 text-purple-200"
                        : "border-purple-800/30 bg-[#1a1a2e] text-gray-400 hover:border-purple-600/50"
                    }`}
                  >
                    <span className="block text-2xl mb-1">{s.emoji}</span>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Engine selector */}
            <div className="glass-card p-6">
              <label className="block text-sm font-medium text-purple-300 mb-3">🔧 生成引擎</label>
              <div className="space-y-3">
                {ENGINES.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => setEngine(e.id)}
                    className={`w-full p-4 rounded-xl border text-left transition-all duration-200 ${
                      engine === e.id
                        ? "border-cyan-500 bg-cyan-900/30 text-cyan-200"
                        : "border-purple-800/30 bg-[#1a1a2e] text-gray-400 hover:border-cyan-700/50"
                    }`}
                  >
                    <span className="mr-2">{e.icon}</span>
                    {e.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={generating || !prompt.trim()}
              className="btn-primary w-full text-lg py-4 flex items-center justify-center gap-3"
            >
              {generating ? (
                <>
                  <span className="spinner" />
                  AI 生成中...
                </>
              ) : (
                "✨ 生成 AI 艺术"
              )}
            </button>

            {error && (
              <div className="glass-card p-4 border-red-700/40 text-red-400 text-sm">
                ❌ {error}
              </div>
            )}
            {successMsg && (
              <div className="glass-card p-4 border-green-700/40 text-green-400 text-sm">
                {successMsg}
              </div>
            )}
          </div>

          {/* ── Right: Preview + Mint ──────────────────────── */}
          <div className="space-y-6">
            {/* Image preview */}
            <div className="glass-card p-6">
              <label className="block text-sm font-medium text-purple-300 mb-3">🖼️ 预览</label>
              <div className="aspect-square rounded-xl bg-[#0f0f1a] border border-purple-800/30 flex items-center justify-center overflow-hidden">
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt="AI Generated artwork"
                    width={512}
                    height={512}
                    className="w-full h-full object-cover rounded-xl"
                    unoptimized={imageUrl.startsWith("data:")}
                  />
                ) : (
                  <div className="text-center text-gray-600">
                    <div className="text-6xl mb-3">🎨</div>
                    <p>生成的图片将显示在这里</p>
                  </div>
                )}
              </div>
            </div>

            {/* NFT metadata (only shown after image generated) */}
            {imageUrl && (
              <div className="glass-card p-6 space-y-4">
                <label className="block text-sm font-medium text-purple-300">
                  📋 NFT 信息
                </label>
                <input
                  className="input-field"
                  placeholder="NFT 名称 *"
                  value={nftName}
                  onChange={(e) => setNftName(e.target.value)}
                />
                <textarea
                  className="input-field resize-none h-20"
                  placeholder="NFT 描述（可选）"
                  value={nftDescription}
                  onChange={(e) => setNftDescription(e.target.value)}
                />

                {!tokenURI ? (
                  <button
                    onClick={handlePrepareUpload}
                    disabled={uploading || !nftName.trim()}
                    className="btn-secondary w-full flex items-center justify-center gap-2"
                  >
                    {uploading ? <><span className="spinner" /> 上传 IPFS...</> : "⬆️ 上传到 IPFS"}
                  </button>
                ) : (
                  <MintButton
                    tokenURI={tokenURI}
                    nftName={nftName}
                    disabled={false}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
