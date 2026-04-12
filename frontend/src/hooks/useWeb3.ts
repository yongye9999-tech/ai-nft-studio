'use client'

import { useCallback } from 'react'
import { useWeb3Context, type Web3ContextValue } from '@/components/Web3Provider'

export interface UseWeb3Return {
  provider: Web3ContextValue['provider']
  signer: Web3ContextValue['signer']
  account: string | null
  chainId: number | null
  connect: () => Promise<void>
  disconnect: () => void
  isConnected: boolean
  switchNetwork: (chainId: number) => Promise<void>
}

/**
 * 自定义 Web3 Hook
 * 返回钱包连接状态、账户信息和操作方法
 */
export function useWeb3(): UseWeb3Return {
  const { provider, signer, account, chainId, connect, disconnect, switchChain } = useWeb3Context()

  const switchNetwork = useCallback(
    async (targetChainId: number) => {
      await switchChain(targetChainId)
    },
    [switchChain]
  )

  return {
    provider,
    signer,
    account,
    chainId,
    connect,
    disconnect,
    isConnected: !!account,
    switchNetwork,
  }
}
