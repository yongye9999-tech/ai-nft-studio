import { useCallback } from 'react'
import { ethers } from 'ethers'
import { useWeb3Context } from '@/components/Web3Provider'
import { getAINFTCollection, getNFTMarketplace } from '@/lib/contracts'

// ── Re-export Web3 context hook ───────────────────────────────────────────────

export function useWeb3() {
  return useWeb3Context()
}

// ── NFT Collection hook ───────────────────────────────────────────────────────

export interface UseNFTCollectionReturn {
  mint: ((tokenUri: string, value: bigint) => Promise<string>) | null
  getOwner: ((tokenId: number) => Promise<string>) | null
}

export function useNFTCollection(): UseNFTCollectionReturn {
  const { signer, chainId } = useWeb3Context()

  const mint = useCallback(
    async (tokenUri: string, value: bigint): Promise<string> => {
      if (!signer || !chainId) throw new Error('钱包未连接')
      const contract = getAINFTCollection(chainId, signer)
      if (!contract) throw new Error('合约地址未配置，请先部署合约')
      const tx = await contract.mint(await signer.getAddress(), tokenUri, { value })
      const receipt = await tx.wait()
      return receipt.hash as string
    },
    [signer, chainId]
  )

  const getOwner = useCallback(
    async (tokenId: number): Promise<string> => {
      if (!signer || !chainId) throw new Error('钱包未连接')
      const contract = getAINFTCollection(chainId, signer)
      if (!contract) throw new Error('合约地址未配置')
      return contract.ownerOf(tokenId) as Promise<string>
    },
    [signer, chainId]
  )

  if (!signer || !chainId) return { mint: null, getOwner: null }
  return { mint, getOwner }
}

// ── Marketplace hook ──────────────────────────────────────────────────────────

export interface UseMarketplaceReturn {
  listItem: ((nftContract: string, tokenId: string, price: string) => Promise<string>) | null
  buyItem: ((nftContract: string, tokenId: string, price: string) => Promise<string>) | null
  createAuction: ((nftContract: string, tokenId: string, startPrice: string, durationSeconds: number) => Promise<string>) | null
  placeBid: ((nftContract: string, tokenId: string, bidAmount: string) => Promise<string>) | null
}

export function useMarketplace(): UseMarketplaceReturn {
  const { signer, chainId } = useWeb3Context()

  const listItem = useCallback(
    async (nftContract: string, tokenId: string, price: string): Promise<string> => {
      if (!signer || !chainId) throw new Error('钱包未连接')
      const contract = getNFTMarketplace(chainId, signer)
      if (!contract) throw new Error('合约地址未配置')
      const priceWei = ethers.parseEther(price)
      const tx = await contract.listItem(nftContract, tokenId, priceWei)
      const receipt = await tx.wait()
      return receipt.hash as string
    },
    [signer, chainId]
  )

  const buyItem = useCallback(
    async (nftContract: string, tokenId: string, price: string): Promise<string> => {
      if (!signer || !chainId) throw new Error('钱包未连接')
      const contract = getNFTMarketplace(chainId, signer)
      if (!contract) throw new Error('合约地址未配置')
      const priceWei = ethers.parseEther(price)
      const tx = await contract.buyItem(nftContract, tokenId, { value: priceWei })
      const receipt = await tx.wait()
      return receipt.hash as string
    },
    [signer, chainId]
  )

  const createAuction = useCallback(
    async (
      nftContract: string,
      tokenId: string,
      startPrice: string,
      durationSeconds: number
    ): Promise<string> => {
      if (!signer || !chainId) throw new Error('钱包未连接')
      const contract = getNFTMarketplace(chainId, signer)
      if (!contract) throw new Error('合约地址未配置')
      const startPriceWei = ethers.parseEther(startPrice)
      const tx = await contract.createAuction(nftContract, tokenId, startPriceWei, durationSeconds)
      const receipt = await tx.wait()
      return receipt.hash as string
    },
    [signer, chainId]
  )

  const placeBid = useCallback(
    async (nftContract: string, tokenId: string, bidAmount: string): Promise<string> => {
      if (!signer || !chainId) throw new Error('钱包未连接')
      const contract = getNFTMarketplace(chainId, signer)
      if (!contract) throw new Error('合约地址未配置')
      const bidWei = ethers.parseEther(bidAmount)
      const tx = await contract.placeBid(nftContract, tokenId, { value: bidWei })
      const receipt = await tx.wait()
      return receipt.hash as string
    },
    [signer, chainId]
  )

  if (!signer || !chainId) return { listItem: null, buyItem: null, createAuction: null, placeBid: null }
  return { listItem, buyItem, createAuction, placeBid }
}
