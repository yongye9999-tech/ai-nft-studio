'use client'

import { useState } from 'react'

export interface NFTItem {
  tokenId: string
  name: string
  image: string
  price: string
  seller: string
  nftContract: string
  isAuction: boolean
  endTime?: number
  royaltyBps?: number
}

interface NFTCardProps {
  nft: NFTItem
  onBuy?: (nft: NFTItem) => Promise<void>
  onBid?: (nft: NFTItem) => Promise<void>
}

function formatAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function getRoyaltyLabel(bps?: number) {
  if (bps === undefined) return null
  return `版税 ${bps / 100}%`
}

function getTimeLeft(endTime?: number): string {
  if (!endTime) return ''
  const diff = endTime - Math.floor(Date.now() / 1000)
  if (diff <= 0) return '已结束'
  const h = Math.floor(diff / 3600)
  const m = Math.floor((diff % 3600) / 60)
  return `${h}h ${m}m`
}

export default function NFTCard({ nft, onBuy, onBid }: NFTCardProps) {
  const [loading, setLoading] = useState(false)

  const handleAction = async () => {
    setLoading(true)
    try {
      if (nft.isAuction && onBid) {
        await onBid(nft)
      } else if (!nft.isAuction && onBuy) {
        await onBuy(nft)
      }
    } finally {
      setLoading(false)
    }
  }

  const royaltyLabel = getRoyaltyLabel(nft.royaltyBps)
  const timeLeft = getTimeLeft(nft.endTime)

  return (
    <div className="glass-card nft-card overflow-hidden flex flex-col">
      {/* Image */}
      <div className="relative w-full aspect-square overflow-hidden bg-gray-800/50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={nft.image}
          alt={nft.name}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.src =
              'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiMxYTFhMmUiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZmlsbD0iIzZiNzI4MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iIGZvbnQtc2l6ZT0iNDAiPvCfjq88L3RleHQ+PC9zdmc+'
          }}
        />
        {/* Auction badge */}
        {nft.isAuction && (
          <div className="absolute top-2 left-2 bg-pink-600/90 text-white text-xs font-medium px-2 py-0.5 rounded-full">
            拍卖中 {timeLeft && `· ${timeLeft}`}
          </div>
        )}
        {/* Royalty badge */}
        {royaltyLabel && (
          <div className="absolute top-2 right-2 bg-violet-600/80 text-white text-xs font-medium px-2 py-0.5 rounded-full">
            {royaltyLabel}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-white truncate mb-1">{nft.name}</h3>
        <p className="text-xs text-gray-500 mb-3">卖家: {formatAddress(nft.seller)}</p>

        <div className="flex items-center justify-between mt-auto">
          <div>
            <div className="text-xs text-gray-500">{nft.isAuction ? '当前出价' : '售价'}</div>
            <div className="text-lg font-bold text-violet-300">{nft.price} ETH</div>
          </div>

          {(onBuy || onBid) && (
            <button
              className="btn-primary text-sm px-4 py-1.5"
              onClick={handleAction}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                  处理中
                </span>
              ) : nft.isAuction ? (
                '出价'
              ) : (
                '购买'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
