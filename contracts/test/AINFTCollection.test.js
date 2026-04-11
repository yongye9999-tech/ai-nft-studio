const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AINFTCollection", function () {
  let nftCollection;
  let owner, addr1, addr2, platform;
  const MINT_FEE = ethers.parseEther("0.01");
  const ROYALTY_BPS = 500; // 5%

  beforeEach(async function () {
    [owner, addr1, addr2, platform] = await ethers.getSigners();

    const AINFTCollection = await ethers.getContractFactory("AINFTCollection");
    nftCollection = await AINFTCollection.deploy(
      "AI NFT Studio",
      "AINFT",
      MINT_FEE,
      ROYALTY_BPS,
      0, // maxSupply = 0 (无限制)
      platform.address
    );
    await nftCollection.waitForDeployment();
  });

  describe("部署 / Deployment", function () {
    it("应正确设置名称和符号", async function () {
      expect(await nftCollection.name()).to.equal("AI NFT Studio");
      expect(await nftCollection.symbol()).to.equal("AINFT");
    });

    it("应正确设置初始铸造费", async function () {
      expect(await nftCollection.mintFee()).to.equal(MINT_FEE);
    });

    it("应正确设置默认版税比例", async function () {
      expect(await nftCollection.defaultRoyaltyBps()).to.equal(ROYALTY_BPS);
    });

    it("应正确设置平台地址", async function () {
      expect(await nftCollection.platformAddress()).to.equal(platform.address);
    });

    it("Owner应为部署者", async function () {
      expect(await nftCollection.owner()).to.equal(owner.address);
    });
  });

  describe("铸造 / Minting", function () {
    const TOKEN_URI = "ipfs://QmTest123";

    it("应成功铸造NFT并支付铸造费", async function () {
      const tx = await nftCollection.connect(addr1).mintNFT(
        TOKEN_URI,
        addr1.address,
        ROYALTY_BPS,
        { value: MINT_FEE }
      );
      await tx.wait();

      expect(await nftCollection.ownerOf(1)).to.equal(addr1.address);
      expect(await nftCollection.tokenURI(1)).to.equal(TOKEN_URI);
      expect(await nftCollection.totalSupply()).to.equal(1);
    });

    it("铸造后应触发NFTMinted事件", async function () {
      await expect(
        nftCollection.connect(addr1).mintNFT(TOKEN_URI, addr1.address, ROYALTY_BPS, { value: MINT_FEE })
      )
        .to.emit(nftCollection, "NFTMinted")
        .withArgs(1, addr1.address, TOKEN_URI, ROYALTY_BPS);
    });

    it("支付超额时应退还多余ETH", async function () {
      const overpayment = ethers.parseEther("0.05");
      const balanceBefore = await ethers.provider.getBalance(addr1.address);

      const tx = await nftCollection.connect(addr1).mintNFT(
        TOKEN_URI,
        addr1.address,
        ROYALTY_BPS,
        { value: overpayment }
      );
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      const balanceAfter = await ethers.provider.getBalance(addr1.address);
      // 余额变化应约等于铸造费 + gas
      const expectedDiff = MINT_FEE + gasUsed;
      expect(balanceBefore - balanceAfter).to.be.closeTo(expectedDiff, ethers.parseEther("0.001"));
    });

    it("铸造费不足时应revert", async function () {
      const insufficientFee = ethers.parseEther("0.005");
      await expect(
        nftCollection.connect(addr1).mintNFT(TOKEN_URI, addr1.address, ROYALTY_BPS, { value: insufficientFee })
      ).to.be.revertedWith("AINFTCollection: Insufficient mint fee");
    });

    it("空TokenURI时应revert", async function () {
      await expect(
        nftCollection.connect(addr1).mintNFT("", addr1.address, ROYALTY_BPS, { value: MINT_FEE })
      ).to.be.revertedWith("AINFTCollection: Empty token URI");
    });

    it("版税超过10%时应revert", async function () {
      await expect(
        nftCollection.connect(addr1).mintNFT(TOKEN_URI, addr1.address, 1100, { value: MINT_FEE })
      ).to.be.revertedWith("AINFTCollection: Royalty too high (max 10%)");
    });
  });

  describe("Owner铸造 / Owner Mint", function () {
    it("Owner应能免费铸造NFT", async function () {
      await nftCollection.connect(owner).ownerMint(addr1.address, "ipfs://QmOwner", addr1.address, 300);
      expect(await nftCollection.ownerOf(1)).to.equal(addr1.address);
    });

    it("非Owner调用应revert", async function () {
      await expect(
        nftCollection.connect(addr1).ownerMint(addr2.address, "ipfs://QmTest", addr2.address, 300)
      ).to.be.revertedWithCustomError(nftCollection, "OwnableUnauthorizedAccount");
    });
  });

  describe("版税 / Royalties (ERC2981)", function () {
    it("应正确返回版税信息", async function () {
      await nftCollection.connect(addr1).mintNFT("ipfs://QmTest", addr1.address, 500, { value: MINT_FEE });

      const salePrice = ethers.parseEther("1");
      const [receiver, royaltyAmount] = await nftCollection.royaltyInfo(1, salePrice);

      expect(receiver).to.equal(addr1.address);
      expect(royaltyAmount).to.equal((salePrice * 500n) / 10000n); // 5%
    });
  });

  describe("管理功能 / Admin Functions", function () {
    it("Owner应能更新铸造费", async function () {
      const newFee = ethers.parseEther("0.02");
      await nftCollection.connect(owner).setMintFee(newFee);
      expect(await nftCollection.mintFee()).to.equal(newFee);
    });

    it("Owner应能提款", async function () {
      // 先铸造NFT积累合约余额
      await nftCollection.connect(addr1).mintNFT("ipfs://QmTest", addr1.address, 500, { value: MINT_FEE });

      const contractBalance = await ethers.provider.getBalance(await nftCollection.getAddress());
      expect(contractBalance).to.equal(MINT_FEE);

      const platformBalanceBefore = await ethers.provider.getBalance(platform.address);
      await nftCollection.connect(owner).withdraw();
      const platformBalanceAfter = await ethers.provider.getBalance(platform.address);

      expect(platformBalanceAfter - platformBalanceBefore).to.equal(MINT_FEE);
    });

    it("无余额时提款应revert", async function () {
      await expect(nftCollection.connect(owner).withdraw()).to.be.revertedWith(
        "AINFTCollection: No balance to withdraw"
      );
    });

    it("非Owner更新铸造费应revert", async function () {
      await expect(
        nftCollection.connect(addr1).setMintFee(ethers.parseEther("0.1"))
      ).to.be.revertedWithCustomError(nftCollection, "OwnableUnauthorizedAccount");
    });
  });

  describe("接口支持 / Interface Support", function () {
    it("应支持ERC721接口", async function () {
      expect(await nftCollection.supportsInterface("0x80ac58cd")).to.be.true;
    });

    it("应支持ERC2981接口", async function () {
      expect(await nftCollection.supportsInterface("0x2a55205a")).to.be.true;
    });
  });
});
