# 🚀 AI NFT Studio 部署指南

## 前置要求

| 工具 | 版本 | 用途 |
|------|------|------|
| Node.js | ≥ 18.x | 运行时环境 |
| npm | ≥ 9.x | 包管理器 |
| Git | 任意 | 代码管理 |
| MetaMask | 最新版 | 测试钱包 |

---

## 第一步：获取 API Keys

### 1. HuggingFace（免费）
1. 注册: https://huggingface.co/join
2. 前往: https://huggingface.co/settings/tokens
3. 创建 Read 类型 Token
4. 复制保存

### 2. OpenAI（可选，付费）
1. 注册: https://platform.openai.com
2. 前往: https://platform.openai.com/api-keys
3. 创建新密钥

### 3. Pinata IPFS（免费额度 1GB）
1. 注册: https://app.pinata.cloud
2. 前往: https://app.pinata.cloud/keys
3. 创建新密钥（勾选 pinFileToIPFS + pinJSONToIPFS）

### 4. 区块链 RPC（推荐 Alchemy）
1. 注册: https://www.alchemy.com
2. 创建 App（选择 Ethereum Sepolia）
3. 复制 HTTPS RPC URL

---

## 第二步：本地配置

```bash
# 克隆项目
git clone https://github.com/yongye9999-tech/ai-nft-studio.git
cd ai-nft-studio

# 复制环境变量模板
cp .env.example .env

# 编辑 .env 填入你的密钥
nano .env
```

### .env 关键配置项

```env
# AI 引擎
HUGGINGFACE_API_KEY=hf_xxxxx
OPENAI_API_KEY=sk-xxxxx           # 可选

# IPFS
PINATA_API_KEY=xxxxx
PINATA_SECRET_KEY=xxxxx

# 区块链
PRIVATE_KEY=0x你的钱包私钥          # ⚠️ 切勿泄露！
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/xxxxx

# 合约地址（部署后填写）
NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS=0x...
```

---

## 第三步：安装依赖

```bash
# 安装根目录依赖
npm install

# 安装合约依赖
cd contracts && npm install && cd ..

# 安装前端依赖
cd frontend && npm install && cd ..
```

---

## 第四步：本地测试部署

### 启动本地区块链

```bash
# 终端 1: 启动 Hardhat 本地节点
npm run contracts:node
```

### 部署合约到本地网络

```bash
# 终端 2: 部署合约
npm run contracts:deploy:local
```

部署成功后输出：
```
✅ AINFTCollection 已部署: 0x5FbDB2315678afecb367f032d93F642f64180aa3
✅ NFTMarketplace 已部署: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
```

将地址填入 `.env`：
```env
NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
```

### 启动前端

```bash
# 终端 3: 启动 Next.js 开发服务器
npm run dev
```

访问 http://localhost:3000 🎉

---

## 第五步：测试网部署（Sepolia）

### 1. 获取测试 ETH

- **Sepolia Faucet**: https://sepoliafaucet.com
- **Alchemy Faucet**: https://sepoliafaucet.com
- 每次可领 0.5 ETH，够部署和测试

### 2. 部署到 Sepolia

```bash
npm run contracts:deploy:sepolia
```

### 3. 验证合约（可选）

```bash
cd contracts
npx hardhat verify --network sepolia <NFT_ADDRESS> \
  "AI NFT Studio" "AINFT" 10000000000000000 500 0 <YOUR_WALLET>

npx hardhat verify --network sepolia <MARKETPLACE_ADDRESS> 250 <YOUR_WALLET>
```

---

## 第六步：生产部署（Vercel）

### 部署前端到 Vercel

1. **推送代码到 GitHub**

2. **前往 Vercel**:
   - https://vercel.com/new
   - 导入 `ai-nft-studio` 仓库
   - 根目录设为 `frontend`

3. **配置环境变量**（在 Vercel 控制台）:
   ```
   HUGGINGFACE_API_KEY=hf_xxxxx
   PINATA_API_KEY=xxxxx
   PINATA_SECRET_KEY=xxxxx
   NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=0x...
   NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS=0x...
   NEXT_PUBLIC_DEFAULT_CHAIN_ID=11155111
   ```

4. **点击 Deploy** ✅

---

## 运行测试

```bash
# 合约单元测试
npm run contracts:test

# 查看测试覆盖率
cd contracts && npx hardhat coverage
```

---

## 常见问题

### Q: 连接钱包后显示"切换网络"？
**A**: 在 MetaMask 中手动添加对应网络，或点击"切换网络"按钮。

### Q: AI生成时提示 "Loading..."很久？
**A**: HuggingFace免费模型第一次调用可能需要等待模型加载（30-60秒）。

### Q: IPFS上传失败？
**A**: 检查 `PINATA_API_KEY` 和 `PINATA_SECRET_KEY` 是否正确配置。

### Q: 铸造提示"Insufficient mint fee"？
**A**: 确保钱包有足够的测试ETH（需要 ≥ 0.01 ETH + gas）。

---

## 网络配置速查

| 网络 | Chain ID | 水龙头 | 浏览器 |
|------|----------|--------|--------|
| Localhost | 31337 | hardhat账户 | - |
| Sepolia | 11155111 | sepoliafaucet.com | sepolia.etherscan.io |
| Polygon Amoy | 80002 | faucet.polygon.technology | amoy.polygonscan.com |
| BNB Testnet | 97 | testnet.binance.org/faucet | testnet.bscscan.com |
