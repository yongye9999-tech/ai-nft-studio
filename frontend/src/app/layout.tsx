import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { Web3ProviderWrapper } from "@/components/Web3Provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI NFT Studio | AI 驱动的 NFT 生成与交易平台",
  description:
    "通过文本描述生成 AI 艺术作品，一键铸造为 NFT 并在市场上交易。支持 HuggingFace 和 OpenAI DALL-E 双引擎。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <Web3ProviderWrapper>
          <Navbar />
          <main className="pt-16 min-h-screen">{children}</main>
          <footer className="mt-20 border-t border-white/10 py-8 text-center text-gray-500 text-sm">
            <p>
              © 2024 AI NFT Studio · 本平台仅供学习和研究目的，不构成投资建议。
            </p>
          </footer>
        </Web3ProviderWrapper>
      </body>
    </html>
  );
}
