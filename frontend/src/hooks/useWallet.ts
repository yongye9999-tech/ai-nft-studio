// src/hooks/useWallet.ts — Wallet hook wrapping Web3Context
// Provides convenient access to wallet state including a formatted short address.

"use client";

import { useWeb3 } from "@/components/Web3Provider";
import { ethers } from "ethers";

export interface UseWalletReturn {
  account: string | null;
  chainId: number | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  isConnected: boolean;
  /** Truncated address: "0x1234...abcd" or empty string if not connected */
  shortAddress: string;
}

/**
 * useWallet — hook for wallet connection state.
 * Usage: const { account, isConnected, connect, shortAddress } = useWallet();
 */
export function useWallet(): UseWalletReturn {
  const { account, chainId, provider, signer, connect, disconnect, isConnected } = useWeb3();

  const shortAddress =
    account && account.length >= 10
      ? `${account.slice(0, 6)}...${account.slice(-4)}`
      : account ?? "";

  return {
    account,
    chainId,
    provider,
    signer,
    connect,
    disconnect,
    isConnected,
    shortAddress,
  };
}
