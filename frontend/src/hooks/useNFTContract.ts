"use client";

import { useCallback } from "react";
import { parseEther } from "ethers";
import { useWallet } from "./useWallet";
import { getAINFTContract } from "@/lib/contracts";

export function useNFTContract() {
  const { signer, chainId } = useWallet();

  /**
   * Get the current mint fee from the contract.
   */
  const getMintFee = useCallback(async (): Promise<bigint> => {
    if (!signer || !chainId) throw new Error("Wallet not connected");

    const contract = getAINFTContract(chainId, signer);
    if (!contract) throw new Error("Contract not deployed on this network");

    return await contract.mintFee();
  }, [signer, chainId]);

  /**
   * Get the total number of minted NFTs.
   */
  const totalMinted = useCallback(async (): Promise<bigint> => {
    if (!signer || !chainId) throw new Error("Wallet not connected");

    const contract = getAINFTContract(chainId, signer);
    if (!contract) throw new Error("Contract not deployed on this network");

    return await contract.totalMinted();
  }, [signer, chainId]);

  /**
   * Mint a new NFT with the given tokenURI.
   * Returns the transaction hash.
   */
  const mint = useCallback(
    async (tokenURI: string): Promise<string> => {
      if (!signer || !chainId) throw new Error("Wallet not connected");

      const contract = getAINFTContract(chainId, signer);
      if (!contract) throw new Error("Contract not deployed on this network");

      const mintFee = await contract.mintFee();
      const tx = await contract.mint(tokenURI, { value: mintFee });
      await tx.wait();

      return tx.hash;
    },
    [signer, chainId]
  );

  /**
   * Get NFTs owned by the current user.
   * Returns an array of token IDs.
   */
  const getMyNFTs = useCallback(async (): Promise<number[]> => {
    if (!signer || !chainId) throw new Error("Wallet not connected");

    const contract = getAINFTContract(chainId, signer);
    if (!contract) throw new Error("Contract not deployed on this network");

    const address = await signer.getAddress();
    const total = await contract.totalMinted();
    const myTokens: number[] = [];

    for (let i = 0; i < Number(total); i++) {
      try {
        const owner = await contract.ownerOf(i);
        if (owner.toLowerCase() === address.toLowerCase()) {
          myTokens.push(i);
        }
      } catch {
        // Token may be burned or transferred
      }
    }

    return myTokens;
  }, [signer, chainId]);

  return { mint, getMintFee, totalMinted, getMyNFTs };
}
