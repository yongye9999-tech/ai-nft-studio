// src/app/layout.tsx — Root layout for AI+NFT Studio
// Sets up global metadata, Inter font, Web3Provider context, and Navbar.

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { Web3Provider } from "@/components/Web3Provider";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "AI+NFT Studio",
    template: "%s | AI+NFT Studio",
  },
  description:
    "用 AI 创作独一无二的数字艺术，铸造为 NFT，在去中心化市场自由流通。Powered by Stable Diffusion & DALL-E 3.",
  keywords: ["NFT", "AI Art", "Web3", "Blockchain", "Stable Diffusion", "DALL-E", "Ethereum"],
  authors: [{ name: "AI NFT Studio Contributors" }],
  openGraph: {
    title: "AI+NFT Studio",
    description: "Create AI artwork, mint as NFT, trade on-chain.",
    type: "website",
    locale: "zh_CN",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI+NFT Studio",
    description: "Create AI artwork, mint as NFT, trade on-chain.",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className={inter.variable}>
      <body className="bg-[#0f0f1a] text-gray-100 antialiased min-h-screen">
        <Web3Provider>
          <Navbar />
          <main className="pt-16">{children}</main>
        </Web3Provider>
      </body>
    </html>
  );
}
