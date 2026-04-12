'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { ethers, type BrowserProvider, type JsonRpcSigner } from 'ethers'

export interface Web3ContextValue {
  provider: BrowserProvider | null
  signer: JsonRpcSigner | null
  account: string | null
  chainId: number | null
  connect: () => Promise<void>
  disconnect: () => void
  switchChain: (chainId: number) => Promise<void>
}

const Web3Context = createContext<Web3ContextValue>({
  provider: null,
  signer: null,
  account: null,
  chainId: null,
  connect: async () => {},
  disconnect: () => {},
  switchChain: async () => {},
})

export function useWeb3Context(): Web3ContextValue {
  return useContext(Web3Context)
}

interface Web3ProviderProps {
  children: ReactNode
}

export function Web3Provider({ children }: Web3ProviderProps) {
  const [provider, setProvider] = useState<BrowserProvider | null>(null)
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null)
  const [account, setAccount] = useState<string | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)

  const initProvider = useCallback(async (ethereum: unknown) => {
    const web3Provider = new ethers.BrowserProvider(ethereum as Parameters<typeof ethers.BrowserProvider>[0])
    const network = await web3Provider.getNetwork()
    const accounts = await web3Provider.listAccounts()

    setProvider(web3Provider)
    setChainId(Number(network.chainId))

    if (accounts.length > 0) {
      const web3Signer = await web3Provider.getSigner()
      setSigner(web3Signer)
      setAccount(await web3Signer.getAddress())
    }
  }, [])

  // Auto-connect on page load if already authorized
  useEffect(() => {
    const ethereum = (window as unknown as { ethereum?: unknown }).ethereum
    if (!ethereum) return
    initProvider(ethereum).catch(console.error)
  }, [initProvider])

  // Listen for account / chain changes
  useEffect(() => {
    const ethereum = (window as unknown as { ethereum?: { on: (event: string, handler: (...args: unknown[]) => void) => void; removeListener: (event: string, handler: (...args: unknown[]) => void) => void } }).ethereum
    if (!ethereum) return

    const handleAccountsChanged = (accounts: unknown[]) => {
      if ((accounts as string[]).length === 0) {
        setSigner(null)
        setAccount(null)
      } else {
        initProvider(ethereum).catch(console.error)
      }
    }

    const handleChainChanged = () => {
      initProvider(ethereum).catch(console.error)
    }

    ethereum.on('accountsChanged', handleAccountsChanged)
    ethereum.on('chainChanged', handleChainChanged)

    return () => {
      ethereum.removeListener('accountsChanged', handleAccountsChanged)
      ethereum.removeListener('chainChanged', handleChainChanged)
    }
  }, [initProvider])

  const connect = useCallback(async () => {
    const ethereum = (window as unknown as { ethereum?: { request: (args: { method: string }) => Promise<unknown> } }).ethereum
    if (!ethereum) {
      alert('请安装 MetaMask 浏览器插件')
      return
    }
    await ethereum.request({ method: 'eth_requestAccounts' })
    await initProvider(ethereum)
  }, [initProvider])

  const disconnect = useCallback(() => {
    setSigner(null)
    setAccount(null)
    setProvider(null)
    setChainId(null)
  }, [])

  const switchChain = useCallback(async (targetChainId: number) => {
    const ethereum = (window as unknown as { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum
    if (!ethereum) return
    const hexChainId = `0x${targetChainId.toString(16)}`
    try {
      await ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hexChainId }] })
    } catch (err: unknown) {
      // Error code 4902: chain not added to MetaMask yet
      if ((err as { code?: number }).code === 4902) {
        console.warn('Chain not found in MetaMask. Please add it manually.')
      }
      throw err
    }
  }, [])

  return (
    <Web3Context.Provider value={{ provider, signer, account, chainId, connect, disconnect, switchChain }}>
      {children}
    </Web3Context.Provider>
  )
}
