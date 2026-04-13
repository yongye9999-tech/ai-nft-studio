'use client'

import { useState } from 'react'

type Period = '本月' | '上月' | '全部'

interface CreatorEntry {
  rank: number
  address: string
  name?: string
  totalMinted: number
  totalSales: string
  rewardEarned: string
  badge?: string
}

// Mock data — replace with on-chain event indexing in production
const MOCK_CREATORS: CreatorEntry[] = [
  { rank: 1, address: '0x1a2b...3c4d', name: 'PixelWizard', totalMinted: 87, totalSales: '12.4', rewardEarned: '0.05', badge: '🥇' },
  { rank: 2, address: '0xabcd...ef01', name: 'CyberArtist', totalMinted: 64, totalSales: '9.1', rewardEarned: '0.05', badge: '🥈' },
  { rank: 3, address: '0x5678...90ab', name: 'InkMaster', totalMinted: 52, totalSales: '7.3', rewardEarned: '0.02', badge: '🥉' },
  { rank: 4, address: '0xef01...2345', totalMinted: 41, totalSales: '5.8', rewardEarned: '0.02' },
  { rank: 5, address: '0x9999...1111', name: 'NeonDreamer', totalMinted: 38, totalSales: '4.2', rewardEarned: '0.02' },
  { rank: 6, address: '0xaaaa...bbbb', totalMinted: 24, totalSales: '3.5', rewardEarned: '0.005' },
  { rank: 7, address: '0xcccc...dddd', name: 'AquaForge', totalMinted: 18, totalSales: '2.1', rewardEarned: '0.005' },
  { rank: 8, address: '0xeeee...ffff', totalMinted: 15, totalSales: '1.7', rewardEarned: '0.005' },
  { rank: 9, address: '0x1111...2222', name: 'GlitchPainter', totalMinted: 12, totalSales: '1.2', rewardEarned: '0.005' },
  { rank: 10, address: '0x3333...4444', totalMinted: 10, totalSales: '0.9', rewardEarned: '0.005' },
]

const PERIODS: Period[] = ['本月', '上月', '全部']

export default function LeaderboardPage() {
  const [activePeriod, setActivePeriod] = useState<Period>('本月')

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold gradient-text mb-2">🏆 创作者排行榜</h1>
        <p className="text-gray-400">月度 Top 创作者，根据铸造数量与成交量综合排名，自动发放平台激励奖励</p>
      </div>

      {/* Period selector */}
      <div className="flex gap-2 mb-6">
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => setActivePeriod(p)}
            className={`px-5 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
              activePeriod === p
                ? 'bg-violet-600 text-white shadow-brand'
                : 'text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-800'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Rewards info */}
      <div className="glass-card p-4 mb-6 flex flex-wrap gap-6 text-sm">
        <div>
          <span className="text-gray-500">奖励池来源</span>
          <p className="text-white mt-0.5">平台手续费的 30% 分配给 Top 10 创作者</p>
        </div>
        <div>
          <span className="text-gray-500">里程碑奖励</span>
          <p className="text-white mt-0.5">10 铸 → 0.005 ETH &nbsp;·&nbsp; 50 铸 → 0.02 ETH &nbsp;·&nbsp; 100 铸 → 0.05 ETH</p>
        </div>
      </div>

      {/* Leaderboard table */}
      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wide">
              <th className="text-left p-4 w-12">排名</th>
              <th className="text-left p-4">创作者</th>
              <th className="text-right p-4">铸造数</th>
              <th className="text-right p-4">总成交 (ETH)</th>
              <th className="text-right p-4">获得奖励</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_CREATORS.map((creator) => (
              <tr
                key={creator.rank}
                className={`border-b border-gray-800/50 hover:bg-white/5 transition-colors ${
                  creator.rank <= 3 ? 'bg-violet-900/10' : ''
                }`}
              >
                <td className="p-4 font-bold text-lg">
                  {creator.badge ?? `#${creator.rank}`}
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center text-xs font-bold">
                      {(creator.name ?? creator.address).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      {creator.name && (
                        <p className="font-medium text-white">{creator.name}</p>
                      )}
                      <p className={`font-mono text-xs ${creator.name ? 'text-gray-500' : 'text-gray-300'}`}>
                        {creator.address}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-right">
                  <span className="text-white font-semibold">{creator.totalMinted}</span>
                  {creator.totalMinted >= 100 && <span className="ml-1 text-yellow-400 text-xs">★</span>}
                  {creator.totalMinted >= 50 && creator.totalMinted < 100 && <span className="ml-1 text-gray-400 text-xs">◆</span>}
                  {creator.totalMinted >= 10 && creator.totalMinted < 50 && <span className="ml-1 text-gray-600 text-xs">●</span>}
                </td>
                <td className="p-4 text-right text-violet-300 font-semibold">
                  {creator.totalSales} ETH
                </td>
                <td className="p-4 text-right">
                  <span className="text-green-400 font-semibold">{creator.rewardEarned} ETH</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-600">
        <span>★ 已达 100 铸里程碑</span>
        <span>◆ 已达 50 铸里程碑</span>
        <span>● 已达 10 铸里程碑</span>
        <span className="ml-auto text-gray-700">* 数据每 24 小时更新一次</span>
      </div>
    </div>
  )
}
