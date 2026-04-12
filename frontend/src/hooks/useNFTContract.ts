'use client'

import { useCallback } from 'react'
import { ethers, type TransactionReceipt } from 'ethers'
import { useWeb3Context } from '@/components/Web3Provider'
import { getAINFTCollection } from '@/lib/contracts'

export interface UseNFTContractReturn {
  mint: ((tokenUri: string, value: bigint) => Promise<string>) | null
  setMintFee: ((feeEth: string) => Promise<string>) | null
  getMintFee: (() => Promise<bigint>) | null
  getTokenURI: ((tokenId: number) => Promise<string>) | null
  balanceOf: ((address: string) => Promise<bigint>) | null
}

/**
 * 自定义 NFT 合约 Hook
 * 封装 AINFTCollection 合约的常用操作
 */
export function useNFTContract(): UseNFTContractReturn {
  const { signer, chainId } = useWeb3Context()

  const mint = useCallback(
    async (tokenUri: string, value: bigint): Promise<string> => {
      if (!signer || !chainId) throw new Error('钱包未连接')
      const contract = getAINFTCollection(chainId, signer)
      if (!contract) throw new Error('合约地址未配置，请先部署合约')
      const address = await signer.getAddress()
      const tx = await contract.mint(address, tokenUri, { value })
      const receipt = await tx.wait()
      return (receipt as TransactionReceipt).hash
    },
    [signer, chainId]
  )

  const setMintFee = useCallback(
    async (feeEth: string): Promise<string> => {
      if (!signer || !chainId) throw new Error('钱包未连接')
      const contract = getAINFTCollection(chainId, signer)
      if (!contract) throw new Error('合约地址未配置')
      const feeWei = ethers.parseEther(feeEth)
      const tx = await contract.setMintFee(feeWei)
      const receipt = await tx.wait()
      return (receipt as TransactionReceipt).hash
    },
    [signer, chainId]
  )

  const getMintFee = useCallback(async (): Promise<bigint> => {
    if (!signer || !chainId) throw new Error('钱包未连接')
    const contract = getAINFTCollection(chainId, signer)
    if (!contract) throw new Error('合约地址未配置')
    return (await contract.mintFee()) as bigint
  }, [signer, chainId])

  const getTokenURI = useCallback(
    async (tokenId: number): Promise<string> => {
      if (!signer || !chainId) throw new Error('钱包未连接')
      const contract = getAINFTCollection(chainId, signer)
      if (!contract) throw new Error('合约地址未配置')
      return (await contract.tokenURI(tokenId)) as string
    },
    [signer, chainId]
  )

  const balanceOf = useCallback(
    async (address: string): Promise<bigint> => {
      if (!signer || !chainId) throw new Error('钱包未连接')
      const contract = getAINFTCollection(chainId, signer)
      if (!contract) throw new Error('合约地址未配置')
      return (await contract.balanceOf(address)) as bigint
    },
    [signer, chainId]
  )

  if (!signer || !chainId) {
    return {
      mint: null,
      setMintFee: null,
      getMintFee: null,
      getTokenURI: null,
      balanceOf: null,
    }
  }

  return { mint, setMintFee, getMintFee, getTokenURI, balanceOf }
}
