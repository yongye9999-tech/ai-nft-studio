// test/NFTMarketplace.test.js — Hardhat + Chai tests for NFTMarketplace
// Tests cover: listItem, buyItem (with royalty), cancelListing, and auction flow.

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

describe("NFTMarketplace", function () {
  // ── Fixture ────────────────────────────────────────────────────
  async function deployFixture() {
    const [owner, seller, buyer, royaltyRecipient] = await ethers.getSigners();

    // Deploy NFT collection
    const mintFee = ethers.parseEther("0.01");
    const AINFTCollection = await ethers.getContractFactory("AINFTCollection");
    const nft = await AINFTCollection.deploy("AI NFT Studio", "AINFT", mintFee);
    await nft.waitForDeployment();

    // Deploy Marketplace
    const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");
    const marketplace = await NFTMarketplace.deploy();
    await marketplace.waitForDeployment();

    const nftAddress = await nft.getAddress();
    const marketplaceAddress = await marketplace.getAddress();

    // Seller mints a token
    await nft.connect(seller).mint("ipfs://token1", { value: mintFee });
    const tokenId = 1n;

    return {
      nft,
      marketplace,
      nftAddress,
      marketplaceAddress,
      owner,
      seller,
      buyer,
      royaltyRecipient,
      mintFee,
      tokenId,
    };
  }

  // ── listItem ───────────────────────────────────────────────────
  describe("listItem()", function () {
    it("should list an NFT for sale", async function () {
      const { nft, marketplace, marketplaceAddress, seller, nftAddress, tokenId } =
        await loadFixture(deployFixture);

      const price = ethers.parseEther("1.0");
      await nft.connect(seller).approve(marketplaceAddress, tokenId);

      await expect(
        marketplace.connect(seller).listItem(nftAddress, tokenId, price)
      )
        .to.emit(marketplace, "ItemListed")
        .withArgs(1, seller.address, nftAddress, tokenId, price);

      const listing = await marketplace.listings(1);
      expect(listing.seller).to.equal(seller.address);
      expect(listing.price).to.equal(price);
      expect(listing.active).to.be.true;
    });

    it("should revert if price is 0", async function () {
      const { nft, marketplace, marketplaceAddress, seller, nftAddress, tokenId } =
        await loadFixture(deployFixture);
      await nft.connect(seller).approve(marketplaceAddress, tokenId);
      await expect(
        marketplace.connect(seller).listItem(nftAddress, tokenId, 0)
      ).to.be.revertedWith("NFTMarketplace: price must be > 0");
    });

    it("should revert if caller is not the token owner", async function () {
      const { marketplace, nftAddress, buyer, tokenId } =
        await loadFixture(deployFixture);
      await expect(
        marketplace.connect(buyer).listItem(nftAddress, tokenId, ethers.parseEther("1.0"))
      ).to.be.revertedWith("NFTMarketplace: not token owner");
    });

    it("should revert if marketplace is not approved", async function () {
      const { marketplace, nftAddress, seller, tokenId } =
        await loadFixture(deployFixture);
      await expect(
        marketplace.connect(seller).listItem(nftAddress, tokenId, ethers.parseEther("1.0"))
      ).to.be.revertedWith("NFTMarketplace: marketplace not approved");
    });
  });

  // ── buyItem ────────────────────────────────────────────────────
  describe("buyItem()", function () {
    async function listedFixture() {
      const base = await loadFixture(deployFixture);
      const { nft, marketplace, marketplaceAddress, seller, nftAddress, tokenId } = base;
      const price = ethers.parseEther("1.0");
      await nft.connect(seller).approve(marketplaceAddress, tokenId);
      await marketplace.connect(seller).listItem(nftAddress, tokenId, price);
      return { ...base, price, listingId: 1n };
    }

    it("should transfer NFT to buyer and emit ItemSold", async function () {
      const { nft, marketplace, buyer, tokenId, price, listingId } =
        await listedFixture();

      await expect(
        marketplace.connect(buyer).buyItem(listingId, { value: price })
      )
        .to.emit(marketplace, "ItemSold")
        .withArgs(listingId, buyer.address, price);

      expect(await nft.ownerOf(tokenId)).to.equal(buyer.address);
    });

    it("should distribute royalty to the token creator (seller minted it)", async function () {
      const { marketplace, seller, buyer, price, listingId } =
        await listedFixture();

      // Seller is the royalty recipient (minted the token)
      const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);
      await marketplace.connect(buyer).buyItem(listingId, { value: price });
      const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);

      // Platform fee: 2.5% = 0.025 ETH; royalty: 5% = 0.05 ETH
      // Seller receives royalty + proceeds (they are seller AND royalty recipient)
      const platformFee = (price * 250n) / 10_000n;
      const expectedMinReceived = price - platformFee;
      expect(sellerBalanceAfter - sellerBalanceBefore).to.be.gte(expectedMinReceived - ethers.parseEther("0.01"));
    });

    it("should deactivate the listing after purchase", async function () {
      const { marketplace, buyer, price, listingId } = await listedFixture();
      await marketplace.connect(buyer).buyItem(listingId, { value: price });
      const listing = await marketplace.listings(listingId);
      expect(listing.active).to.be.false;
    });

    it("should revert if listing is not active", async function () {
      const { marketplace, buyer, price, listingId } = await listedFixture();
      await marketplace.connect(buyer).buyItem(listingId, { value: price });
      await expect(
        marketplace.connect(buyer).buyItem(listingId, { value: price })
      ).to.be.revertedWith("NFTMarketplace: listing not active");
    });

    it("should revert if payment is insufficient", async function () {
      const { marketplace, buyer, price, listingId } = await listedFixture();
      await expect(
        marketplace.connect(buyer).buyItem(listingId, { value: price - 1n })
      ).to.be.revertedWith("NFTMarketplace: insufficient payment");
    });
  });

  // ── cancelListing ──────────────────────────────────────────────
  describe("cancelListing()", function () {
    it("should allow seller to cancel their listing", async function () {
      const { nft, marketplace, marketplaceAddress, seller, nftAddress, tokenId } =
        await loadFixture(deployFixture);
      await nft.connect(seller).approve(marketplaceAddress, tokenId);
      await marketplace.connect(seller).listItem(nftAddress, tokenId, ethers.parseEther("1.0"));

      await expect(marketplace.connect(seller).cancelListing(1))
        .to.emit(marketplace, "ItemCanceled")
        .withArgs(1);

      expect((await marketplace.listings(1)).active).to.be.false;
    });

    it("should revert if non-seller tries to cancel", async function () {
      const { nft, marketplace, marketplaceAddress, seller, buyer, nftAddress, tokenId } =
        await loadFixture(deployFixture);
      await nft.connect(seller).approve(marketplaceAddress, tokenId);
      await marketplace.connect(seller).listItem(nftAddress, tokenId, ethers.parseEther("1.0"));
      await expect(marketplace.connect(buyer).cancelListing(1)).to.be.revertedWith(
        "NFTMarketplace: not seller"
      );
    });
  });

  // ── Auction flow ───────────────────────────────────────────────
  describe("Auction: createAuction → placeBid → endAuction", function () {
    async function auctionFixture() {
      const base = await loadFixture(deployFixture);
      const { nft, marketplace, marketplaceAddress, seller, nftAddress, tokenId } = base;
      const duration = 3600n; // 1 hour
      const startPrice = ethers.parseEther("0.5");

      await nft.connect(seller).approve(marketplaceAddress, tokenId);
      await marketplace.connect(seller).createAuction(nftAddress, tokenId, startPrice, duration);

      return { ...base, duration, startPrice, auctionId: 1n };
    }

    it("should create an auction and escrow the NFT", async function () {
      const { nft, marketplaceAddress, tokenId, startPrice } = await auctionFixture();
      // NFT is held by the marketplace
      expect(await nft.ownerOf(tokenId)).to.equal(marketplaceAddress);
      const auction = await (await ethers.getContractFactory("NFTMarketplace"))
        .attach(marketplaceAddress)
        .auctions(1);
      expect(auction.startPrice).to.equal(startPrice);
      expect(auction.ended).to.be.false;
    });

    it("should accept a bid higher than current highest", async function () {
      const { marketplace, buyer, auctionId, startPrice } = await auctionFixture();

      await expect(
        marketplace.connect(buyer).placeBid(auctionId, { value: startPrice })
      )
        .to.emit(marketplace, "BidPlaced")
        .withArgs(auctionId, buyer.address, startPrice);

      const auction = await marketplace.auctions(auctionId);
      expect(auction.highestBidder).to.equal(buyer.address);
      expect(auction.highestBid).to.equal(startPrice);
    });

    it("should refund previous bidder when outbid", async function () {
      const { marketplace, buyer, owner, auctionId, startPrice } = await auctionFixture();
      const bid1 = startPrice;
      const bid2 = startPrice + ethers.parseEther("0.1");

      await marketplace.connect(buyer).placeBid(auctionId, { value: bid1 });
      const balanceBefore = await ethers.provider.getBalance(buyer.address);
      await marketplace.connect(owner).placeBid(auctionId, { value: bid2 });
      const balanceAfter = await ethers.provider.getBalance(buyer.address);

      // Buyer should have received bid1 back (within gas tolerance)
      expect(balanceAfter).to.be.closeTo(balanceBefore + bid1, ethers.parseEther("0.01"));
    });

    it("should revert placeBid below start price", async function () {
      const { marketplace, buyer, auctionId, startPrice } = await auctionFixture();
      await expect(
        marketplace.connect(buyer).placeBid(auctionId, { value: startPrice - 1n })
      ).to.be.revertedWith("NFTMarketplace: bid below start price");
    });

    it("should settle auction and transfer NFT to highest bidder", async function () {
      const { nft, marketplace, buyer, seller, tokenId, auctionId, startPrice } =
        await auctionFixture();

      await marketplace.connect(buyer).placeBid(auctionId, { value: startPrice });

      // Fast-forward time past auction end
      await time.increase(3601);

      await expect(marketplace.endAuction(auctionId))
        .to.emit(marketplace, "AuctionEnded")
        .withArgs(auctionId, buyer.address, startPrice);

      expect(await nft.ownerOf(tokenId)).to.equal(buyer.address);
    });

    it("should return NFT to seller if no bids placed", async function () {
      const { nft, marketplace, seller, tokenId, auctionId } = await auctionFixture();

      await time.increase(3601);
      await marketplace.endAuction(auctionId);

      expect(await nft.ownerOf(tokenId)).to.equal(seller.address);
    });

    it("should revert endAuction before auction ends", async function () {
      const { marketplace, auctionId } = await auctionFixture();
      await expect(marketplace.endAuction(auctionId)).to.be.revertedWith(
        "NFTMarketplace: not yet ended"
      );
    });
  });

  // ── Platform fee & Withdraw ────────────────────────────────────
  describe("Admin", function () {
    it("should allow owner to set platform fee", async function () {
      const { marketplace, owner } = await loadFixture(deployFixture);
      await expect(marketplace.connect(owner).setPlatformFee(300))
        .to.emit(marketplace, "PlatformFeeUpdated")
        .withArgs(250, 300);
      expect(await marketplace.platformFee()).to.equal(300);
    });

    it("should revert if platform fee exceeds 10%", async function () {
      const { marketplace, owner } = await loadFixture(deployFixture);
      await expect(marketplace.connect(owner).setPlatformFee(1001)).to.be.revertedWith(
        "NFTMarketplace: fee too high"
      );
    });

    it("should allow owner to withdraw platform fees", async function () {
      const { nft, marketplace, marketplaceAddress, seller, buyer, nftAddress, tokenId, owner } =
        await loadFixture(deployFixture);
      const price = ethers.parseEther("1.0");
      await nft.connect(seller).approve(marketplaceAddress, tokenId);
      await marketplace.connect(seller).listItem(nftAddress, tokenId, price);
      await marketplace.connect(buyer).buyItem(1, { value: price });

      const contractBalance = await ethers.provider.getBalance(marketplaceAddress);
      expect(contractBalance).to.be.gt(0);

      const ownerBefore = await ethers.provider.getBalance(owner.address);
      const tx = await marketplace.connect(owner).withdraw();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const ownerAfter = await ethers.provider.getBalance(owner.address);

      expect(ownerAfter).to.be.closeTo(ownerBefore + contractBalance - gasUsed, ethers.parseEther("0.001"));
    });
  });
});
