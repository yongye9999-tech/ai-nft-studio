import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-6 py-20 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-900/30 via-transparent to-purple-900/20 pointer-events-none" />
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-brand-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl" />

        <div className="relative z-10 text-center max-w-4xl mx-auto">
          <div className="mb-6 inline-flex items-center gap-2 bg-brand-500/20 border border-brand-500/30 rounded-full px-4 py-1.5 text-sm text-brand-300">
            <span>✨</span>
            <span>AI-Powered NFT Generation Platform</span>
          </div>

          <h1 className="text-6xl md:text-8xl font-extrabold mb-6 leading-tight">
            <span className="gradient-text">AI+NFT</span>
            <br />
            <span className="text-white">Studio</span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-300 mb-4 max-w-2xl mx-auto">
            将你的创意变为链上艺术
          </p>
          <p className="text-lg text-gray-400 mb-10 max-w-2xl mx-auto">
            Transform your ideas into AI-generated NFT artwork. Describe what you imagine, generate
            stunning art, and mint it as an NFT in seconds.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/create" className="btn-primary text-center text-lg">
              🎨 Start Creating
            </Link>
            <Link href="/marketplace" className="btn-secondary text-center text-lg">
              🏪 Browse Marketplace
            </Link>
          </div>

          <div className="mt-14 grid grid-cols-3 gap-8 max-w-md mx-auto text-center">
            <div>
              <p className="text-3xl font-bold gradient-text">AI</p>
              <p className="text-sm text-gray-400 mt-1">Dual Engine</p>
            </div>
            <div>
              <p className="text-3xl font-bold gradient-text">ERC721</p>
              <p className="text-sm text-gray-400 mt-1">Standard NFT</p>
            </div>
            <div>
              <p className="text-3xl font-bold gradient-text">5%</p>
              <p className="text-sm text-gray-400 mt-1">Creator Royalty</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-white/2">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-white mb-4">
            Everything You Need
          </h2>
          <p className="text-center text-gray-400 mb-14 text-lg">
            From AI generation to on-chain trading — all in one platform
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="card p-8 text-center">
              <div className="text-5xl mb-4">🤖</div>
              <h3 className="text-xl font-bold text-white mb-3">AI Generation</h3>
              <p className="text-gray-400 leading-relaxed">
                Powered by HuggingFace Stable Diffusion XL and OpenAI DALL-E 3. Choose your style
                and let AI create stunning artwork from your text prompts.
              </p>
            </div>
            <div className="card p-8 text-center">
              <div className="text-5xl mb-4">⛓️</div>
              <h3 className="text-xl font-bold text-white mb-3">NFT Minting</h3>
              <p className="text-gray-400 leading-relaxed">
                Mint your AI artwork as ERC721 NFTs with automatic IPFS metadata storage via Pinata.
                Creator royalties (ERC2981) built-in from day one.
              </p>
            </div>
            <div className="card p-8 text-center">
              <div className="text-5xl mb-4">🏪</div>
              <h3 className="text-xl font-bold text-white mb-3">Marketplace</h3>
              <p className="text-gray-400 leading-relaxed">
                List NFTs at fixed prices or run English auctions. Royalties auto-distributed to
                creators on every secondary sale.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-white mb-4">How It Works</h2>
          <p className="text-center text-gray-400 mb-14 text-lg">
            From idea to NFT in 4 simple steps
          </p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { step: "01", icon: "✏️", title: "Describe", desc: "Type your creative vision in natural language" },
              { step: "02", icon: "🎨", title: "Generate", desc: "AI creates stunning artwork from your prompt" },
              { step: "03", icon: "⛓️", title: "Mint", desc: "Upload to IPFS and mint as ERC721 NFT on-chain" },
              { step: "04", icon: "💰", title: "Trade", desc: "List on marketplace, earn royalties forever" },
            ].map((item) => (
              <div key={item.step} className="relative text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-3xl">
                  {item.icon}
                </div>
                <div className="text-xs text-brand-400 font-mono mb-1">{item.step}</div>
                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl font-bold text-white mb-4">Ready to Create?</h2>
          <p className="text-gray-400 mb-8 text-lg">
            Connect your wallet and start generating AI NFT art today
          </p>
          <Link href="/create" className="btn-primary text-lg inline-block">
            🚀 Launch App
          </Link>
        </div>
      </section>
    </div>
  );
}
