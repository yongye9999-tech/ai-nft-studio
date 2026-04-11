"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { ethers } from "ethers";
import toast from "react-hot-toast";
import { Zap, Loader2 } from "lucide-react";
import { NFT_COLLECTION_ABI, NFT_COLLECTION_ADDRESS } from "@/lib/contracts";

interface MintButtonProps {
  ipfsUri: string;
  royaltyBps?: number;
  onSuccess?: (tokenId: number) => void;
  disabled?: boolean;
}

export function MintButton({
  ipfsUri,
  royaltyBps = 500,
  onSuccess,
  disabled = false,
}: MintButtonProps) {
  const { address, isConnected } = useAccount();
  const [minting, setMinting] = useState(false);

  const handleMint = async () => {
    if (!isConnected || !address) {
      toast.error("请先连接钱包");
      return;
    }
    if (!ipfsUri) {
      toast.error("请先上传至IPFS");
      return;
    }
    if (!window.ethereum) {
      toast.error("未检测到以太坊钱包");
      return;
    }

    setMinting(true);
    const toastId = toast.loading("⏳ 铸造交易确认中...");

    try {
      const provider = new ethers.BrowserProvider(window.ethereum as ethers.Eip1193Provider);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        NFT_COLLECTION_ADDRESS,
        NFT_COLLECTION_ABI,
        signer
      );

      const mintFee = await contract.mintFee();
      const tx = await contract.mintNFT(ipfsUri, address, royaltyBps, {
        value: mintFee,
      });

      const receipt = await tx.wait();

      // Parse NFTMinted event for tokenId
      let tokenId: number | null = null;
      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog(log);
          if (parsed?.name === "NFTMinted") {
            tokenId = Number(parsed.args[0]);
            break;
          }
        } catch {
          // Not this event
        }
      }

      toast.dismiss(toastId);
      toast.success(`🎉 NFT铸造成功！Token ID: #${tokenId}`);

      if (onSuccess && tokenId !== null) {
        onSuccess(tokenId);
      }
    } catch (err: unknown) {
      toast.dismiss(toastId);
      const message =
        err instanceof Error
          ? err.message.includes("user rejected")
            ? "用户取消了交易"
            : err.message.slice(0, 100)
          : "铸造失败，请重试";
      toast.error(message);
    } finally {
      setMinting(false);
    }
  };

  return (
    <button
      onClick={handleMint}
      disabled={minting || disabled || !isConnected || !ipfsUri}
      className="btn-primary w-full flex items-center justify-center gap-2 py-4"
    >
      {minting ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          铸造中...
        </>
      ) : (
        <>
          <Zap className="w-5 h-5" />
          铸造NFT ({royaltyBps / 100}%版税)
        </>
      )}
    </button>
  );
}
