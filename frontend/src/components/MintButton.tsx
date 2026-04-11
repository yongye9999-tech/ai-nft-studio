'use client'

import { useState } from 'react'
import { useNFTCollection } from '@/hooks/useContract'
import { ethers } from 'ethers'

interface MintButtonProps {
  metadataUri: string
  royaltyBps?: number
  onSuccess?: (txHash: string) => void
}

export default function MintButton({ metadataUri, royaltyBps = 500, onSuccess }: MintButtonProps) {
  const { mint } = useNFTCollection()
  const [loading, setLoading] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const MINT_FEE = ethers.parseEther('0.01')

  const handleMint = async () => {
    if (!mint) {
      setError('请先连接钱包')
      return
    }
    setLoading(true)
    setError(null)
    setTxHash(null)
    try {
      const hash = await mint(metadataUri, MINT_FEE)
      setTxHash(hash)
      onSuccess?.(hash)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg.length > 120 ? msg.slice(0, 120) + '...' : msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-gray-400">
        <span>铸造费用</span>
        <span className="text-violet-300 font-semibold">0.01 ETH</span>
      </div>
      <div className="flex items-center justify-between text-sm text-gray-400">
        <span>版税</span>
        <span className="text-violet-300 font-semibold">{royaltyBps / 100}%</span>
      </div>

      <button
        className="btn-primary w-full py-3 text-base"
        onClick={handleMint}
        disabled={loading || !metadataUri}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            铸造中...
          </span>
        ) : (
          '🔨 铸造 NFT'
        )}
      </button>

      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg p-3 text-sm break-all">
          ❌ {error}
        </div>
      )}

      {txHash && (
        <div className="bg-green-900/30 border border-green-700 text-green-300 rounded-lg p-3 text-sm break-all">
          🎉 铸造成功！
          <br />
          <span className="font-mono">{txHash}</span>
        </div>
      )}
    </div>
  )
}
