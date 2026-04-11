# 🎨 AI+NFT Studio

> **免责声明**：本项目仅供学习和技术研究使用，不构成任何投资建议。NFT 市场具有高度波动性，请谨慎参与。智能合约存在潜在风险，使用前请充分审计。

一个集 **AI 图像生成** 与 **NFT 铸造/交易** 于一体的全栈 Web3 应用，支持多种 AI 引擎（HuggingFace / OpenAI DALL-E）和多条区块链网络（Sepolia / Polygon Amoy / BNB 测试网）。

---

## 📐 系统架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                         用户浏览器 (Browser)                         │
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │  首页 (Home) │  │ 创作 (Create)│  │ 市场 (Market)│  │  个人    │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬───────┘  └────┬─────┘ │
│         └────────────────┴─────────────────┴───────────────┘        │
│                          Next.js 14 App Router                       │
│              ┌──────────────────────────────────────┐               │
│              │        Web3Provider (ethers.js v6)    │               │
│              └───────────────────┬──────────────────┘               │
└──────────────────────────────────┼──────────────────────────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
              ▼                    ▼                    ▼
  ┌───────────────────┐  ┌─────────────────┐  ┌──────────────────┐
  │   AI 引擎层        │  │  IPFS 存储层     │  │  区块链层         │
  │                   │  │                 │  │                  │
  │ HuggingFace API   │  │  Pinata IPFS    │  │ AINFTCollection  │
  │ (SDXL-1.0)        │  │  (图片+元数据)   │  │ (ERC721+ERC2981) │
  │                   │  │                 │  │                  │
  │ OpenAI DALL-E 3   │  │  ipfs.io 网关   │  │ NFTMarketplace   │
  └───────────────────┘  └─────────────────┘  │ (列表+拍卖)       │
                                               │                  │
                                               │ Sepolia Testnet  │
                                               │ Polygon Amoy     │
                                               │ BNB Testnet      │
                                               └──────────────────┘
```

---

## ✨ 功能特性

| 功能 | 描述 |
|------|------|
| 🤖 **AI 图像生成** | 支持 HuggingFace SDXL 和 OpenAI DALL-E 3 双引擎 |
| 🎨 **6 种艺术风格** | 赛博朋克 / 水彩 / 油画 / 像素艺术 / 日本动漫 / 3D 渲染 |
| 🔨 **NFT 铸造** | ERC721 标准，支持 ERC2981 版税（最高 10%）|
| 🛒 **NFT 交易市场** | 固定价格上架 + 拍卖竞价，平台手续费 2.5%|
| 🌐 **多链支持** | Sepolia / Polygon Amoy / BNB Testnet |
| 📦 **IPFS 存储** | 通过 Pinata 将图片和元数据上传至 IPFS |

---

## 🚀 快速开始

### 前置要求

- Node.js >= 18.0.0
- npm >= 9.0.0
- MetaMask 浏览器插件
- HuggingFace API Token 或 OpenAI API Key
- Pinata API Key & Secret

### 1. 克隆项目

```bash
git clone https://github.com/your-username/ai-nft-studio.git
cd ai-nft-studio
```

### 2. 安装依赖

```bash
# 安装根目录及所有工作区依赖
npm install
```

### 3. 环境变量配置

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入以下内容：

```env
# AI 引擎
OPENAI_API_KEY=sk-xxxxxxxxxxxx
HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxx

# IPFS (Pinata)
PINATA_API_KEY=xxxxxxxxxxxx
PINATA_SECRET_API_KEY=xxxxxxxxxxxx

# 区块链
PRIVATE_KEY=0xYOUR_DEPLOYER_PRIVATE_KEY
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
AMOY_RPC_URL=https://rpc-amoy.polygon.technology
BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545
ETHERSCAN_API_KEY=xxxxxxxxxxxx
POLYGONSCAN_API_KEY=xxxxxxxxxxxx
```

### 4. 编译并部署智能合约

```bash
# 启动本地节点（可选，用于本地测试）
npm run node -w contracts

# 编译合约
npm run compile -w contracts

# 运行测试
npm run test -w contracts

# 部署到 Sepolia 测试网
npm run deploy:sepolia -w contracts

# 或部署到 Polygon Amoy
npm run deploy:amoy -w contracts
```

### 5. 启动前端

```bash
npm run dev -w frontend
```

打开浏览器访问 [http://localhost:3000](http://localhost:3000)

---

## 📁 项目结构

```
ai-nft-studio/
├── contracts/                    # 智能合约 (Hardhat)
│   ├── src/
│   │   ├── AINFTCollection.sol  # ERC721 NFT 合约
│   │   └── NFTMarketplace.sol   # 交易市场合约
│   ├── scripts/
│   │   └── deploy.js            # 部署脚本
│   ├── test/
│   │   ├── AINFTCollection.test.js
│   │   └── NFTMarketplace.test.js
│   └── hardhat.config.js
│
├── frontend/                     # Next.js 14 前端
│   └── src/
│       ├── app/                  # App Router 页面
│       │   ├── api/              # API 路由
│       │   │   ├── generate/    # AI 图像生成
│       │   │   └── upload/      # IPFS 上传
│       │   ├── create/          # 创作页面
│       │   ├── marketplace/     # 交易市场
│       │   └── profile/         # 个人中心
│       ├── components/          # React 组件
│       ├── lib/                 # 工具库
│       └── hooks/               # 自定义 Hooks
│
├── docs/                         # 项目文档
│   ├── ARCHITECTURE.md
│   ├── DEPLOYMENT.md
│   └── BUSINESS_MODEL.md
│
└── .github/workflows/           # CI/CD
    └── test.yml
```

---

## 🔗 合约地址

| 网络 | AINFTCollection | NFTMarketplace |
|------|-----------------|----------------|
| Sepolia | 部署后自动生成 | 部署后自动生成 |
| Polygon Amoy | 部署后自动生成 | 部署后自动生成 |
| BNB Testnet | 部署后自动生成 | 部署后自动生成 |

> 合约地址部署后保存在 `contracts/deployments/` 目录下。

---

## 🧪 测试

```bash
# 运行所有合约测试
npm run test -w contracts

# 前端 lint
npm run lint -w frontend
```

---

## 🛠️ 技术栈

**前端**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS (暗色主题)
- ethers.js v6

**智能合约**
- Solidity 0.8.20
- OpenZeppelin Contracts v5
- Hardhat

**AI & 存储**
- HuggingFace Inference API (SDXL-1.0)
- OpenAI DALL-E 3
- Pinata IPFS

---

## 📄 许可证

MIT License - 详见 [LICENSE](./LICENSE)

---

## ⚠️ 免责声明

本项目为**技术演示和学习目的**开发，具体说明如下：

1. **非投资建议**：本项目内容不构成任何形式的投资建议或财务指导。
2. **市场风险**：NFT 和加密货币市场具有高度波动性，投资存在本金损失风险。
3. **合约风险**：智能合约可能存在未发现的漏洞，在主网部署前请进行专业安全审计。
4. **测试网使用**：建议仅在测试网上运行本项目，切勿将真实资金用于未经审计的合约。
5. **AI 内容**：AI 生成的图像版权归属复杂，请了解相关法律法规后再进行 NFT 铸造。

**使用本项目即表示您已理解并接受上述风险。**
