# 🎨 AI NFT Studio

> AI 驱动的 NFT 生成与交易平台 — 输入文字描述，让 AI 创作独一无二的数字艺术，一键铸造为 NFT。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-blue.svg)](https://soliditylang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)

---

## ✨ 核心特性

| 功能 | 说明 |
|------|------|
| 🤖 **双 AI 引擎** | HuggingFace Stable Diffusion XL + OpenAI DALL-E 3 |
| 🎨 **6 种艺术风格** | 赛博朋克 / 水彩 / 油画 / 像素艺术 / 日本动漫 / 3D 渲染 |
| ⛓️ **完整 NFT 铸造** | ERC721 + ERC2981 版税标准（默认 5%）|
| 🏪 **NFT 交易市场** | 固定价格上架 + 英式拍卖 + 自动版税分配 |
| 🌐 **多链支持** | Ethereum Sepolia / Polygon Amoy / BNB Testnet |
| 📦 **IPFS 存储** | 通过 Pinata 永久存储图片和元数据 |
| 💰 **平台手续费** | 仅 2.5%，可配置（最高 10%）|

---

## 🏗️ 系统架构

```
AI NFT Studio
│
├── contracts/                ← 智能合约层 (Solidity + Hardhat)
│   ├── src/
│   │   ├── AINFTCollection.sol    ERC721 + ERC2981 版税 NFT
│   │   └── NFTMarketplace.sol     上架/购买/拍卖市场
│   ├── scripts/deploy.js          部署脚本
│   ├── test/                      完整单元测试
│   └── hardhat.config.js          多链配置
│
├── frontend/                 ← Next.js 14 前端 (TypeScript)
│   └── src/
│       ├── app/
│       │   ├── page.tsx           首页 Hero + 特性展示
│       │   ├── create/            AI 创作 → 铸造 NFT
│       │   ├── marketplace/       NFT 交易市场
│       │   ├── profile/           个人主页 (收藏/创作)
│       │   └── api/               服务端 AI 生成 + IPFS 上传
│       ├── components/            UI 组件 (Navbar, NFTCard...)
│       ├── lib/                   AI引擎 / IPFS / 合约 ABI
│       └── hooks/                 Web3 React Hooks
│
└── docs/                     ← 文档
    ├── ARCHITECTURE.md            系统架构说明
    ├── DEPLOYMENT.md              部署指南
    └── BUSINESS_MODEL.md          商业模式分析
```

---

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| 智能合约 | Solidity 0.8.26 + OpenZeppelin 5.x |
| 合约工具链 | Hardhat + hardhat-toolbox |
| 前端框架 | Next.js 14 (App Router) + TypeScript |
| UI 样式 | Tailwind CSS（深色主题） |
| Web3 | ethers.js v6 + MetaMask |
| AI 图像 | HuggingFace Inference API + OpenAI DALL-E 3 |
| IPFS | Pinata API |
| CI/CD | GitHub Actions |

---

## 🚀 快速开始

### 第一步：克隆并安装

```bash
git clone https://github.com/yongye9999-tech/ai-nft-studio.git
cd ai-nft-studio
npm install
```

### 第二步：配置环境变量

```bash
cp .env.example .env
# 编辑 .env 填入 API 密钥
```

### 第三步：本地运行

```bash
# 终端 1: 启动本地区块链
npm run contracts:node

# 终端 2: 部署合约
npm run contracts:deploy:local

# 终端 3: 启动前端
npm run dev
```

访问 http://localhost:3000 开始创作！

详细部署说明请参考 [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)。

---

## 🧪 运行测试

```bash
# 运行所有合约测试
npm test

# 仅编译合约
npm run contracts:compile
```

---

## 📖 参考项目致谢

本项目融合了以下优秀开源项目的设计思路：

| 项目 | Stars | 贡献 |
|------|-------|------|
| [dappuniversity/ai_nft_generator](https://github.com/dappuniversity/ai_nft_generator) | ⭐54 (62 forks) | HuggingFace AI + IPFS + Hardhat 架构参考 |
| [kaymen99/AART-NFT-Marketplace](https://github.com/kaymen99/AART-NFT-Marketplace) | ⭐22 | ERC721+ERC2981 版税 + 拍卖市场设计参考 |
| [net2devcrypto/Ai-NFT-Art-Contract-Web3-Site-Generator-JS](https://github.com/net2devcrypto/Ai-NFT-Art-Contract-Web3-Site-Generator-JS) | ⭐7 | OpenAI 生成 + 铸造门户参考 |

---

## ⚠️ 风险警告与免责声明

> **本项目仅供学习和研究目的，不构成任何投资建议。**
>
> - NFT 是数字收藏品，其价值具有高度不确定性，可能归零。
> - 请勿将超出承受范围的资产投入加密货币或 NFT 市场。
> - 智能合约在部署到主网前必须经过专业安全审计。
> - AI 生成内容的版权归属在各法律管辖区尚存争议，使用者需自行承担相关法律风险。
> - 加密资产交易可能受到您所在国家或地区的监管限制，请务必了解当地法规。

---

## 📄 License

[MIT License](./LICENSE) — Copyright (c) 2024 yongye9999-tech
