# AI NFT Studio — 系统架构

## 架构全景图

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户浏览器 (Client)                        │
│                                                                   │
│   ┌─────────────┐  ┌───────────────┐  ┌──────────────────────┐  │
│   │  Next.js 14  │  │ Web3Provider  │  │  ethers.js v6 SDK    │  │
│   │  React 18   │  │  (Context)    │  │  合约交互层           │  │
│   └──────┬──────┘  └───────┬───────┘  └──────────┬───────────┘  │
│          │                 │                      │              │
└──────────┼─────────────────┼──────────────────────┼─────────────┘
           │ HTTP/HTTPS      │ MetaMask RPC          │ JSON-RPC
           ▼                 │                       ▼
┌──────────────────────┐     │         ┌─────────────────────────┐
│   Next.js API 路由    │     │         │     EVM 区块链网络        │
│  (Server-Side)        │     │         │                         │
│  ┌────────────────┐  │     │         │  ┌───────────────────┐  │
│  │ /api/generate  │  │     │         │  │ AINFTCollection   │  │
│  │ AI 图像生成      │  │     │         │  │ ERC721+ERC2981   │  │
│  └────────────────┘  │     │         │  └───────────────────┘  │
│  ┌────────────────┐  │     │         │  ┌───────────────────┐  │
│  │ /api/upload    │  │     │         │  │  NFTMarketplace   │  │
│  │ IPFS 元数据上传  │  │     │         │  │  上架/购买/拍卖   │  │
│  └────────────────┘  │     │         │  └───────────────────┘  │
└──────────────────────┘     │         └─────────────────────────┘
           │                 │
           ▼                 └─────────────────┐
┌──────────────────────┐                       │
│  外部 AI 服务         │                       ▼
│                      │           ┌────────────────────┐
│  HuggingFace SDXL   │           │   MetaMask 钱包      │
│  OpenAI DALL-E 3    │           │   Sepolia / Amoy /  │
└──────────────────────┘           │   BNB Testnet       │
           │                       └────────────────────┘
           ▼
┌──────────────────────┐
│   Pinata IPFS        │
│   图片 + JSON 元数据  │
│   去中心化永久存储    │
└──────────────────────┘
```

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 智能合约 | Solidity 0.8.20 | ERC721 + ERC2981 + 拍卖市场 |
| 合约框架 | Hardhat + OpenZeppelin | 编译、测试、部署 |
| 前端框架 | Next.js 14 (App Router) | SSR + API Routes |
| UI 样式 | Tailwind CSS | 深色主题响应式设计 |
| Web3 | ethers.js v6 | 钱包连接 + 合约调用 |
| AI 引擎 | HuggingFace / OpenAI | Stable Diffusion XL / DALL-E 3 |
| IPFS | Pinata | 去中心化图片和元数据存储 |
| 语言 | TypeScript | 全栈类型安全 |

## 数据流说明

### NFT 铸造流程

```
1. 用户输入文本描述 + 选择艺术风格
        ↓
2. 前端调用 /api/generate
        ↓
3. 服务端调用 HuggingFace 或 OpenAI API 生成图片
        ↓
4. 前端展示生成的图片，用户填写 NFT 名称和描述
        ↓
5. 用户点击「铸造 NFT」→ 前端调用 /api/upload
        ↓
6. 服务端将图片上传到 Pinata IPFS → 获得 imageCID
        ↓
7. 服务端构建 ERC721 标准 metadata JSON 并上传 → 获得 tokenURI
        ↓
8. 前端使用 ethers.js 调用 AINFTCollection.mint(tokenURI)
        ↓
9. 用户通过 MetaMask 签名交易，支付 mintFee + Gas
        ↓
10. 链上铸造完成，NFTMinted 事件触发，Token ID 返回
```

### NFT 交易流程

```
1. 卖家授权市场合约 (setApprovalForAll)
        ↓
2. 卖家调用 NFTMarketplace.listItem(nftContract, tokenId, price)
        ↓
3. ItemListed 事件触发，前端展示新上架 NFT
        ↓
4. 买家调用 NFTMarketplace.buyItem(listingId) + 发送 ETH
        ↓
5. 合约自动分配：ERC2981 版税 → 版税接收方
                              平台手续费 2.5% → 待提款池
                              剩余金额 → 卖家
        ↓
6. NFT 所有权转移给买家，ItemSold 事件触发
```

## 智能合约架构

### AINFTCollection.sol

```
AINFTCollection
├── ERC721 (NFT 标准)
├── ERC721URIStorage (每 Token 独立 URI)
├── ERC2981 (版税标准，默认 5%)
└── Ownable (权限管理)

状态变量:
  _nextTokenId  → 自增 Token ID
  mintFee       → 铸造手续费 (wei)

核心函数:
  mint(tokenURI)       → 铸造 NFT，收取 mintFee
  setMintFee(fee)      → 更新铸造费 (仅 Owner)
  setDefaultRoyalty()  → 更新版税配置 (仅 Owner)
  withdraw()           → 提取手续费 (仅 Owner)
```

### NFTMarketplace.sol

```
NFTMarketplace
├── Ownable (平台手续费管理)
└── ReentrancyGuard (防重入攻击)

数据结构:
  Listing  → 固定价格上架信息
  Auction  → 英式拍卖信息

核心函数:
  listItem()     → 上架 NFT (固定价格)
  buyItem()      → 购买上架 NFT，自动分配资金
  cancelListing() → 取消上架
  createAuction() → 创建英式拍卖，锁定 NFT
  placeBid()     → 出价，自动退还上一个出价者
  endAuction()   → 结束拍卖，分配资金并转移 NFT
  withdraw()     → 提取平台手续费 (仅 Owner)
```
