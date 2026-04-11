"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Sparkles, Menu, X, Home, PlusCircle, Store, User } from "lucide-react";
import { ConnectWallet } from "./ConnectWallet";

const navLinks = [
  { href: "/", label: "首页", icon: Home },
  { href: "/create", label: "创作", icon: PlusCircle },
  { href: "/marketplace", label: "市场", icon: Store },
  { href: "/profile", label: "我的", icon: User },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="gradient-text hidden sm:block">AI NFT Studio</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                pathname === href
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </div>

        {/* Connect Wallet + Mobile Menu */}
        <div className="flex items-center gap-3">
          <ConnectWallet />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-xl glass text-gray-400 hover:text-white"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#0a0814]/95 backdrop-blur-xl">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-6 py-4 text-sm font-medium transition-all border-b border-white/5 ${
                pathname === href
                  ? "text-indigo-300 bg-indigo-500/10"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
