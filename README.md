# 🎨 AI+NFT Studio

<!-- 项目封面与徽章 -->

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.26-blue?logo=solidity)](https://soliditylang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![Hardhat](https://img.shields.io/badge/Hardhat-2.22-yellow)](https://hardhat.org/)
[![OpenZeppelin](https://img.shields.io/badge/OpenZeppelin-5.0-blue)](https://openzeppelin.com/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

> **用 AI 创作，用区块链确权，用市场流通** — 一站式 AI 艺术 NFT 创作与交易平台

[English](#english) | 中文文档

---

## 🏗️ 系统架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                         用户浏览器                                │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────────────┐   │
│  │  创作页面   │   │  市场页面   │   │     个人主页        │   │
│  │ /create     │   │ /marketplace│   │     /profile        │   │
│  └──────┬──────┘   └──────┬──────┘   └──────────┬──────────┘   │
│         │                 │                       │              │
│  ┌──────┴─────────────────┴───────────────────────┴──────────┐  │
│  │              Next.js App Router (前端框架)                  │  │
│  │  Navbar | Web3Provider | ConnectWallet | NFTCard           │  │
│  └──────────────────────────┬───────────────────────────────┘  │
└─────────────────────────────┼───────────────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                     │
          ▼                    ▼                     ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐
│  AI 生成 API    │  │  IPFS/Pinata    │  │  以太坊智能合约     │
│                 │  │                 │  │                     │
│  HuggingFace   │  │  图片上传        │  │  AINFTCollection    │
│  Stable Diff.  │  │  元数据存储      │  │  (ERC-721 + 2981)   │
│                 │  │  CID 获取       │  │                     │
│  OpenAI        │  │  IPFS Gateway   │  │  NFTMarketplace     │
│  DALL-E 3      │  │                 │  │  (挂单/竞拍/版税)   │
└─────────────────┘  └─────────────────┘  └─────────────────────┘
                                                     │
                                          ┌──────────┴──────────┐
                                          │   测试网 / 主网      │
                                          │  Sepolia / Amoy /   │
                                          │  BNB Testnet        │
                                          └─────────────────────┘
```

---

## 🛠️ 技术栈

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 智能合约 | Solidity | 0.8.26 | 核心合约语言 |
| 合约框架 | Hardhat | ^2.22 | 编译、测试、部署 |
| 合约标准 | OpenZeppelin | ^5.0 | ERC-721、ERC-2981、Ownable |
| 前端框架 | Next.js | 14.2 | App Router + SSR |
| UI 样式 | Tailwind CSS | ^3.4 | 紫青渐变主题 |
| Web3 库 | ethers.js | ^6.12 | 钱包连接与合约交互 |
| AI 生成 | HuggingFace | API | Stable Diffusion XL |
| AI 生成 | OpenAI | API | DALL-E 3 |
| 存储 | Pinata / IPFS | — | 图片与元数据去中心化存储 |
| 语言 | TypeScript | ^5.4 | 类型安全的前端代码 |

---

## ⚡ 快速启动（本地开发）

### 第 1 步：克隆项目并安装依赖

```bash
git clone https://github.com/your-org/ai-nft-studio.git
cd ai-nft-studio
npm install
```

### 第 2 步：配置环境变量

```bash
cp .env.example .env
# 编辑 .env，填入你的 API 密钥（HuggingFace / OpenAI / Pinata）
```

### 第 3 步：启动本地开发环境

```bash
# 终端 1：启动本地区块链节点
cd contracts && npx hardhat node

# 终端 2：部署合约到本地节点
cd contracts && npx hardhat run scripts/deploy.js --network localhost

# 终端 3：启动前端开发服务器
cd frontend && npm run dev
```

打开浏览器访问 [http://localhost:3000](http://localhost:3000) 即可看到应用。

---

## 🚀 部署教程

### 一、智能合约部署到 Sepolia 测试网

```bash
# 1. 确保 .env 中已配置 PRIVATE_KEY 和 SEPOLIA_RPC_URL
# 2. 编译合约
cd contracts && npx hardhat compile

# 3. 部署合约
npx hardhat run scripts/deploy.js --network sepolia

# 4. 验证合约（可选）
npx hardhat verify --network sepolia <DEPLOYED_ADDRESS>
```

### 二、前端部署到 Vercel

```bash
# 1. 将代码推送到 GitHub
# 2. 在 Vercel 中导入项目，选择 frontend/ 目录
# 3. 配置环境变量（同 .env.example 中的 NEXT_PUBLIC_* 变量）
# 4. 点击部署

# 或使用 CLI 部署：
cd frontend
npx vercel --prod
```

详细部署说明请参考 [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)

---

## 📁 项目结构

```
ai-nft-studio/
├── contracts/           # Hardhat 智能合约工程
│   ├── src/
│   │   ├── AINFTCollection.sol   # ERC-721 NFT 合约
│   │   └── NFTMarketplace.sol    # NFT 市场合约
│   ├── scripts/deploy.js         # 部署脚本
│   ├── test/                     # 合约测试
│   └── hardhat.config.js
├── frontend/            # Next.js 前端应用
│   └── src/
│       ├── app/         # App Router 页面
│       ├── components/  # React 组件
│       ├── hooks/       # 自定义 Hooks
│       └── lib/         # 工具函数
├── docs/                # 项目文档
└── .github/workflows/   # CI/CD 配置
```

---

## 🙏 致谢

本项目在构建过程中参考了以下优秀开源项目：

- [OpenZeppelin Contracts](https://github.com/OpenZeppelin/openzeppelin-contracts) — 安全、可审计的智能合约标准库
- [Hardhat](https://github.com/NomicFoundation/hardhat) — 以太坊开发环境
- [Next.js](https://github.com/vercel/next.js) — React 全栈框架
- [ethers.js](https://github.com/ethers-io/ethers.js/) — 以太坊 JavaScript 库
- [Pinata](https://pinata.cloud/) — IPFS 固定服务
- [HuggingFace](https://huggingface.co/) — 开源 AI 模型托管平台

---

## 📄 许可证

本项目基于 [MIT License](./LICENSE) 开源。

Copyright © 2024-2026 AI NFT Studio Contributors

---

<a name="english"></a>
## English Summary

**AI+NFT Studio** is a full-stack Web3 platform that combines AI image generation
(Stable Diffusion / DALL-E 3) with NFT minting and marketplace functionality.
Users can:

1. **Generate** unique AI artwork using text prompts
2. **Mint** their creations as ERC-721 NFTs with on-chain royalties (ERC-2981)
3. **Trade** NFTs on the built-in marketplace with auction support

Built with Next.js 16, Solidity 0.8.26, ethers.js v6, and deployed on EVM-compatible testnets.
