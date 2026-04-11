import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "@/components/Web3Provider";
import { Navbar } from "@/components/Navbar";
import { Toaster } from "react-hot-toast";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "AI NFT Studio | AI驱动的NFT创作与交易平台",
  description:
    "使用AI生成独特数字艺术，一键铸造NFT并在去中心化市场交易。支持HuggingFace Stable Diffusion + OpenAI DALL-E双引擎。",
  keywords: ["AI NFT", "NFT生成", "区块链", "数字艺术", "Web3", "Stable Diffusion", "DALL-E"],
  openGraph: {
    title: "AI NFT Studio",
    description: "AI驱动的NFT生成与交易平台",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="dark">
      <body className={`${inter.variable} antialiased bg-[#0a0814] text-white`}>
        <Web3Provider>
          <Navbar />
          <main className="min-h-screen pt-16">{children}</main>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "#1e1b4b",
                color: "#ffffff",
                border: "1px solid rgba(99, 102, 241, 0.3)",
              },
              success: {
                iconTheme: { primary: "#6366f1", secondary: "#ffffff" },
              },
              error: {
                iconTheme: { primary: "#ef4444", secondary: "#ffffff" },
              },
            }}
          />
        </Web3Provider>
      </body>
    </html>
  );
}
