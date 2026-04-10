// src/components/AIGenerator.tsx — Standalone AI image generator component
// Can be used embedded in any page; exposes generated image URL via onGenerated callback.

"use client";

import { useState } from "react";
import Image from "next/image";

const STYLES = [
  { id: "cyberpunk", label: "赛博朋克", emoji: "🌆" },
  { id: "watercolor", label: "水彩画", emoji: "🎨" },
  { id: "oil_painting", label: "油画", emoji: "🖼️" },
  { id: "pixel_art", label: "像素艺术", emoji: "👾" },
  { id: "anime", label: "动漫", emoji: "✨" },
  { id: "3d_render", label: "3D 渲染", emoji: "💎" },
];

const ENGINES = [
  { id: "huggingface", label: "HuggingFace SDXL", icon: "🤗" },
  { id: "openai", label: "OpenAI DALL-E 3", icon: "🧠" },
];

interface AIGeneratorProps {
  onGenerated?: (imageUrl: string, imageBlob: Blob) => void;
}

export default function AIGenerator({ onGenerated }: AIGeneratorProps) {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("cyberpunk");
  const [engine, setEngine] = useState("huggingface");
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("请输入创作描述");
      return;
    }
    setError(null);
    setLoading(true);
    setImageUrl(null);

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
      let url = "";
      let blob: Blob;

      if (data.imageBase64) {
        url = `data:image/png;base64,${data.imageBase64}`;
        blob = await (await fetch(url)).blob();
      } else if (data.imageUrl) {
        url = data.imageUrl;
        blob = await (await fetch(url)).blob();
      } else {
        throw new Error("未收到图像数据");
      }

      setImageUrl(url);
      onGenerated?.(url, blob);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "生成出错");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Prompt */}
      <div>
        <label className="block text-sm font-medium text-purple-300 mb-2">创作描述</label>
        <textarea
          className="input-field resize-none h-28"
          placeholder="描述你想要的艺术作品..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          maxLength={500}
        />
      </div>

      {/* Style */}
      <div>
        <label className="block text-sm font-medium text-purple-300 mb-2">艺术风格</label>
        <div className="grid grid-cols-3 gap-2">
          {STYLES.map((s) => (
            <button
              key={s.id}
              onClick={() => setStyle(s.id)}
              className={`p-2.5 rounded-xl border text-xs transition-all ${
                style === s.id
                  ? "border-purple-500 bg-purple-900/50 text-purple-200"
                  : "border-purple-800/30 bg-[#1a1a2e] text-gray-500 hover:border-purple-700/50"
              }`}
            >
              <span className="block text-xl mb-0.5">{s.emoji}</span>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Engine */}
      <div>
        <label className="block text-sm font-medium text-purple-300 mb-2">生成引擎</label>
        <div className="flex gap-2">
          {ENGINES.map((e) => (
            <button
              key={e.id}
              onClick={() => setEngine(e.id)}
              className={`flex-1 py-2.5 px-3 rounded-xl border text-xs transition-all ${
                engine === e.id
                  ? "border-cyan-500 bg-cyan-900/30 text-cyan-200"
                  : "border-purple-800/30 bg-[#1a1a2e] text-gray-500"
              }`}
            >
              {e.icon} {e.label}
            </button>
          ))}
        </div>
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={loading || !prompt.trim()}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {loading ? <><span className="spinner" /> 生成中...</> : "✨ 生成 AI 图像"}
      </button>

      {/* Error */}
      {error && <p className="text-red-400 text-sm">❌ {error}</p>}

      {/* Preview */}
      {imageUrl && (
        <div className="aspect-square rounded-xl overflow-hidden border border-purple-800/30">
          <Image
            src={imageUrl}
            alt="Generated"
            width={512}
            height={512}
            className="w-full h-full object-cover"
            unoptimized={imageUrl.startsWith("data:")}
          />
        </div>
      )}
    </div>
  );
}
