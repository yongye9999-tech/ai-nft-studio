"use client";

import { useState } from "react";

const STYLES = [
  { id: "cyberpunk", label: "赛博朋克" },
  { id: "watercolor", label: "水彩" },
  { id: "oilpainting", label: "油画" },
  { id: "pixelart", label: "像素艺术" },
  { id: "anime", label: "日本动漫" },
  { id: "3d", label: "3D 渲染" },
] as const;

type Engine = "huggingface" | "openai";

interface AIGeneratorProps {
  prompt: string;
  setPrompt: (v: string) => void;
  style: string;
  setStyle: (v: string) => void;
  onImageGenerated: (imageDataUrl: string) => void;
}

export default function AIGenerator({
  prompt,
  setPrompt,
  style,
  setStyle,
  onImageGenerated,
}: AIGeneratorProps) {
  const [engine, setEngine] = useState<Engine>("huggingface");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("请输入创意描述");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, style, engine }),
      });
      const data = await res.json() as { imageBase64?: string; imageUrl?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "生成失败");
      const imgSrc = data.imageBase64 || data.imageUrl;
      if (!imgSrc) throw new Error("未收到图片数据");
      onImageGenerated(imgSrc);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "生成失败";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass rounded-2xl p-6 flex flex-col gap-5">
      <h2 className="text-xl font-bold text-white">AI 生成器</h2>

      {/* Prompt */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          创意描述 *
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="例如：一座漂浮在星云中的赛博朋克城市，霓虹灯倒映在雨水中..."
          rows={4}
          className="input-dark resize-none"
        />
      </div>

      {/* Style */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          艺术风格
        </label>
        <div className="grid grid-cols-3 gap-2">
          {STYLES.map((s) => (
            <button
              key={s.id}
              onClick={() => setStyle(s.id)}
              className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                style === s.id
                  ? "bg-purple-600 text-white"
                  : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Engine */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          AI 引擎
        </label>
        <div className="grid grid-cols-2 gap-2">
          {([
            { id: "huggingface", label: "🤗 HuggingFace" },
            { id: "openai", label: "🔵 OpenAI DALL-E 3" },
          ] as { id: Engine; label: string }[]).map((e) => (
            <button
              key={e.id}
              onClick={() => setEngine(e.id)}
              className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                engine === e.id
                  ? "bg-cyan-600/80 text-white"
                  : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10"
              }`}
            >
              {e.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-red-400 text-sm bg-red-400/10 rounded-lg px-4 py-2 border border-red-400/20">
          ❌ {error}
        </p>
      )}

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin">⏳</span>
            AI 生成中...
          </span>
        ) : (
          "✨ 生成图片"
        )}
      </button>
    </div>
  );
}
