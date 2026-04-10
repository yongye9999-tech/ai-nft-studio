// next.config.js — Next.js configuration for AI+NFT Studio frontend
// Configures allowed image domains for NFT artwork served from IPFS and AI providers.

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      "gateway.pinata.cloud",
      "ipfs.io",
      "via.placeholder.com",
      "oaidalleapiprodscus.blob.core.windows.net",
    ],
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
    ],
  },
  // Enable experimental server actions
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000"],
    },
  },
};

module.exports = nextConfig;
