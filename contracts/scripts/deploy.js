const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // Deploy AINFTCollection
  console.log("\nDeploying AINFTCollection...");
  const AINFTCollection = await hre.ethers.getContractFactory("AINFTCollection");
  const nftCollection = await AINFTCollection.deploy(
    "AI NFT Studio",  // name
    "AINFT",          // symbol
    500               // royalty: 5%
  );
  await nftCollection.waitForDeployment();
  const nftAddress = await nftCollection.getAddress();
  console.log("AINFTCollection deployed to:", nftAddress);

  // Deploy NFTMarketplace
  console.log("\nDeploying NFTMarketplace...");
  const NFTMarketplace = await hre.ethers.getContractFactory("NFTMarketplace");
  const marketplace = await NFTMarketplace.deploy(250); // 2.5% platform fee
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log("NFTMarketplace deployed to:", marketplaceAddress);

  console.log("\n=== Deployment Summary ===");
  console.log("Network:", hre.network.name);
  console.log("AINFTCollection:", nftAddress);
  console.log("NFTMarketplace:", marketplaceAddress);
  console.log("\nUpdate your .env with:");
  console.log(`NEXT_PUBLIC_AINFT_COLLECTION_${hre.network.name.toUpperCase()}=${nftAddress}`);
  console.log(`NEXT_PUBLIC_NFT_MARKETPLACE_${hre.network.name.toUpperCase()}=${marketplaceAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
