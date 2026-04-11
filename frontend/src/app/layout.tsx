import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Web3Provider } from '@/components/Web3Provider'
import Navbar from '@/components/Navbar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AI+NFT Studio',
  description: 'AI驱动的NFT创作与交易平台 — 生成、铸造、交易一站式体验',
  keywords: 'NFT, AI, blockchain, 区块链, 数字艺术, DALL-E, Stable Diffusion',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" className="dark">
      <body className={`${inter.className} bg-[#0f0f1a] text-white min-h-screen`}>
        <Web3Provider>
          <Navbar />
          <main className="pt-16">{children}</main>
        </Web3Provider>
      </body>
    </html>
  )
}
