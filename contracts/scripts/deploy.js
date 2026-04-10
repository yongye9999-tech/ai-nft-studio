// scripts/deploy.js — Deployment script for AI+NFT Studio contracts
// Deploys AINFTCollection and NFTMarketplace, then saves addresses to deployments.json

const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log(
    "Account balance:",
    ethers.formatEther(await deployer.provider.getBalance(deployer.address)),
    "ETH"
  );

  // ── Deploy AINFTCollection ──────────────────────────────────────
  const mintFee = ethers.parseEther("0.01"); // 0.01 ETH
  console.log("\n[1/2] Deploying AINFTCollection...");
  const AINFTCollection = await ethers.getContractFactory("AINFTCollection");
  const nftCollection = await AINFTCollection.deploy(
    "AI NFT Studio",
    "AINFT",
    mintFee
  );
  await nftCollection.waitForDeployment();
  const nftAddress = await nftCollection.getAddress();
  console.log("  AINFTCollection deployed to:", nftAddress);

  // ── Deploy NFTMarketplace ───────────────────────────────────────
  console.log("\n[2/2] Deploying NFTMarketplace...");
  const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");
  const marketplace = await NFTMarketplace.deploy();
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log("  NFTMarketplace deployed to:", marketplaceAddress);

  // ── Save deployment info ────────────────────────────────────────
  const deploymentInfo = {
    network: network.name,
    chainId: (await deployer.provider.getNetwork()).chainId.toString(),
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      AINFTCollection: {
        address: nftAddress,
        mintFee: ethers.formatEther(mintFee) + " ETH",
      },
      NFTMarketplace: {
        address: marketplaceAddress,
        platformFee: "2.5%",
      },
    },
  };

  const outputPath = path.join(__dirname, "../deployments.json");
  fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("\nDeployment info saved to:", outputPath);

  // ── Summary ─────────────────────────────────────────────────────
  console.log("\n============================================================");
  console.log("Deployment complete!");
  console.log("  Network          :", network.name);
  console.log("  AINFTCollection  :", nftAddress);
  console.log("  NFTMarketplace   :", marketplaceAddress);
  console.log("============================================================");
  console.log(
    "\nNext steps:\n" +
    "  1. Update .env:\n" +
    `     NEXT_PUBLIC_AINFT_CONTRACT_ADDRESS=${nftAddress}\n` +
    `     NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS=${marketplaceAddress}\n` +
    "  2. Verify contracts on Etherscan (if not localhost):\n" +
    `     npx hardhat verify --network ${network.name} ${nftAddress} "AI NFT Studio" "AINFT" "${mintFee}"\n` +
    `     npx hardhat verify --network ${network.name} ${marketplaceAddress}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
