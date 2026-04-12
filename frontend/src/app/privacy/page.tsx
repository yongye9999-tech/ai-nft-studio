import Link from 'next/link'

export const metadata = {
  title: '隐私政策 | AI+NFT Studio',
  description: 'AI+NFT Studio 隐私政策',
}

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold gradient-text mb-2">🔐 隐私政策</h1>
      <p className="text-gray-500 text-sm mb-8">最后更新：2025年1月</p>

      <div className="space-y-8 text-gray-300 leading-relaxed">
        <section className="glass-card p-6">
          <h2 className="text-xl font-semibold text-white mb-3">1. 我们收集的信息</h2>
          <div className="space-y-3">
            <p>
              <strong className="text-violet-300">区块链地址：</strong>
              当您连接钱包时，我们读取您的公开区块链地址以识别您的身份。区块链地址是公开信息。
            </p>
            <p>
              <strong className="text-violet-300">生成内容：</strong>
              您输入的 AI 生成提示词可能被传递给第三方 AI 服务（HuggingFace、OpenAI）进行处理。
              请勿在提示词中包含个人敏感信息。
            </p>
            <p>
              <strong className="text-violet-300">IPFS 数据：</strong>
              您上传的图片和 NFT 元数据存储在 IPFS 去中心化网络上，是永久公开可访问的。
            </p>
            <p>
              <strong className="text-violet-300">日志数据：</strong>
              我们的服务器可能记录标准 HTTP 请求日志（IP 地址、时间戳、请求路径），用于安全监控和故障排查。
            </p>
          </div>
        </section>

        <section className="glass-card p-6">
          <h2 className="text-xl font-semibold text-white mb-3">2. 我们如何使用信息</h2>
          <ul className="list-disc list-inside space-y-1 text-gray-400">
            <li>提供和改善平台功能</li>
            <li>内容安全审核（防止违规内容生成）</li>
            <li>安全监控和欺诈防范</li>
            <li>响应法律请求（如 DMCA 举报）</li>
          </ul>
        </section>

        <section className="glass-card p-6">
          <h2 className="text-xl font-semibold text-white mb-3">3. 第三方服务</h2>
          <div className="space-y-3">
            <p>我们使用以下第三方服务，各有其独立的隐私政策：</p>
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              <li>
                <a href="https://huggingface.co/privacy" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline">
                  HuggingFace
                </a>{' '}
                — AI 图像生成
              </li>
              <li>
                <a href="https://openai.com/privacy" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline">
                  OpenAI
                </a>{' '}
                — DALL-E 3 图像生成及内容审核
              </li>
              <li>
                <a href="https://pinata.cloud/privacy" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline">
                  Pinata
                </a>{' '}
                — IPFS 文件存储
              </li>
            </ul>
          </div>
        </section>

        <section className="glass-card p-6">
          <h2 className="text-xl font-semibold text-white mb-3">4. 数据安全</h2>
          <p>
            我们采取合理的安全措施保护您的数据。但请注意，区块链上的数据（包括 NFT 元数据、
            交易记录）是永久公开的，无法删除或修改。
          </p>
        </section>

        <section className="glass-card p-6">
          <h2 className="text-xl font-semibold text-white mb-3">5. 您的权利</h2>
          <p>
            在适用法律（如 GDPR）允许的范围内，您有权要求访问、更正或删除我们持有的您的个人数据。
            请注意，区块链上的数据不在此范围内（技术上无法删除）。
          </p>
        </section>

        <section className="glass-card p-6">
          <h2 className="text-xl font-semibold text-white mb-3">6. Cookie</h2>
          <p>
            本平台使用最少量的功能性 Cookie 以维持用户会话。我们不使用跟踪 Cookie 或第三方广告 Cookie。
          </p>
        </section>
      </div>

      <div className="mt-8 flex gap-4">
        <Link href="/" className="btn-secondary text-sm px-4 py-2">← 返回首页</Link>
        <Link href="/terms" className="text-violet-400 hover:text-violet-300 text-sm self-center">
          服务条款 →
        </Link>
      </div>
    </div>
  )
}
