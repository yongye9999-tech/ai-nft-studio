// src/components/MintButton.tsx — NFT minting button component
// Handles wallet check → contract call → tx confirmation → success/error state.

"use client";

import { useState } from "react";
import { useNFTContract } from "@/hooks/useNFTContract";
import { useWallet } from "@/hooks/useWallet";

interface MintButtonProps {
  tokenURI: string;
  nftName: string;
  disabled?: boolean;
  onSuccess?: (tokenId: number, txHash: string) => void;
}

type MintState = "idle" | "pending" | "confirming" | "success" | "error";

export default function MintButton({
  tokenURI,
  nftName,
  disabled = false,
  onSuccess,
}: MintButtonProps) {
  const { isConnected, connect } = useWallet();
  const { mint, getMintFee } = useNFTContract();
  const [state, setState] = useState<MintState>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [tokenId, setTokenId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleMint = async () => {
    // Ensure wallet is connected
    if (!isConnected) {
      await connect();
      return;
    }

    setError(null);
    setState("pending");

    try {
      // Fetch current mint fee
      await getMintFee();

      setState("confirming");
      const result = await mint(tokenURI);
      setTxHash(result.txHash);
      setTokenId(result.tokenId);
      setState("success");
      onSuccess?.(result.tokenId, result.txHash);
    } catch (err: unknown) {
      console.error("[MintButton] mint error:", err);
      setError(err instanceof Error ? err.message : "铸造失败，请重试");
      setState("error");
    }
  };

  if (state === "success") {
    return (
      <div className="space-y-3">
        <div className="glass-card p-4 border-green-700/40">
          <p className="text-green-400 font-medium mb-2">🎉 NFT 铸造成功！</p>
          {tokenId !== null && (
            <p className="text-gray-400 text-sm">Token ID: #{tokenId}</p>
          )}
          {txHash && (
            <a
              href={`https://sepolia.etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 text-sm hover:underline mt-1 block"
            >
              查看交易 ↗
            </a>
          )}
        </div>
        <button
          onClick={() => { setState("idle"); setTxHash(null); setTokenId(null); }}
          className="btn-secondary w-full text-sm"
        >
          再次铸造
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleMint}
        disabled={disabled || state === "pending" || state === "confirming"}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {state === "pending" && (
          <><span className="spinner" /> 等待钱包确认...</>
        )}
        {state === "confirming" && (
          <><span className="spinner" /> 交易上链中...</>
        )}
        {(state === "idle" || state === "error") && (
          <>
            {isConnected ? "🔨 铸造 NFT" : "🔗 连接钱包"}
          </>
        )}
      </button>

      {state === "pending" && (
        <p className="text-xs text-gray-500 text-center">请在钱包中确认交易</p>
      )}
      {state === "confirming" && (
        <p className="text-xs text-gray-500 text-center">
          正在等待区块确认，请勿关闭页面
        </p>
      )}

      {error && state === "error" && (
        <p className="text-red-400 text-sm">❌ {error}</p>
      )}

      {nftName && state === "idle" && (
        <p className="text-xs text-gray-600 text-center">
          将铸造: &quot;{nftName}&quot;
        </p>
      )}
    </div>
  );
}
