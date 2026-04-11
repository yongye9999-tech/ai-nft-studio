import Link from "next/link";
import { Sparkles, Zap, Shield, Globe, TrendingUp, Users } from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "双AI引擎",
    description: "HuggingFace Stable Diffusion + OpenAI DALL-E 3，生成高质量独特艺术作品",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
  },
  {
    icon: Zap,
    title: "一键铸造",
    description: "自动上传至IPFS，构建元数据，调用智能合约，30秒完成NFT铸造",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
  },
  {
    icon: Shield,
    title: "ERC2981版税",
    description: "版税标准保障创作者权益，每次二次销售自动分配5%版税收益",
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
  },
  {
    icon: Globe,
    title: "多链支持",
    description: "支持 Ethereum Sepolia / Polygon Amoy / BNB Testnet，灵活选择网络",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
  {
    icon: TrendingUp,
    title: "拍卖市场",
    description: "支持固定价格上架和拍卖竞价，2.5%平台手续费，透明公平",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
  },
  {
    icon: Users,
    title: "创作者档案",
    description: "个人主页展示作品集，追踪版税收益，管理上架与拍卖状态",
    color: "text-pink-400",
    bg: "bg-pink-500/10",
    border: "border-pink-500/20",
  },
];

const stats = [
  { value: "6种", label: "AI艺术风格" },
  { value: "2.5%", label: "平台手续费" },
  { value: "5%", label: "默认版税" },
  { value: "3链", label: "多链支持" },
];

export default function HomePage() {
  return (
    <div className="relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 bg-[#0a0814] -z-10" />
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse-slow delay-1000" />
      </div>

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center px-4">
        <div className="max-w-6xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-medium mb-8 animate-float">
            <Sparkles className="w-4 h-4" />
            AI × NFT × Web3
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
            <span className="gradient-text">AI创作</span>
            <br />
            <span className="text-white">铸造独特NFT</span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-300 mb-4 max-w-3xl mx-auto leading-relaxed">
            输入文字描述，AI秒速生成专属数字艺术
          </p>
          <p className="text-lg text-gray-400 mb-12 max-w-2xl mx-auto">
            支持 HuggingFace Stable Diffusion + OpenAI DALL-E 3 双引擎
            <br />
            一键铸造到区块链，在去中心化市场交易变现
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-4 justify-center mb-16">
            <Link href="/create" className="btn-primary text-lg px-8 py-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              开始创作
            </Link>
            <Link href="/marketplace" className="btn-secondary text-lg px-8 py-4 flex items-center gap-2">
              <Globe className="w-5 h-5" />
              探索市场
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {stats.map((stat) => (
              <div key={stat.label} className="glass rounded-xl p-4 text-center">
                <div className="text-2xl font-black gradient-text">{stat.value}</div>
                <div className="text-sm text-gray-400 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              为什么选择 <span className="gradient-text">AI NFT Studio</span>？
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              融合最优秀的开源项目精华，为创作者提供完整的AI NFT生命周期管理
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className={`glass rounded-2xl p-6 border ${feature.border} hover:scale-105 transition-all duration-300 group`}
                >
                  <div className={`inline-flex p-3 rounded-xl ${feature.bg} ${feature.border} border mb-4`}>
                    <Icon className={`w-6 h-6 ${feature.color}`} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:gradient-text transition-all">
                    {feature.title}
                  </h3>
                  <p className="text-gray-400 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="relative py-24 px-4 bg-section">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              三步创作你的 <span className="gradient-text">AI NFT</span>
            </h2>
          </div>

          <div className="space-y-8">
            {[
              {
                step: "01",
                title: "描述你的创意",
                desc: "输入文字提示词，选择艺术风格（赛博朋克/水彩/油画/像素/动漫/3D），AI自动生成高质量图像",
              },
              {
                step: "02",
                title: "自动上传IPFS",
                desc: "生成的图像和元数据通过Pinata自动上传到IPFS，获得永久去中心化存储链接",
              },
              {
                step: "03",
                title: "铸造并交易",
                desc: "一键调用智能合约铸造ERC721 NFT，可选择固定价格上架或开启竞价拍卖",
              },
            ].map((item, i) => (
              <div key={item.step} className="flex gap-6 items-start group">
                <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-2xl font-black text-white group-hover:scale-110 transition-transform">
                  {item.step}
                </div>
                <div className="glass rounded-2xl p-6 flex-1 hover:border-indigo-500/30 border border-transparent transition-all">
                  <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-gray-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link href="/create" className="btn-primary text-lg px-10 py-4">
              立即开始创作 →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 px-4 mt-24">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <span className="font-bold gradient-text">AI NFT Studio</span>
            </div>
            <p className="text-gray-500 text-sm text-center">
              ⚠️ 免责声明：本项目仅供学习研究，不构成投资建议。NFT市场存在风险，请谨慎参与。
            </p>
            <p className="text-gray-600 text-sm">MIT License © 2024</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
