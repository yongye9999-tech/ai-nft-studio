# 系统架构文档

> AI+NFT Studio — 技术架构详述

---

## 一、系统总览

```
┌─────────────────────────────────────────────────────────────────────┐
│                           用户端 (Browser)                           │
│                                                                     │
│  ┌──────────┐  ┌───────────┐  ┌────────────┐  ┌───────────────┐   │
│  │  首页     │  │  创作页面  │  │  交易市场   │  │   个人中心    │   │
│  └────┬─────┘  └─────┬─────┘  └──────┬─────┘  └───────┬───────┘   │
│       └──────────────┴───────────────┴────────────────┘            │
│                      Next.js 15 App Router                          │
│              ┌──────────────────────────────────────┐              │
│              │     Web3Provider (ethers.js v6)       │              │
│              │  account / chainId / signer / connect │              │
│              └──────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
              │                  │                  │
      ┌───────▼───────┐  ┌──────▼──────┐  ┌────────▼────────┐
      │   AI 引擎层    │  │  IPFS 存储层 │  │    区块链层      │
      │               │  │             │  │                  │
      │ HuggingFace   │  │   Pinata    │  │ AINFTCollection  │
      │ SDXL-1.0      │  │   (图片)    │  │ (ERC721+ERC2981) │
      │               │  │             │  │                  │
      │ OpenAI        │  │   Pinata    │  │ NFTMarketplace   │
      │ DALL-E 3      │  │  (元数据)   │  │ (列表+拍卖)       │
      └───────────────┘  └─────────────┘  └──────────────────┘
```

---

## 二、前端层 (Frontend Layer)

### 技术栈

| 组件 | 技术 | 说明 |
|------|------|------|
| 框架 | Next.js 15 (App Router) | 服务端渲染 + API Routes |
| 语言 | TypeScript 5 | 强类型安全 |
| 样式 | Tailwind CSS 3 | 暗色主题 (bg-gray-900 / violet) |
| Web3 | ethers.js v6 | 钱包连接、合约调用 |
| HTTP | axios | AI API 和 IPFS 请求 |

### 关键组件

```
src/
├── app/
│   ├── page.tsx            # 首页 (Hero + 功能卡片)
│   ├── create/page.tsx     # 创作页面 (AI生成 + 铸造)
│   ├── marketplace/page.tsx # 交易市场 (列表 + 拍卖)
│   ├── profile/page.tsx    # 个人中心
│   └── api/
│       ├── generate/route.ts # AI图像生成 API
│       └── upload/route.ts   # IPFS上传 API
├── components/
│   ├── Web3Provider.tsx    # 全局 Web3 上下文
│   ├── Navbar.tsx          # 导航栏
│   ├── ConnectWallet.tsx   # 钱包连接按钮
│   ├── AIGenerator.tsx     # AI 生成面板
│   ├── MintButton.tsx      # NFT 铸造按钮
│   └── NFTCard.tsx         # NFT 卡片组件
├── lib/
│   ├── contracts.ts        # 合约 ABI 和地址
│   ├── ipfs.ts             # IPFS 工具函数
│   └── ai-engines.ts       # AI 引擎封装
└── hooks/
    └── useContract.ts      # 合约交互 Hooks
```

---

## 三、AI 引擎层 (AI Engine Layer)

### HuggingFace SDXL

```
用户提示词
    │
    ▼
样式增强 (STYLE_PROMPTS)
    │
    ▼
POST https://api-inference.huggingface.co/models/
     stabilityai/stable-diffusion-xl-base-1.0
    │
    ▼
返回: ArrayBuffer (JPEG) → Base64 Data URI
```

### OpenAI DALL-E 3

```
用户提示词
    │
    ▼
样式增强 (STYLE_PROMPTS)
    │
    ▼
POST https://api.openai.com/v1/images/generations
     model: dall-e-3, size: 1024x1024
    │
    ▼
返回: 图片 URL (CDN 链接)
```

### 6 种艺术风格

| ID | 中文名 | 英文提示词关键词 |
|----|--------|----------------|
| cyberpunk | 赛博朋克 | neon city, futuristic |
| watercolor | 水彩 | soft colors, wet paper |
| oilpaint | 油画 | thick brushstrokes, impressionist |
| pixel | 像素艺术 | 8-bit, retro game sprite |
| anime | 日本动漫 | manga, clean line art |
| 3d | 3D 渲染 | octane render, photorealistic |

---

## 四、IPFS 存储层

```
生成图片 (Base64)
    │
    ▼
POST /api/upload (Next.js API Route)
    │
    ├─→ Pinata pinFileToIPFS → ipfs://QmImageCID
    │
    └─→ Pinata pinJSONToIPFS (含 image URI)
            → ipfs://QmMetadataCID
                │
                ▼
           传入 mint() 函数
```

### 元数据结构 (ERC721 Metadata Standard)

```json
{
  "name": "NFT 名称",
  "description": "描述文字",
  "image": "ipfs://QmImageCID",
  "attributes": [
    { "trait_type": "Creator", "value": "AI+NFT Studio" },
    { "trait_type": "Royalty", "value": "5%" }
  ],
  "created_by": "AI+NFT Studio",
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

---

## 五、区块链层 (Blockchain Layer)

### AINFTCollection.sol

```
ERC721 (NFT 标准)
  ├── ERC721URIStorage (per-token metadata URI)
  ├── ERC2981 (版税标准, 最高 10%)
  └── Ownable (管理员权限)

核心函数:
  mint(address to, string uri) payable → tokenId
  setMintFee(uint256 fee)
  setDefaultRoyalty(address, uint96)
  withdraw()
```

### NFTMarketplace.sol

```
Ownable + ReentrancyGuard

固定价格:
  listItem(nftContract, tokenId, price)
  buyItem(nftContract, tokenId) payable
    ├── ERC2981 版税自动分发
    ├── 平台手续费 2.5%
    └── 余额转给卖家
  cancelListing(nftContract, tokenId)

拍卖:
  createAuction(nftContract, tokenId, startPrice, duration)
  placeBid(nftContract, tokenId) payable
    └── 自动退款上一个竞价者
  endAuction(nftContract, tokenId)
    ├── 结算版税 + 手续费
    └── 转移 NFT 给最高竞价者
```

### 支持链

| 链 | ChainId | 用途 |
|----|---------|------|
| Ethereum Sepolia | 11155111 | ETH 测试网 |
| Polygon Amoy | 80002 | MATIC 测试网 |
| BNB Testnet | 97 | BNB 测试网 |
| Localhost (Hardhat) | 31337 | 本地开发 |

---

## 六、数据流

```
用户输入提示词
    │
    ▼
AIGenerator 组件
    │
    ▼
POST /api/generate
    ├── HuggingFace API 或 OpenAI API
    └── 返回 imageUrl + imageData
    │
    ▼
用户填写 NFT 信息 (名称/描述/版税)
    │
    ▼
POST /api/upload
    ├── 上传图片至 Pinata IPFS
    ├── 构建元数据 JSON
    └── 上传元数据至 Pinata IPFS
    │
    ▼
MintButton 触发
    │
    ▼
AINFTCollection.mint(address, metadataUri)
    ├── 支付 0.01 ETH mintFee
    ├── 铸造 ERC721 Token
    └── 绑定 tokenURI → IPFS 元数据
    │
    ▼
NFT 铸造成功 → 显示交易哈希
```
