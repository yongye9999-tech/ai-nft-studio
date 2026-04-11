"use client";

import { useState } from "react";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import { AI_STYLES, AI_ENGINES } from "@/lib/ai-engines";

interface AIGeneratorProps {
  onGenerate: (imageUrl: string, prompt: string) => void;
}

export function AIGenerator({ onGenerate }: AIGeneratorProps) {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("cyberpunk");
  const [engine, setEngine] = useState("huggingface");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("请输入创作提示词");
      return;
    }

    setLoading(true);
    setError("");

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
      onGenerate(data.imageUrl, data.prompt);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "生成失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const PROMPT_SUGGESTIONS = [
    "霓虹色的赛博朋克猫咪，未来都市背景",
    "梦幻水彩风格的银河独角兽",
    "日本动漫风格的武士在樱花树下",
    "3D渲染的水晶宝石龙，发光效果",
    "像素艺术风格的复古太空飞船",
  ];

  return (
    <div className="space-y-5">
      {/* Prompt */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          <Sparkles className="inline w-3.5 h-3.5 mr-1 text-purple-400" />
          创作提示词
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="描述你想要的艺术作品..."
          className="input resize-none h-24"
        />
        {error && <p className="text-red-400 text-xs mt-1">{error}</p>}

        {/* Suggestions */}
        <div className="flex flex-wrap gap-2 mt-2">
          {PROMPT_SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setPrompt(s)}
              className="text-xs px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all border border-white/10"
            >
              {s.slice(0, 15)}...
            </button>
          ))}
        </div>
      </div>

      {/* Style */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">艺术风格</label>
        <div className="grid grid-cols-3 gap-2">
          {AI_STYLES.map((s) => (
            <button
              key={s.id}
              onClick={() => setStyle(s.id)}
              className={`p-2.5 rounded-xl border text-xs font-medium transition-all text-center ${
                style === s.id
                  ? "border-indigo-500 bg-indigo-500/20 text-indigo-300"
                  : "border-white/10 hover:border-white/30 text-gray-400"
              }`}
            >
              <span className="block text-lg mb-0.5">{s.emoji}</span>
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Engine */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">AI引擎</label>
        <div className="grid grid-cols-2 gap-2">
          {AI_ENGINES.map((e) => (
            <button
              key={e.id}
              onClick={() => setEngine(e.id)}
              className={`p-3 rounded-xl border text-left text-xs transition-all ${
                engine === e.id
                  ? "border-indigo-500 bg-indigo-500/20"
                  : "border-white/10 hover:border-white/20"
              }`}
            >
              <div className="font-medium text-white">{e.name}</div>
              <div className="text-gray-500 mt-0.5">{e.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="btn-primary w-full flex items-center justify-center gap-2 py-3.5"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            AI生成中...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            生成艺术作品
          </>
        )}
      </button>

      <button
        onClick={() => setPrompt("")}
        disabled={loading}
        className="btn-secondary w-full flex items-center justify-center gap-2 py-2.5 text-sm"
      >
        <RefreshCw className="w-4 h-4" />
        重置
      </button>
    </div>
  );
}
