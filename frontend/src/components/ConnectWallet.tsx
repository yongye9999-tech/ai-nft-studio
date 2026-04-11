"use client";

import { useWeb3 } from "./Web3Provider";

export default function ConnectWallet() {
  const { account, connect, disconnect } = useWeb3();

  if (account) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline text-xs text-gray-400 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 font-mono">
          {account.slice(0, 6)}...{account.slice(-4)}
        </span>
        <button
          onClick={disconnect}
          className="text-xs text-gray-400 hover:text-white border border-white/10 hover:border-white/30 rounded-lg px-3 py-1.5 transition-colors"
        >
          断开
        </button>
      </div>
    );
  }

  return (
    <button onClick={connect} className="btn-primary text-sm px-4 py-2">
      连接钱包
    </button>
  );
}
