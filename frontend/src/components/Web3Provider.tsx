"use client";

import { ReactNode } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { sepolia, polygonAmoy, bscTestnet, hardhat } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, getDefaultConfig, darkTheme } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";

const config = getDefaultConfig({
  appName: "AI NFT Studio",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "ai-nft-studio-placeholder",
  chains: [hardhat, sepolia, polygonAmoy, bscTestnet],
  transports: {
    [hardhat.id]: http("http://127.0.0.1:8545"),
    [sepolia.id]: http(
      process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://rpc.sepolia.org"
    ),
    [polygonAmoy.id]: http(
      process.env.NEXT_PUBLIC_POLYGON_AMOY_RPC_URL ||
        "https://rpc-amoy.polygon.technology"
    ),
    [bscTestnet.id]: http(
      process.env.NEXT_PUBLIC_BNB_TESTNET_RPC_URL ||
        "https://data-seed-prebsc-1-s1.binance.org:8545"
    ),
  },
  ssr: true,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
});

interface Web3ProviderProps {
  children: ReactNode;
}

export function Web3Provider({ children }: Web3ProviderProps) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#6366f1",
            accentColorForeground: "white",
            borderRadius: "medium",
            fontStack: "system",
            overlayBlur: "small",
          })}
          locale="zh-CN"
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
