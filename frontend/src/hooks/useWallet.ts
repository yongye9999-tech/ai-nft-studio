"use client";

import { useWeb3 } from "@/components/Web3Provider";

export function useWallet() {
  const { provider, signer, account, chainId, isConnected, connect, disconnect } = useWeb3();

  return {
    provider,
    signer,
    account,
    chainId,
    isConnected,
    connect,
    disconnect,
  };
}
