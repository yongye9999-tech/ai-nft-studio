'use client'

import { useState } from 'react'
import Link from 'next/link'
import AIGenerator from '@/components/AIGenerator'
import MintButton from '@/components/MintButton'
import { uploadImage, uploadMetadata } from '@/lib/ipfs'

type LicenseOption = 'CC0' | 'CC BY 4.0' | 'All Rights Reserved'

const LICENSE_OPTIONS: { value: LicenseOption; label: string; description: string }[] = [
  {
    value: 'CC0',
    label: 'CC0（公共领域）',
    description: '完全放弃版权，任何人可自由使用',
  },
  {
    value: 'CC BY 4.0',
    label: 'CC BY 4.0（署名）',
    description: '允许他人使用，但须注明原作者',
  },
  {
    value: 'All Rights Reserved',
    label: '版权保留',
    description: '所有权利归作者所有',
  },
]

interface MintFormData {
  name: string
  description: string
  royalty: number
  license: LicenseOption
}

interface GeneratedImageInfo {
  url: string
  data: string
  engine?: string
  model?: string
  prompt?: string
}

export default function CreatePage() {
  const [generatedImage, setGeneratedImage] = useState<GeneratedImageInfo | null>(null)
  const [metadataUri, setMetadataUri] = useState<string | null>(null)
  const [mintForm, setMintForm] = useState<MintFormData>({
    name: '',
    description: '',
    royalty: 500,
    license: 'All Rights Reserved',
  })
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [mintSuccess, setMintSuccess] = useState<string | null>(null)

  const handleImageGenerated = (url: string, data: string, engine?: string, model?: string, prompt?: string) => {
    setGeneratedImage({ url, data, engine, model, prompt })
    setMetadataUri(null)
    setMintSuccess(null)
    setUploadError(null)
  }

  const handleUploadToIPFS = async () => {
    if (!generatedImage) return
    setUploading(true)
    setUploadError(null)
    try {
      const imageUri = await uploadImage(generatedImage.data)
      const metadata = {
        name: mintForm.name || 'AI Generated NFT',
        description: mintForm.description || 'Created with AI+NFT Studio',
        image: imageUri,
        attributes: [
          { trait_type: 'Creator', value: 'AI+NFT Studio' },
          { trait_type: 'Royalty', value: `${mintForm.royalty / 100}%` },
          { trait_type: 'License', value: mintForm.license },
        ],
        license: mintForm.license,
        ...(generatedImage.engine ? { ai_engine: generatedImage.engine } : {}),
        ...(generatedImage.model ? { ai_model: generatedImage.model } : {}),
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
                src={generatedImage.url}
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

            {/* License selector */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">版权协议</label>
              <div className="space-y-2">
                {LICENSE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      mintForm.license === opt.value
                        ? 'border-violet-500 bg-violet-600/10'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="license"
                      value={opt.value}
                      checked={mintForm.license === opt.value}
                      onChange={() => setMintForm({ ...mintForm, license: opt.value })}
                      className="mt-0.5 accent-violet-500"
                    />
                    <div>
                      <div className="text-sm font-medium text-white">{opt.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{opt.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Terms acceptance */}
            <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 accent-violet-500"
                />
                <span className="text-xs text-gray-400 leading-relaxed">
                  我已阅读并同意{' '}
                  <Link href="/terms" className="text-violet-400 hover:text-violet-300 underline" target="_blank">
                    服务条款
                  </Link>{' '}
                  和{' '}
                  <Link href="/privacy" className="text-violet-400 hover:text-violet-300 underline" target="_blank">
                    隐私政策
                  </Link>
                  。我了解 AI 生成内容的版权归属存在不确定性，并承担相关法律责任。
                </span>
              </label>
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
                disabled={!generatedImage || uploading || !termsAccepted}
              >
                {uploading ? '上传中...' : '📦 上传至 IPFS 并准备铸造'}
              </button>
            )}

            {!termsAccepted && generatedImage && !metadataUri && (
              <p className="text-xs text-yellow-500 text-center">请先同意服务条款才能继续</p>
            )}

            {mintSuccess && (
              <div className="bg-violet-900/30 border border-violet-700 text-violet-300 rounded-lg p-3 text-sm break-all space-y-2">
                <div>🎉 铸造成功！Tx: <span className="font-mono">{mintSuccess}</span></div>
                <div className="text-xs text-gray-400 bg-violet-900/20 rounded p-2">
                  🎯 <span className="text-violet-300">里程碑提示：</span>累计铸造 10 / 50 / 100 个 NFT 可在
                  <a href="/profile" className="text-violet-400 underline mx-1">个人中心 → 我的激励</a>
                  领取 ETH 里程碑奖励！
                </div>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`我刚在 AI+NFT Studio 上铸造了一件 AI 生成 NFT！🎨✨ ${mintForm.name || 'AI Generated NFT'} #NFT #AIArt #Web3`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs bg-blue-600/20 border border-blue-500/50 rounded px-2 py-1 text-blue-300 hover:bg-blue-600/30 transition-colors"
                >
                  🐦 分享到 Twitter/X
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
