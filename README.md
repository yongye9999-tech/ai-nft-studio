# 🎨 AI+NFT Studio

```
   ___   _____   _  ___  ____  ______   _____ _             _ _
  / _ \ |_   _| | |/ / ||  __| |___  | / ____| |           | (_)
 / /_\ \  | |   | ' /  | |__     / /  | (___ | |_ _   _  __| |_  ___
 |  _  |  | |   |  <   |  __|   / /    \___ \| __| | | |/ _` | |/ _ \
 | | | | _| |_  | . \  | |     / /     ____) | |_| |_| | (_| | | (_) |
 |_| |_| |_____| |_|\_\ |_|   /_/     |_____/ \__|\__,_|\__,_|_|\___/
```

> 🤖 AI-Powered NFT Generation & Marketplace | AI驱动的NFT生成与交易平台

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-blue)](contracts/src/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](frontend/)
[![CI](https://github.com/yongye9999-tech/ai-nft-studio/actions/workflows/test.yml/badge.svg)](https://github.com/yongye9999-tech/ai-nft-studio/actions)

---

## 📖 项目简介 | Introduction

**中文：** AI+NFT Studio 是一个去中心化应用（DApp），让用户通过文字描述生成 AI 艺术作品，并一键铸造为 NFT 在链上市场交易。平台支持固定价格上架与英式拍卖，创作者版税通过 ERC2981 标准自动结算。

**English:** AI+NFT Studio is a decentralized application (DApp) that enables users to generate AI artwork from text prompts and mint them as NFTs with one click. The platform supports fixed-price listings and English auctions, with creator royalties automatically distributed via the ERC2981 standard.

---

## 🏗️ 系统架构 | Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        用户 / User                          │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Next.js 14 前端 / Frontend                │
│  ┌──────────┐  ┌──────────┐  ┌────────────┐  ┌──────────┐  │
│  │ /create  │  │/marketplace│ │ /profile   │  │ Navbar   │  │
│  └────┬─────┘  └─────┬────┘  └─────┬──────┘  └──────────┘  │
│       │              │             │                         │
│  ┌────▼──────────────▼─────────────▼────────────────────┐   │
│  │              API Routes (Server-side)                 │   │
│  │   /api/generate ─→ HuggingFace SDXL / OpenAI DALL-E  │   │
│  │   /api/upload   ─→ Pinata IPFS                        │   │
│  └───────────────────────────┬───────────────────────────┘   │
└──────────────────────────────│──────────────────────────────┘
                               │ ethers.js v6
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   智能合约 / Smart Contracts                 │
│  ┌─────────────────────┐   ┌──────────────────────────────┐  │
│  │  AINFTCollection    │   │     NFTMarketplace           │  │
│  │  ERC721+ERC2981     │◄──│  上架/购买/拍卖/版税分配     │  │
│  └─────────────────────┘   └──────────────────────────────┘  │
│           EVM 兼容链：Ethereum Sepolia / Polygon / BNB        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ 技术栈 | Tech Stack

| 层级 | 技术 | 说明 |
|---|---|---|
| **智能合约** | Solidity 0.8.20 | 主要合约语言 |
| **合约框架** | Hardhat 2.19 | 编译、测试、部署 |
| **合约标准** | OpenZeppelin v5 | ERC721, ERC2981, ReentrancyGuard |
| **前端框架** | Next.js 14 | App Router + SSR |
| **UI 库** | TailwindCSS 3 | 响应式暗色主题 |
| **类型安全** | TypeScript 5 | 全栈类型支持 |
| **Web3 库** | ethers.js v6 | 钱包连接和合约交互 |
| **AI 引擎** | HuggingFace SDXL | 免费开源，Stable Diffusion XL |
| **AI 引擎** | OpenAI DALL-E 3 | 高质量付费引擎 |
| **IPFS** | Pinata | NFT 图片和元数据存储 |
| **CI/CD** | GitHub Actions | 自动测试和构建 |

---

## ✨ 核心特性 | Features

- 🤖 **双 AI 引擎** — HuggingFace Stable Diffusion XL（免费）+ OpenAI DALL-E 3（高质量）
- 🎨 **7种风格** — Cyberpunk、Watercolor、Oil Painting、Pixel Art、Anime、3D Render、Photorealistic
- ⛓️ **一键铸造** — 生成图片 → IPFS 上传 → 链上铸造，全自动完成
- 🏪 **完整市场** — 固定价格 + 英式拍卖
- 💰 **版税保障** — ERC2981 标准，创作者在任意兼容市场都能收到 5% 版税
- 🔒 **安全设计** — ReentrancyGuard + Ownable + OpenZeppelin 审计标准库
- 🌐 **多链支持** — Ethereum Sepolia / Polygon Amoy / BNB Testnet

---

## 🚀 快速开始 | Quick Start

### 1. 克隆仓库

```bash
git clone https://github.com/yongye9999-tech/ai-nft-studio.git
cd ai-nft-studio
```

### 2. 安装依赖

```bash
# 安装所有依赖（monorepo）
npm install
cd contracts && npm install
cd ../frontend && npm install
cd ..
```

### 3. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 填入你的 API Keys
```

需要的 API Keys：
- **HUGGINGFACE_API_KEY** — [免费获取](https://huggingface.co/settings/tokens)
- **PINATA_JWT** — [免费获取](https://app.pinata.cloud/keys)
- **PRIVATE_KEY** — 你的 MetaMask 私钥（测试网）

### 4. 本地部署合约

```bash
# 终端 1：启动本地链
cd contracts && npx hardhat node

# 终端 2：部署合约
cd contracts && npx hardhat run scripts/deploy.js --network localhost
```

### 5. 启动前端

```bash
cd frontend && npm run dev
```

打开 **http://localhost:3000** 🎉

---

## 🧪 运行测试

```bash
cd contracts
npx hardhat test
```

---

## 📸 截图预览 | Screenshots

| 首页 | AI 创作页 | 市场页 |
|---|---|---|
| *[截图占位符]* | *[截图占位符]* | *[截图占位符]* |

---

## 📁 项目结构

```
ai-nft-studio/
├── .github/workflows/test.yml    # CI/CD 自动测试
├── .env.example                  # 环境变量模板
├── package.json                  # Monorepo 根配置
│
├── contracts/                    # 智能合约（Hardhat）
│   ├── src/
│   │   ├── AINFTCollection.sol   # ERC721 + ERC2981 版税 NFT
│   │   └── NFTMarketplace.sol    # 上架/购买/拍卖市场
│   ├── scripts/deploy.js         # 部署脚本（多链）
│   ├── test/
│   │   ├── AINFTCollection.test.js
│   │   └── NFTMarketplace.test.js
│   └── hardhat.config.js         # 多链配置
│
├── frontend/                     # Next.js 14 前端
│   ├── src/app/
│   │   ├── page.tsx              # 首页
│   │   ├── create/page.tsx       # AI 创作 → 铸造
│   │   ├── marketplace/page.tsx  # NFT 交易市场
│   │   ├── profile/page.tsx      # 个人主页
│   │   └── api/                  # 服务端 API
│   ├── src/components/           # UI 组件（Navbar, AIGenerator, NFTCard...）
│   ├── src/hooks/                # Web3 Hooks（useWallet, useNFTContract...）
│   └── src/lib/                  # AI 引擎 + IPFS + 合约配置
│
└── docs/
    ├── ARCHITECTURE.md           # 系统架构文档（中文）
    ├── DEPLOYMENT.md             # 部署指南（中文）
    └── BUSINESS_MODEL.md         # 商业模式分析（中文）
```

---

## 💼 商业模式 | Business Model

| 收入来源 | 金额 |
|---|---|
| 平台交易手续费 | 2.5% / 笔 |
| NFT 铸造费 | 0.001 ETH / 次 |
| 高级 AI 引擎（订阅） | 计划中 |

详见 [docs/BUSINESS_MODEL.md](docs/BUSINESS_MODEL.md)

---

## 🙏 参考项目 | References

本项目融合了以下优秀开源项目的设计理念：

| 项目 | Stars | 借鉴内容 |
|---|---|---|
| [dappuniversity/ai_nft_generator](https://github.com/dappuniversity/ai_nft_generator) | ⭐54 (62 forks) | HuggingFace + IPFS + Hardhat 核心架构 |
| [kaymen99/AART-NFT-Marketplace](https://github.com/kaymen99/AART-NFT-Marketplace) | ⭐22 | ERC2981版税 + 拍卖市场 + 创作者档案 |
| [net2devcrypto/Ai-NFT-Art-Contract-Web3-Site-Generator-JS](https://github.com/net2devcrypto/Ai-NFT-Art-Contract-Web3-Site-Generator-JS) | ⭐7 | OpenAI集成 + 自动部署 + 铸造门户 |

---

## 📄 License

[MIT License](LICENSE) © 2026 yongye9999-tech