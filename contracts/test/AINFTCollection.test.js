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

    it("should refund excess payment to the caller", async function () {
      const overpayment = ethers.parseEther("0.1");
      const excess = overpayment - MINT_FEE;

      const balanceBefore = await ethers.provider.getBalance(user1.address);
      const tx = await nft.connect(user1).mint(user1.address, TOKEN_URI, { value: overpayment });
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * (receipt.gasPrice || receipt.effectiveGasPrice);
      const balanceAfter = await ethers.provider.getBalance(user1.address);

      // User paid MINT_FEE + gas, excess was refunded
      expect(balanceBefore - balanceAfter).to.equal(MINT_FEE + gasUsed);
      // Contract only holds the mint fee, not the overpayment
      const contractBalance = await ethers.provider.getBalance(await nft.getAddress());
      expect(contractBalance).to.equal(MINT_FEE);
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

  // ── Free Mint List ───────────────────────────────────────────────────────

  describe("FreeMintList", function () {
    it("should allow owner to whitelist an address for free minting", async function () {
      await nft.connect(owner).setFreeMintList([user1.address], true);
      expect(await nft.freeMintList(user1.address)).to.be.true;
    });

    it("should emit FreeMintListUpdated when whitelist is updated", async function () {
      await expect(nft.connect(owner).setFreeMintList([user1.address], true))
        .to.emit(nft, "FreeMintListUpdated")
        .withArgs(user1.address, true);
    });

    it("should allow a whitelisted address to mint for free", async function () {
      await nft.connect(owner).setFreeMintList([user1.address], true);
      // Minting with zero value should succeed
      await expect(
        nft.connect(user1).mint(user1.address, TOKEN_URI, { value: 0 })
      ).not.to.be.reverted;
      expect(await nft.ownerOf(1)).to.equal(user1.address);
    });

    it("should allow owner to remove an address from the whitelist", async function () {
      await nft.connect(owner).setFreeMintList([user1.address], true);
      await nft.connect(owner).setFreeMintList([user1.address], false);
      expect(await nft.freeMintList(user1.address)).to.be.false;
    });

    it("should revert setFreeMintList when called by non-owner", async function () {
      await expect(
        nft.connect(user1).setFreeMintList([user1.address], true)
      ).to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount");
    });

    it("should still require the fee for a non-whitelisted address", async function () {
      await nft.connect(owner).setFreeMintList([user1.address], true);
      await expect(
        nft.connect(user2).mint(user2.address, TOKEN_URI, { value: 0 })
      ).to.be.revertedWith("AINFTCollection: insufficient mint fee");
    });
  });

  // ── Mint Fee Discount ────────────────────────────────────────────────────

  describe("MintFeeDiscount", function () {
    it("should allow owner to set a discount for an address", async function () {
      await nft.connect(owner).setMintFeeDiscount(user1.address, 5000); // 50% off
      expect(await nft.mintFeeDiscount(user1.address)).to.equal(5000);
    });

    it("should emit MintFeeDiscountUpdated when discount is set", async function () {
      await expect(nft.connect(owner).setMintFeeDiscount(user1.address, 5000))
        .to.emit(nft, "MintFeeDiscountUpdated")
        .withArgs(user1.address, 5000);
    });

    it("should apply discount when minting", async function () {
      // 50% discount: effective fee = 0.005 ETH
      await nft.connect(owner).setMintFeeDiscount(user1.address, 5000);
      const discountedFee = MINT_FEE / 2n;

      const balanceBefore = await ethers.provider.getBalance(user1.address);
      const tx = await nft
        .connect(user1)
        .mint(user1.address, TOKEN_URI, { value: discountedFee });
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * (receipt.gasPrice || receipt.effectiveGasPrice);
      const balanceAfter = await ethers.provider.getBalance(user1.address);

      expect(balanceBefore - balanceAfter).to.equal(discountedFee + gasUsed);
    });

    it("should revert if discounted fee is not met", async function () {
      await nft.connect(owner).setMintFeeDiscount(user1.address, 5000); // 50% off
      const tooLow = ethers.parseEther("0.004"); // below the 0.005 effective fee
      await expect(
        nft.connect(user1).mint(user1.address, TOKEN_URI, { value: tooLow })
      ).to.be.revertedWith("AINFTCollection: insufficient mint fee");
    });

    it("should revert if discount exceeds 100%", async function () {
      await expect(
        nft.connect(owner).setMintFeeDiscount(user1.address, 10_001)
      ).to.be.revertedWith("AINFTCollection: discount cannot exceed 100%");
    });

    it("should revert setMintFeeDiscount when called by non-owner", async function () {
      await expect(
        nft.connect(user1).setMintFeeDiscount(user1.address, 5000)
      ).to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount");
    });
  });

  // ── Pausable ─────────────────────────────────────────────────────────────

  describe("Pausable", function () {
    it("should allow owner to pause the contract", async function () {
      await nft.connect(owner).pause();
      expect(await nft.paused()).to.be.true;
    });

    it("should allow owner to unpause the contract", async function () {
      await nft.connect(owner).pause();
      await nft.connect(owner).unpause();
      expect(await nft.paused()).to.be.false;
    });

    it("should revert mint when paused", async function () {
      await nft.connect(owner).pause();
      await expect(
        nft.connect(user1).mint(user1.address, TOKEN_URI, { value: MINT_FEE })
      ).to.be.revertedWithCustomError(nft, "EnforcedPause");
    });

    it("should allow minting again after unpausing", async function () {
      await nft.connect(owner).pause();
      await nft.connect(owner).unpause();
      await expect(
        nft.connect(user1).mint(user1.address, TOKEN_URI, { value: MINT_FEE })
      ).not.to.be.reverted;
    });

    it("should revert pause when called by non-owner", async function () {
      await expect(
        nft.connect(user1).pause()
      ).to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount");
    });

    it("should revert unpause when called by non-owner", async function () {
      await nft.connect(owner).pause();
      await expect(
        nft.connect(user1).unpause()
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
      const gasUsed = receipt.gasUsed * (receipt.gasPrice || receipt.effectiveGasPrice);

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
