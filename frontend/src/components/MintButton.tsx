"use client";

import { useState } from "react";
import { useWeb3 } from "./Web3Provider";
import { useNFTContract } from "@/hooks/useContract";
import { ethers } from "ethers";

type MintStep = "idle" | "uploading" | "minting" | "success" | "error";

interface MintButtonProps {
  imageUrl: string | null;
  name: string;
  description: string;
  prompt?: string;
  style?: string;
}

export default function MintButton({
  imageUrl,
  name,
  description,
  prompt,
  style,
}: MintButtonProps) {
  const { account } = useWeb3();
  const { nftContract } = useNFTContract();
  const [step, setStep] = useState<MintStep>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [tokenId, setTokenId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleMint = async () => {
    if (!account) {
      alert("请先连接钱包");
      return;
    }
    if (!imageUrl) {
      alert("请先生成图片");
      return;
    }
    if (!name.trim()) {
      alert("请输入 NFT 名称");
      return;
    }
    if (!nftContract) {
      alert("合约未连接，请检查网络和合约地址配置");
      return;
    }

    setError(null);
    setStep("uploading");

    try {
      // ── Step 1: Upload to IPFS ──────────────────────────────────────
      const formData = new FormData();
      formData.append("name", name);
      formData.append("description", description);
      formData.append("imageUrl", imageUrl);
      if (prompt) formData.append("prompt", prompt);
      if (style) formData.append("style", style);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json() as { tokenURI?: string; error?: string };
      if (!uploadRes.ok) throw new Error(uploadData.error || "IPFS 上传失败");
      const tokenURI = uploadData.tokenURI!;

      // ── Step 2: Mint on-chain ───────────────────────────────────────
      setStep("minting");
      const mintFee = await nftContract.mintFee();
      const tx = await nftContract.mint(tokenURI, { value: mintFee });
      setTxHash(tx.hash);
      const receipt = await tx.wait();

      // Parse NFTMinted event to get token ID
      const iface = nftContract.interface;
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog(log);
          if (parsed && parsed.name === "NFTMinted") {
            setTokenId(Number(parsed.args.tokenId));
            break;
          }
        } catch {
          // Skip unparseable logs
        }
      }

      setStep("success");
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "shortMessage" in err
          ? String((err as { shortMessage: string }).shortMessage)
          : "铸造失败";
      setError(message);
      setStep("error");
    }
  };

  if (step === "success") {
    return (
      <div className="rounded-xl bg-green-500/10 border border-green-500/30 p-4 text-center">
        <div className="text-3xl mb-2">🎉</div>
        <p className="text-green-400 font-semibold mb-1">NFT 铸造成功！</p>
        {tokenId !== null && (
          <p className="text-gray-400 text-sm mb-2">Token ID: #{tokenId}</p>
        )}
        {txHash && (
          <a
            href={`https://sepolia.etherscan.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 text-sm underline"
          >
            查看交易记录 ↗
          </a>
        )}
        <button
          onClick={() => {
            setStep("idle");
            setTxHash(null);
            setTokenId(null);
          }}
          className="mt-3 w-full btn-secondary py-2 text-sm"
        >
          再铸造一个
        </button>
      </div>
    );
  }

  const getButtonLabel = () => {
    switch (step) {
      case "uploading":
        return "📤 上传到 IPFS...";
      case "minting":
        return "⛓️ 铸造中...";
      default:
        return "🚀 铸造 NFT";
    }
  };

  return (
    <div>
      {error && step === "error" && (
        <p className="text-red-400 text-sm bg-red-400/10 rounded-lg px-4 py-2 border border-red-400/20 mb-3">
          ❌ {error}
        </p>
      )}

      {step === "minting" && txHash && (
        <p className="text-yellow-400 text-xs mb-2 text-center">
          交易已提交，等待确认...
          <a
            href={`https://sepolia.etherscan.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline ml-1"
          >
            查看
          </a>
        </p>
      )}

      <button
        onClick={handleMint}
        disabled={step === "uploading" || step === "minting" || !account || !imageUrl}
        className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {(step === "uploading" || step === "minting") ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin">⏳</span>
            {getButtonLabel()}
          </span>
        ) : (
          getButtonLabel()
        )}
      </button>

      <p className="text-xs text-gray-500 mt-2 text-center">
        铸造费用约 0.01 ETH + Gas 费用
      </p>
    </div>
  );
}
