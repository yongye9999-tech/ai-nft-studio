const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NFTMarketplace", function () {
  let nft, marketplace;
  let owner, seller, buyer, royaltyReceiver, other;
  const mintFee = ethers.parseEther("0.01");
  const royaltyBps = 500; // 5%

  beforeEach(async function () {
    [owner, seller, buyer, royaltyReceiver, other] = await ethers.getSigners();

    // Deploy NFT collection
    const AINFTCollection = await ethers.getContractFactory("AINFTCollection");
    nft = await AINFTCollection.deploy(
      "AI NFT Collection",
      "AINFT",
      mintFee,
      royaltyReceiver.address,
      royaltyBps
    );

    // Deploy marketplace
    const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");
    marketplace = await NFTMarketplace.deploy();

    // Mint a token for the seller
    await nft.connect(seller).mint("ipfs://QmToken1", { value: mintFee });
    // tokenId = 1

    // Approve marketplace
    await nft.connect(seller).setApprovalForAll(await marketplace.getAddress(), true);
  });

  describe("Deployment", function () {
    it("should set platform fee to 250 (2.5%)", async function () {
      expect(await marketplace.platformFee()).to.equal(250);
    });

    it("should set owner correctly", async function () {
      expect(await marketplace.owner()).to.equal(owner.address);
    });
  });

  describe("Listing", function () {
    const listPrice = ethers.parseEther("1");

    it("should list an NFT", async function () {
      const nftAddr = await nft.getAddress();
      await expect(marketplace.connect(seller).listItem(nftAddr, 1, listPrice))
        .to.emit(marketplace, "ItemListed")
        .withArgs(1, seller.address, nftAddr, 1, listPrice);

      const listing = await marketplace.listings(1);
      expect(listing.seller).to.equal(seller.address);
      expect(listing.price).to.equal(listPrice);
      expect(listing.active).to.be.true;
    });

    it("should revert if price is 0", async function () {
      await expect(
        marketplace.connect(seller).listItem(await nft.getAddress(), 1, 0)
      ).to.be.revertedWith("NFTMarketplace: price must be > 0");
    });

    it("should revert if caller is not owner of token", async function () {
      await expect(
        marketplace.connect(buyer).listItem(await nft.getAddress(), 1, listPrice)
      ).to.be.revertedWith("NFTMarketplace: not token owner");
    });
  });

  describe("Buying", function () {
    const listPrice = ethers.parseEther("1");

    beforeEach(async function () {
      await marketplace.connect(seller).listItem(await nft.getAddress(), 1, listPrice);
    });

    it("should transfer NFT to buyer on purchase", async function () {
      await marketplace.connect(buyer).buyItem(1, { value: listPrice });
      expect(await nft.ownerOf(1)).to.equal(buyer.address);
    });

    it("should distribute royalty, platform fee, and seller proceeds", async function () {
      const sellerBefore = await ethers.provider.getBalance(seller.address);
      const royaltyBefore = await ethers.provider.getBalance(royaltyReceiver.address);

      await marketplace.connect(buyer).buyItem(1, { value: listPrice });

      const royaltyAfter = await ethers.provider.getBalance(royaltyReceiver.address);
      const royaltyReceived = royaltyAfter - royaltyBefore;

      // 5% royalty = 0.05 ETH
      expect(royaltyReceived).to.equal(ethers.parseEther("0.05"));

      const sellerAfter = await ethers.provider.getBalance(seller.address);
      const sellerReceived = sellerAfter - sellerBefore;

      // 2.5% platform + 5% royalty = 7.5% deducted => seller gets 92.5%
      expect(sellerReceived).to.be.closeTo(
        ethers.parseEther("0.925"),
        ethers.parseEther("0.001")
      );
    });

    it("should deactivate listing after purchase", async function () {
      await marketplace.connect(buyer).buyItem(1, { value: listPrice });
      const listing = await marketplace.listings(1);
      expect(listing.active).to.be.false;
    });

    it("should revert on insufficient payment", async function () {
      await expect(
        marketplace.connect(buyer).buyItem(1, { value: ethers.parseEther("0.5") })
      ).to.be.revertedWith("NFTMarketplace: insufficient payment");
    });

    it("should revert if listing is not active", async function () {
      await marketplace.connect(buyer).buyItem(1, { value: listPrice });
      await expect(
        marketplace.connect(other).buyItem(1, { value: listPrice })
      ).to.be.revertedWith("NFTMarketplace: listing not active");
    });
  });

  describe("Cancel Listing", function () {
    const listPrice = ethers.parseEther("1");

    it("should cancel listing by seller", async function () {
      await marketplace.connect(seller).listItem(await nft.getAddress(), 1, listPrice);
      await expect(marketplace.connect(seller).cancelListing(1))
        .to.emit(marketplace, "ItemCanceled")
        .withArgs(1, seller.address);
      expect((await marketplace.listings(1)).active).to.be.false;
    });

    it("should allow owner to cancel any listing", async function () {
      await marketplace.connect(seller).listItem(await nft.getAddress(), 1, listPrice);
      await marketplace.connect(owner).cancelListing(1);
      expect((await marketplace.listings(1)).active).to.be.false;
    });

    it("should revert if non-seller tries to cancel", async function () {
      await marketplace.connect(seller).listItem(await nft.getAddress(), 1, listPrice);
      await expect(marketplace.connect(buyer).cancelListing(1)).to.be.revertedWith(
        "NFTMarketplace: not seller"
      );
    });
  });

  describe("Auction", function () {
    const startPrice = ethers.parseEther("0.5");
    const duration = 3600; // 1 hour

    beforeEach(async function () {
      await marketplace
        .connect(seller)
        .createAuction(await nft.getAddress(), 1, startPrice, duration);
    });

    it("should create an auction and lock the NFT", async function () {
      expect(await nft.ownerOf(1)).to.equal(await marketplace.getAddress());
      const auction = await marketplace.auctions(1);
      expect(auction.active).to.be.true;
      expect(auction.startPrice).to.equal(startPrice);
    });

    it("should accept a bid above start price", async function () {
      const bid = ethers.parseEther("1");
      await expect(marketplace.connect(buyer).placeBid(1, { value: bid }))
        .to.emit(marketplace, "BidPlaced")
        .withArgs(1, buyer.address, bid);
      const auction = await marketplace.auctions(1);
      expect(auction.highestBid).to.equal(bid);
      expect(auction.highestBidder).to.equal(buyer.address);
    });

    it("should refund previous bidder on higher bid", async function () {
      const bid1 = ethers.parseEther("1");
      await marketplace.connect(buyer).placeBid(1, { value: bid1 });

      const buyerBefore = await ethers.provider.getBalance(buyer.address);
      const bid2 = ethers.parseEther("2");
      await marketplace.connect(other).placeBid(1, { value: bid2 });
      const buyerAfter = await ethers.provider.getBalance(buyer.address);

      expect(buyerAfter - buyerBefore).to.be.closeTo(bid1, ethers.parseEther("0.001"));
    });

    it("should end auction and transfer NFT to winner", async function () {
      const bid = ethers.parseEther("1");
      await marketplace.connect(buyer).placeBid(1, { value: bid });

      // Fast-forward time
      await ethers.provider.send("evm_increaseTime", [duration + 1]);
      await ethers.provider.send("evm_mine");

      await marketplace.endAuction(1);
      expect(await nft.ownerOf(1)).to.equal(buyer.address);
    });

    it("should return NFT to seller if no bids", async function () {
      await ethers.provider.send("evm_increaseTime", [duration + 1]);
      await ethers.provider.send("evm_mine");

      await marketplace.endAuction(1);
      expect(await nft.ownerOf(1)).to.equal(seller.address);
    });

    it("should revert endAuction before end time", async function () {
      await marketplace.connect(buyer).placeBid(1, { value: ethers.parseEther("1") });
      await expect(marketplace.endAuction(1)).to.be.revertedWith(
        "NFTMarketplace: auction still ongoing"
      );
    });
  });

  describe("Platform Fee", function () {
    it("should allow owner to update platform fee", async function () {
      await marketplace.setPlatformFee(300);
      expect(await marketplace.platformFee()).to.equal(300);
    });

    it("should revert if fee exceeds 10%", async function () {
      await expect(marketplace.setPlatformFee(1001)).to.be.revertedWith(
        "NFTMarketplace: fee too high"
      );
    });

    it("should accumulate platform fees after sale", async function () {
      const listPrice = ethers.parseEther("1");
      await marketplace.connect(seller).listItem(await nft.getAddress(), 1, listPrice);
      await marketplace.connect(buyer).buyItem(1, { value: listPrice });

      // 2.5% of 1 ETH = 0.025 ETH
      const pending = await marketplace.pendingPlatformFees();
      expect(pending).to.equal(ethers.parseEther("0.025"));
    });

    it("should allow owner to withdraw platform fees", async function () {
      const listPrice = ethers.parseEther("1");
      await marketplace.connect(seller).listItem(await nft.getAddress(), 1, listPrice);
      await marketplace.connect(buyer).buyItem(1, { value: listPrice });

      const ownerBefore = await ethers.provider.getBalance(owner.address);
      const tx = await marketplace.withdraw();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const ownerAfter = await ethers.provider.getBalance(owner.address);

      expect(ownerAfter).to.be.closeTo(
        ownerBefore + ethers.parseEther("0.025") - gasUsed,
        ethers.parseEther("0.001")
      );
    });
  });
});
