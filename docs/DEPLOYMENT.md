# AI NFT Studio — 部署指南

## 本地开发环境搭建

### 前置条件

- Node.js >= 18.0.0
- npm >= 9.0.0
- MetaMask 或其他 Web3 钱包浏览器插件

### 第一步：克隆项目并安装依赖

```bash
git clone https://github.com/yongye9999-tech/ai-nft-studio.git
cd ai-nft-studio

# 安装根目录和所有工作区依赖
npm install
```

### 第二步：配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的 API 密钥（至少填写 HuggingFace 或 OpenAI 其中一个）：

```env
HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxx
OPENAI_API_KEY=sk-xxxxxxxxxxxx
PINATA_API_KEY=xxxxxxxxxxxx
PINATA_SECRET_KEY=xxxxxxxxxxxx
```

### 第三步：启动本地区块链节点

```bash
# 在一个终端窗口中运行
npm run contracts:node
```

这会启动 Hardhat 本地节点（端口 8545），并创建 20 个测试账户，每个账户有 10000 ETH。

### 第四步：部署合约到本地网络

```bash
# 在另一个终端窗口
npm run contracts:deploy:local
```

记录输出的合约地址，更新 `.env`：

```env
NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_CHAIN_ID=31337
```

### 第五步：启动前端开发服务器

```bash
npm run dev
# 或
cd frontend && npm run dev
```

访问 http://localhost:3000

---

## 测试网部署

### Ethereum Sepolia 测试网

1. **获取测试 ETH**
   - 访问 [Sepolia Faucet](https://sepoliafaucet.com/) 或 [Alchemy Faucet](https://sepoliafaucet.com/)

2. **配置 RPC URL**（推荐使用 Alchemy 或 Infura）
   ```env
   PRIVATE_KEY=0x你的钱包私钥
   SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/你的APIKey
   ETHERSCAN_API_KEY=你的EtherScan API Key
   ```

3. **部署合约**
   ```bash
   cd contracts
   npm run deploy:sepolia
   ```

4. **验证合约（可选）**
   ```bash
   npx hardhat verify --network sepolia 合约地址 构造函数参数...
   ```

### Polygon Amoy 测试网

```bash
# 配置环境变量
POLYGON_AMOY_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/你的APIKey
POLYGONSCAN_API_KEY=你的PolygonScan API Key

# 部署
cd contracts && npm run deploy:amoy
```

### BNB Chain 测试网

```bash
BNB_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545

cd contracts && npm run deploy:bnb
```

---

## 主网部署清单

> ⚠️ **警告**：主网部署将使用真实资产，请务必完成以下安全检查。

### 安全检查清单

- [ ] 合约代码已通过专业安全审计
- [ ] 所有 hardhat 测试全部通过
- [ ] 在测试网上完整运行所有功能
- [ ] 私钥使用硬件钱包或 HSM 管理
- [ ] 合约 Owner 使用多签钱包（推荐 Gnosis Safe）
- [ ] 设置合理的 mintFee 和 platformFee
- [ ] 确认版税接收地址正确
- [ ] 前端 .env 中所有 `NEXT_PUBLIC_` 地址正确

### 部署步骤

1. 审查并确认所有合约参数（mintFee、royaltyFee、platformFee）
2. 使用生产环境 RPC URL（Alchemy/Infura 付费计划）
3. 部署到主网：
   ```bash
   # Ethereum Mainnet
   npx hardhat run scripts/deploy.js --network mainnet
   ```
4. 在 Etherscan 验证合约源码
5. 更新前端环境变量中的合约地址
6. 部署前端到 Vercel / Netlify 等平台

### 前端部署（Vercel）

```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署
cd frontend && vercel --prod
```

在 Vercel 控制台中设置所有环境变量（不含 `PRIVATE_KEY`，该变量仅用于合约部署）。

---

## 常见问题

**Q: 本地开发时 MetaMask 连接不上？**

A: 在 MetaMask 中手动添加本地网络：
- 网络名称：Hardhat Local
- RPC URL：http://127.0.0.1:8545
- 链 ID：31337
- 货币符号：ETH

**Q: HuggingFace 模型加载慢？**

A: 免费版 HuggingFace 模型会"冷启动"，首次请求可能需要 30-60 秒。建议在 UI 中加入适当的超时提示。

**Q: IPFS 上传失败？**

A: 检查 Pinata API 密钥是否正确，并确保账户未超出免费额度（1GB）。
