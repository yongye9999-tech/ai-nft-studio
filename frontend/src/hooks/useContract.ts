"use client";

import { useMemo } from "react";
import { Contract } from "ethers";
import { useWeb3 } from "@/components/Web3Provider";
import {
  AI_NFT_COLLECTION_ABI,
  NFT_MARKETPLACE_ABI,
  CONTRACT_ADDRESSES,
} from "@/lib/contracts";

/**
 * Returns an ethers Contract instance for AINFTCollection, or null if not ready.
 * Automatically handles network switching.
 */
export function useNFTContract() {
  const { signer, chainId } = useWeb3();

  const nftContract = useMemo(() => {
    if (!signer || !chainId) return null;
    const addresses = CONTRACT_ADDRESSES[chainId];
    if (!addresses?.nftCollection) return null;
    return new Contract(
      addresses.nftCollection,
      AI_NFT_COLLECTION_ABI as string[],
      signer
    );
  }, [signer, chainId]);

  return { nftContract };
}

/**
 * Returns an ethers Contract instance for NFTMarketplace, or null if not ready.
 */
export function useMarketplace() {
  const { signer, chainId } = useWeb3();

  const marketplace = useMemo(() => {
    if (!signer || !chainId) return null;
    const addresses = CONTRACT_ADDRESSES[chainId];
    if (!addresses?.marketplace) return null;
    return new Contract(
      addresses.marketplace,
      NFT_MARKETPLACE_ABI as string[],
      signer
    );
  }, [signer, chainId]);

  return { marketplace };
}
