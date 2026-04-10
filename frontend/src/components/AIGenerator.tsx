"use client";

import { useState } from "react";
import Image from "next/image";
import { MintButton } from "./MintButton";

const STYLES = [
  "Cyberpunk",
  "Watercolor",
  "Oil Painting",
  "Pixel Art",
  "Anime",
  "3D Render",
  "Photorealistic",
];

const ENGINES = [
  { value: "huggingface", label: "🤗 HuggingFace (Free)" },
  { value: "openai", label: "🔮 OpenAI DALL-E 3 (Paid)" },
];

export function AIGenerator() {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState(STYLES[0]);
  const [engine, setEngine] = useState("huggingface");
  const [loading, setLoading] = useState(false);
  const [imageData, setImageData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt");
      return;
    }

    setLoading(true);
    setError(null);
    setImageData(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, style, engine }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Generation failed");
      }

      setImageData(data.image);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to generate image";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Left: Input */}
      <div className="card p-6 space-y-5">
        <h2 className="text-xl font-bold text-white">Describe Your Art</h2>

        {/* Prompt input */}
        <div>
          <label className="text-sm text-gray-400 mb-2 block">Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="A majestic dragon soaring through neon-lit cyberpunk skies, highly detailed..."
            rows={4}
            className="input-field resize-none"
          />
        </div>

        {/* Style selector */}
        <div>
          <label className="text-sm text-gray-400 mb-2 block">Art Style</label>
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            className="input-field"
          >
            {STYLES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Engine selector */}
        <div>
          <label className="text-sm text-gray-400 mb-2 block">AI Engine</label>
          <select
            value={engine}
            onChange={(e) => setEngine(e.target.value)}
            className="input-field"
          >
            {ENGINES.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </select>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating...
            </span>
          ) : (
            "✨ Generate Image"
          )}
        </button>
      </div>

      {/* Right: Preview */}
      <div className="card p-6 flex flex-col">
        <h2 className="text-xl font-bold text-white mb-4">Preview</h2>

        <div className="flex-1 relative rounded-xl overflow-hidden bg-white/5 min-h-64">
          {imageData ? (
            <Image
              src={`data:image/png;base64,${imageData}`}
              alt="Generated AI artwork"
              fill
              className="object-contain"
              unoptimized
            />
          ) : loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
              <p className="text-gray-400 text-sm">Generating your artwork...</p>
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center p-6">
              <div className="text-4xl">🎨</div>
              <p className="text-gray-400 text-sm">
                Your AI-generated artwork will appear here
              </p>
            </div>
          )}
        </div>

        {/* Mint button */}
        {imageData && (
          <div className="mt-4">
            <MintButton
              imageData={imageData}
              prompt={prompt}
              style={style}
            />
          </div>
        )}
      </div>
    </div>
  );
}
