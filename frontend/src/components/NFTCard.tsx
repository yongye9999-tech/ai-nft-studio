"use client";

import { ethers } from "ethers";
import { ImageIcon, ExternalLink, ShoppingCart } from "lucide-react";

interface NFTCardProps {
  listingId: number;
  tokenId: number;
  name: string;
  image: string;
  description: string;
  price: bigint;
  seller: string;
  onBuy: () => void;
  viewMode?: "grid" | "list";
}

export function NFTCard({
  listingId,
  tokenId,
  name,
  image,
  description,
  price,
  seller,
  onBuy,
  viewMode = "grid",
}: NFTCardProps) {
  const shortSeller = `${seller.slice(0, 6)}...${seller.slice(-4)}`;
  const priceEth = ethers.formatEther(price);

  if (viewMode === "list") {
    return (
      <div className="glass rounded-2xl p-4 flex items-center gap-4 hover:border-indigo-500/30 border border-transparent transition-all">
        <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-indigo-900/50 to-purple-900/50">
          {image ? (
            <img src={image} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-gray-600" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white truncate">{name}</h3>
          <p className="text-gray-500 text-xs">Token #{tokenId} · by {shortSeller}</p>
          {description && (
            <p className="text-gray-400 text-sm mt-1 truncate">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="text-right">
            <div className="font-bold text-white">{priceEth} ETH</div>
            <div className="text-xs text-gray-500">Listing #{listingId}</div>
          </div>
          <button onClick={onBuy} className="btn-primary py-2 px-4 flex items-center gap-1 text-sm">
            <ShoppingCart className="w-4 h-4" />
            购买
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="nft-card group">
      {/* Image */}
      <div className="aspect-square bg-gradient-to-br from-indigo-900/50 to-purple-900/50 relative overflow-hidden">
        {image ? (
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-16 h-16 text-gray-600" />
          </div>
        )}
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
          <button
            onClick={onBuy}
            className="btn-primary py-2 px-6 flex items-center gap-2 text-sm"
          >
            <ShoppingCart className="w-4 h-4" />
            立即购买
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-bold text-white truncate flex-1">{name}</h3>
          <a
            href="#"
            className="text-gray-600 hover:text-indigo-400 transition-colors flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        <p className="text-gray-500 text-xs mb-2">
          Token #{tokenId} · 卖家: {shortSeller}
        </p>

        {description && (
          <p className="text-gray-400 text-xs line-clamp-2 mb-3">{description}</p>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-white/5">
          <div>
            <div className="text-xs text-gray-500 mb-0.5">售价</div>
            <div className="font-bold text-white text-lg">{priceEth} <span className="text-sm text-gray-400">ETH</span></div>
          </div>
          <button
            onClick={onBuy}
            className="btn-primary py-2 px-4 text-sm flex items-center gap-1"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            购买
          </button>
        </div>
      </div>
    </div>
  );
}
