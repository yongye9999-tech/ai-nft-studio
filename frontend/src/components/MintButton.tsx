"use client";

import { useState } from "react";
import { useNFTContract } from "@/hooks/useNFTContract";
import { useWallet } from "@/hooks/useWallet";

type MintStatus = "idle" | "uploading" | "minting" | "success" | "error";

interface MintButtonProps {
  imageData: string;
  prompt: string;
  style: string;
}

export function MintButton({ imageData, prompt, style }: MintButtonProps) {
  const { isConnected } = useWallet();
  const { mint } = useNFTContract();
  const [status, setStatus] = useState<MintStatus>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleMint = async () => {
    if (!isConnected) {
      setError("Please connect your wallet first");
      return;
    }

    setStatus("uploading");
    setError(null);

    try {
      // Step 1: Upload to IPFS
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageData,
          name: `AI NFT - ${style}`,
          description: prompt,
        }),
      });

      const uploadData = await uploadRes.json();

      if (!uploadRes.ok) {
        throw new Error(uploadData.error || "IPFS upload failed");
      }

      const { tokenURI } = uploadData;

      // Step 2: Mint NFT
      setStatus("minting");
      const tx = await mint(tokenURI);
      setTxHash(tx);
      setStatus("success");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Minting failed";
      setError(message);
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
        <div className="text-2xl mb-2">🎉</div>
        <p className="text-green-300 font-semibold mb-1">NFT Minted Successfully!</p>
        {txHash && (
          <p className="text-gray-400 text-xs font-mono truncate">Tx: {txHash}</p>
        )}
        <a href="/profile" className="mt-3 text-sm text-brand-400 hover:text-brand-300 inline-block">
          View in Profile →
        </a>
      </div>
    );
  }

  const statusLabels: Record<MintStatus, string> = {
    idle: "⛓️ Mint as NFT",
    uploading: "Uploading to IPFS...",
    minting: "Minting NFT...",
    success: "Success!",
    error: "Try Again",
  };

  const isLoading = status === "uploading" || status === "minting";

  return (
    <div className="space-y-3">
      <button
        onClick={handleMint}
        disabled={isLoading}
        className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            {statusLabels[status]}
          </span>
        ) : (
          statusLabels[status]
        )}
      </button>

      {error && (
        <p className="text-red-400 text-sm text-center">{error}</p>
      )}

      {!isConnected && (
        <p className="text-yellow-400 text-xs text-center">
          ⚠️ Connect your wallet to mint
        </p>
      )}
    </div>
  );
}
