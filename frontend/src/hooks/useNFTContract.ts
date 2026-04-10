// src/hooks/useNFTContract.ts — Hook for interacting with AINFTCollection contract
// Provides mint, getMyNFTs, getMintFee, and totalSupply functions.

"use client";

import { useCallback } from "react";
import { ethers } from "ethers";
import { useWallet } from "./useWallet";
import { AINFT_ABI, getContractAddress } from "@/lib/contracts";
import { getIPFSUrl, fetchMetadata } from "@/lib/ipfs";

export interface NFTItem {
  tokenId: number;
  name: string;
  description: string;
  imageUrl: string;
  tokenURI: string;
  creator: string;
  priceEth?: string;
}

export function useNFTContract() {
  const { signer, provider, chainId, account, isConnected } = useWallet();

  /** Get an ethers Contract instance (read-only if no signer) */
  const getContract = useCallback(
    (withSigner = false) => {
      const address = getContractAddress(chainId ?? 11155111, "ainft");
      if (!address) throw new Error("AINFTCollection address not configured");
      const runner = withSigner ? signer : provider;
      if (!runner) throw new Error("No provider available");
      return new ethers.Contract(address, AINFT_ABI, runner);
    },
    [chainId, signer, provider]
  );

  /**
   * Mint a new NFT with the given tokenURI.
   * Fetches current mintFee automatically.
   */
  const mint = useCallback(
    async (tokenURI: string): Promise<{ tokenId: number; txHash: string }> => {
      if (!isConnected) throw new Error("Wallet not connected");
      const contract = getContract(true);
      const mintFee: bigint = await contract.mintFee();

      const tx = await contract.mint(tokenURI, { value: mintFee });
      const receipt = await tx.wait();

      // Parse NFTMinted event
      let tokenId = 0;
      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog(log);
          if (parsed && parsed.name === "NFTMinted") {
            tokenId = Number(parsed.args.tokenId);
            break;
          }
        } catch {
          // skip unparseable logs
        }
      }

      return { tokenId, txHash: receipt.hash };
    },
    [isConnected, getContract]
  );

  /**
   * Fetch all NFTs owned by the connected wallet.
   * Reads Transfer events to find owned tokens, then fetches metadata.
   */
  const getMyNFTs = useCallback(async (): Promise<NFTItem[]> => {
    if (!account || !provider) return [];
    const contract = getContract(false);

    const filter = contract.filters.Transfer(null, account);
    const events = await contract.queryFilter(filter, -10000);

    const tokenIds = new Set<number>();
    for (const event of events) {
      const parsed = contract.interface.parseLog(event);
      if (parsed) tokenIds.add(Number(parsed.args.tokenId));
    }

    // Filter to tokens still owned by user
    const owned: NFTItem[] = [];
    for (const tokenId of tokenIds) {
      try {
        const owner = await contract.ownerOf(tokenId);
        if (owner.toLowerCase() !== account.toLowerCase()) continue;

        const uri: string = await contract.tokenURI(tokenId);
        const metadata = await fetchMetadata(uri).catch(() => ({
          name: `NFT #${tokenId}`,
          description: "",
          image: "",
        }));

        owned.push({
          tokenId,
          name: metadata.name,
          description: metadata.description,
          imageUrl: metadata.image ? getIPFSUrl(metadata.image) : "",
          tokenURI: uri,
          creator: account,
        });
      } catch {
        // token may have been burned or transferred
      }
    }

    return owned;
  }, [account, provider, getContract]);

  /** Get the current mint fee in ETH as a string */
  const getMintFee = useCallback(async (): Promise<string> => {
    const contract = getContract(false);
    const fee: bigint = await contract.mintFee();
    return ethers.formatEther(fee);
  }, [getContract]);

  /** Get the total number of minted tokens */
  const totalSupply = useCallback(async (): Promise<number> => {
    const contract = getContract(false);
    const supply: bigint = await contract.totalSupply();
    return Number(supply);
  }, [getContract]);

  return { mint, getMyNFTs, getMintFee, totalSupply };
}
