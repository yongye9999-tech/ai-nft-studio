# AI+NFT Studio — 部署指南

> 本文档提供从本地开发到测试网部署的完整步骤，适合初次部署的开发者。

---

## 一、前置条件

在开始之前，请确保你已安装以下工具：

| 工具 | 版本要求 | 安装方式 |
|------|---------|---------|
| Node.js | >= 18.0.0 | https://nodejs.org |
| npm | >= 9.0.0 | 随 Node.js 附带 |
| Git | 任意版本 | https://git-scm.com |
| MetaMask | 最新版 | Chrome/Firefox 扩展 |

你还需要准备：

- **HuggingFace API Key**（免费注册）— https://huggingface.co/settings/tokens
- **OpenAI API Key**（可选）— https://platform.openai.com/api-keys
- **Pinata 账号**（免费 1GB）— https://app.pinata.cloud/register
- **Alchemy/Infura RPC**（免费额度）— https://dashboard.alchemy.com
- **测试网 ETH**（免费水龙头）— https://sepoliafaucet.com

---

## 二、本地开发环境

### 2.1 克隆仓库

```bash
git clone https://github.com/your-org/ai-nft-studio.git
cd ai-nft-studio
```

### 2.2 安装依赖

```bash
# 根目录（安装所有 workspaces）
npm install

# 若 workspaces 未自动安装子包，手动安装：
cd contracts && npm install
cd ../frontend && npm install
```

### 2.3 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，至少填写以下字段用于本地开发：

```env
HUGGINGFACE_API_KEY=hf_xxxxx      # 必填，用于 AI 生成
PINATA_JWT=eyJhbGci...            # 必填，用于 IPFS 上传
NEXT_PUBLIC_CHAIN_ID=31337        # 本地节点链 ID
```

### 2.4 启动本地区块链

```bash
cd contracts
npx hardhat node
```

控制台会输出 20 个测试账户及其私钥，可导入 MetaMask 使用。

### 2.5 部署合约到本地节点

打开新的终端窗口：

```bash
cd contracts
npx hardhat run scripts/deploy.js --network localhost
```

输出示例：
```
AINFTCollection deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
NFTMarketplace   deployed to: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
```

将这两个地址填入 `.env`：

```env
NEXT_PUBLIC_AINFT_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
```

### 2.6 启动前端开发服务器

```bash
cd frontend
npm run dev
```

访问 http://localhost:3000

在 MetaMask 中添加本地网络：
- 网络名称：Hardhat Local
- RPC URL：http://127.0.0.1:8545
- 链 ID：31337
- 货币符号：ETH

---

## 三、Sepolia 测试网部署

### 3.1 获取 Sepolia 测试 ETH

前往水龙头领取免费测试 ETH：
- https://sepoliafaucet.com（需要 Alchemy 账号）
- https://faucets.chain.link/sepolia

### 3.2 获取 Sepolia RPC URL

在 Alchemy 创建应用：
1. 登录 https://dashboard.alchemy.com
2. Create App → 选择 Ethereum → Sepolia
3. 复制 HTTPS RPC URL

### 3.3 配置 .env

```env
PRIVATE_KEY=你的钱包私钥（不带0x）
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your-key
ETHERSCAN_API_KEY=你的Etherscan API Key
NEXT_PUBLIC_CHAIN_ID=11155111
```

> ⚠️ 注意：请使用专用测试钱包，切勿使用存有真实资产的主钱包。

### 3.4 编译并部署

```bash
cd contracts

# 编译合约
npx hardhat compile

# 部署到 Sepolia
npx hardhat run scripts/deploy.js --network sepolia
```

### 3.5 验证合约（可选但推荐）

```bash
npx hardhat verify --network sepolia \
  <AINFT_ADDRESS> "AI NFT Studio" "AINFT" "10000000000000000"

npx hardhat verify --network sepolia <MARKETPLACE_ADDRESS>
```

验证成功后可在 Etherscan 上查看合约源码。

---

## 四、Polygon Amoy 部署

```bash
# 配置环境变量
POLYGON_AMOY_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/your-key
POLYGONSCAN_API_KEY=你的Polygonscan API Key

# 部署
npx hardhat run scripts/deploy.js --network polygon-amoy
```

获取 MATIC 测试代币：https://faucet.polygon.technology/

---

## 五、前端部署到 Vercel

### 5.1 准备工作

1. 将代码推送到 GitHub
2. 注册 Vercel 账号：https://vercel.com

### 5.2 导入项目

1. 进入 Vercel Dashboard → New Project
2. 导入你的 GitHub 仓库
3. **重要**：设置 Root Directory 为 `frontend`
4. Framework Preset 选择 `Next.js`

### 5.3 配置环境变量

在 Vercel 项目设置的 Environment Variables 中添加：

```
HUGGINGFACE_API_KEY          = hf_xxxxx
OPENAI_API_KEY               = sk-xxxxx（可选）
PINATA_JWT                   = eyJhbGci...
NEXT_PUBLIC_AINFT_CONTRACT_ADDRESS = 0x...
NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS = 0x...
NEXT_PUBLIC_CHAIN_ID         = 11155111
```

### 5.4 部署

点击 Deploy 即可。也可使用 CLI：

```bash
cd frontend
npx vercel --prod
```

### 5.5 自动部署

配置完成后，每次推送到 main 分支会自动触发重新部署。

---

## 六、运行测试

```bash
cd contracts

# 运行所有测试
npm test

# 运行测试并生成 Gas 报告
REPORT_GAS=true npm test

# 生成覆盖率报告
npx hardhat coverage
```

---

## 七、常见问题

**Q: MetaMask 提示 "Could not fetch chain id"**
A: 确保本地节点已启动（`npx hardhat node`），且 MetaMask 网络配置正确。

**Q: HuggingFace 返回 503**
A: 模型正在冷启动（约20-30秒），稍后重试即可。可考虑使用付费 Inference API。

**Q: Pinata 上传失败**
A: 检查 `PINATA_JWT` 是否正确，Pinata 免费账号有 1GB 存储上限。

**Q: 合约部署失败 "insufficient funds"**
A: 确保部署钱包有足够的测试 ETH（部署约需 0.01-0.05 ETH）。
