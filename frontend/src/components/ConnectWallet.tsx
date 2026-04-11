'use client'

import { useState } from 'react'
import { useWeb3Context } from './Web3Provider'

const CHAIN_NAMES: Record<number, string> = {
  1: 'Mainnet',
  11155111: 'Sepolia',
  80002: 'Amoy',
  97: 'BNB Test',
  31337: 'Localhost',
}

function truncate(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export default function ConnectWallet() {
  const { account, chainId, connect, disconnect } = useWeb3Context()
  const [showMenu, setShowMenu] = useState(false)

  if (!account) {
    return (
      <button className="btn-primary text-sm px-4 py-2" onClick={connect}>
        连接钱包
      </button>
    )
  }

  const chainName = chainId ? (CHAIN_NAMES[chainId] ?? `Chain ${chainId}`) : ''

  return (
    <div className="relative">
      <button
        className="flex items-center gap-2 bg-violet-900/30 border border-violet-700/50 hover:border-violet-500 rounded-lg px-3 py-2 text-sm transition-all"
        onClick={() => setShowMenu((v) => !v)}
      >
        <span className="w-2 h-2 bg-green-400 rounded-full" />
        <span className="text-violet-300 font-mono">{truncate(account)}</span>
        {chainName && (
          <span className="hidden sm:inline text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
            {chainName}
          </span>
        )}
        <span className="text-gray-500">▾</span>
      </button>

      {showMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 mt-2 w-48 glass-card border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-700">
              <p className="text-xs text-gray-500">已连接</p>
              <p className="text-sm text-white font-mono truncate">{truncate(account)}</p>
              {chainName && <p className="text-xs text-violet-400 mt-0.5">{chainName}</p>}
            </div>
            <button
              className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-900/20 transition-colors"
              onClick={() => {
                disconnect()
                setShowMenu(false)
              }}
            >
              🔌 断开连接
            </button>
          </div>
        </>
      )}
    </div>
  )
}
