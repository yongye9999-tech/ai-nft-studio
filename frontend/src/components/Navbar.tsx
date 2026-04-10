// src/components/Navbar.tsx — Navigation bar for AI+NFT Studio
// Shows logo, nav links, and ConnectWallet button.

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ConnectWallet from "./ConnectWallet";

const NAV_LINKS = [
  { href: "/", label: "首页" },
  { href: "/create", label: "创作" },
  { href: "/marketplace", label: "市场" },
  { href: "/profile", label: "个人" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-purple-800/20 backdrop-blur-md"
      style={{ background: "rgba(15, 15, 26, 0.85)" }}
    >
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="text-2xl">🎨</span>
          <span className="gradient-text">AI+NFT Studio</span>
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                pathname === link.href
                  ? "bg-purple-900/50 text-purple-200"
                  : "text-gray-400 hover:text-gray-100 hover:bg-white/5"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Wallet button */}
        <div className="flex items-center gap-3">
          <ConnectWallet />
          {/* Mobile menu hint */}
          <div className="md:hidden flex gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`p-2 rounded-lg text-sm transition-colors ${
                  pathname === link.href ? "text-purple-400" : "text-gray-500"
                }`}
              >
                {link.label.slice(0, 1)}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
