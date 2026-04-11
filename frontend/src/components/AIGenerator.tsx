'use client'

import { useState } from 'react'
import axios from 'axios'

type AIEngine = 'huggingface' | 'openai'

interface Style {
  id: string
  label: string
  icon: string
  prompt: string
}

const STYLES: Style[] = [
  { id: 'cyberpunk', label: '赛博朋克', icon: '🌆', prompt: 'cyberpunk neon city, futuristic' },
  { id: 'watercolor', label: '水彩', icon: '🎨', prompt: 'watercolor painting, soft colors, artistic' },
  { id: 'oilpaint', label: '油画', icon: '🖼️', prompt: 'oil painting, classic art, detailed brushwork' },
  { id: 'pixel', label: '像素艺术', icon: '👾', prompt: 'pixel art, 8-bit style, retro game' },
  { id: 'anime', label: '日本动漫', icon: '⛩️', prompt: 'anime style, Japanese animation, manga' },
  { id: '3d', label: '3D 渲染', icon: '💎', prompt: '3D render, photorealistic, octane render, 8K' },
]

interface AIGeneratorProps {
  onImageGenerated: (imageUrl: string, imageData: string) => void
}

export default function AIGenerator({ onImageGenerated }: AIGeneratorProps) {
  const [prompt, setPrompt] = useState('')
  const [selectedStyle, setSelectedStyle] = useState<string>(STYLES[0].id)
  const [engine, setEngine] = useState<AIEngine>('huggingface')
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
      const style = STYLES.find((s) => s.id === selectedStyle)?.prompt ?? ''
      const res = await axios.post<{ imageUrl: string; imageData?: string }>('/api/generate', {
        prompt: prompt.trim(),
        style,
        engine,
      })
      const { imageUrl, imageData } = res.data
      setPreviewUrl(imageUrl)
      onImageGenerated(imageUrl, imageData ?? imageUrl)
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
        <div className="grid grid-cols-3 gap-2">
          {STYLES.map((style) => (
            <button
              key={style.id}
              onClick={() => setSelectedStyle(style.id)}
              className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all duration-150 text-sm ${
                selectedStyle === style.id
                  ? 'border-violet-500 bg-violet-600/20 text-violet-300'
                  : 'border-gray-700 hover:border-gray-600 text-gray-400 hover:text-white'
              }`}
            >
              <span className="text-xl">{style.icon}</span>
              <span>{style.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Engine toggle */}
      <div>
        <label className="block text-sm text-gray-400 mb-2">AI 引擎</label>
        <div className="flex rounded-lg overflow-hidden border border-gray-700">
          {(['huggingface', 'openai'] as AIEngine[]).map((e) => (
            <button
              key={e}
              onClick={() => setEngine(e)}
              className={`flex-1 py-2 text-sm font-medium transition-all duration-150 ${
                engine === e
                  ? 'bg-violet-600 text-white'
                  : 'bg-transparent text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {e === 'huggingface' ? '🤗 HuggingFace' : '🌐 OpenAI'}
            </button>
          ))}
        </div>
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
