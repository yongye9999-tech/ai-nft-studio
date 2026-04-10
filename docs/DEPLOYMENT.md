# 部署指南

## 前置条件

- Node.js >= 18.0.0
- npm >= 8.0.0
- MetaMask 浏览器扩展
- 测试网 ETH（Sepolia faucet：https://sepoliafaucet.com）

---

## 一、本地开发

### 1. 克隆并安装依赖

```bash
git clone https://github.com/yongye9999-tech/ai-nft-studio.git
cd ai-nft-studio

# 安装根依赖
npm install

# 安装合约依赖
cd contracts && npm install

# 安装前端依赖
cd ../frontend && npm install
```

### 2. 配置环境变量

```bash
# 在根目录
cp .env.example .env
# 编辑 .env 填入你的 API Keys
```

### 3. 启动本地区块链

```bash
cd contracts
npx hardhat node
```

保留此终端运行。新开终端继续：

### 4. 部署合约到本地链

```bash
cd contracts
npx hardhat run scripts/deploy.js --network localhost
```

将输出的合约地址更新到 `.env`：
```
NEXT_PUBLIC_AINFT_COLLECTION_LOCAL=0x...
NEXT_PUBLIC_NFT_MARKETPLACE_LOCAL=0x...
```

### 5. 启动前端

```bash
cd frontend
npm run dev
```

打开 http://localhost:3000

---

## 二、运行合约测试

```bash
cd contracts
npx hardhat test
```

---

## 三、部署到 Sepolia 测试网

### 准备工作

1. 在 [Infura](https://infura.io) 或 [Alchemy](https://alchemy.com) 创建项目，获取 Sepolia RPC URL
2. 在 [Etherscan](https://etherscan.io/apis) 申请 API Key
3. 确保部署钱包有 Sepolia ETH

### 配置 .env

```bash
PRIVATE_KEY=0x你的私钥（不要提交到 git！）
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your-project-id
ETHERSCAN_API_KEY=你的 Etherscan API Key
```

### 部署

```bash
cd contracts
npx hardhat run scripts/deploy.js --network sepolia
```

### 验证合约（可选）

```bash
npx hardhat verify --network sepolia <AINFTCollection地址> "AI NFT Studio" "AINFT" 500
npx hardhat verify --network sepolia <NFTMarketplace地址> 250
```

### 更新前端配置

将部署地址更新到 `.env`：
```
NEXT_PUBLIC_AINFT_COLLECTION_SEPOLIA=0x...
NEXT_PUBLIC_NFT_MARKETPLACE_SEPOLIA=0x...
```

---

## 四、部署前端到 Vercel

1. Fork 本仓库到你的 GitHub 账户
2. 在 [Vercel](https://vercel.com) 导入仓库
3. 设置 Root Directory 为 `frontend`
4. 添加所有 `.env` 中的环境变量
5. 点击 Deploy

---

## 五、MetaMask 配置

### 添加 Sepolia 测试网

- 网络名称：Sepolia Test Network
- RPC URL：https://sepolia.infura.io/v3/
- Chain ID：11155111
- 货币符号：ETH
- 区块浏览器：https://sepolia.etherscan.io

### 获取测试 ETH

- Sepolia Faucet：https://sepoliafaucet.com
- Alchemy Faucet：https://sepoliafaucet.com

---

## 六、常见问题

**Q: `Error: insufficient funds`**
A: 部署钱包没有足够的测试 ETH，请前往 faucet 获取

**Q: `Error: IPFS upload failed`**
A: 检查 `.env` 中的 `PINATA_JWT` 是否正确配置

**Q: `Error: HuggingFace API error: 503`**
A: HuggingFace 模型正在加载（冷启动），等待 30 秒后重试

**Q: MetaMask 显示错误的网络**
A: 在 MetaMask 中切换到对应的测试网
