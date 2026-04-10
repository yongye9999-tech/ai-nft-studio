"use client";

import { useCallback } from "react";
import { parseEther } from "ethers";
import { useWallet } from "./useWallet";
import { getMarketplaceContract } from "@/lib/contracts";

export interface ListingData {
  listingId: number;
  seller: string;
  nftContract: string;
  tokenId: number;
  price: bigint;
  active: boolean;
}

export function useMarketplace() {
  const { signer, chainId } = useWallet();

  /**
   * List an NFT for sale at a fixed price.
   * Caller must approve the marketplace before calling.
   */
  const listItem = useCallback(
    async (
      nftContract: string,
      tokenId: number,
      priceEth: string
    ): Promise<string> => {
      if (!signer || !chainId) throw new Error("Wallet not connected");

      const contract = getMarketplaceContract(chainId, signer);
      if (!contract) throw new Error("Marketplace not deployed on this network");

      const priceWei = parseEther(priceEth);
      const tx = await contract.listItem(nftContract, tokenId, priceWei);
      await tx.wait();

      return tx.hash;
    },
    [signer, chainId]
  );

  /**
   * Buy a listed NFT.
   */
  const buyItem = useCallback(
    async (listingId: number, priceWei: bigint): Promise<string> => {
      if (!signer || !chainId) throw new Error("Wallet not connected");

      const contract = getMarketplaceContract(chainId, signer);
      if (!contract) throw new Error("Marketplace not deployed on this network");

      const tx = await contract.buyItem(listingId, { value: priceWei });
      await tx.wait();

      return tx.hash;
    },
    [signer, chainId]
  );

  /**
   * Cancel a listing and reclaim the NFT.
   */
  const cancelListing = useCallback(
    async (listingId: number): Promise<string> => {
      if (!signer || !chainId) throw new Error("Wallet not connected");

      const contract = getMarketplaceContract(chainId, signer);
      if (!contract) throw new Error("Marketplace not deployed on this network");

      const tx = await contract.cancelListing(listingId);
      await tx.wait();

      return tx.hash;
    },
    [signer, chainId]
  );

  /**
   * Get all active listings by scanning listing IDs.
   * Note: In production, use events/indexing for efficiency.
   */
  const getListedItems = useCallback(async (): Promise<ListingData[]> => {
    if (!signer || !chainId) throw new Error("Wallet not connected");

    const contract = getMarketplaceContract(chainId, signer);
    if (!contract) throw new Error("Marketplace not deployed on this network");

    const listings: ListingData[] = [];
    let id = 0;

    while (true) {
      try {
        const listing = await contract.listings(id);
        if (listing.active) {
          listings.push({
            listingId: id,
            seller: listing.seller,
            nftContract: listing.nftContract,
            tokenId: Number(listing.tokenId),
            price: listing.price,
            active: listing.active,
          });
        }
        id++;
      } catch {
        break;
      }
    }

    return listings;
  }, [signer, chainId]);

  return { listItem, buyItem, cancelListing, getListedItems };
}
