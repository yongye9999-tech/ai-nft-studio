import Link from "next/link";

const features = [
  {
    icon: "🤖",
    title: "AI 图像生成",
    description: "支持 HuggingFace Stable Diffusion 和 OpenAI DALL-E 3 双引擎，通过文本描述即可生成独特的数字艺术作品。",
  },
  {
    icon: "⛓️",
    title: "链上铸造",
    description: "一键将 AI 生成的艺术作品铸造为 ERC721 NFT，元数据永久存储在 IPFS 上，支持 ERC2981 版税标准。",
  },
  {
    icon: "🏪",
    title: "NFT 交易市场",
    description: "完整的买卖和拍卖功能，平台手续费仅 2.5%，支持多链：Ethereum Sepolia、Polygon Amoy、BNB 测试网。",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col items-center">
      {/* ── Hero ── */}
      <section className="relative w-full flex flex-col items-center justify-center px-4 py-28 text-center overflow-hidden">
        {/* Background gradient blobs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-purple-700/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-pink-700/30 rounded-full blur-3xl" />

        <span className="inline-block mb-4 px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
          AI + Web3 · NFT Studio
        </span>

        <h1 className="text-5xl md:text-7xl font-extrabold mb-6 bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent leading-tight">
          AI NFT Studio
        </h1>

        <p className="max-w-2xl text-lg md:text-xl text-gray-300 mb-10">
          输入一段文字描述，让 AI 为你创作独一无二的数字艺术作品，<br />
          一键铸造为 NFT，在区块链上永久保存并交易。
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/create" className="btn-primary text-lg px-8 py-4">
            🎨 开始创作
          </Link>
          <Link href="/marketplace" className="btn-secondary text-lg px-8 py-4">
            🏪 浏览市场
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-3 gap-8 text-center">
          {[
            { label: "AI 引擎", value: "2" },
            { label: "支持链", value: "3" },
            { label: "版税标准", value: "ERC2981" },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-3xl font-bold text-white">{s.value}</div>
              <div className="text-sm text-gray-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="w-full max-w-5xl px-4 pb-20">
        <h2 className="text-center text-3xl font-bold text-white mb-12">
          核心特性
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="glass rounded-2xl p-6 hover:border-purple-500/40 transition-colors"
            >
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="text-xl font-semibold text-white mb-3">{f.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="w-full max-w-3xl px-4 pb-20 text-center">
        <div className="glass rounded-2xl p-10">
          <h2 className="text-3xl font-bold text-white mb-4">准备好开始了吗？</h2>
          <p className="text-gray-400 mb-8">
            连接你的钱包，输入创意描述，让 AI 帮你创作独特的 NFT 作品。
          </p>
          <Link href="/create" className="btn-primary text-lg px-10 py-4">
            立即创作 →
          </Link>
        </div>
      </section>
    </div>
  );
}
