import Image from "next/image";

interface NFTCardProps {
  name: string;
  description: string;
  image: string;
  price?: string;
  creator: string;
  onAction?: () => void;
  actionLabel?: string;
  actionDisabled?: boolean;
}

function shortenAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function resolveImageUrl(src: string): string {
  if (src.startsWith("ipfs://")) {
    return `https://ipfs.io/ipfs/${src.slice(7)}`;
  }
  return src;
}

export default function NFTCard({
  name,
  description,
  image,
  price,
  creator,
  onAction,
  actionLabel,
  actionDisabled,
}: NFTCardProps) {
  const imageUrl = resolveImageUrl(image);

  return (
    <div className="glass rounded-2xl overflow-hidden hover:border-purple-500/40 transition-all duration-200 group">
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-white/5">
        <Image
          src={imageUrl}
          alt={name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          unoptimized
        />
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="text-white font-semibold text-sm truncate mb-1">{name}</h3>
        <p className="text-gray-400 text-xs line-clamp-2 mb-3">{description}</p>

        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-gray-500">
            创作者：<span className="text-gray-300">{shortenAddress(creator)}</span>
          </span>
          {price && (
            <span className="text-purple-400 font-bold text-sm">{price} ETH</span>
          )}
        </div>

        {onAction && (
          <button
            onClick={onAction}
            disabled={actionDisabled}
            className="w-full btn-primary py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {actionLabel || "查看"}
          </button>
        )}
      </div>
    </div>
  );
}
