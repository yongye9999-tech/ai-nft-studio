const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AINFTCollection", function () {
  let nftCollection;
  let owner;
  let addr1;
  let addr2;

  const MINT_FEE = ethers.parseEther("0.001");
  const TOKEN_URI = "ipfs://QmTestHash/metadata.json";

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const AINFTCollection = await ethers.getContractFactory("AINFTCollection");
    nftCollection = await AINFTCollection.deploy("AI NFT Studio", "AINFT", 500);
    await nftCollection.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should deploy with correct name and symbol", async function () {
      expect(await nftCollection.name()).to.equal("AI NFT Studio");
      expect(await nftCollection.symbol()).to.equal("AINFT");
    });

    it("Should set the correct owner", async function () {
      expect(await nftCollection.owner()).to.equal(owner.address);
    });

    it("Should set the default mint fee to 0.001 ether", async function () {
      expect(await nftCollection.mintFee()).to.equal(MINT_FEE);
    });
  });

  describe("Minting", function () {
    it("Should mint NFT with correct tokenURI", async function () {
      await nftCollection.connect(addr1).mint(TOKEN_URI, { value: MINT_FEE });
      expect(await nftCollection.tokenURI(0)).to.equal(TOKEN_URI);
    });

    it("Should charge mint fee", async function () {
      await expect(
        nftCollection.connect(addr1).mint(TOKEN_URI, { value: ethers.parseEther("0.0009") })
      ).to.be.revertedWith("AINFTCollection: insufficient mint fee");
    });

    it("Should succeed with exact mint fee", async function () {
      await expect(
        nftCollection.connect(addr1).mint(TOKEN_URI, { value: MINT_FEE })
      ).to.not.be.reverted;
    });

    it("Should record the creator correctly", async function () {
      await nftCollection.connect(addr1).mint(TOKEN_URI, { value: MINT_FEE });
      expect(await nftCollection.getCreator(0)).to.equal(addr1.address);
    });

    it("Should increment totalMinted after each mint", async function () {
      expect(await nftCollection.totalMinted()).to.equal(0);
      await nftCollection.connect(addr1).mint(TOKEN_URI, { value: MINT_FEE });
      expect(await nftCollection.totalMinted()).to.equal(1);
      await nftCollection.connect(addr2).mint(TOKEN_URI, { value: MINT_FEE });
      expect(await nftCollection.totalMinted()).to.equal(2);
    });

    it("Should emit NFTMinted event", async function () {
      await expect(nftCollection.connect(addr1).mint(TOKEN_URI, { value: MINT_FEE }))
        .to.emit(nftCollection, "NFTMinted")
        .withArgs(0, addr1.address, TOKEN_URI);
    });
  });

  describe("Royalties (ERC2981)", function () {
    it("Should set royalty info", async function () {
      await nftCollection.connect(addr1).mint(TOKEN_URI, { value: MINT_FEE });
      const [receiver, royaltyAmount] = await nftCollection.royaltyInfo(0, ethers.parseEther("1"));
      expect(receiver).to.equal(owner.address);
      // 5% of 1 ether = 0.05 ether
      expect(royaltyAmount).to.equal(ethers.parseEther("0.05"));
    });

    it("Should allow owner to update default royalty", async function () {
      await nftCollection.setDefaultRoyalty(addr2.address, 1000); // 10%
      await nftCollection.connect(addr1).mint(TOKEN_URI, { value: MINT_FEE });
      const [receiver, royaltyAmount] = await nftCollection.royaltyInfo(0, ethers.parseEther("1"));
      expect(receiver).to.equal(addr2.address);
      expect(royaltyAmount).to.equal(ethers.parseEther("0.1"));
    });

    it("Should revert setDefaultRoyalty from non-owner", async function () {
      await expect(
        nftCollection.connect(addr1).setDefaultRoyalty(addr1.address, 500)
      ).to.be.reverted;
    });
  });

  describe("Owner functions", function () {
    it("Should allow owner to change mint fee", async function () {
      const newFee = ethers.parseEther("0.005");
      await nftCollection.setMintFee(newFee);
      expect(await nftCollection.mintFee()).to.equal(newFee);
    });

    it("Should revert setMintFee from non-owner", async function () {
      await expect(
        nftCollection.connect(addr1).setMintFee(ethers.parseEther("0.005"))
      ).to.be.reverted;
    });

    it("Should allow owner to withdraw", async function () {
      // Mint to accumulate fees
      await nftCollection.connect(addr1).mint(TOKEN_URI, { value: MINT_FEE });
      await nftCollection.connect(addr2).mint(TOKEN_URI, { value: MINT_FEE });

      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      const tx = await nftCollection.withdraw();
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * tx.gasPrice;

      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);

      // Owner receives 2 * MINT_FEE minus gas
      expect(ownerBalanceAfter).to.be.closeTo(
        ownerBalanceBefore + MINT_FEE * 2n - gasCost,
        ethers.parseEther("0.0001")
      );
    });

    it("Should revert withdraw when balance is zero", async function () {
      await expect(nftCollection.withdraw()).to.be.revertedWith(
        "AINFTCollection: nothing to withdraw"
      );
    });

    it("Should revert withdraw from non-owner", async function () {
      await nftCollection.connect(addr1).mint(TOKEN_URI, { value: MINT_FEE });
      await expect(nftCollection.connect(addr1).withdraw()).to.be.reverted;
    });
  });

  describe("Interface support", function () {
    it("Should support ERC721 interface", async function () {
      expect(await nftCollection.supportsInterface("0x80ac58cd")).to.equal(true);
    });

    it("Should support ERC2981 interface", async function () {
      expect(await nftCollection.supportsInterface("0x2a55205a")).to.equal(true);
    });
  });
});
