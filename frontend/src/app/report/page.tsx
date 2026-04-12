'use client'

import { useState } from 'react'

type ReportCategory =
  | 'copyright'
  | 'nsfw'
  | 'violence'
  | 'spam'
  | 'other'

const CATEGORIES: { value: ReportCategory; label: string; icon: string }[] = [
  { value: 'copyright', label: '版权侵权（DMCA）', icon: '©️' },
  { value: 'nsfw', label: '色情/不雅内容', icon: '🔞' },
  { value: 'violence', label: '暴力/仇恨内容', icon: '⚠️' },
  { value: 'spam', label: '垃圾/欺诈内容', icon: '🚫' },
  { value: 'other', label: '其他违规', icon: '📋' },
]

interface ReportForm {
  nftContract: string
  tokenId: string
  category: ReportCategory
  description: string
  contactEmail: string
}

export default function ReportPage() {
  const [form, setForm] = useState<ReportForm>({
    nftContract: '',
    tokenId: '',
    category: 'copyright',
    description: '',
    contactEmail: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nftContract.trim() || !form.tokenId.trim() || !form.description.trim()) {
      setError('请填写所有必填字段')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      // In production: POST to /api/report to store in DB and notify admins
      await new Promise((res) => setTimeout(res, 800))
      setSubmitted(true)
    } catch {
      setError('提交失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-white mb-3">举报已提交</h1>
        <p className="text-gray-400 mb-6">
          感谢您的举报。我们的审核团队将在 48 小时内处理您的请求。
          如举报属实，相关 NFT 将被紧急下架。
        </p>
        <p className="text-gray-500 text-sm">
          举报编号：{`RPT-${Date.now().toString(36).toUpperCase()}`}
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold gradient-text mb-2">🚩 举报内容</h1>
      <p className="text-gray-400 mb-8">
        发现侵权或违规 NFT？请填写以下表单，我们会尽快审核处理。
        版权投诉须符合 DMCA 或适用法律的相关要求。
      </p>

      <form onSubmit={handleSubmit} className="glass-card p-6 space-y-5">
        {/* NFT info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              NFT 合约地址 <span className="text-red-400">*</span>
            </label>
            <input
              className="input-dark font-mono text-sm"
              placeholder="0x..."
              value={form.nftContract}
              onChange={(e) => setForm({ ...form, nftContract: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Token ID <span className="text-red-400">*</span>
            </label>
            <input
              className="input-dark"
              placeholder="1"
              type="number"
              min="1"
              value={form.tokenId}
              onChange={(e) => setForm({ ...form, tokenId: e.target.value })}
              required
            />
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">
            举报类型 <span className="text-red-400">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {CATEGORIES.map((cat) => (
              <label
                key={cat.value}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  form.category === cat.value
                    ? 'border-violet-500 bg-violet-600/10'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <input
                  type="radio"
                  name="category"
                  value={cat.value}
                  checked={form.category === cat.value}
                  onChange={() => setForm({ ...form, category: cat.value })}
                  className="accent-violet-500"
                />
                <span className="text-sm">
                  {cat.icon} {cat.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            详细说明 <span className="text-red-400">*</span>
          </label>
          <textarea
            className="input-dark resize-none"
            rows={5}
            placeholder={
              form.category === 'copyright'
                ? '请说明您是原始版权所有者，并描述侵权内容...'
                : '请详细描述违规情况...'
            }
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
          />
        </div>

        {/* Contact email */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">联系邮箱（可选）</label>
          <input
            className="input-dark"
            type="email"
            placeholder="your@email.com"
            value={form.contactEmail}
            onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
          />
          <p className="text-xs text-gray-600 mt-1">用于接收处理结果通知</p>
        </div>

        {form.category === 'copyright' && (
          <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3 text-xs text-blue-300">
            📜 版权举报提示：提交虚假 DMCA 举报可能承担法律责任。请确保您是版权持有人或其授权代理人。
          </div>
        )}

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg p-3 text-sm">
            ❌ {error}
          </div>
        )}

        <button
          type="submit"
          className="btn-primary w-full py-3"
          disabled={submitting}
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              提交中...
            </span>
          ) : (
            '🚩 提交举报'
          )}
        </button>
      </form>
    </div>
  )
}
