'use client'

import { useCallback } from 'react'
import { ethers, type TransactionReceipt } from 'ethers'
import { useWeb3Context } from '@/components/Web3Provider'
import { getNFTMarketplace } from '@/lib/contracts'

export interface ListingData {
  seller: string
  nftContract: string
  tokenId: bigint
  price: bigint
  active: boolean
}

export interface AuctionData {
  seller: string
  nftContract: string
  tokenId: bigint
  startPrice: bigint
  highestBid: bigint
  highestBidder: string
  endTime: bigint
  active: boolean
}

export interface UseMarketplaceReturn {
  listItem: ((nftContract: string, tokenId: string, priceEth: string) => Promise<string>) | null
  buyItem: ((nftContract: string, tokenId: string, priceEth: string) => Promise<string>) | null
  cancelListing: ((nftContract: string, tokenId: string) => Promise<string>) | null
  createAuction: ((nftContract: string, tokenId: string, startPriceEth: string, durationSeconds: number) => Promise<string>) | null
  placeBid: ((nftContract: string, tokenId: string, bidEth: string) => Promise<string>) | null
  endAuction: ((nftContract: string, tokenId: string) => Promise<string>) | null
  getListings: ((nftContract: string, tokenId: string) => Promise<ListingData>) | null
  getAuctions: ((nftContract: string, tokenId: string) => Promise<AuctionData>) | null
}

/**
 * 自定义市场 Hook
 * 封装 NFTMarketplace 合约的上架、购买、取消、拍卖等操作
 */
export function useMarketplace(): UseMarketplaceReturn {
  const { signer, chainId } = useWeb3Context()

  const listItem = useCallback(
    async (nftContract: string, tokenId: string, priceEth: string): Promise<string> => {
      if (!signer || !chainId) throw new Error('钱包未连接')
      const contract = getNFTMarketplace(chainId, signer)
      if (!contract) throw new Error('合约地址未配置')
      const priceWei = ethers.parseEther(priceEth)
      const tx = await contract.listItem(nftContract, tokenId, priceWei)
      const receipt = await tx.wait()
      return (receipt as TransactionReceipt).hash
    },
    [signer, chainId]
  )

  const buyItem = useCallback(
    async (nftContract: string, tokenId: string, priceEth: string): Promise<string> => {
      if (!signer || !chainId) throw new Error('钱包未连接')
      const contract = getNFTMarketplace(chainId, signer)
      if (!contract) throw new Error('合约地址未配置')
      const priceWei = ethers.parseEther(priceEth)
      const tx = await contract.buyItem(nftContract, tokenId, { value: priceWei })
      const receipt = await tx.wait()
      return (receipt as TransactionReceipt).hash
    },
    [signer, chainId]
  )

  const cancelListing = useCallback(
    async (nftContract: string, tokenId: string): Promise<string> => {
      if (!signer || !chainId) throw new Error('钱包未连接')
      const contract = getNFTMarketplace(chainId, signer)
      if (!contract) throw new Error('合约地址未配置')
      const tx = await contract.cancelListing(nftContract, tokenId)
      const receipt = await tx.wait()
      return (receipt as TransactionReceipt).hash
    },
    [signer, chainId]
  )

  const createAuction = useCallback(
    async (
      nftContract: string,
      tokenId: string,
      startPriceEth: string,
      durationSeconds: number
    ): Promise<string> => {
      if (!signer || !chainId) throw new Error('钱包未连接')
      const contract = getNFTMarketplace(chainId, signer)
      if (!contract) throw new Error('合约地址未配置')
      const startPriceWei = ethers.parseEther(startPriceEth)
      const tx = await contract.createAuction(nftContract, tokenId, startPriceWei, durationSeconds)
      const receipt = await tx.wait()
      return (receipt as TransactionReceipt).hash
    },
    [signer, chainId]
  )

  const placeBid = useCallback(
    async (nftContract: string, tokenId: string, bidEth: string): Promise<string> => {
      if (!signer || !chainId) throw new Error('钱包未连接')
      const contract = getNFTMarketplace(chainId, signer)
      if (!contract) throw new Error('合约地址未配置')
      const bidWei = ethers.parseEther(bidEth)
      const tx = await contract.placeBid(nftContract, tokenId, { value: bidWei })
      const receipt = await tx.wait()
      return (receipt as TransactionReceipt).hash
    },
    [signer, chainId]
  )

  const endAuction = useCallback(
    async (nftContract: string, tokenId: string): Promise<string> => {
      if (!signer || !chainId) throw new Error('钱包未连接')
      const contract = getNFTMarketplace(chainId, signer)
      if (!contract) throw new Error('合约地址未配置')
      const tx = await contract.endAuction(nftContract, tokenId)
      const receipt = await tx.wait()
      return (receipt as TransactionReceipt).hash
    },
    [signer, chainId]
  )

  const getListings = useCallback(
    async (nftContract: string, tokenId: string): Promise<ListingData> => {
      if (!signer || !chainId) throw new Error('钱包未连接')
      const contract = getNFTMarketplace(chainId, signer)
      if (!contract) throw new Error('合约地址未配置')
      return (await contract.getListing(nftContract, tokenId)) as ListingData
    },
    [signer, chainId]
  )

  const getAuctions = useCallback(
    async (nftContract: string, tokenId: string): Promise<AuctionData> => {
      if (!signer || !chainId) throw new Error('钱包未连接')
      const contract = getNFTMarketplace(chainId, signer)
      if (!contract) throw new Error('合约地址未配置')
      return (await contract.getAuction(nftContract, tokenId)) as AuctionData
    },
    [signer, chainId]
  )

  if (!signer || !chainId) {
    return {
      listItem: null,
      buyItem: null,
      cancelListing: null,
      createAuction: null,
      placeBid: null,
      endAuction: null,
      getListings: null,
      getAuctions: null,
    }
  }

  return {
    listItem,
    buyItem,
    cancelListing,
    createAuction,
    placeBid,
    endAuction,
    getListings,
    getAuctions,
  }
}
