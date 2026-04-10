// src/components/NFTCard.tsx — Reusable NFT card component
// Displays NFT image, name, price, creator address (truncated), and action button.

"use client";

import Image from "next/image";

interface NFTCardProps {
  name: string;
  imageUrl: string | null;
  priceEth: string | null;
  creator: string;
  action?: "buy" | "view" | "list" | "cancel";
  loading?: boolean;
  onAction?: () => void;
}

const ACTION_LABELS: Record<string, string> = {
  buy: "购买",
  view: "查看",
  list: "上架出售",
  cancel: "取消挂单",
};

const ACTION_STYLES: Record<string, string> = {
  buy: "btn-primary",
  view: "btn-secondary",
  list: "btn-secondary",
  cancel: "px-4 py-2 rounded-lg border border-red-700/40 text-red-400 text-sm hover:bg-red-900/20 transition-all",
};

function truncateAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function NFTCard({
  name,
  imageUrl,
  priceEth,
  creator,
  action = "view",
  loading = false,
  onAction,
}: NFTCardProps) {
  return (
    <div className="neon-card overflow-hidden group">
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-[#0f0f1a]">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            sizes="(max-width: 768px) 100vw, 240px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            unoptimized={imageUrl.startsWith("data:")}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-5xl opacity-30">🖼️</span>
          </div>
        )}
        {/* Price badge overlay */}
        {priceEth && (
          <div className="absolute top-3 right-3 badge-purple text-xs backdrop-blur-sm">
            {priceEth} ETH
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-100 truncate mb-1">{name || "Untitled NFT"}</h3>

        <div className="flex items-center gap-2 mb-3">
          <span className="text-gray-600 text-xs">创作者</span>
          <span className="text-gray-400 text-xs font-mono">{truncateAddress(creator)}</span>
        </div>

        {priceEth && (
          <div className="flex items-baseline gap-1 mb-4">
            <span className="text-xs text-gray-500">售价</span>
            <span className="text-lg font-bold gradient-text">{priceEth}</span>
            <span className="text-xs text-gray-500">ETH</span>
          </div>
        )}

        {onAction && (
          <button
            onClick={onAction}
            disabled={loading}
            className={`w-full text-sm py-2.5 flex items-center justify-center gap-2 ${ACTION_STYLES[action]}`}
          >
            {loading ? (
              <>
                <span className="spinner" />
                处理中...
              </>
            ) : (
              ACTION_LABELS[action]
            )}
          </button>
        )}
      </div>
    </div>
  );
}
