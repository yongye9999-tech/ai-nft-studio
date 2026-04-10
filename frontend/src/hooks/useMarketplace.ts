// src/hooks/useMarketplace.ts — Hook for interacting with NFTMarketplace contract
// Provides listItem, buyItem, getListedItems, and getMyListings functions.

"use client";

import { useCallback } from "react";
import { ethers } from "ethers";
import { useWallet } from "./useWallet";
import { MARKETPLACE_ABI, AINFT_ABI, getContractAddress } from "@/lib/contracts";
import { getIPFSUrl, fetchMetadata } from "@/lib/ipfs";

export interface ListingItem {
  listingId: number;
  seller: string;
  nftContract: string;
  tokenId: number;
  priceEth: string;
  name: string;
  description: string;
  imageUrl: string;
}

export function useMarketplace() {
  const { signer, provider, chainId, account, isConnected } = useWallet();

  const getMarketplaceContract = useCallback(
    (withSigner = false) => {
      const address = getContractAddress(chainId ?? 11155111, "marketplace");
      if (!address) throw new Error("Marketplace address not configured");
      const runner = withSigner ? signer : provider;
      if (!runner) throw new Error("No provider available");
      return new ethers.Contract(address, MARKETPLACE_ABI, runner);
    },
    [chainId, signer, provider]
  );

  /**
   * List an NFT for sale at a fixed price.
   * Approves marketplace and calls listItem.
   */
  const listItem = useCallback(
    async (nftContractAddress: string, tokenId: number, priceEth: string): Promise<void> => {
      if (!isConnected || !signer) throw new Error("Wallet not connected");

      const marketplaceAddress = getContractAddress(chainId ?? 11155111, "marketplace");
      // Approve marketplace to transfer the NFT
      const nftContract = new ethers.Contract(nftContractAddress, AINFT_ABI, signer);
      const approveTx = await nftContract.approve(marketplaceAddress, tokenId);
      await approveTx.wait();

      const marketplace = getMarketplaceContract(true);
      const tx = await marketplace.listItem(
        nftContractAddress,
        tokenId,
        ethers.parseEther(priceEth)
      );
      await tx.wait();
    },
    [isConnected, signer, chainId, getMarketplaceContract]
  );

  /**
   * Buy a listed NFT by listingId.
   */
  const buyItem = useCallback(
    async (listingId: number, priceEth: string): Promise<void> => {
      if (!isConnected) throw new Error("Wallet not connected");
      const marketplace = getMarketplaceContract(true);
      const tx = await marketplace.buyItem(listingId, {
        value: ethers.parseEther(priceEth),
      });
      await tx.wait();
    },
    [isConnected, getMarketplaceContract]
  );

  /**
   * Fetch all active listings from the marketplace.
   * Reads ItemListed events and filters to active ones.
   */
  const getListedItems = useCallback(async (): Promise<ListingItem[]> => {
    if (!provider) return [];
    const marketplace = getMarketplaceContract(false);

    const count: bigint = await marketplace.listingCount().catch(() => 0n);
    const items: ListingItem[] = [];

    for (let id = 1; id <= Number(count); id++) {
      try {
        const listing = await marketplace.listings(id);
        if (!listing.active) continue;

        const nftContract = new ethers.Contract(listing.nftContract, AINFT_ABI, provider);
        const uri: string = await nftContract.tokenURI(listing.tokenId).catch(() => "");
        const metadata = uri
          ? await fetchMetadata(uri).catch(() => ({ name: `NFT #${listing.tokenId}`, description: "", image: "" }))
          : { name: `NFT #${listing.tokenId}`, description: "", image: "" };

        items.push({
          listingId: id,
          seller: listing.seller,
          nftContract: listing.nftContract,
          tokenId: Number(listing.tokenId),
          priceEth: ethers.formatEther(listing.price),
          name: metadata.name,
          description: metadata.description,
          imageUrl: metadata.image ? getIPFSUrl(metadata.image) : "",
        });
      } catch {
        // skip invalid listings
      }
    }

    return items;
  }, [provider, getMarketplaceContract]);

  /**
   * Fetch listings created by the connected wallet.
   */
  const getMyListings = useCallback(async (): Promise<ListingItem[]> => {
    if (!account) return [];
    const all = await getListedItems();
    return all.filter((item) => item.seller.toLowerCase() === account.toLowerCase());
  }, [account, getListedItems]);

  return { listItem, buyItem, getListedItems, getMyListings };
}
