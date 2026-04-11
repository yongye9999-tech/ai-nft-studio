const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AINFTCollection", function () {
  let nft;
  let owner, user1, user2, royaltyReceiver;
  const mintFee = ethers.parseEther("0.01");
  const royaltyBps = 500; // 5%

  beforeEach(async function () {
    [owner, user1, user2, royaltyReceiver] = await ethers.getSigners();
    const AINFTCollection = await ethers.getContractFactory("AINFTCollection");
    nft = await AINFTCollection.deploy(
      "AI NFT Collection",
      "AINFT",
      mintFee,
      royaltyReceiver.address,
      royaltyBps
    );
  });

  describe("Deployment", function () {
    it("should set correct name and symbol", async function () {
      expect(await nft.name()).to.equal("AI NFT Collection");
      expect(await nft.symbol()).to.equal("AINFT");
    });

    it("should set correct mint fee", async function () {
      expect(await nft.mintFee()).to.equal(mintFee);
    });

    it("should set owner correctly", async function () {
      expect(await nft.owner()).to.equal(owner.address);
    });
  });

  describe("Minting", function () {
    it("should mint NFT with correct fee", async function () {
      const tokenURI = "ipfs://QmTestHash";
      await expect(
        nft.connect(user1).mint(tokenURI, { value: mintFee })
      )
        .to.emit(nft, "NFTMinted")
        .withArgs(1, user1.address, tokenURI);

      expect(await nft.ownerOf(1)).to.equal(user1.address);
      expect(await nft.tokenURI(1)).to.equal(tokenURI);
    });

    it("should revert if mint fee is insufficient", async function () {
      await expect(
        nft.connect(user1).mint("ipfs://QmTest", { value: ethers.parseEther("0.001") })
      ).to.be.revertedWith("AINFTCollection: insufficient mint fee");
    });

    it("should increment token IDs", async function () {
      await nft.connect(user1).mint("ipfs://QmA", { value: mintFee });
      await nft.connect(user1).mint("ipfs://QmB", { value: mintFee });
      expect(await nft.totalSupply()).to.equal(2);
    });

    it("should accept overpayment", async function () {
      await expect(
        nft.connect(user1).mint("ipfs://QmTest", { value: ethers.parseEther("1") })
      ).to.not.be.reverted;
    });
  });

  describe("Mint Fee Management", function () {
    it("should allow owner to update mint fee", async function () {
      const newFee = ethers.parseEther("0.05");
      await expect(nft.setMintFee(newFee))
        .to.emit(nft, "MintFeeUpdated")
        .withArgs(mintFee, newFee);
      expect(await nft.mintFee()).to.equal(newFee);
    });

    it("should revert if non-owner updates mint fee", async function () {
      await expect(
        nft.connect(user1).setMintFee(ethers.parseEther("0.05"))
      ).to.be.reverted;
    });
  });

  describe("Royalty (ERC2981)", function () {
    it("should return correct royalty info", async function () {
      await nft.connect(user1).mint("ipfs://QmTest", { value: mintFee });
      const salePrice = ethers.parseEther("1");
      const [receiver, royaltyAmount] = await nft.royaltyInfo(1, salePrice);
      expect(receiver).to.equal(royaltyReceiver.address);
      // 5% of 1 ETH = 0.05 ETH
      expect(royaltyAmount).to.equal(ethers.parseEther("0.05"));
    });

    it("should allow owner to update royalty", async function () {
      await nft.setDefaultRoyalty(user2.address, 1000); // 10%
      await nft.connect(user1).mint("ipfs://QmTest", { value: mintFee });
      const salePrice = ethers.parseEther("1");
      const [receiver, royaltyAmount] = await nft.royaltyInfo(1, salePrice);
      expect(receiver).to.equal(user2.address);
      expect(royaltyAmount).to.equal(ethers.parseEther("0.1"));
    });

    it("should support ERC2981 interface", async function () {
      const erc2981InterfaceId = "0x2a55205a";
      expect(await nft.supportsInterface(erc2981InterfaceId)).to.be.true;
    });
  });

  describe("Withdraw", function () {
    it("should allow owner to withdraw mint fees", async function () {
      // Mint a token to build up balance
      await nft.connect(user1).mint("ipfs://QmTest", { value: mintFee });

      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      const tx = await nft.withdraw();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);

      expect(ownerBalanceAfter).to.be.closeTo(
        ownerBalanceBefore + mintFee - gasUsed,
        ethers.parseEther("0.001")
      );
    });

    it("should revert withdraw when balance is zero", async function () {
      await expect(nft.withdraw()).to.be.revertedWith(
        "AINFTCollection: nothing to withdraw"
      );
    });

    it("should revert withdraw for non-owner", async function () {
      await nft.connect(user1).mint("ipfs://QmTest", { value: mintFee });
      await expect(nft.connect(user1).withdraw()).to.be.reverted;
    });
  });
});
