const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AINFTCollection", function () {
  let nft;
  let owner;
  let user1;
  let user2;

  const MINT_FEE = ethers.parseEther("0.01");
  const MAX_SUPPLY = 100;
  const TOKEN_URI = "ipfs://QmTestMetadata";

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    const AINFTCollection = await ethers.getContractFactory("AINFTCollection");
    nft = await AINFTCollection.deploy("AI NFT Studio", "AINFT", MINT_FEE, MAX_SUPPLY);
  });

  // ── Deployment ──────────────────────────────────────────────────────────

  describe("Deployment", function () {
    it("should set the correct name and symbol", async function () {
      expect(await nft.name()).to.equal("AI NFT Studio");
      expect(await nft.symbol()).to.equal("AINFT");
    });

    it("should set the correct mint fee", async function () {
      expect(await nft.mintFee()).to.equal(MINT_FEE);
    });

    it("should set the correct max supply", async function () {
      expect(await nft.maxSupply()).to.equal(MAX_SUPPLY);
    });

    it("should initialise tokenCounter to 0", async function () {
      expect(await nft.tokenCounter()).to.equal(0);
    });

    it("should set owner correctly", async function () {
      expect(await nft.owner()).to.equal(owner.address);
    });

    it("should set default royalty to 5% for owner", async function () {
      // Mint first so royaltyInfo has a valid token to query
      await nft.connect(user1).mint(user1.address, TOKEN_URI, { value: MINT_FEE });
      const salePrice = ethers.parseEther("1");
      const [receiver, royaltyAmount] = await nft.royaltyInfo(1, salePrice);
      expect(receiver).to.equal(owner.address);
      expect(royaltyAmount).to.equal((salePrice * 500n) / 10_000n);
    });

    it("should support ERC721 and ERC2981 interfaces", async function () {
      // ERC721 interfaceId
      expect(await nft.supportsInterface("0x80ac58cd")).to.be.true;
      // ERC2981 interfaceId
      expect(await nft.supportsInterface("0x2a55205a")).to.be.true;
    });
  });

  // ── Minting ─────────────────────────────────────────────────────────────

  describe("Minting", function () {
    it("should mint an NFT and assign it to the recipient", async function () {
      await nft.connect(user1).mint(user1.address, TOKEN_URI, { value: MINT_FEE });
      expect(await nft.ownerOf(1)).to.equal(user1.address);
    });

    it("should increment tokenCounter after mint", async function () {
      await nft.connect(user1).mint(user1.address, TOKEN_URI, { value: MINT_FEE });
      expect(await nft.tokenCounter()).to.equal(1);
    });

    it("should set the correct token URI", async function () {
      await nft.connect(user1).mint(user1.address, TOKEN_URI, { value: MINT_FEE });
      expect(await nft.tokenURI(1)).to.equal(TOKEN_URI);
    });

    it("should emit NFTMinted event", async function () {
      await expect(nft.connect(user1).mint(user1.address, TOKEN_URI, { value: MINT_FEE }))
        .to.emit(nft, "NFTMinted")
        .withArgs(user1.address, 1, TOKEN_URI);
    });

    it("should allow minting to a different address", async function () {
      await nft.connect(user1).mint(user2.address, TOKEN_URI, { value: MINT_FEE });
      expect(await nft.ownerOf(1)).to.equal(user2.address);
    });

    it("should revert if insufficient mint fee is provided", async function () {
      const lowFee = ethers.parseEther("0.001");
      await expect(
        nft.connect(user1).mint(user1.address, TOKEN_URI, { value: lowFee })
      ).to.be.revertedWith("AINFTCollection: insufficient mint fee");
    });

    it("should allow overpayment (excess not refunded by contract)", async function () {
      const overpayment = ethers.parseEther("0.1");
      await expect(nft.connect(user1).mint(user1.address, TOKEN_URI, { value: overpayment })).to
        .not.be.reverted;
    });

    it("should revert when max supply is reached", async function () {
      const SmallSupply = await ethers.getContractFactory("AINFTCollection");
      const smallNft = await SmallSupply.deploy("Test", "TST", MINT_FEE, 1);

      await smallNft.connect(user1).mint(user1.address, TOKEN_URI, { value: MINT_FEE });
      await expect(
        smallNft.connect(user1).mint(user1.address, TOKEN_URI, { value: MINT_FEE })
      ).to.be.revertedWith("AINFTCollection: max supply reached");
    });
  });

  // ── Fee Collection ───────────────────────────────────────────────────────

  describe("Fee collection", function () {
    it("should accumulate ETH in the contract after minting", async function () {
      await nft.connect(user1).mint(user1.address, TOKEN_URI, { value: MINT_FEE });
      const contractBalance = await ethers.provider.getBalance(await nft.getAddress());
      expect(contractBalance).to.equal(MINT_FEE);
    });

    it("should allow owner to update mint fee", async function () {
      const newFee = ethers.parseEther("0.05");
      await expect(nft.connect(owner).setMintFee(newFee))
        .to.emit(nft, "MintFeeUpdated")
        .withArgs(newFee);
      expect(await nft.mintFee()).to.equal(newFee);
    });

    it("should revert setMintFee when called by non-owner", async function () {
      await expect(
        nft.connect(user1).setMintFee(ethers.parseEther("0.05"))
      ).to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount");
    });
  });

  // ── Royalty ──────────────────────────────────────────────────────────────

  describe("Royalty (ERC2981)", function () {
    it("should allow owner to update default royalty", async function () {
      await nft.connect(owner).setDefaultRoyalty(user2.address, 1000); // 10%
      await nft.connect(user1).mint(user1.address, TOKEN_URI, { value: MINT_FEE });
      const salePrice = ethers.parseEther("1");
      const [receiver, amount] = await nft.royaltyInfo(1, salePrice);
      expect(receiver).to.equal(user2.address);
      expect(amount).to.equal((salePrice * 1000n) / 10_000n);
    });

    it("should revert if royalty exceeds 10%", async function () {
      await expect(
        nft.connect(owner).setDefaultRoyalty(user2.address, 1001)
      ).to.be.revertedWith("AINFTCollection: royalty cannot exceed 10%");
    });

    it("should revert setDefaultRoyalty when called by non-owner", async function () {
      await expect(
        nft.connect(user1).setDefaultRoyalty(user1.address, 500)
      ).to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount");
    });
  });

  // ── Withdraw ─────────────────────────────────────────────────────────────

  describe("Withdraw", function () {
    it("should allow owner to withdraw accumulated fees", async function () {
      await nft.connect(user1).mint(user1.address, TOKEN_URI, { value: MINT_FEE });

      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      const tx = await nft.connect(owner).withdraw();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
      expect(ownerBalanceAfter).to.equal(ownerBalanceBefore + MINT_FEE - gasUsed);
    });

    it("should emit Withdrawn event on withdraw", async function () {
      await nft.connect(user1).mint(user1.address, TOKEN_URI, { value: MINT_FEE });
      await expect(nft.connect(owner).withdraw())
        .to.emit(nft, "Withdrawn")
        .withArgs(owner.address, MINT_FEE);
    });

    it("should revert withdraw when balance is zero", async function () {
      await expect(nft.connect(owner).withdraw()).to.be.revertedWith(
        "AINFTCollection: nothing to withdraw"
      );
    });

    it("should revert withdraw when called by non-owner", async function () {
      await nft.connect(user1).mint(user1.address, TOKEN_URI, { value: MINT_FEE });
      await expect(nft.connect(user1).withdraw()).to.be.revertedWithCustomError(
        nft,
        "OwnableUnauthorizedAccount"
      );
    });
  });
});
