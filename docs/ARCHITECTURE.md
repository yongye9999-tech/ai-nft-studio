# 系统架构文档

## 整体架构

```
用户
 │
 ▼
Next.js 前端 (App Router)
 ├── /create      → AIGenerator → /api/generate ──→ HuggingFace / OpenAI
 │                               /api/upload  ──→ Pinata IPFS
 │                → MintButton → ethers.js ──────→ AINFTCollection.sol
 │
 ├── /marketplace → useMarketplace → ethers.js ──→ NFTMarketplace.sol
 │
 └── /profile     → useNFTContract → ethers.js ──→ AINFTCollection.sol
```

**数据流总结：**
1. 用户输入提示词 → 服务端 API 调用 AI 模型 → 返回 base64 图片
2. 图片上传 Pinata IPFS → 获取 CID → 构建元数据 JSON → 上传元数据 → 获取 tokenURI
3. 调用 `AINFTCollection.mint(tokenURI)` → NFT 铸造成功
4. 上架到 `NFTMarketplace` → 其他用户购买 → 自动分配版税和手续费

---

## 技术选型理由

### 为什么选 Hardhat？
- 以太坊生态最流行的 Solidity 开发框架（每周下载量 >200 万次）
- 内置本地链、调试器、Gas 报告
- 完善的 TypeScript 支持和插件生态

### 为什么选 Next.js 14？
- SSR + API Routes：AI 调用在服务端完成，保护 API Key 不暴露给客户端
- App Router：现代 React Server Components
- Vercel 部署零配置

### 为什么选双 AI 引擎？
| 引擎 | 优点 | 缺点 |
|---|---|---|
| HuggingFace SDXL | 免费，开源，可自托管 | 图片质量一般，速度慢 |
| OpenAI DALL-E 3 | 图片质量极高，理解提示词能力强 | 每张约 $0.04，需付费 |

用户可根据需求选择，形成差异化定价策略。

### 为什么选 Pinata IPFS？
- IPFS 网关稳定，SLA 保障
- 免费额度：1 GB 存储 + 100 次/月请求
- 支持 JWT 认证，安全性好
- 无需自建 IPFS 节点

---

## 合约架构

### AINFTCollection.sol

```
AINFTCollection
 ├── ERC721          — NFT 标准（转让、授权、查询）
 ├── ERC721URIStorage — 链上存储 tokenURI
 ├── ERC2981         — 版税标准（市场自动读取并支付版税）
 └── Ownable         — 合约管理权限
```

**核心逻辑：**
- `mint(tokenURI)` — 支付 mintFee 铸造 NFT
- `_creators` mapping — 记录每个 tokenId 的原始创作者
- 默认版税 5%（500 basis points），合约 Owner 可调整

### NFTMarketplace.sol

```
NFTMarketplace
 ├── ReentrancyGuard — 防重入攻击
 ├── Ownable         — 平台管理
 └── 内部逻辑
      ├── Fixed Listing — 固定价格上架/购买/取消
      └── Auction       — 英式拍卖（出价递增，自动退款）
```

**资金分配逻辑（每次成交）：**
```
售价 = 版税（ERC2981）+ 平台手续费（2.5%）+ 卖家所得
```

---

## 安全性设计

| 风险 | 防护措施 |
|---|---|
| 重入攻击 | `ReentrancyGuard` 修饰符 |
| 整数溢出 | Solidity 0.8.x 内置溢出检查 |
| API Key 泄露 | AI/IPFS 调用在 Next.js Server 端完成 |
| 权限控制 | `Ownable` + 自定义权限检查 |
| 手续费上限 | `platformFee` 不超过 10%（1000 bps）|

---

## 目录结构

```
ai-nft-studio/
├── contracts/                    # 智能合约（Hardhat）
│   ├── src/
│   │   ├── AINFTCollection.sol   # ERC721 NFT + ERC2981 版税
│   │   └── NFTMarketplace.sol    # 固定价格 + 拍卖市场
│   ├── scripts/deploy.js         # 部署脚本
│   ├── test/                     # 单元测试
│   └── hardhat.config.js         # 多链配置
│
├── frontend/                     # Next.js 14 前端
│   ├── src/app/                  # 页面（App Router）
│   │   ├── api/generate/         # AI 生成 API（服务端）
│   │   └── api/upload/           # IPFS 上传 API（服务端）
│   ├── src/components/           # UI 组件
│   ├── src/hooks/                # Web3 React Hooks
│   └── src/lib/                  # AI 引擎 + IPFS + 合约配置
│
└── docs/                         # 文档
```
