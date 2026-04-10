# AI+NFT Studio — 系统架构文档

> 本文档描述 AI+NFT Studio 的整体技术架构、设计决策及各模块的实现细节。

---

## 一、系统总览

```
                        ┌──────────────────────────────────────────────┐
                        │              用户浏览器 (Next.js 16)           │
                        │                                              │
                        │  /create         /marketplace    /profile    │
                        │  ┌───────────┐   ┌───────────┐  ┌────────┐  │
                        │  │AI生成页面 │   │ 市场页面  │  │个人页面│  │
                        │  └─────┬─────┘   └─────┬─────┘  └───┬────┘  │
                        │        │               │             │        │
                        │  ┌─────┴───────────────┴─────────────┴────┐  │
                        │  │       React 组件层 (App Router)         │  │
                        │  │  Web3Provider │ useWallet │ useNFT     │  │
                        │  └──────────────────────┬──────────────────┘  │
                        └─────────────────────────┼────────────────────┘
                                                   │
              ┌────────────────────┬───────────────┼──────────────────┐
              │                    │               │                  │
              ▼                    ▼               ▼                  ▼
   ┌──────────────────┐  ┌──────────────┐  ┌───────────────┐  ┌──────────────┐
   │  Next.js API     │  │  MetaMask /  │  │  Pinata       │  │  以太坊      │
   │  Routes          │  │  ethers.js   │  │  IPFS         │  │  智能合约    │
   │                  │  │  v6          │  │               │  │              │
   │  POST /generate  │  │  BrowserProv.│  │  图片 CID     │  │  AINFTColl.  │
   │  POST /upload    │  │  JsonRpcSign │  │  元数据 JSON  │  │  ERC-721     │
   └────────┬─────────┘  └──────────────┘  └───────────────┘  │  ERC-2981   │
            │                                                   │              │
   ┌────────┴───────────┐                                       │  Marketplace │
   │  AI 推理服务       │                                       │  挂单/竞拍  │
   │                    │                                       └──────────────┘
   │  HuggingFace API   │
   │  SDXL 1.0          │
   │                    │
   │  OpenAI API        │
   │  DALL-E 3          │
   └────────────────────┘
```

---

## 二、技术选型说明

### 2.1 智能合约层

| 选择 | 理由 |
|------|------|
| Solidity 0.8.26 | 最新稳定版本，内置溢出保护，`custom error` 节省 Gas |
| OpenZeppelin 5.x | 行业标准安全库，经过多次审计 |
| ERC-721 + URIStorage | 每个 Token 独立存储 IPFS URI，灵活且标准 |
| ERC-2981 版税标准 | 二级市场自动版税分配，无需平台特殊支持 |
| Hardhat | 最佳开发体验，内置测试框架，支持 TypeScript |

### 2.2 前端层

| 选择 | 理由 |
|------|------|
| Next.js 16 (App Router) | 文件路由、SSR/SSG、API Routes 一体化 |
| ethers.js v6 | 最新版 Web3 库，TypeScript 友好，Bundle 更小 |
| Tailwind CSS | 原子化 CSS，开发效率高，定制主题方便 |
| TypeScript | 全栈类型安全，减少 ABI 集成错误 |

### 2.3 AI 生成层

| 引擎 | 模型 | 特点 |
|------|------|------|
| HuggingFace | SDXL 1.0 | 免费额度，本地部署可选，返回二进制图片 |
| OpenAI | DALL-E 3 | 图片质量高，文字理解强，返回临时 URL |

---

## 三、智能合约设计

### 3.1 AINFTCollection

```
AINFTCollection
├── 继承
│   ├── ERC721              — 基础 NFT 标准
│   ├── ERC721URIStorage    — 每 Token 独立 URI
│   ├── ERC2981             — 版税信息标准
│   └── Ownable             — 权限控制
├── 状态
│   ├── _nextTokenId        — Token ID 计数器（从1开始）
│   └── mintFee             — 铸造手续费（wei）
├── 核心函数
│   ├── mint(tokenURI)      — 用户铸造 NFT，自动设置版税给铸造者
│   ├── setMintFee()        — 管理员调整铸造费
│   ├── setDefaultRoyalty() — 管理员设置默认版税
│   └── withdraw()          — 管理员提取合约余额
└── 安全机制
    ├── msg.value 检查
    ├── 多余 ETH 退款
    └── onlyOwner 权限控制
```

