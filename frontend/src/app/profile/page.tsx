'use client'

import { useEffect, useState } from 'react'
import NFTCard, { NFTItem } from '@/components/NFTCard'
import { useWeb3 } from '@/hooks/useContract'
import { useWeb3Context } from '@/components/Web3Provider'
import { getContractAddresses, AINFT_COLLECTION_ABI } from '@/lib/contracts'
import { ethers } from 'ethers'

type ProfileTab = '我的收藏' | '我的创作' | '我的激励'

const TABS: ProfileTab[] = ['我的收藏', '我的创作', '我的激励']

// Mock data — replace with on-chain query in production
const MOCK_COLLECTED: NFTItem[] = [
  {
    tokenId: '5',
    name: '3D 星系 #099',
    image: 'https://ipfs.io/ipfs/QmCOLL1',
    price: '1.0',
    seller: '0xYou',
    nftContract: '0xContract',
    isAuction: false,
    royaltyBps: 500,
  },
]

const MOCK_CREATED: NFTItem[] = [
  {
    tokenId: '3',
    name: '油画海浪 #011',
    image: 'https://ipfs.io/ipfs/QmCREATE1',
    price: '0.7',
    seller: '0xYou',
    nftContract: '0xContract',
    isAuction: false,
    royaltyBps: 700,
  },
]

interface MilestoneInfo {
  mintCount: number
  claimed: number // bitmask
  reward1: string
  reward2: string
  reward3: string
}

