'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import ConnectWallet from './ConnectWallet'

const NAV_LINKS = [
  { href: '/', label: '首页' },
  { href: '/create', label: '创作' },
  { href: '/marketplace', label: '市场' },
  { href: '/profile', label: '个人' },
]

export default function Navbar() {
  const pathname = usePathname()

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0f0f1a]/90 backdrop-blur-md border-b border-gray-800/50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 text-lg font-bold">
          <span className="text-2xl">🎨</span>
          <span className="gradient-text hidden sm:inline">AI NFT Studio</span>
        </Link>

        {/* Nav Links */}
        <nav className="flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-violet-600/20 text-violet-300'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Connect Wallet */}
        <ConnectWallet />
      </div>
    </header>
  )
}
