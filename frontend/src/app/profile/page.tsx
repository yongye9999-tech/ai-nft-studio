'use client'

import { useState } from 'react'
import NFTCard, { NFTItem } from '@/components/NFTCard'
import { useWeb3 } from '@/hooks/useContract'

type ProfileTab = '我的收藏' | '我的创作'

const TABS: ProfileTab[] = ['我的收藏', '我的创作']

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

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export default function ProfilePage() {
  const { account } = useWeb3()
  const [activeTab, setActiveTab] = useState<ProfileTab>('我的收藏')

  const items = activeTab === '我的收藏' ? MOCK_COLLECTED : MOCK_CREATED

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
          </button>
        ))}
      </div>

      {/* NFT Grid */}
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
    </div>
  )
}
