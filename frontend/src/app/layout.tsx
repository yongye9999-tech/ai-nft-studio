import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'
import { Web3Provider } from '@/components/Web3Provider'
import Navbar from '@/components/Navbar'

export const metadata: Metadata = {
  title: 'AI+NFT Studio',
  description: 'AI驱动的NFT创作与交易平台 — 生成、铸造、交易一站式体验',
  keywords: ['NFT', 'AI', 'blockchain', '区块链', '数字艺术', 'DALL-E', 'Stable Diffusion'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="font-sans bg-[#0f0f1a] text-white min-h-screen flex flex-col">
        <Web3Provider>
          <Navbar />
          <main className="pt-16 flex-1">{children}</main>
          <footer className="border-t border-gray-800/50 mt-16 py-6 text-center text-xs text-gray-600">
            <div className="flex items-center justify-center gap-6">
              <span>© 2025 AI+NFT Studio</span>
              <Link href="/terms" className="hover:text-gray-400 transition-colors">服务条款</Link>
              <Link href="/privacy" className="hover:text-gray-400 transition-colors">隐私政策</Link>
              <Link href="/report" className="hover:text-gray-400 transition-colors">举报内容</Link>
            </div>
          </footer>
        </Web3Provider>
      </body>
    </html>
  )
}
