"use client";

import { useWallet } from "@/hooks/useWallet";

export function ConnectWallet() {
  const { account, isConnected, connect, disconnect } = useWallet();

  const truncateAddress = (address: string) =>
    `${address.slice(0, 6)}...${address.slice(-4)}`;

  if (isConnected && account) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-1.5">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-300 text-sm font-mono">
            {truncateAddress(account)}
          </span>
        </div>
        <button
          onClick={disconnect}
          className="text-sm text-gray-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button onClick={connect} className="btn-primary text-sm">
      Connect Wallet
    </button>
  );
}
