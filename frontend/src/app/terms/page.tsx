import Link from 'next/link'

export const metadata = {
  title: '服务条款 | AI+NFT Studio',
  description: 'AI+NFT Studio 服务条款与用户协议',
}

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold gradient-text mb-2">📜 服务条款</h1>
      <p className="text-gray-500 text-sm mb-8">最后更新：2025年1月</p>

      <div className="space-y-8 text-gray-300 leading-relaxed">
        <section className="glass-card p-6">
          <h2 className="text-xl font-semibold text-white mb-3">1. 接受条款</h2>
          <p>
            使用 AI+NFT Studio（以下简称&ldquo;平台&rdquo;）即表示您同意本服务条款。如不同意，请勿使用本平台。
          </p>
        </section>

        <section className="glass-card p-6">
          <h2 className="text-xl font-semibold text-white mb-3">2. AI 生成内容的版权说明</h2>
          <div className="space-y-3">
            <p>
              <strong className="text-yellow-400">⚠️ 重要声明：</strong>
              AI 生成内容的版权归属在全球各司法管辖区仍存在法律不确定性。
              使用本平台生成内容的用户须自行承担相关的法律风险和责任。
            </p>
            <p>
              本平台不保证任何 AI 生成内容的版权归属或商业可用性。用户在铸造 NFT 前应自行评估相关法律风险。
            </p>
            <p>
              使用他人版权作品（包括艺术家风格、品牌 Logo 等）作为生成提示词可能侵犯第三方权利，用户须对此负全部责任。
            </p>
          </div>
        </section>

        <section className="glass-card p-6">
          <h2 className="text-xl font-semibold text-white mb-3">3. 禁止内容</h2>
          <p className="mb-3">用户不得生成或铸造以下类型的 NFT：</p>
          <ul className="list-disc list-inside space-y-1 text-gray-400">
            <li>色情、淫秽或性暗示内容</li>
            <li>涉及未成年人的任何不当内容</li>
            <li>暴力、血腥或煽动仇恨的内容</li>
            <li>侵犯他人版权、商标或知识产权的内容</li>
            <li>虚假信息、欺诈性内容</li>
            <li>违反中国及国际适用法律的任何内容</li>
          </ul>
        </section>

        <section className="glass-card p-6">
          <h2 className="text-xl font-semibold text-white mb-3">4. NFT 交易与智能合约</h2>
          <div className="space-y-3">
            <p>
              本平台使用经过审计的智能合约进行 NFT 铸造和交易。区块链交易具有不可逆性，
              用户在确认任何交易前应仔细核查所有信息。
            </p>
            <p>
              平台不对以下情况承担责任：用户因操作失误导致的资产损失、
              网络拥堵导致的交易延迟、第三方钱包软件的安全问题。
            </p>
            <p>
              平台收取 2.5% 的交易手续费，以支持平台运营和持续开发。
            </p>
          </div>
        </section>

        <section className="glass-card p-6">
          <h2 className="text-xl font-semibold text-white mb-3">5. 免责声明</h2>
          <p>
            本平台以&ldquo;现状&rdquo;提供，不作任何明示或暗示的保证，包括但不限于适销性、
            特定用途适用性或非侵权性。在适用法律允许的最大范围内，
            平台对因使用或无法使用本服务造成的任何直接、间接、偶然或后果性损失不承担责任。
          </p>
        </section>

        <section className="glass-card p-6">
          <h2 className="text-xl font-semibold text-white mb-3">6. DMCA 版权投诉</h2>
          <p>
            如您认为平台上的某件 NFT 侵犯了您的版权，请通过{' '}
            <Link href="/report" className="text-violet-400 hover:text-violet-300 underline">
              举报页面
            </Link>{' '}
            提交 DMCA 举报。我们将在核实后采取适当措施，包括紧急下架涉嫌侵权内容。
          </p>
        </section>

        <section className="glass-card p-6">
          <h2 className="text-xl font-semibold text-white mb-3">7. 条款修改</h2>
          <p>
            平台保留随时修改本条款的权利，修改后将在本页面更新并注明日期。
            继续使用平台即视为接受修改后的条款。
          </p>
        </section>
      </div>

      <div className="mt-8 flex gap-4">
        <Link href="/" className="btn-secondary text-sm px-4 py-2">← 返回首页</Link>
        <Link href="/privacy" className="text-violet-400 hover:text-violet-300 text-sm self-center">
          隐私政策 →
        </Link>
      </div>
    </div>
  )
}