function MilestoneBar({ count, threshold, label }: { count: number; threshold: number; label: string }) {
  const progress = Math.min((count / threshold) * 100, 100)
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-400">
        <span>{label}</span>
        <span>{Math.min(count, threshold)} / {threshold}</span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-violet-600 to-blue-500 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export default function ProfilePage() {
  const { account } = useWeb3()
  const { signer, chainId } = useWeb3Context()
  const [activeTab, setActiveTab] = useState<ProfileTab>('我的收藏')
  const [milestone, setMilestone] = useState<MilestoneInfo | null>(null)
  const [milestoneLoading, setMilestoneLoading] = useState(false)
  const [claimLoading, setClaimLoading] = useState(false)
  const [claimError, setClaimError] = useState<string | null>(null)
  const [claimSuccess, setClaimSuccess] = useState(false)

  const addresses = chainId ? getContractAddresses(chainId) : null

  useEffect(() => {
    if (!signer || !addresses?.AINFTCollection || !account) return

    const load = async () => {
      setMilestoneLoading(true)
      try {
        const collection = new ethers.Contract(addresses.AINFTCollection, AINFT_COLLECTION_ABI, signer)
        const [mintCount, claimed, r1, r2, r3] = await Promise.all([
          collection.creatorMintCount(account),
          collection.milestonesClaimed(account),
          collection.milestoneReward1(),
          collection.milestoneReward2(),
          collection.milestoneReward3(),
        ])
        setMilestone({
          mintCount: Number(mintCount),
          claimed: Number(claimed),
          reward1: ethers.formatEther(r1),
          reward2: ethers.formatEther(r2),
          reward3: ethers.formatEther(r3),
        })
      } catch {
        // Contract may not be deployed on this chain
      } finally {
        setMilestoneLoading(false)
      }
    }
    load()
  }, [signer, account, addresses])

  const handleClaimReward = async () => {
    if (!signer || !addresses?.AINFTCollection) return
    setClaimLoading(true)
    setClaimError(null)
    setClaimSuccess(false)
    try {
      const collection = new ethers.Contract(addresses.AINFTCollection, AINFT_COLLECTION_ABI, signer)
      const tx = await collection.claimMilestoneReward()
      await tx.wait()
      setClaimSuccess(true)
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : '领取失败')
    } finally {
      setClaimLoading(false)
    }
  }

  const items = activeTab === '我的收藏' ? MOCK_COLLECTED : activeTab === '我的创作' ? MOCK_CREATED : []

  const milestoneThresholds = [10, 50, 100]
  const milestoneRewards = milestone ? [milestone.reward1, milestone.reward2, milestone.reward3] : ['0.005', '0.02', '0.05']
  const mintCount = milestone?.mintCount ?? 0
  const hasPendingReward = milestone
    ? (mintCount >= 10 && (milestone.claimed & 1) === 0) ||
      (mintCount >= 50 && (milestone.claimed & 2) === 0) ||
      (mintCount >= 100 && (milestone.claimed & 4) === 0)
    : false

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-6xl">👤</div>
        <h2 className="text-2xl font-bold text-gray-300">请先连接钱包</h2>
        <p className="text-gray-500">连接钱包后查看你的 NFT 收藏和创作</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Profile header */}
      <div className="glass-card p-8 mb-8 flex flex-col sm:flex-row items-center gap-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center text-3xl">
          🎨
        </div>
        <div className="text-center sm:text-left">
          <h1 className="text-2xl font-bold text-white mb-1">我的空间</h1>
          <p className="text-violet-400 font-mono text-sm">{truncateAddress(account)}</p>
          <p className="text-gray-500 text-sm mt-1">
            收藏: {MOCK_COLLECTED.length} &nbsp;·&nbsp; 创作: {MOCK_CREATED.length}
            {milestone && <span> &nbsp;·&nbsp; 累计铸造: {milestone.mintCount}</span>}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 border-b border-gray-800 pb-4">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg font-medium transition-all duration-200 text-sm ${
              activeTab === tab
                ? 'bg-violet-600 text-white shadow-brand'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {tab}
            {tab === '我的激励' && hasPendingReward && (
              <span className="ml-1.5 inline-block w-2 h-2 rounded-full bg-green-400" />
            )}
          </button>
        ))}
      </div>

      {/* Incentives Panel */}
      {activeTab === '我的激励' && (
        <div className="space-y-6">
          {milestoneLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Milestone progress */}
              <div className="glass-card p-6">
                <h2 className="font-semibold text-violet-300 mb-5">🎯 创作里程碑</h2>
                <div className="space-y-4">
                  {milestoneThresholds.map((threshold, i) => {
                    const isClaimed = milestone ? (milestone.claimed & (1 << i)) !== 0 : false
                    const isReached = mintCount >= threshold
                    return (
                      <div key={threshold} className="flex items-center gap-4">
                        <div className="flex-1">
                          <MilestoneBar
                            count={mintCount}
                            threshold={threshold}
                            label={`里程碑 ${i + 1}：铸造 ${threshold} 个 NFT`}
                          />
                        </div>
                        <div className="text-right min-w-24">
                          {isClaimed ? (
                            <span className="text-xs text-gray-500">✅ 已领取</span>
                          ) : isReached ? (
                            <span className="text-xs text-green-400 font-semibold">🎁 可领取 {milestoneRewards[i]} ETH</span>
                          ) : (
                            <span className="text-xs text-gray-600">{milestoneRewards[i]} ETH</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {hasPendingReward && (
                  <div className="mt-6">
                    {claimError && (
                      <div className="mb-3 text-xs text-red-400 bg-red-900/20 border border-red-700/50 rounded p-2">
                        ❌ {claimError}
                      </div>
                    )}
                    {claimSuccess && (
                      <div className="mb-3 text-xs text-green-400 bg-green-900/20 border border-green-700/50 rounded p-2">
                        🎉 里程碑奖励已成功领取！
                      </div>
                    )}
                    <button
                      onClick={handleClaimReward}
                      disabled={claimLoading}
                      className="btn-primary w-full py-2.5"
                    >
                      {claimLoading ? '领取中...' : '🏆 领取里程碑奖励'}
                    </button>
                  </div>
                )}
              </div>

              {/* Tips */}
              <div className="glass-card p-5 text-sm text-gray-400 space-y-2">
                <p className="text-violet-300 font-medium mb-2">💡 如何获得更多激励</p>
                <p>• 每月活跃创作者可获得平台手续费的 30% 分成（奖励池）</p>
                <p>• 达到铸造里程碑后在此页面领取 ETH 奖励</p>
                <p>• 联系管理员申请首次上架免手续费资格</p>
                <p>• 进入排行榜前 10 名可额外获得月度奖励分配</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* NFT Grid */}
      {activeTab !== '我的激励' && (
        <>
          {items.length === 0 ? (
            <div className="text-center py-24 text-gray-500">
              <div className="text-5xl mb-4">🌌</div>
              <p>暂无 NFT</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {items.map((nft) => (
                <NFTCard key={`${nft.nftContract}-${nft.tokenId}`} nft={nft} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
