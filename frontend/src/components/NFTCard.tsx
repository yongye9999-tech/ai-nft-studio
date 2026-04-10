"use client";

import Image from "next/image";
import { ipfsToHttp } from "@/lib/ipfs";

interface NFTCardProps {
  tokenId: number;
  name: string;
  image: string;
  creator: string;
  price?: string;
  action?: "buy" | "view";
  onAction?: () => void;
}

export function NFTCard({ tokenId, name, image, creator, price, action = "view", onAction }: NFTCardProps) {
  const truncateAddress = (address: string) =>
    `${address.slice(0, 6)}...${address.slice(-4)}`;

  const imageUrl = image.startsWith("ipfs://") ? ipfsToHttp(image) : image;

  return (
    <div className="card group cursor-pointer">
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-white/5">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-gray-600">
            🖼️
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="text-white font-semibold truncate mb-1">{name || `NFT #${tokenId}`}</h3>
        <p className="text-gray-500 text-xs font-mono truncate mb-3">
          by {truncateAddress(creator)}
        </p>

        <div className="flex items-center justify-between">
          {price && (
            <div>
              <p className="text-xs text-gray-500">Price</p>
              <p className="text-brand-400 font-bold">{price} ETH</p>
            </div>
          )}

          {action === "buy" && (
            <button
              onClick={onAction}
              className="ml-auto btn-primary text-sm py-2 px-4"
            >
              Buy Now
            </button>
          )}
          {action === "view" && (
            <button
              onClick={onAction}
              className="ml-auto btn-secondary text-sm py-2 px-4"
            >
              View
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
