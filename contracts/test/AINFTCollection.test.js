// test/AINFTCollection.test.js — Hardhat + Chai tests for AINFTCollection
// Tests cover: minting, fee enforcement, owner-only functions, royalties, and withdrawal.

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("AINFTCollection", function () {
  // ── Fixture ────────────────────────────────────────────────────
  async function deployFixture() {
    const [owner, alice, bob] = await ethers.getSigners();

    const mintFee = ethers.parseEther("0.01");
    const AINFTCollection = await ethers.getContractFactory("AINFTCollection");
    const nft = await AINFTCollection.deploy("AI NFT Studio", "AINFT", mintFee);
    await nft.waitForDeployment();

    return { nft, owner, alice, bob, mintFee };
  }

  // ── Deployment ─────────────────────────────────────────────────
  describe("Deployment", function () {
    it("should set correct name and symbol", async function () {
      const { nft } = await loadFixture(deployFixture);
      expect(await nft.name()).to.equal("AI NFT Studio");
      expect(await nft.symbol()).to.equal("AINFT");
    });

    it("should set the correct mint fee", async function () {
      const { nft, mintFee } = await loadFixture(deployFixture);
      expect(await nft.mintFee()).to.equal(mintFee);
    });

    it("should set the owner correctly", async function () {
      const { nft, owner } = await loadFixture(deployFixture);
      expect(await nft.owner()).to.equal(owner.address);
    });

    it("should start with totalSupply of 0", async function () {
      const { nft } = await loadFixture(deployFixture);
      expect(await nft.totalSupply()).to.equal(0);
    });
  });

  // ── Minting ────────────────────────────────────────────────────
  describe("mint()", function () {
    it("should mint successfully with exact mint fee", async function () {
      const { nft, alice, mintFee } = await loadFixture(deployFixture);
      const tokenURI = "ipfs://QmTestHash/metadata.json";

      await expect(nft.connect(alice).mint(tokenURI, { value: mintFee }))
        .to.emit(nft, "NFTMinted")
        .withArgs(1, alice.address, tokenURI);

      expect(await nft.ownerOf(1)).to.equal(alice.address);
      expect(await nft.tokenURI(1)).to.equal(tokenURI);
      expect(await nft.totalSupply()).to.equal(1);
    });

    it("should mint successfully with excess ETH and refund the difference", async function () {
      const { nft, alice, mintFee } = await loadFixture(deployFixture);
      const overpayment = mintFee + ethers.parseEther("0.05");

      const balanceBefore = await ethers.provider.getBalance(alice.address);
      const tx = await nft.connect(alice).mint("ipfs://test", { value: overpayment });
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const balanceAfter = await ethers.provider.getBalance(alice.address);

      // Net cost should be approximately mintFee + gas (not the overpayment)
      const netCost = balanceBefore - balanceAfter;
      expect(netCost).to.be.closeTo(mintFee + gasUsed, ethers.parseEther("0.001"));
    });

    it("should revert if insufficient fee is sent", async function () {
      const { nft, alice, mintFee } = await loadFixture(deployFixture);
      const lowFee = mintFee - 1n;

      await expect(
        nft.connect(alice).mint("ipfs://test", { value: lowFee })
      ).to.be.revertedWith("AINFTCollection: insufficient mint fee");
    });

    it("should revert with zero value", async function () {
      const { nft, alice } = await loadFixture(deployFixture);
      await expect(
        nft.connect(alice).mint("ipfs://test", { value: 0 })
      ).to.be.revertedWith("AINFTCollection: insufficient mint fee");
    });

    it("should auto-increment token IDs", async function () {
      const { nft, alice, mintFee } = await loadFixture(deployFixture);
      await nft.connect(alice).mint("ipfs://1", { value: mintFee });
      await nft.connect(alice).mint("ipfs://2", { value: mintFee });
      expect(await nft.totalSupply()).to.equal(2);
      expect(await nft.ownerOf(1)).to.equal(alice.address);
      expect(await nft.ownerOf(2)).to.equal(alice.address);
    });
  });

  // ── setMintFee ─────────────────────────────────────────────────
  describe("setMintFee()", function () {
    it("should allow owner to update the mint fee", async function () {
      const { nft, owner } = await loadFixture(deployFixture);
      const newFee = ethers.parseEther("0.05");

      await expect(nft.connect(owner).setMintFee(newFee))
        .to.emit(nft, "MintFeeUpdated");

      expect(await nft.mintFee()).to.equal(newFee);
    });

    it("should revert if called by non-owner", async function () {
      const { nft, alice } = await loadFixture(deployFixture);
      await expect(
        nft.connect(alice).setMintFee(ethers.parseEther("0.05"))
      ).to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount");
    });
  });

  // ── Royalties (ERC-2981) ────────────────────────────────────────
  describe("Royalties (ERC-2981)", function () {
    it("should return royalty info for a minted token", async function () {
      const { nft, alice, mintFee } = await loadFixture(deployFixture);
      await nft.connect(alice).mint("ipfs://test", { value: mintFee });

      const salePrice = ethers.parseEther("1.0");
      const [receiver, royaltyAmount] = await nft.royaltyInfo(1, salePrice);

      // Token-level royalty set to alice at 5%
      expect(receiver).to.equal(alice.address);
      expect(royaltyAmount).to.equal(salePrice * 500n / 10_000n);
    });

    it("should allow owner to set default royalty", async function () {
      const { nft, owner, bob } = await loadFixture(deployFixture);
      await nft.connect(owner).setDefaultRoyalty(bob.address, 300); // 3%

      // Mint a new token – it will use the updated default royalty
      const { mintFee } = await loadFixture(deployFixture);
      // re-deploy to get fresh state with new royalty
      const AINFTCollection = await ethers.getContractFactory("AINFTCollection");
      const freshNft = await AINFTCollection.deploy("Test", "TST", mintFee);
      await freshNft.connect(owner).setDefaultRoyalty(bob.address, 300);
      await freshNft.connect(bob).mint("ipfs://x", { value: mintFee });

      const salePrice = ethers.parseEther("1.0");
      const [, royaltyAmount] = await freshNft.royaltyInfo(1, salePrice);
      // per-token royalty set to minter (bob) at 5%; default royalty separate
      expect(royaltyAmount).to.equal(salePrice * 500n / 10_000n);
    });

    it("should report supportsInterface for ERC2981", async function () {
      const { nft } = await loadFixture(deployFixture);
      // ERC-2981 interface ID
      expect(await nft.supportsInterface("0x2a55205a")).to.be.true;
    });
  });

  // ── Withdraw ───────────────────────────────────────────────────
  describe("withdraw()", function () {
    it("should allow owner to withdraw accumulated fees", async function () {
      const { nft, owner, alice, mintFee } = await loadFixture(deployFixture);
      await nft.connect(alice).mint("ipfs://test", { value: mintFee });

      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      const tx = await nft.connect(owner).withdraw();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);

      expect(ownerBalanceAfter).to.be.closeTo(
        ownerBalanceBefore + mintFee - gasUsed,
        ethers.parseEther("0.001")
      );
    });

    it("should revert withdraw if balance is zero", async function () {
      const { nft, owner } = await loadFixture(deployFixture);
      await expect(nft.connect(owner).withdraw()).to.be.revertedWith(
        "AINFTCollection: nothing to withdraw"
      );
    });

    it("should revert withdraw if called by non-owner", async function () {
      const { nft, alice, mintFee } = await loadFixture(deployFixture);
      await nft.connect(alice).mint("ipfs://test", { value: mintFee });
      await expect(nft.connect(alice).withdraw()).to.be.revertedWithCustomError(
        nft,
        "OwnableUnauthorizedAccount"
      );
    });
  });
});
