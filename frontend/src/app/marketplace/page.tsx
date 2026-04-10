"use client";

import { useEffect, useState } from "react";
import { NFTCard } from "@/components/NFTCard";

interface ListedNFT {
  listingId: number;
  tokenId: number;
  nftContract: string;
  seller: string;
  price: string;
  name: string;
  image: string;
}

export default function MarketplacePage() {
  const [listings, setListings] = useState<ListedNFT[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Placeholder: load listings from contract
    // In production, call marketplace.getListedItems()
    setTimeout(() => {
      setListings([]);
      setLoading(false);
    }, 500);
  }, []);

  return (
    <div className="min-h-screen pt-20 px-6 pb-20">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
            🏪 NFT Marketplace
          </h1>
          <p className="text-gray-400 text-lg">
            Discover and collect AI-generated NFT artwork
          </p>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap gap-3 mb-8">
          {["All", "Fixed Price", "Auction", "Recently Listed"].map((filter) => (
            <button
              key={filter}
              className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-gray-300 text-sm hover:bg-brand-600/20 hover:border-brand-500/40 hover:text-white transition-all"
            >
              {filter}
            </button>
          ))}
        </div>

        {/* NFT Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="card aspect-square animate-pulse bg-white/5" />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🖼️</div>
            <h3 className="text-xl font-semibold text-white mb-2">No Listings Yet</h3>
            <p className="text-gray-400 mb-6">
              Be the first to list an NFT on the marketplace
            </p>
            <a href="/create" className="btn-primary inline-block">
              Create & Mint NFT
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {listings.map((nft) => (
              <NFTCard
                key={nft.listingId}
                tokenId={nft.tokenId}
                name={nft.name}
                image={nft.image}
                creator={nft.seller}
                price={nft.price}
                action="buy"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
