'use client'

import { useState, useEffect } from 'react'
import NFTCard, { NFTItem } from '@/components/NFTCard'
import { useMarketplace } from '@/hooks/useContract'

type FilterTab = '全部' | '上架中' | '拍卖中'

// Mock data — replace with on-chain event indexing in production
const MOCK_NFTS: NFTItem[] = [
  {
    tokenId: '1',
    name: '赛博朋克都市 #001',
    image: 'https://ipfs.io/ipfs/QmTEST1',
    price: '0.5',
    seller: '0x1234...abcd',
    nftContract: '0xContract',
    isAuction: false,
    royaltyBps: 500,
  },
  {
    tokenId: '2',
    name: '水彩梦境 #042',
    image: 'https://ipfs.io/ipfs/QmTEST2',
    price: '0.8',
    seller: '0xabcd...5678',
    nftContract: '0xContract',
    isAuction: true,
    endTime: Math.floor(Date.now() / 1000) + 3600,
    royaltyBps: 300,
  },
  {
    tokenId: '3',
    name: '像素武士 #007',
    image: 'https://ipfs.io/ipfs/QmTEST3',
    price: '1.2',
    seller: '0x9999...1111',
    nftContract: '0xContract',
    isAuction: false,
    royaltyBps: 750,
  },
]

const TABS: FilterTab[] = ['全部', '上架中', '拍卖中']

export default function MarketplacePage() {
  const [activeTab, setActiveTab] = useState<FilterTab>('全部')
  const [nfts] = useState<NFTItem[]>(MOCK_NFTS)
  const [loading, setLoading] = useState(false)
  const { buyItem } = useMarketplace()

  useEffect(() => {
    // In production: fetch listings from contract events or an indexer
    setLoading(false)
  }, [])

  const filtered = nfts.filter((n) => {
    if (activeTab === '上架中') return !n.isAuction
    if (activeTab === '拍卖中') return n.isAuction
    return true
  })

  const handleBuy = async (nft: NFTItem) => {
    if (!buyItem) return
    try {
      await buyItem(nft.nftContract, nft.tokenId, nft.price)
    } catch (err) {
      console.error('Purchase failed:', err)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold gradient-text mb-2">🛒 NFT 交易市场</h1>
        <p className="text-gray-400">探索、购买和竞拍独一无二的 AI 生成数字艺术</p>
      </div>

      {/* Filter Tabs */}
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
        <div className="ml-auto text-sm text-gray-500 self-center">
          共 {filtered.length} 件
        </div>
      </div>

      {/* NFT Grid */}
      {loading ? (
        <div className="flex justify-center py-24">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 text-gray-500">
          <div className="text-5xl mb-4">🌌</div>
          <p>暂无 NFT</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filtered.map((nft) => (
            <NFTCard key={`${nft.nftContract}-${nft.tokenId}`} nft={nft} onBuy={handleBuy} />
          ))}
        </div>
      )}
    </div>
  )
}
