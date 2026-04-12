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

// ── Chain metadata for wallet_addEthereumChain ────────────────────────────────

export interface ChainConfig {
  chainId: number
  chainName: string
  nativeCurrency: { name: string; symbol: string; decimals: number }
  rpcUrls: string[]
  blockExplorerUrls: string[]
  isTestnet?: boolean
}

export const CHAIN_CONFIGS: Record<number, ChainConfig> = {
  1: {
    chainId: 1,
    chainName: 'Ethereum Mainnet',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://eth.llamarpc.com'],
    blockExplorerUrls: ['https://etherscan.io'],
  },
  137: {
    chainId: 137,
    chainName: 'Polygon',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    rpcUrls: ['https://polygon-rpc.com'],
    blockExplorerUrls: ['https://polygonscan.com'],
  },
  42161: {
    chainId: 42161,
    chainName: 'Arbitrum One',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://arb1.arbitrum.io/rpc'],
    blockExplorerUrls: ['https://arbiscan.io'],
  },
  8453: {
    chainId: 8453,
    chainName: 'Base',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://mainnet.base.org'],
    blockExplorerUrls: ['https://basescan.org'],
  },
  11155111: {
    chainId: 11155111,
    chainName: 'Sepolia',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://rpc.sepolia.org'],
    blockExplorerUrls: ['https://sepolia.etherscan.io'],
    isTestnet: true,
  },
  80002: {
    chainId: 80002,
    chainName: 'Polygon Amoy',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    rpcUrls: ['https://rpc-amoy.polygon.technology'],
    blockExplorerUrls: ['https://amoy.polygonscan.com'],
    isTestnet: true,
  },
  97: {
    chainId: 97,
    chainName: 'BNB Testnet',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545'],
    blockExplorerUrls: ['https://testnet.bscscan.com'],
    isTestnet: true,
  },
  31337: {
    chainId: 31337,
    chainName: 'Localhost',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['http://127.0.0.1:8545'],
    blockExplorerUrls: [],
    isTestnet: true,
  },
}

// ── Context ───────────────────────────────────────────────────────────────────

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
    const web3Provider = new ethers.BrowserProvider(ethereum as ethers.Eip1193Provider)
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

    const handleAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[]
      if (accounts.length === 0) {
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
      alert('请安装 MetaMask 或其他 Web3 钱包浏览器插件')
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
      // Error code 4902: chain not added to wallet yet — try adding it
      if ((err as { code?: number }).code === 4902) {
        const chainConfig = CHAIN_CONFIGS[targetChainId]
        if (!chainConfig) {
          throw new Error(`Chain ${targetChainId} not supported`)
        }
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: hexChainId,
              chainName: chainConfig.chainName,
              nativeCurrency: chainConfig.nativeCurrency,
              rpcUrls: chainConfig.rpcUrls,
              blockExplorerUrls: chainConfig.blockExplorerUrls,
            },
          ],
        })
      } else {
        throw err
      }
    }
  }, [])

  return (
    <Web3Context.Provider value={{ provider, signer, account, chainId, connect, disconnect, switchChain }}>
      {children}
    </Web3Context.Provider>
  )
}
