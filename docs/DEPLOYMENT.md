# 部署指南

> AI+NFT Studio — 从零到生产环境完整部署流程

---

## 一、前置要求

| 工具 | 版本要求 | 说明 |
|------|---------|------|
| Node.js | >= 18.0.0 | 运行时环境 |
| npm | >= 9.0.0 | 包管理器 |
| Git | 任意 | 版本控制 |
| MetaMask | 最新版 | 浏览器钱包插件 |

### 需要的 API Keys

| 服务 | 获取地址 | 说明 |
|------|---------|------|
| HuggingFace | https://huggingface.co/settings/tokens | AI 图像生成 |
| OpenAI | https://platform.openai.com/api-keys | DALL-E 3 (可选) |
| Pinata | https://app.pinata.cloud/keys | IPFS 存储 |
| Infura | https://infura.io/ | Sepolia RPC |
| Etherscan | https://etherscan.io/myapikey | 合约验证 |
| Polygonscan | https://polygonscan.com/myapikey | Amoy 合约验证 |

---

## 二、环境配置

```bash
# 1. 克隆项目
git clone https://github.com/your-username/ai-nft-studio.git
cd ai-nft-studio

# 2. 安装全部依赖
npm install

# 3. 复制环境变量模板
cp .env.example .env
```

编辑 `.env` 文件：

```env
# ── AI 引擎 ──────────────────────────────────────────────
OPENAI_API_KEY=sk-xxxxxxxxxxxx
HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxx

# ── IPFS (Pinata) ────────────────────────────────────────
PINATA_API_KEY=xxxxxxxxxxxx
PINATA_SECRET_API_KEY=xxxxxxxxxxxx

# ── 区块链 RPC ────────────────────────────────────────────
PRIVATE_KEY=0xYOUR_DEPLOYER_PRIVATE_KEY
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
AMOY_RPC_URL=https://rpc-amoy.polygon.technology
BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545

# ── 区块链浏览器 API ──────────────────────────────────────
ETHERSCAN_API_KEY=xxxxxxxxxxxx
POLYGONSCAN_API_KEY=xxxxxxxxxxxx
BSCSCAN_API_KEY=xxxxxxxxxxxx

# ── 合约地址 (部署后填入) ──────────────────────────────────
NEXT_PUBLIC_AINFT_COLLECTION_SEPOLIA=
NEXT_PUBLIC_NFT_MARKETPLACE_SEPOLIA=
NEXT_PUBLIC_AINFT_COLLECTION_AMOY=
NEXT_PUBLIC_NFT_MARKETPLACE_AMOY=
NEXT_PUBLIC_AINFT_COLLECTION_BSC=
NEXT_PUBLIC_NFT_MARKETPLACE_BSC=
NEXT_PUBLIC_AINFT_COLLECTION_LOCAL=
NEXT_PUBLIC_NFT_MARKETPLACE_LOCAL=
```

> ⚠️ **安全警告**：`PRIVATE_KEY` 是你的部署钱包私钥，绝对不要提交到 Git！

---

## 三、智能合约部署

### 3.1 本地测试

```bash
# 启动本地 Hardhat 节点 (另开一个终端)
npm run node -w contracts

# 编译合约
npm run compile -w contracts

# 运行测试套件
npm run test -w contracts

# 部署到本地节点
npm run deploy:local -w contracts
```

部署成功后，地址保存在 `contracts/deployments/localhost.json`。

将地址复制到 `.env`：
```env
NEXT_PUBLIC_AINFT_COLLECTION_LOCAL=0x...
NEXT_PUBLIC_NFT_MARKETPLACE_LOCAL=0x...
```

### 3.2 部署到 Sepolia 测试网

```bash
# 确保钱包有 Sepolia ETH (从 https://sepoliafaucet.com/ 领取)
npm run deploy:sepolia -w contracts
```

输出示例：
```
Deploying contracts with account: 0xYourAddress
Network: sepolia
AINFTCollection deployed to: 0xABC...123
NFTMarketplace deployed to: 0xDEF...456
```

更新 `.env`：
```env
NEXT_PUBLIC_AINFT_COLLECTION_SEPOLIA=0xABC...123
NEXT_PUBLIC_NFT_MARKETPLACE_SEPOLIA=0xDEF...456
```

### 3.3 部署到 Polygon Amoy

```bash
# 从 https://faucet.polygon.technology/ 领取 Amoy MATIC
npm run deploy:amoy -w contracts
```

### 3.4 合约验证（可选）

```bash
cd contracts
npx hardhat verify --network sepolia 0xABC...123 "AI NFT Studio" "AINFT" "10000000000000000" "10000"
npx hardhat verify --network sepolia 0xDEF...456
```

---

## 四、前端部署

### 4.1 本地开发

```bash
npm run dev -w frontend
# 访问 http://localhost:3000
```

### 4.2 生产构建（本地测试）

```bash
npm run build -w frontend
npm run start -w frontend
```

### 4.3 部署到 Vercel（推荐）

#### 方式一：Vercel CLI

```bash
npm install -g vercel
cd frontend
vercel

# 按提示操作，选择 Next.js 框架
```

#### 方式二：Vercel Dashboard

1. 访问 https://vercel.com/new
2. 导入 GitHub 仓库
3. 设置根目录为 `frontend`
4. 配置环境变量（将 `.env` 中的所有变量添加到 Vercel 控制台）
5. 点击 Deploy

---

## 五、多链配置

### MetaMask 添加 Polygon Amoy

| 参数 | 值 |
|------|-----|
| 网络名称 | Polygon Amoy Testnet |
| RPC URL | https://rpc-amoy.polygon.technology |
| Chain ID | 80002 |
| 代币符号 | MATIC |
| 区块浏览器 | https://amoy.polygonscan.com |

### MetaMask 添加 BNB Testnet

| 参数 | 值 |
|------|-----|
| 网络名称 | BNB Smart Chain Testnet |
| RPC URL | https://data-seed-prebsc-1-s1.binance.org:8545 |
| Chain ID | 97 |
| 代币符号 | tBNB |
| 区块浏览器 | https://testnet.bscscan.com |

---

## 六、常见问题

**Q: 合约部署失败 "insufficient funds"**
> 确保部署钱包有足够的测试 ETH/MATIC。前往对应测试网水龙头领取。

**Q: HuggingFace API 返回 503**
> 模型可能正在加载（冷启动），等待 20 秒后重试。可考虑切换到 OpenAI 引擎。

**Q: Pinata 上传失败**
> 检查 PINATA_API_KEY 和 PINATA_SECRET_API_KEY 是否正确，以及账户是否有足够的存储空间。

**Q: 前端连接不到合约**
> 确认 `.env` 中的合约地址已更新，且当前 MetaMask 网络与合约部署网络一致。
