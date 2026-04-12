'use client'

import { useState } from 'react'
import { useWeb3Context, CHAIN_CONFIGS } from './Web3Provider'

// Chains surfaced in the quick-switch menu (mainnet L2s + popular testnets)
const QUICK_SWITCH_CHAINS = [137, 42161, 8453, 11155111, 80002]

function truncate(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export default function ConnectWallet() {
  const { account, chainId, connect, disconnect, switchChain } = useWeb3Context()
  const [showMenu, setShowMenu] = useState(false)
  const [switching, setSwitching] = useState<number | null>(null)

  if (!account) {
    return (
      <button className="btn-primary text-sm px-4 py-2" onClick={connect}>
        连接钱包
      </button>
    )
  }

  const currentChain = chainId ? CHAIN_CONFIGS[chainId] : null
  const chainName = currentChain?.chainName ?? (chainId ? `Chain ${chainId}` : '')

  const handleSwitchChain = async (targetChainId: number) => {
    setSwitching(targetChainId)
    try {
      await switchChain(targetChainId)
    } catch (err) {
      console.error('Chain switch failed:', err)
    } finally {
      setSwitching(null)
      setShowMenu(false)
    }
  }

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
          <div className="absolute right-0 mt-2 w-56 glass-card border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
            {/* Account info */}
            <div className="px-4 py-3 border-b border-gray-700">
              <p className="text-xs text-gray-500">已连接</p>
              <p className="text-sm text-white font-mono truncate">{truncate(account)}</p>
              {chainName && <p className="text-xs text-violet-400 mt-0.5">{chainName}</p>}
            </div>

            {/* Quick network switcher */}
            <div className="px-4 py-2 border-b border-gray-700">
              <p className="text-xs text-gray-500 mb-2">切换网络</p>
              <div className="space-y-1">
                {QUICK_SWITCH_CHAINS.map((cid) => {
                  const config = CHAIN_CONFIGS[cid]
                  if (!config) return null
                  const isActive = cid === chainId
                  return (
                    <button
                      key={cid}
                      onClick={() => handleSwitchChain(cid)}
                      disabled={isActive || switching !== null}
                      className={`w-full text-left px-2 py-1.5 text-xs rounded transition-colors flex items-center justify-between ${
                        isActive
                          ? 'bg-violet-600/20 text-violet-300'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                      }`}
                    >
                      <span>{config.chainName}</span>
                      {isActive && <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />}
                      {switching === cid && (
                        <span className="w-3 h-3 border border-violet-500 border-t-transparent rounded-full animate-spin" />
                      )}
                      {config.isTestnet && !isActive && switching !== cid && (
                        <span className="text-[10px] text-gray-600">测试</span>
                      )}
                    </button>
                  )
                })}
              </div>
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
