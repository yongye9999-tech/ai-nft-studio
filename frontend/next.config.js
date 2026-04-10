// next.config.js — Next.js configuration for AI+NFT Studio frontend
// Configures allowed image domains for NFT artwork served from IPFS and AI providers.

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // images.domains is deprecated; use remotePatterns only (Next.js 15+)
    remotePatterns: [
      {
        protocol: "https",
        hostname: "gateway.pinata.cloud",
        pathname: "/ipfs/**",
      },
      {
        protocol: "https",
        hostname: "ipfs.io",
        pathname: "/ipfs/**",
      },
      {
        protocol: "https",
        hostname: "**.blob.core.windows.net",
      },
      {
        protocol: "https",
        hostname: "replicate.delivery",
      },
      {
        protocol: "https",
        hostname: "**.huggingface.co",
      },
      {
        protocol: "https",
        hostname: "via.placeholder.com",
      },
    ],
  },
  // serverActions is stable in Next.js 15+ — no longer under experimental
};

module.exports = nextConfig;
