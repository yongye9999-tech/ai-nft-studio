# 🏗️ AI NFT Studio 系统架构文档

## 整体架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                      用户界面层                               │
│  Next.js 14 (App Router) + Tailwind CSS 深色主题              │
│  /create  /marketplace  /profile                            │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│                      服务端 API 层                            │
│  /api/generate  →  HuggingFace / OpenAI                     │
│  /api/upload    →  Pinata IPFS                              │
└────────────────────────────┬────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌───────────────────┐
│   AI 引擎层      │ │   IPFS 存储层    │ │   区块链合约层      │
│                 │ │                 │ │                   │
│  HuggingFace    │ │  Pinata API     │ │  AINFTCollection  │
│  Stable Diff XL │ │  ipfs://CID     │ │  (ERC721+ERC2981) │
│                 │ │                 │ │                   │
│  OpenAI         │ │  元数据 JSON    │ │  NFTMarketplace   │
│  DALL-E 3       │ │  图片文件       │ │  (上架+拍卖)       │
└─────────────────┘ └─────────────────┘ └───────────────────┘
```

---

## 核心模块说明

### 1. 智能合约层 (`contracts/`)

#### AINFTCollection.sol
- **继承**: ERC721URIStorage + ERC2981 + Ownable + ReentrancyGuard
- **核心功能**:
  - `mintNFT()` — 用户付费铸造，自动设置ERC2981版税
  - `ownerMint()` — 管理员免费铸造（空投/赠品）
  - `withdraw()` — 提取平台铸造费收入
  - `setMintFee()` — 动态调整铸造费
- **版税模型**: ERC2981标准，默认5%，最高10%
- **安全设计**: ReentrancyGuard防重入，Ownable权限控制

#### NFTMarketplace.sol
- **继承**: Ownable + ReentrancyGuard
- **核心功能**:
  - **固定价格**: `listItem()` → `buyItem()` → `cancelListing()`
  - **拍卖**: `createAuction()` → `placeBid()` → `endAuction()`
  - **提款**: `withdrawPending()` — 被超越出价安全提取
- **收益分配**: 平台2.5% + ERC2981版税 + 卖方收益
- **安全设计**: 拉取模式提款，防止重入攻击

---

### 2. 前端层 (`frontend/`)

#### 页面路由 (`src/app/`)

| 路由 | 功能 |
|------|------|
| `/` | 首页 — Hero + 特性介绍 + 操作引导 |
| `/create` | 创作页 — AI生成 + IPFS上传 + NFT铸造 |
| `/marketplace` | 市场页 — 浏览上架/拍卖NFT + 购买 |
| `/profile` | 个人页 — 我的NFT收藏 + 创作统计 |
| `/api/generate` | Server Action — AI图像生成代理 |
| `/api/upload` | Server Action — IPFS上传代理 |

#### 组件架构 (`src/components/`)

```
Web3Provider (RainbowKit + Wagmi + TanStack Query)
└── Navbar (导航栏 + 钱包连接)
└── ConnectWallet (RainbowKit自定义按钮)
└── AIGenerator (提示词输入 + 风格/引擎选择)
└── MintButton (调用合约mintNFT)
└── NFTCard (NFT展示卡片，支持grid/list)
```

#### 状态与数据流

```
用户输入提示词
    ↓
/api/generate → HuggingFace/OpenAI → 返回图片URL
    ↓
用户确认图片
    ↓
/api/upload → Pinata → 返回 ipfs:// URI
    ↓
MintButton → ethers.js → 智能合约 mintNFT()
    ↓
NFT铸造完成
```

---

### 3. AI 引擎层

#### HuggingFace Stable Diffusion XL
- **模型**: `stabilityai/stable-diffusion-xl-base-1.0`
- **特点**: 免费额度，图像质量高，支持1024×1024
- **响应**: 二进制流 → Base64编码

#### OpenAI DALL-E 3
- **模型**: `dall-e-3`
- **特点**: 理解自然语言能力强，支持HD质量
- **响应**: 临时URL（需要及时下载到IPFS）

#### 风格提示词增强

| 风格ID | 中文名 | 提示词增强 |
|--------|--------|-----------|
| cyberpunk | 赛博朋克 | neon lights, futuristic city... |
| watercolor | 水彩 | watercolor painting, soft colors... |
| oil_painting | 油画 | oil painting, rich textures... |
| pixel_art | 像素艺术 | pixel art, 8-bit retro... |
| anime | 日本动漫 | anime style, manga aesthetic... |
| 3d_render | 3D渲染 | octane render, ray tracing... |

---

### 4. IPFS 存储层

#### Pinata 集成
- **图片上传**: `POST /pinning/pinFileToIPFS`
- **元数据上传**: `POST /pinning/pinJSONToIPFS`
- **网关**: `https://gateway.pinata.cloud/ipfs/{CID}`

#### NFT 元数据结构 (ERC721 Metadata Standard)

```json
{
  "name": "My AI NFT #1",
  "description": "AI-generated artwork using Stable Diffusion",
  "image": "ipfs://Qm...",
  "attributes": [
    { "trait_type": "AI Engine", "value": "HuggingFace" },
    { "trait_type": "Art Style", "value": "cyberpunk" },
    { "trait_type": "Prompt", "value": "a cyberpunk cat..." }
  ],
  "external_url": "https://ai-nft-studio.xyz"
}
```

---

## 安全设计

### 合约安全
- **ReentrancyGuard** — 所有payable函数防重入
- **拉取模式 (Pull Payment)** — 拍卖出价退款使用pendingWithdrawals
- **输入验证** — 零地址检查、空URI检查、版税上限(10%)
- **费率上限** — 平台手续费不超过5%，版税不超过10%
- **Ownable权限** — 管理功能限制owner调用

### 前端安全
- **服务端API代理** — AI/IPFS密钥不暴露给客户端
- **环境变量分离** — `NEXT_PUBLIC_*` vs 服务端密钥
- **类型安全** — TypeScript严格模式

---

## 数据流图

```
Client Browser
│
├─ 连接钱包 (RainbowKit → MetaMask/WalletConnect)
│
├─ 创作流程
│   ├─ 输入提示词 → POST /api/generate
│   │   └─ Server → HuggingFace/OpenAI → 返回图片
│   │
│   ├─ 填写NFT信息 → POST /api/upload
│   │   └─ Server → Pinata (图片 + 元数据) → 返回 ipfs://
│   │
│   └─ 铸造 → ethers.js → AINFTCollection.mintNFT(ipfs://)
│       └─ 链上存储 tokenId → tokenURI 映射
│
└─ 市场流程
    ├─ 浏览 → JsonRpcProvider → NFTMarketplace.listings()
    ├─ 购买 → BrowserProvider/Signer → buyItem()
    └─ 拍卖 → placeBid() / endAuction()
```
