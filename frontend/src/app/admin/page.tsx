'use client'

import { useEffect, useState } from 'react'
import { useWeb3Context, CHAIN_CONFIGS } from '@/components/Web3Provider'
import { getContractAddresses, AINFT_COLLECTION_ABI, NFT_MARKETPLACE_ABI } from '@/lib/contracts'
import { ethers } from 'ethers'

interface PlatformStats {
  totalMinted: number
  accumulatedFees: string
  rewardsPoolBalance: string
  opsFundBalance: string
  mintFee: string
  maxSupply: number
  collectionPaused: boolean
  marketplacePaused: boolean
  contractOwner: string
  platformFee: number
  feeRateLow: number
  feeRateHigh: number
  pendingPlatformFee: number
  platformFeeChangeTime: number
}

export default function AdminPage() {
  const { signer, account, chainId } = useWeb3Context()
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [proposedFee, setProposedFee] = useState('')

  const addresses = chainId ? getContractAddresses(chainId) : null

  useEffect(() => {
    if (!signer || !addresses?.AINFTCollection || !addresses?.NFTMarketplace) {
      setLoading(false)
      return
    }

    const loadStats = async () => {
      setLoading(true)
      setError(null)
      try {
        const collection = new ethers.Contract(
          addresses.AINFTCollection,
          AINFT_COLLECTION_ABI,
          signer
        )
        const marketplace = new ethers.Contract(
          addresses.NFTMarketplace,
          NFT_MARKETPLACE_ABI,
          signer
        )

        const [
          tokenCounter,
          mintFee,
          maxSupply,
          collectionOwner,
          collectionPaused,
          accumulatedFees,
          rewardsPoolBalance,
          opsFundBalance,
          marketplacePaused,
          marketplaceOwner,
          platformFee,
          feeRateLow,
          feeRateHigh,
          pendingPlatformFee,
          platformFeeChangeTime,
        ] = await Promise.all([
          collection.tokenCounter(),
          collection.mintFee(),
          collection.maxSupply(),
          collection.owner(),
          collection.paused(),
          marketplace.accumulatedFees(),
          marketplace.rewardsPoolBalance(),
          marketplace.opsFundBalance(),
          marketplace.paused(),
          marketplace.owner(),
          marketplace.platformFee(),
          marketplace.feeRateLow(),
          marketplace.feeRateHigh(),
          marketplace.pendingPlatformFee(),
          marketplace.platformFeeChangeTime(),
        ])

        const ownerAddr: string = collectionOwner
        setIsOwner(ownerAddr.toLowerCase() === account?.toLowerCase())

        setStats({
          totalMinted: Number(tokenCounter),
          accumulatedFees: ethers.formatEther(accumulatedFees),
          rewardsPoolBalance: ethers.formatEther(rewardsPoolBalance),
          opsFundBalance: ethers.formatEther(opsFundBalance),
          mintFee: ethers.formatEther(mintFee),
          maxSupply: Number(maxSupply),
          collectionPaused: Boolean(collectionPaused),
          marketplacePaused: Boolean(marketplacePaused),
          contractOwner: marketplaceOwner,
          platformFee: Number(platformFee),
          feeRateLow: Number(feeRateLow),
          feeRateHigh: Number(feeRateHigh),
          pendingPlatformFee: Number(pendingPlatformFee),
          platformFeeChangeTime: Number(platformFeeChangeTime),
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载数据失败')
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [signer, account, addresses])

  const execAction = async (
    label: string,
    action: () => Promise<ethers.ContractTransactionResponse>
  ) => {
    setActionLoading(label)
    setError(null)
    try {
      const tx = await action()
      await tx.wait()
      // Refresh stats
      setStats(null)
      setLoading(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败')
    } finally {
      setActionLoading(null)
    }
  }

  const getCollection = () =>
    addresses?.AINFTCollection && signer
      ? new ethers.Contract(addresses.AINFTCollection, AINFT_COLLECTION_ABI, signer)
      : null

  const getMarketplace = () =>
    addresses?.NFTMarketplace && signer
      ? new ethers.Contract(addresses.NFTMarketplace, NFT_MARKETPLACE_ABI, signer)
      : null

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-6xl">⚙️</div>
        <h2 className="text-2xl font-bold text-gray-300">请先连接钱包</h2>
        <p className="text-gray-500">连接合约 Owner 钱包以访问运营后台</p>
      </div>
    )
  }

  if (!addresses?.AINFTCollection) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4">🔗</div>
        <h2 className="text-2xl font-bold text-gray-300 mb-3">未检测到合约地址</h2>
        <p className="text-gray-500">
          当前网络（Chain ID: {chainId}）未配置合约地址。请先部署合约并配置环境变量。
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold gradient-text mb-2">⚙️ 运营后台</h1>
      <p className="text-gray-400 mb-8">
        仅合约 Owner 可执行管理操作。当前网络: Chain {chainId}
      </p>

      {error && (
        <div className="mb-6 bg-red-900/30 border border-red-700 text-red-300 rounded-lg p-3 text-sm">
          ❌ {error}
        </div>
      )}

      {!isOwner && !loading && (
        <div className="mb-6 bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4 text-yellow-300 text-sm">
          ⚠️ 当前地址不是合约 Owner，无法执行管理操作（只读模式）
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : stats ? (
        <div className="space-y-6">
          {/* ── Stats Overview ────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: '已铸造 NFT', value: stats.totalMinted, suffix: `/ ${stats.maxSupply}` },
              { label: '累计平台费', value: stats.accumulatedFees, suffix: 'ETH' },
              { label: '铸造费用', value: stats.mintFee, suffix: 'ETH' },
              {
                label: '剩余供应量',
                value: stats.maxSupply - stats.totalMinted,
                suffix: '',
              },
            ].map((stat) => (
              <div key={stat.label} className="glass-card p-4">
                <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-white">
                  {stat.value}{' '}
                  <span className="text-sm font-normal text-gray-400">{stat.suffix}</span>
                </p>
              </div>
            ))}
          </div>

          {/* ── Fee Split Overview ────────────────────────────────────────── */}
          <div className="glass-card p-5">
            <h2 className="font-semibold text-violet-300 mb-4">💸 手续费拆分（当前累计）</h2>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-1">协议金库 (60%)</p>
                <p className="text-lg font-bold text-white">
                  {(parseFloat(stats.accumulatedFees) * 0.6).toFixed(6)} ETH
                </p>
              </div>
              <div className="text-center border-x border-gray-700">
                <p className="text-xs text-gray-500 mb-1">创作者奖励池 (30%)</p>
                <p className="text-lg font-bold text-green-400">{stats.rewardsPoolBalance} ETH</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-1">运营基金 (10%)</p>
                <p className="text-lg font-bold text-blue-400">{stats.opsFundBalance} ETH</p>
              </div>
            </div>
          </div>

          {/* ── Tiered Fee Display ────────────────────────────────────────── */}
          <div className="glass-card p-5">
            <h2 className="font-semibold text-violet-300 mb-4">📊 动态手续费档位</h2>
            <div className="grid grid-cols-3 gap-3 text-sm mb-4">
              <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">小额 (&lt;0.1 ETH)</p>
                <p className="text-xl font-bold text-orange-400">{(stats.feeRateLow / 100).toFixed(1)}%</p>
              </div>
              <div className="bg-violet-900/30 rounded-lg p-3 text-center border border-violet-700/30">
                <p className="text-xs text-gray-500 mb-1">中额 (0.1–1 ETH)</p>
                <p className="text-xl font-bold text-violet-300">{(stats.platformFee / 100).toFixed(1)}%</p>
                <p className="text-xs text-gray-600 mt-0.5">当前基础费率</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">大额 (&gt;1 ETH)</p>
                <p className="text-xl font-bold text-green-400">{(stats.feeRateHigh / 100).toFixed(1)}%</p>
              </div>
            </div>

            {/* Fee timelock panel */}
            {isOwner && (
              <div className="border-t border-gray-700 pt-4">
                <p className="text-xs text-gray-500 mb-3">调整基础费率（中额档，48 小时 Timelock）</p>
                {stats.pendingPlatformFee > 0 && (
                  <div className="mb-3 bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-3 text-xs text-yellow-300">
                    待生效费率: {(stats.pendingPlatformFee / 100).toFixed(2)}%
                    {stats.platformFeeChangeTime > 0 && (
                      <span className="ml-2">
                        · 可执行时间: {new Date(stats.platformFeeChangeTime * 1000).toLocaleString()}
                      </span>
                    )}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={0}
                    max={500}
                    placeholder="新费率 (bps, 如 250 = 2.5%)"
                    value={proposedFee}
                    onChange={(e) => setProposedFee(e.target.value)}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500"
                  />
                  <button
                    onClick={() =>
                      execAction('propose-fee', async () => {
                        const m = getMarketplace()!
                        return m.proposePlatformFee(Number(proposedFee))
                      })
                    }
                    disabled={actionLoading !== null || !proposedFee}
                    className="text-sm px-3 py-1.5 rounded-lg border border-yellow-600 text-yellow-400 hover:bg-yellow-900/20 transition-colors disabled:opacity-50"
                  >
                    {actionLoading === 'propose-fee' ? '提交中...' : '⏱ 提案'}
                  </button>
                  <button
                    onClick={() =>
                      execAction('execute-fee', async () => {
                        const m = getMarketplace()!
                        return m.executePlatformFee()
                      })
                    }
                    disabled={actionLoading !== null || stats.pendingPlatformFee === 0}
                    className="text-sm px-3 py-1.5 rounded-lg border border-green-600 text-green-400 hover:bg-green-900/20 transition-colors disabled:opacity-50"
                  >
                    {actionLoading === 'execute-fee' ? '执行中...' : '✅ 执行'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Contract Status ───────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* AINFTCollection */}
            <div className="glass-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-violet-300">🎨 NFT Collection</h2>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    stats.collectionPaused
                      ? 'bg-red-900/50 text-red-300'
                      : 'bg-green-900/50 text-green-300'
                  }`}
                >
                  {stats.collectionPaused ? '⏸ 已暂停' : '▶ 运行中'}
                </span>
              </div>
              <p className="text-xs text-gray-500 font-mono truncate">{addresses.AINFTCollection}</p>
              {isOwner && (
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      execAction('pause-collection', async () => {
                        const c = getCollection()!
                        return stats.collectionPaused ? c.unpause() : c.pause()
                      })
                    }
                    disabled={actionLoading !== null}
                    className={`flex-1 text-sm py-1.5 rounded-lg border transition-colors ${
                      stats.collectionPaused
                        ? 'border-green-600 text-green-400 hover:bg-green-900/20'
                        : 'border-red-600 text-red-400 hover:bg-red-900/20'
                    }`}
                  >
                    {actionLoading === 'pause-collection'
                      ? '处理中...'
                      : stats.collectionPaused
                      ? '▶ 恢复铸造'
                      : '⏸ 暂停铸造'}
                  </button>
                  <button
                    onClick={() =>
                      execAction('withdraw-collection', async () => {
                        const c = getCollection()!
                        return c.withdraw()
                      })
                    }
                    disabled={actionLoading !== null}
                    className="flex-1 text-sm py-1.5 rounded-lg border border-violet-600 text-violet-400 hover:bg-violet-900/20 transition-colors"
                  >
                    {actionLoading === 'withdraw-collection' ? '处理中...' : '💰 提取费用'}
                  </button>
                </div>
              )}
            </div>

            {/* NFTMarketplace */}
            <div className="glass-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-violet-300">🛒 Marketplace</h2>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    stats.marketplacePaused
                      ? 'bg-red-900/50 text-red-300'
                      : 'bg-green-900/50 text-green-300'
                  }`}
                >
                  {stats.marketplacePaused ? '⏸ 已暂停' : '▶ 运行中'}
                </span>
              </div>
              <p className="text-xs text-gray-500 font-mono truncate">{addresses.NFTMarketplace}</p>
              {isOwner && (
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      execAction('pause-marketplace', async () => {
                        const m = getMarketplace()!
                        return stats.marketplacePaused ? m.unpause() : m.pause()
                      })
                    }
                    disabled={actionLoading !== null}
                    className={`flex-1 text-sm py-1.5 rounded-lg border transition-colors ${
                      stats.marketplacePaused
                        ? 'border-green-600 text-green-400 hover:bg-green-900/20'
                        : 'border-red-600 text-red-400 hover:bg-red-900/20'
                    }`}
                  >
                    {actionLoading === 'pause-marketplace'
                      ? '处理中...'
                      : stats.marketplacePaused
                      ? '▶ 恢复市场'
                      : '⏸ 暂停市场'}
                  </button>
                  <button
                    onClick={() =>
                      execAction('withdraw-marketplace', async () => {
                        const m = getMarketplace()!
                        return m.withdrawFees()
                      })
                    }
                    disabled={actionLoading !== null}
                    className="flex-1 text-sm py-1.5 rounded-lg border border-violet-600 text-violet-400 hover:bg-violet-900/20 transition-colors"
                  >
                    {actionLoading === 'withdraw-marketplace' ? '处理中...' : '💰 提取手续费'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── Links ──────────────────────────────────────────────────────── */}
          <div className="glass-card p-5">
            <h2 className="font-semibold text-violet-300 mb-3">🔗 合约浏览器链接</h2>
            <div className="flex flex-wrap gap-3">
              {(() => {
                const explorerBase =
                  chainId && CHAIN_CONFIGS[chainId]?.blockExplorerUrls?.[0]
                    ? CHAIN_CONFIGS[chainId].blockExplorerUrls[0]
                    : 'https://etherscan.io'
                return (
                  <>
                    <a
                      href={`${explorerBase}/address/${addresses.AINFTCollection}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:underline"
                    >
                      Collection on Explorer ↗
                    </a>
                    <a
                      href={`${explorerBase}/address/${addresses.NFTMarketplace}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:underline"
                    >
                      Marketplace on Explorer ↗
                    </a>
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
