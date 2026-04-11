const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("🚀 部署者地址:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 部署者余额:", hre.ethers.formatEther(balance), "ETH");

  // ============ 部署 AINFTCollection ============
  console.log("\n📄 部署 AINFTCollection...");

  const mintFee = hre.ethers.parseEther("0.01"); // 0.01 ETH
  const defaultRoyaltyBps = 500; // 5%
  const maxSupply = 0; // 无限制
  const platformAddress = deployer.address; // 使用部署者地址作为平台地址

  const AINFTCollection = await hre.ethers.getContractFactory("AINFTCollection");
  const nftCollection = await AINFTCollection.deploy(
    "AI NFT Studio",
    "AINFT",
    mintFee,
    defaultRoyaltyBps,
    maxSupply,
    platformAddress
  );
  await nftCollection.waitForDeployment();

  const nftAddress = await nftCollection.getAddress();
  console.log("✅ AINFTCollection 已部署:", nftAddress);

  // ============ 部署 NFTMarketplace ============
  console.log("\n📄 部署 NFTMarketplace...");

  const platformFeeBps = 250; // 2.5%

  const NFTMarketplace = await hre.ethers.getContractFactory("NFTMarketplace");
  const marketplace = await NFTMarketplace.deploy(platformFeeBps, platformAddress);
  await marketplace.waitForDeployment();

  const marketplaceAddress = await marketplace.getAddress();
  console.log("✅ NFTMarketplace 已部署:", marketplaceAddress);

  // ============ 部署摘要 ============
  console.log("\n" + "=".repeat(60));
  console.log("🎉 部署完成！合约地址摘要:");
  console.log("=".repeat(60));
  console.log("网络:", hre.network.name);
  console.log("AINFTCollection:  ", nftAddress);
  console.log("NFTMarketplace:   ", marketplaceAddress);
  console.log("=".repeat(60));

  // 更新 .env 文件提示
  console.log("\n📝 请将以下环境变量添加到 .env 文件:");
  console.log(`NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=${nftAddress}`);
  console.log(`NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS=${marketplaceAddress}`);

  // 如果是测试网，提示验证命令
  if (hre.network.name !== "localhost" && hre.network.name !== "hardhat") {
    console.log("\n🔍 合约验证命令:");
    console.log(`npx hardhat verify --network ${hre.network.name} ${nftAddress} "AI NFT Studio" "AINFT" ${mintFee} ${defaultRoyaltyBps} ${maxSupply} ${platformAddress}`);
    console.log(`npx hardhat verify --network ${hre.network.name} ${marketplaceAddress} ${platformFeeBps} ${platformAddress}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 部署失败:", error);
    process.exit(1);
  });