### 3.2 NFTMarketplace

```
NFTMarketplace
├── 继承
│   ├── Ownable             — 管理员权限
│   └── ReentrancyGuard     — 防重入攻击
├── 状态
│   ├── platformFee = 250   — 平台费 2.5%（基点）
│   ├── listings mapping    — 固定价格挂单
│   └── auctions mapping    — 竞拍
├── 挂单流程
│   └── listItem → buyItem（自动分配版税+平台费+卖家收益）
├── 竞拍流程
│   └── createAuction → placeBid（前高价者退款）→ endAuction
└── 版税分配
    └── 调用 IERC2981.royaltyInfo 获取版税信息，自动转账
```

---

## 四、前端架构

### 4.1 目录结构

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # 根布局（Navbar + Web3Provider）
│   ├── page.tsx            # 首页
│   ├── create/page.tsx     # AI 创作页
│   ├── marketplace/page.tsx# 市场页
│   ├── profile/page.tsx    # 个人主页
│   └── api/
│       ├── generate/       # AI 生成 API
│       └── upload/         # IPFS 上传 API
├── components/
│   ├── Web3Provider.tsx    # React Context for Web3 状态
│   ├── Navbar.tsx
│   ├── ConnectWallet.tsx
│   ├── NFTCard.tsx
│   ├── AIGenerator.tsx
│   └── MintButton.tsx
├── hooks/
│   ├── useWallet.ts        # 钱包状态 Hook
│   ├── useNFTContract.ts   # NFT 合约交互 Hook
│   └── useMarketplace.ts   # 市场合约交互 Hook
└── lib/
    ├── contracts.ts        # ABI + 地址映射
    ├── ipfs.ts             # IPFS 工具函数
    └── ai.ts               # AI 生成工具函数
```

### 4.2 状态管理

- **Web3 状态**：通过 `Web3Provider` React Context 全局共享 `provider/signer/account/chainId`
- **合约交互**：通过自定义 Hooks 封装 ethers.js 调用，组件只关注业务逻辑
- **页面状态**：使用 React `useState` 管理本地 UI 状态

---

## 五、AI 集成流程

```
用户输入 prompt + style
        │
        ▼
   前端 POST /api/generate
        │
        ├── engine=huggingface
        │   └── HuggingFace Inference API
        │       └── stabilityai/stable-diffusion-xl-base-1.0
        │           └── 返回二进制 PNG → base64 → 前端显示
        │
        └── engine=openai
            └── OpenAI Images API
                └── DALL-E 3, 1024x1024
                    └── 返回临时 URL → 前端显示
```

---

## 六、IPFS 存储方案

```
用户确认铸造
    │
    ▼
前端 POST /api/upload (FormData: image + name + desc + attrs)
    │
    ├── Step 1: 上传图片到 Pinata
    │   └── POST https://api.pinata.cloud/pinning/pinFileToIPFS
    │       └── 返回 imageIpfsHash (CID)
    │
    └── Step 2: 构建 + 上传元数据 JSON
        └── {name, description, image: "ipfs://CID", attributes: [...]}
            └── POST to Pinata → 返回 metadataIpfsHash
                └── tokenURI = "ipfs://metadataHash"
                    └── 传给合约 mint(tokenURI)
```

NFT 元数据格式（兼容 OpenSea 标准）：
```json
{
  "name": "NFT 名称",
  "description": "描述",
  "image": "ipfs://QmImageHash",
  "attributes": [
    { "trait_type": "Style", "value": "cyberpunk" },
    { "trait_type": "Engine", "value": "huggingface" }
  ]
}
```

---

## 七、安全考虑

| 风险点 | 防护措施 |
|--------|---------|
| 重入攻击 | NFTMarketplace 继承 `ReentrancyGuard` |
| 整数溢出 | Solidity 0.8+ 默认检查；使用 OpenZeppelin SafeMath 无需额外处理 |
| 私钥泄露 | `.env` 加入 `.gitignore`；合约部署使用独立测试钱包 |
| API 密钥泄露 | AI API 调用在服务端 (API Routes) 执行，不暴露给客户端 |
| IPFS 内容不变性 | 使用 CIDv1 (SHA2-256)，内容寻址确保不可篡改 |
| 平台费上限 | `setPlatformFee` 限制最高 10% (1000 bps) |
| 铸造费溢出退款 | `mint()` 函数自动退还多余 ETH |
