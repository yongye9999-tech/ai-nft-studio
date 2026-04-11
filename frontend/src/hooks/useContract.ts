"use client";

import { useState, useCallback } from "react";
import { useAccount, useChainId } from "wagmi";
import { ethers } from "ethers";
import {
  NFT_COLLECTION_ABI,
  NFT_COLLECTION_ADDRESS,
  NFT_MARKETPLACE_ABI,
  NFT_MARKETPLACE_ADDRESS,
} from "@/lib/contracts";

type ContractType = "nftCollection" | "marketplace";

/**
 * Hook to get read-only contract instances
 */
export function useContract(type: ContractType) {
  const chainId = useChainId();

  const getContract = useCallback(
    (signerOrProvider?: ethers.Signer | ethers.Provider) => {
      if (type === "nftCollection") {
        const provider =
          signerOrProvider ||
          new ethers.JsonRpcProvider(
            process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545"
          );
        return new ethers.Contract(NFT_COLLECTION_ADDRESS, NFT_COLLECTION_ABI, provider);
      } else {
        const provider =
          signerOrProvider ||
          new ethers.JsonRpcProvider(
            process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545"
          );
        return new ethers.Contract(NFT_MARKETPLACE_ADDRESS, NFT_MARKETPLACE_ABI, provider);
      }
    },
    [type, chainId]
  );

  return { getContract };
}

/**
 * Hook to get a signer-connected contract for write operations
 */
export function useSignedContract(type: ContractType) {
  const { address, isConnected } = useAccount();

  const getSignedContract = useCallback(async () => {
    if (!isConnected || !window.ethereum) {
      throw new Error("Wallet not connected");
    }

    const provider = new ethers.BrowserProvider(window.ethereum as ethers.Eip1193Provider);
    const signer = await provider.getSigner();

    if (type === "nftCollection") {
      return new ethers.Contract(NFT_COLLECTION_ADDRESS, NFT_COLLECTION_ABI, signer);
    } else {
      return new ethers.Contract(NFT_MARKETPLACE_ADDRESS, NFT_MARKETPLACE_ABI, signer);
    }
  }, [type, isConnected, address]);

  return { getSignedContract, isConnected };
}

/**
 * Hook to mint NFT with loading state management
 */
export function useMintNFT() {
  const { address, isConnected } = useAccount();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenId, setTokenId] = useState<number | null>(null);

  const mint = useCallback(
    async (tokenURI: string, royaltyBps: number = 500) => {
      if (!isConnected || !address || !window.ethereum) {
        setError("请先连接钱包");
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const provider = new ethers.BrowserProvider(window.ethereum as ethers.Eip1193Provider);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(
          NFT_COLLECTION_ADDRESS,
          NFT_COLLECTION_ABI,
          signer
        );

        const mintFee = await contract.mintFee();
        const tx = await contract.mintNFT(tokenURI, address, royaltyBps, {
          value: mintFee,
        });
        const receipt = await tx.wait();

        let mintedTokenId: number | null = null;
        for (const log of receipt.logs) {
          try {
            const parsed = contract.interface.parseLog(log);
            if (parsed?.name === "NFTMinted") {
              mintedTokenId = Number(parsed.args[0]);
              break;
            }
          } catch {
            // Not this event
          }
        }

        setTokenId(mintedTokenId);
        return mintedTokenId;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "铸造失败";
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [isConnected, address]
  );

  return { mint, loading, error, tokenId };
}

/**
 * Hook to list NFT on marketplace
 */
export function useListNFT() {
  const { isConnected } = useAccount();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listItem = useCallback(
    async (nftContract: string, tokenId: number, priceInEth: string) => {
      if (!isConnected || !window.ethereum) {
        setError("请先连接钱包");
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const provider = new ethers.BrowserProvider(window.ethereum as ethers.Eip1193Provider);
        const signer = await provider.getSigner();

        // First approve marketplace
        const nftContractInstance = new ethers.Contract(
          nftContract,
          NFT_COLLECTION_ABI,
          signer
        );
        const marketplaceAddress = NFT_MARKETPLACE_ADDRESS;
        const isApproved = await nftContractInstance.isApprovedForAll(
          await signer.getAddress(),
          marketplaceAddress
        );
        if (!isApproved) {
          const approvalTx = await nftContractInstance.setApprovalForAll(
            marketplaceAddress,
            true
          );
          await approvalTx.wait();
        }

        // Then list
        const marketplace = new ethers.Contract(
          NFT_MARKETPLACE_ADDRESS,
          NFT_MARKETPLACE_ABI,
          signer
        );
        const price = ethers.parseEther(priceInEth);
        const tx = await marketplace.listItem(nftContract, tokenId, price);
        const receipt = await tx.wait();

        let listingId: number | null = null;
        for (const log of receipt.logs) {
          try {
            const parsed = marketplace.interface.parseLog(log);
            if (parsed?.name === "ItemListed") {
              listingId = Number(parsed.args[0]);
              break;
            }
          } catch {
            // Not this event
          }
        }

        return listingId;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "上架失败";
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [isConnected]
  );

  return { listItem, loading, error };
}
