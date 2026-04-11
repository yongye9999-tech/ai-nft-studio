'use client'

import { useState } from 'react'
import AIGenerator from '@/components/AIGenerator'
import MintButton from '@/components/MintButton'
import { uploadImage, uploadMetadata } from '@/lib/ipfs'

interface MintFormData {
  name: string
  description: string
  royalty: number
}

export default function CreatePage() {
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [imageData, setImageData] = useState<string | null>(null)
  const [metadataUri, setMetadataUri] = useState<string | null>(null)
  const [mintForm, setMintForm] = useState<MintFormData>({
    name: '',
    description: '',
    royalty: 500, // 5% default
  })
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [mintSuccess, setMintSuccess] = useState<string | null>(null)

  const handleImageGenerated = (url: string, data: string) => {
    setGeneratedImage(url)
    setImageData(data)
    setMetadataUri(null)
    setMintSuccess(null)
    setUploadError(null)
  }

  const handleUploadToIPFS = async () => {
    if (!imageData) return
    setUploading(true)
    setUploadError(null)
    try {
      const imageUri = await uploadImage(imageData)
      const metadata = {
        name: mintForm.name || 'AI Generated NFT',
        description: mintForm.description || 'Created with AI+NFT Studio',
        image: imageUri,
        attributes: [
          { trait_type: 'Creator', value: 'AI+NFT Studio' },
          { trait_type: 'Royalty', value: `${mintForm.royalty / 100}%` },
        ],
      }
      const uri = await uploadMetadata(metadata)
      setMetadataUri(uri)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setUploadError(msg)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2 gradient-text">🎨 AI 创作工坊</h1>
      <p className="text-gray-400 mb-8">输入提示词，选择风格，生成专属 NFT 并上链</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ── Left: AI Generator ─────────────────────────────────────────── */}
        <div>
          <AIGenerator onImageGenerated={handleImageGenerated} />
        </div>

        {/* ── Right: Mint Form ───────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Preview */}
          <div className="glass-card p-4">
            <h2 className="text-lg font-semibold mb-3 text-violet-300">预览图</h2>
            {generatedImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={generatedImage}
                alt="Generated NFT preview"
                className="w-full rounded-lg object-cover max-h-80"
              />
            ) : (
              <div className="w-full h-64 rounded-lg bg-gray-800/50 flex items-center justify-center text-gray-600">
                <div className="text-center">
                  <div className="text-4xl mb-2">🖼️</div>
                  <div>生成图片后显示预览</div>
                </div>
              </div>
            )}
          </div>

          {/* Mint info form */}
          <div className="glass-card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-violet-300">NFT 信息</h2>

            <div>
              <label className="block text-sm text-gray-400 mb-1">名称</label>
              <input
                className="input-dark"
                placeholder="我的 AI 艺术品 #1"
                value={mintForm.name}
                onChange={(e) => setMintForm({ ...mintForm, name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">描述</label>
              <textarea
                className="input-dark resize-none"
                rows={3}
                placeholder="这是一件由 AI 生成的独特数字艺术品..."
                value={mintForm.description}
                onChange={(e) => setMintForm({ ...mintForm, description: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">
                版税比例: {mintForm.royalty / 100}%
              </label>
              <input
                type="range"
                min={0}
                max={1000}
                step={50}
                value={mintForm.royalty}
                onChange={(e) => setMintForm({ ...mintForm, royalty: Number(e.target.value) })}
                className="w-full accent-violet-500"
              />
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>0%</span>
                <span>10%</span>
              </div>
            </div>

            {uploadError && (
              <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg p-3 text-sm">
                ❌ {uploadError}
              </div>
            )}

            {metadataUri ? (
              <div className="space-y-3">
                <div className="bg-green-900/30 border border-green-700 text-green-300 rounded-lg p-3 text-sm break-all">
                  ✅ 元数据已上传: <span className="font-mono">{metadataUri}</span>
                </div>
                <MintButton
                  metadataUri={metadataUri}
                  royaltyBps={mintForm.royalty}
                  onSuccess={(txHash) => setMintSuccess(txHash)}
                />
              </div>
            ) : (
              <button
                className="btn-primary w-full py-3"
                onClick={handleUploadToIPFS}
                disabled={!generatedImage || uploading}
              >
                {uploading ? '上传中...' : '📦 上传至 IPFS 并准备铸造'}
              </button>
            )}

            {mintSuccess && (
              <div className="bg-violet-900/30 border border-violet-700 text-violet-300 rounded-lg p-3 text-sm break-all">
                🎉 铸造成功！Tx: <span className="font-mono">{mintSuccess}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
