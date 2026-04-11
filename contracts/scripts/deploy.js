const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // ── AINFTCollection ──────────────────────────────────────────────────────
  const mintFee = ethers.parseEther("0.01");       // 0.01 ETH mint fee
  const royaltyFee = 500;                           // 5% royalty (500 basis points)

  const AINFTCollection = await ethers.getContractFactory("AINFTCollection");
  const nftCollection = await AINFTCollection.deploy(
    "AI NFT Collection",
    "AINFT",
    mintFee,
    deployer.address,  // royalty receiver
    royaltyFee
  );
  await nftCollection.waitForDeployment();
  const nftAddress = await nftCollection.getAddress();
  console.log("AINFTCollection deployed to:", nftAddress);

  // ── NFTMarketplace ───────────────────────────────────────────────────────
  const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");
  const marketplace = await NFTMarketplace.deploy();
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log("NFTMarketplace deployed to:", marketplaceAddress);

  console.log("\n✅ Deployment complete!");
  console.log("Add these to your .env:");
  console.log(`NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=${nftAddress}`);
  console.log(`NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS=${marketplaceAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
