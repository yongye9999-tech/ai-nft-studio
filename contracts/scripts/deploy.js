const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Network:", network.name);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH\n");

  // ── Deploy AINFTCollection ────────────────────────────────────────────────
  console.log("Deploying AINFTCollection...");
  const mintFee = ethers.parseEther("0.01"); // 0.01 ETH
  const maxSupply = 10_000;

  const AINFTCollection = await ethers.getContractFactory("AINFTCollection");
  const nftCollection = await AINFTCollection.deploy(
    "AI NFT Studio",
    "AINFT",
    mintFee,
    maxSupply
  );
  await nftCollection.waitForDeployment();
  const nftAddress = await nftCollection.getAddress();
  console.log("AINFTCollection deployed to:", nftAddress);

  // ── Deploy NFTMarketplace ────────────────────────────────────────────────
  console.log("\nDeploying NFTMarketplace...");
  const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");
  const marketplace = await NFTMarketplace.deploy();
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log("NFTMarketplace deployed to:", marketplaceAddress);

  // ── Save deployment addresses ─────────────────────────────────────────────
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const chainId = (await ethers.provider.getNetwork()).chainId.toString();
  const deploymentData = {
    network: network.name,
    chainId,
    timestamp: new Date().toISOString(),
    contracts: {
      AINFTCollection: {
        address: nftAddress,
        constructorArgs: {
          name: "AI NFT Studio",
          symbol: "AINFT",
          mintFee: mintFee.toString(),
          maxSupply,
        },
      },
      NFTMarketplace: {
        address: marketplaceAddress,
        constructorArgs: {},
      },
    },
  };

  const filePath = path.join(deploymentsDir, `${network.name}.json`);
  fs.writeFileSync(filePath, JSON.stringify(deploymentData, null, 2));
  console.log(`\nDeployment data saved to ${filePath}`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n========== Deployment Summary ==========");
  console.log(`Network:         ${network.name} (chainId: ${chainId})`);
  console.log(`AINFTCollection: ${nftAddress}`);
  console.log(`NFTMarketplace:  ${marketplaceAddress}`);
  console.log("=========================================\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
