// src/components/ConnectWallet.tsx — Wallet connect/disconnect button
// Shows "连接钱包" when disconnected, truncated address when connected.

"use client";

import { useWallet } from "@/hooks/useWallet";

export default function ConnectWallet() {
  const { isConnected, connect, disconnect, shortAddress, chainId } = useWallet();

  const CHAIN_NAMES: Record<number, string> = {
    1: "Mainnet",
    11155111: "Sepolia",
    80002: "Amoy",
    97: "BNB Test",
    31337: "Localhost",
  };

  const chainName = chainId ? (CHAIN_NAMES[chainId] ?? `Chain ${chainId}`) : null;

  if (isConnected) {
    return (
      <div className="flex items-center gap-2">
        {/* Chain badge */}
        {chainName && (
          <span className="badge-cyan text-xs hidden sm:inline-flex">{chainName}</span>
        )}
        {/* Address button */}
        <button
          onClick={disconnect}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-purple-700/40 bg-purple-900/20 text-purple-200 text-sm font-medium hover:border-red-500/50 hover:text-red-400 transition-all duration-200"
          title="点击断开连接"
        >
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse-slow" />
          {shortAddress}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={connect}
      className="btn-primary text-sm px-5 py-2 flex items-center gap-2"
    >
      <span>🔗</span>
      <span>连接钱包</span>
    </button>
  );
}
