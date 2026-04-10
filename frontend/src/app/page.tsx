// src/app/page.tsx — Home page for AI+NFT Studio
// Hero section, feature cards, and footer.

import Link from "next/link";

const features = [
  {
    icon: "🤖",
    title: "AI 图像生成",
    description:
      "输入文字描述，选择艺术风格，AI 在几秒内为你创作独一无二的数字艺术作品。支持 Stable Diffusion XL 和 DALL-E 3 两大引擎。",
    color: "from-purple-600/20 to-purple-800/10",
    border: "border-purple-700/30",
  },
  {
    icon: "⛓️",
    title: "链上铸造",
    description:
      "一键将 AI 作品铸造为 ERC-721 NFT，元数据永久存储在 IPFS 上，版权归属自动写入区块链，支持 ERC-2981 版税标准。",
    color: "from-cyan-600/20 to-cyan-800/10",
    border: "border-cyan-700/30",
  },
  {
    icon: "🏪",
    title: "NFT 市场",
    description:
      "在内置的去中心化市场挂单出售或参与竞拍。平台自动分配版税给原创者，透明、公平、无需信任中介。",
    color: "from-pink-600/20 to-pink-800/10",
    border: "border-pink-700/30",
  },
];

const stats = [
  { value: "10K+", label: "AI 作品已创作" },
  { value: "3", label: "支持测试网络" },
  { value: "2", label: "AI 生成引擎" },
  { value: "2.5%", label: "平台手续费" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="hero-section bg-grid">
        {/* Background blobs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl" />

        <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 badge-purple mb-6 text-sm">
            <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
            AI + Web3 一站式创作平台
          </div>

          {/* Title */}
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6">
            <span className="gradient-text-animated">AI+NFT Studio</span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-300 mb-4 max-w-3xl mx-auto leading-relaxed">
            用文字描述你的创意，AI 即刻生成艺术作品
          </p>
          <p className="text-lg text-gray-400 mb-10 max-w-2xl mx-auto">
            一键铸造为 NFT，永久确权，自由交易 — 让每个人都成为数字艺术家
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/create" className="btn-primary text-lg px-8 py-4">
              🎨 创作 AI 艺术
            </Link>
            <Link href="/marketplace" className="btn-secondary text-lg px-8 py-4">
              🏪 探索市场
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────── */}
      <section className="py-16 border-y border-purple-800/20">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((stat) => (
            <div key={stat.label}>
              <div className="text-3xl md:text-4xl font-extrabold gradient-text mb-1">
                {stat.value}
              </div>
              <div className="text-gray-400 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              全流程{" "}
              <span className="gradient-text">AI+NFT</span>{" "}
              创作体验
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              从灵感到作品，从作品到资产，我们为你打通每个环节
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div
                key={i}
                className={`neon-card p-8 bg-gradient-to-br ${feature.color} border ${feature.border}`}
              >
                <div className="text-5xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section className="py-24 px-4 bg-gradient-to-b from-transparent to-purple-950/20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            三步完成你的{" "}
            <span className="gradient-text">NFT 旅程</span>
          </h2>
          <p className="text-gray-400 mb-16">简单直观，新手也能轻松上手</p>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "输入创意", desc: "用文字描述你的艺术想法，选择风格（赛博朋克/水彩/油画等）" },
              { step: "02", title: "AI 生成", desc: "Stable Diffusion 或 DALL-E 3 在几秒内生成高质量图像" },
              { step: "03", title: "铸造 & 交易", desc: "上传 IPFS，铸造 ERC-721 NFT，在市场自由买卖" },
            ].map((item) => (
              <div key={item.step} className="glass-card p-8 text-left">
                <div className="text-5xl font-black gradient-text mb-4 opacity-50">{item.step}</div>
                <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                <p className="text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="py-12 px-4 border-t border-purple-800/20">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <span className="text-xl font-bold gradient-text">AI+NFT Studio</span>
            <p className="text-gray-500 text-sm mt-1">© 2024-2026 AI NFT Studio Contributors</p>
          </div>
          <div className="flex gap-6 text-gray-400 text-sm">
            <Link href="/create" className="hover:text-purple-400">创作</Link>
            <Link href="/marketplace" className="hover:text-purple-400">市场</Link>
            <Link href="/profile" className="hover:text-purple-400">个人</Link>
            <a
              href="https://github.com/your-org/ai-nft-studio"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-purple-400"
            >
              GitHub
            </a>
          </div>
          <div className="flex gap-2 text-xs text-gray-600">
            <span className="badge-purple">MIT License</span>
            <span className="badge-cyan">Open Source</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
