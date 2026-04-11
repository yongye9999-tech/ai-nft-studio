# 🎨 AI NFT Studio

> AI驱动的NFT生成与交易平台 | AI-Powered NFT Generation & Trading Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-blue)](https://soliditylang.org)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org)
[![Hardhat](https://img.shields.io/badge/Hardhat-2.22-orange)](https://hardhat.org)

## 📖 简介

AI NFT Studio 融合了三个优秀开源项目的精华，提供从AI图像生成到NFT铸造再到去中心化市场交易的完整解决方案。

| 参考项目 | Stars | 借鉴要点 |
|---------|-------|---------|
| [dappuniversity/ai_nft_generator](https://github.com/dappuniversity/ai_nft_generator) | ⭐54 | HuggingFace AI + IPFS + Hardhat架构 |
| [kaymen99/AART-NFT-Marketplace](https://github.com/kaymen99/AART-NFT-Marketplace) | ⭐22 | ERC721+ERC2981版税 + 拍卖市场 |
| [net2devcrypto/Ai-NFT-Art-Contract-Web3-Site-Generator-JS](https://github.com/net2devcrypto/Ai-NFT-Art-Contract-Web3-Site-Generator-JS) | ⭐7 | OpenAI生成 + 铸造门户 |

---

## 🏗️ 项目架构

```
ai-nft-studio/
├── contracts/                    # 智能合约层
│   ├── src/
│   │   ├── AINFTCollection.sol   # ERC721 + ERC2981 版税 NFT
│   │   └── NFTMarketplace.sol    # 上架/购买/拍卖市场
│   ├── scripts/deploy.js         # 部署脚本
│   ├── test/                     # 完整单元测试
│   └── hardhat.config.js         # 多链配置
│
├── frontend/                     # Next.js 14 前端
│   ├── src/app/
│   │   ├── page.tsx              # 首页 (Hero + 特性)
│   │   ├── create/page.tsx       # AI创作 → IPFS → 铸造
│   │   ├── marketplace/page.tsx  # NFT交易市场
│   │   ├── profile/page.tsx      # 个人主页
│   │   └── api/                  # 服务端API (AI生成 + IPFS上传)
│   ├── src/components/           # UI 组件 (6个)
│   ├── src/lib/                  # AI引擎 + IPFS + 合约配置
│   └── src/hooks/                # Web3 Hooks
│
├── docs/                         # 文档
│   ├── ARCHITECTURE.md           # 系统架构说明
│   ├── DEPLOYMENT.md             # 部署指南
│   └── BUSINESS_MODEL.md         # 商业模式分析
│
├── .github/workflows/test.yml    # CI/CD 自动化测试
├── .env.example                  # 环境变量模板
└── README.md                     # 本文档
```

---

## 🔑 核心特性

| 特性 | 说明 |
|------|------|
| 🤖 **双AI引擎** | HuggingFace Stable Diffusion XL (免费) + OpenAI DALL-E 3 |
| 🎨 **6种艺术风格** | 赛博朋克 / 水彩 / 油画 / 像素艺术 / 日本动漫 / 3D渲染 |
| 📦 **IPFS永久存储** | Pinata去中心化存储图片和元数据 |
| ⚡ **ERC721 + ERC2981** | NFT标准 + 版税自动分配 |
| 🏪 **完整市场** | 固定价格上架 + 拍卖竞价 |
| 💰 **自动版税分配** | 每次二次销售自动向创作者分配版税 |
| ⛓️ **多链支持** | Ethereum Sepolia / Polygon Amoy / BNB Testnet |
| 🔒 **合约安全** | ReentrancyGuard + 拉取模式提款 + 完整单元测试 |

---

## ⚡ 快速开始

### 1. 克隆并安装依赖

```bash
git clone https://github.com/yongye9999-tech/ai-nft-studio.git
cd ai-nft-studio

# 配置环境变量
cp .env.example .env
# 编辑 .env 填入你的 API Keys

# 安装所有依赖
npm install
cd contracts && npm install && cd ..
cd frontend && npm install && cd ..
```

### 2. 启动本地区块链

```bash
# 终端 1: 启动 Hardhat 节点
npm run contracts:node
```

### 3. 部署合约

```bash
# 终端 2: 部署到本地
npm run contracts:deploy:local
# 将输出的合约地址填入 .env
```

### 4. 启动前端

```bash
# 终端 3: 启动开发服务器
npm run dev
# 访问 http://localhost:3000
```

### 5. 运行测试

```bash
npm run contracts:test
```

---

## 🔧 环境变量

复制 `.env.example` 为 `.env` 并填写：

```env
# AI 引擎
HUGGINGFACE_API_KEY=hf_xxxx        # 免费: huggingface.co/settings/tokens
OPENAI_API_KEY=sk-xxxx             # 可选: platform.openai.com/api-keys

# IPFS 存储
PINATA_API_KEY=xxxx                # 免费1GB: app.pinata.cloud/keys
PINATA_SECRET_KEY=xxxx

# 区块链
PRIVATE_KEY=0x你的钱包私钥          # ⚠️ 切勿提交到Git！
SEPOLIA_RPC_URL=https://...        # Alchemy/Infura

# 合约地址 (部署后填写)
NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS=0x...
```

---

## 📝 合约说明

### AINFTCollection.sol

```solidity
// 铸造NFT（付费）
function mintNFT(
    string calldata tokenURI,      // IPFS元数据URI
    address royaltyReceiver,       // 版税接收地址
    uint96 royaltyBps              // 版税比例 (500 = 5%)
) external payable returns (uint256 tokenId)

// 管理员免费铸造
function ownerMint(address to, string calldata tokenURI, ...) external onlyOwner

// 提取平台铸造费
function withdraw() external onlyOwner
```

### NFTMarketplace.sol

```solidity
// 上架NFT
function listItem(address nftContract, uint256 tokenId, uint256 price) returns (uint256 listingId)

// 购买NFT（自动分配版税）
function buyItem(uint256 listingId) external payable

// 创建拍卖
function createAuction(..., uint256 duration) returns (uint256 auctionId)

// 出价
function placeBid(uint256 auctionId) external payable

// 结束拍卖
function endAuction(uint256 auctionId) external
```

---

## 🌐 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 智能合约 | Solidity + Hardhat | 0.8.24 + 2.22 |
| 合约标准 | OpenZeppelin | 5.0 |
| 前端框架 | Next.js (App Router) | 14 |
| 样式 | Tailwind CSS | 3.4 |
| Web3 | ethers.js | 6.13 |
| 钱包连接 | RainbowKit + Wagmi | 2.1 + 2.10 |
| AI生成 | HuggingFace API | - |
| AI生成 | OpenAI API | DALL-E 3 |
| IPFS | Pinata | - |

---

## 📚 文档

- [系统架构](docs/ARCHITECTURE.md) — 详细的技术架构说明
- [部署指南](docs/DEPLOYMENT.md) — 从本地到生产的完整部署流程
- [商业模式](docs/BUSINESS_MODEL.md) — 平台收入模型分析

---

## ⚠️ 免责声明

本项目仅供**学习和研究**目的，具体包括：

1. 本项目不构成任何投资建议
2. NFT市场存在高度不确定性和价值波动风险
3. 使用AI生成内容时，请遵守相关服务的使用条款
4. 智能合约已经过基本测试，但未经专业审计，请勿用于大额资产操作
5. 私钥安全是用户自身责任，请妥善保管

---

## 📄 开源协议

[MIT License](LICENSE) © 2024 yongye9999-tech

---

<div align="center">
  <sub>Built with ❤️ using AI + Web3</sub>
</div>
