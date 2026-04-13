'use client'

import { useState } from 'react'
import axios from 'axios'
import { STYLE_OPTIONS, ENGINE_OPTIONS, QUALITY_OPTIONS } from '@/lib/ai-engines'
import type { AIEngine, ImageQuality } from '@/lib/ai-engines'

interface AIGeneratorProps {
  onImageGenerated: (imageUrl: string, imageData: string, engine?: string, model?: string, prompt?: string) => void
}

export default function AIGenerator({ onImageGenerated }: AIGeneratorProps) {
  const [prompt, setPrompt] = useState('')
  const [selectedStyle, setSelectedStyle] = useState<string>(STYLE_OPTIONS[0].id)
  const [engine, setEngine] = useState<AIEngine>('huggingface')
  const [quality, setQuality] = useState<ImageQuality>('standard')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('请输入提示词')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const style = STYLE_OPTIONS.find((s) => s.id === selectedStyle)?.prompt ?? ''
      const res = await axios.post<{ imageUrl: string; imageData?: string; engine?: string; model?: string }>('/api/generate', {
        prompt: prompt.trim(),
        style,
        engine,
        quality,
      })
      const { imageUrl, imageData, engine: resEngine, model: resModel } = res.data
      setPreviewUrl(imageUrl)
      onImageGenerated(imageUrl, imageData ?? imageUrl, resEngine, resModel, prompt.trim())
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err)
          ? (err.response?.data as { error?: string })?.error ?? err.message
          : String(err)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const selectedEngineInfo = ENGINE_OPTIONS.find((e) => e.id === engine)

  return (
    <div className="glass-card p-6 space-y-5">
      <h2 className="text-lg font-semibold text-violet-300">🤖 AI 图像生成</h2>

      {/* Prompt */}
      <div>
        <label className="block text-sm text-gray-400 mb-1">创意描述</label>
        <textarea
          className="input-dark resize-none"
          rows={3}
          placeholder="一只穿着太空服的猫在月球上喝咖啡，背景是地球..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
      </div>

      {/* Style selector */}
      <div>
        <label className="block text-sm text-gray-400 mb-2">艺术风格</label>
        <div className="grid grid-cols-5 gap-1.5">
          {STYLE_OPTIONS.map((style) => (
            <button
              key={style.id}
              onClick={() => setSelectedStyle(style.id)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all duration-150 text-xs ${
                selectedStyle === style.id
                  ? 'border-violet-500 bg-violet-600/20 text-violet-300'
                  : 'border-gray-700 hover:border-gray-600 text-gray-400 hover:text-white'
              }`}
            >
              <span className="text-lg">{style.icon}</span>
              <span className="leading-tight text-center">{style.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Engine selector */}
      <div>
        <label className="block text-sm text-gray-400 mb-2">AI 引擎</label>
        <div className="grid grid-cols-1 gap-1.5">
          {ENGINE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setEngine(opt.id)}
              className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-all duration-150 text-sm ${
                engine === opt.id
                  ? 'border-violet-500 bg-violet-600/20 text-violet-300'
                  : 'border-gray-700 hover:border-gray-600 text-gray-400 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2">
                <span>{opt.icon}</span>
                <span className="font-medium">{opt.label}</span>
              </span>
              <span className="flex items-center gap-2 text-xs text-gray-500">
                <span>速度: {opt.speed}</span>
                <span>·</span>
                <span>{opt.note}</span>
              </span>
            </button>
          ))}
        </div>
        {selectedEngineInfo && (
          <p className="mt-1.5 text-xs text-gray-500">
            当前质量等级: <span className="text-violet-400">{selectedEngineInfo.quality}</span>
          </p>
        )}
      </div>

      {/* Quality selector */}
      <div>
        <label className="block text-sm text-gray-400 mb-2">图像质量</label>
        <div className="flex rounded-lg overflow-hidden border border-gray-700">
          {QUALITY_OPTIONS.map((q) => (
            <button
              key={q.id}
              onClick={() => setQuality(q.id)}
              title={q.description}
              className={`flex-1 py-2 text-sm font-medium transition-all duration-150 ${
                quality === q.id
                  ? 'bg-violet-600 text-white'
                  : 'bg-transparent text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {q.label}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-gray-500">
          {QUALITY_OPTIONS.find((q) => q.id === quality)?.description}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg p-3 text-sm">
          ❌ {error}
        </div>
      )}

      {/* Generate button */}
      <button
        className="btn-primary w-full py-3 text-base"
        onClick={handleGenerate}
        disabled={loading || !prompt.trim()}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            生成中...
          </span>
        ) : (
          '✨ 生成图像'
        )}
      </button>

      {/* Preview */}
      {previewUrl && (
        <div className="mt-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Generated preview"
            className="w-full rounded-lg object-cover max-h-72"
          />
        </div>
      )}
    </div>
  )
}
