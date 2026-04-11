import Link from 'next/link'

const features = [
  {
    icon: '🤖',
    title: 'AI 生成',
    description: '支持 HuggingFace SDXL 与 OpenAI DALL-E 3 双引擎，输入提示词即可生成独一无二的数字艺术',
    gradient: 'from-purple-600 to-indigo-600',
  },
  {
    icon: '🔨',
    title: 'NFT 铸造',
    description: 'ERC721 标准，支持 ERC2981 版税设置，图片和元数据自动上传至 IPFS，永久存储',
    gradient: 'from-blue-600 to-cyan-600',
  },
  {
    icon: '🛒',
    title: '交易市场',
    description: '固定价格上架或创建拍卖，内置版税自动分发，平台手续费仅 2.5%，支持多链网络',
    gradient: 'from-pink-600 to-rose-600',
  },
]

export default function HomePage() {
  return (
    <div className="flex flex-col items-center">
      {/* ── Hero Section ──────────────────────────────────────────────────── */}
      <section className="relative w-full min-h-[85vh] flex flex-col items-center justify-center px-4 overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-700/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-700/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 text-center max-w-4xl mx-auto">
          <div className="mb-4 inline-flex items-center gap-2 bg-violet-900/30 border border-violet-700/50 rounded-full px-4 py-1.5 text-sm text-violet-300">
            <span className="animate-pulse w-2 h-2 bg-violet-400 rounded-full" />
            支持 Sepolia · Polygon Amoy · BNB Testnet
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold mt-6 mb-6 leading-tight">
            <span className="gradient-text">AI+NFT Studio</span>
          </h1>

          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            用 AI 创作专属数字艺术，一键铸造成 NFT，在去中心化市场自由交易。
            <br className="hidden md:block" />
            从灵感到链上，全程只需几分钟。
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/create">
              <button className="btn-primary text-lg px-8 py-3">
                🎨 开始创作
              </button>
            </Link>
            <Link href="/marketplace">
              <button className="btn-secondary text-lg px-8 py-3">
                🛒 浏览市场
              </button>
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-md mx-auto">
            {[
              { value: '6', label: '艺术风格' },
              { value: '2', label: 'AI 引擎' },
              { value: '3', label: '区块链网络' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold gradient-text">{stat.value}</div>
                <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature Cards ─────────────────────────────────────────────────── */}
      <section className="w-full max-w-6xl px-4 pb-24">
        <h2 className="text-3xl font-bold text-center mb-12 gradient-text">核心功能</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="glass-card p-8 nft-card group cursor-default"
            >
              <div
                className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-2xl mb-5 group-hover:scale-110 transition-transform duration-200`}
              >
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
              <p className="text-gray-400 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="w-full bg-gradient-to-r from-violet-900/30 to-blue-900/30 border-t border-b border-violet-800/30 py-16 px-4 text-center">
        <h2 className="text-3xl font-bold mb-4">准备好开始了吗？</h2>
        <p className="text-gray-400 mb-8 max-w-xl mx-auto">
          连接钱包，输入你的创意，AI 帮你完成剩下的一切。
        </p>
        <Link href="/create">
          <button className="btn-primary text-lg px-10 py-4">
            立即体验 →
          </button>
        </Link>
      </section>
    </div>
  )
}
