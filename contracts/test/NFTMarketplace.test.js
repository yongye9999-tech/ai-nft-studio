const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("NFTMarketplace", function () {
  let nft;
  let marketplace;
  let owner;
  let seller;
  let buyer;
  let bidder1;
  let bidder2;

  const MINT_FEE = ethers.parseEther("0.01");
  const MAX_SUPPLY = 100;
  const TOKEN_URI = "ipfs://QmTestMetadata";
  const LIST_PRICE = ethers.parseEther("1");
  const ONE_DAY = 86_400;

  async function mintNFT(to) {
    const tx = await nft.connect(to).mint(to.address, TOKEN_URI, { value: MINT_FEE });
    const receipt = await tx.wait();
    // TokenCounter increments sequentially; return the latest value
    return await nft.tokenCounter();
  }

  async function approveMarketplace(tokenOwner, tokenId) {
    await nft
      .connect(tokenOwner)
      .approve(await marketplace.getAddress(), tokenId);
  }

  beforeEach(async function () {
    [owner, seller, buyer, bidder1, bidder2] = await ethers.getSigners();

    const AINFTCollection = await ethers.getContractFactory("AINFTCollection");
    nft = await AINFTCollection.deploy("AI NFT Studio", "AINFT", MINT_FEE, MAX_SUPPLY);

    const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");
    marketplace = await NFTMarketplace.deploy();
  });

  // ── Listing ──────────────────────────────────────────────────────────────

  describe("listItem", function () {
    it("should list an NFT at the specified price", async function () {
      const tokenId = await mintNFT(seller);
      await approveMarketplace(seller, tokenId);
      const nftAddr = await nft.getAddress();

      await expect(marketplace.connect(seller).listItem(nftAddr, tokenId, LIST_PRICE))
        .to.emit(marketplace, "ItemListed")
        .withArgs(seller.address, nftAddr, tokenId, LIST_PRICE);

      const listing = await marketplace.getListing(nftAddr, tokenId);
      expect(listing.active).to.be.true;
      expect(listing.price).to.equal(LIST_PRICE);
      expect(listing.seller).to.equal(seller.address);
    });

    it("should revert if price is zero", async function () {
      const tokenId = await mintNFT(seller);
      await approveMarketplace(seller, tokenId);
      const nftAddr = await nft.getAddress();
      await expect(
        marketplace.connect(seller).listItem(nftAddr, tokenId, 0)
      ).to.be.revertedWith("Marketplace: price must be > 0");
    });

    it("should revert if caller is not the token owner", async function () {
      const tokenId = await mintNFT(seller);
      const nftAddr = await nft.getAddress();
      await expect(
        marketplace.connect(buyer).listItem(nftAddr, tokenId, LIST_PRICE)
      ).to.be.revertedWith("Marketplace: not token owner");
    });

    it("should revert if marketplace is not approved", async function () {
      const tokenId = await mintNFT(seller);
      const nftAddr = await nft.getAddress();
      await expect(
        marketplace.connect(seller).listItem(nftAddr, tokenId, LIST_PRICE)
      ).to.be.revertedWith("Marketplace: marketplace not approved");
    });

    it("should revert if the token is already listed", async function () {
      const tokenId = await mintNFT(seller);
      await approveMarketplace(seller, tokenId);
      const nftAddr = await nft.getAddress();
      await marketplace.connect(seller).listItem(nftAddr, tokenId, LIST_PRICE);
      await expect(
        marketplace.connect(seller).listItem(nftAddr, tokenId, LIST_PRICE)
      ).to.be.revertedWith("Marketplace: already listed");
    });
  });

  // ── Buying with royalty ───────────────────────────────────────────────────

  describe("buyItem", function () {
    let tokenId;
    let nftAddr;

    beforeEach(async function () {
      tokenId = await mintNFT(seller);
      await approveMarketplace(seller, tokenId);
      nftAddr = await nft.getAddress();
      await marketplace.connect(seller).listItem(nftAddr, tokenId, LIST_PRICE);
    });

    it("should transfer the NFT to the buyer", async function () {
      await marketplace.connect(buyer).buyItem(nftAddr, tokenId, { value: LIST_PRICE });
      expect(await nft.ownerOf(tokenId)).to.equal(buyer.address);
    });

    it("should emit ItemSold event", async function () {
      await expect(
        marketplace.connect(buyer).buyItem(nftAddr, tokenId, { value: LIST_PRICE })
      )
        .to.emit(marketplace, "ItemSold")
        .withArgs(buyer.address, nftAddr, tokenId, LIST_PRICE);
    });

    it("should distribute royalty, platform fee, and seller proceeds correctly", async function () {
      // Default royalty 5%, platform fee 2.5%
      const salePrice = LIST_PRICE;
      const royalty = (salePrice * 500n) / 10_000n;
      const platformFeeAmt = (salePrice * 250n) / 10_000n;
      const sellerProceeds = salePrice - royalty - platformFeeAmt;

      const sellerBefore = await ethers.provider.getBalance(seller.address);
      const ownerBefore = await ethers.provider.getBalance(owner.address); // royalty receiver = deployer

      await marketplace.connect(buyer).buyItem(nftAddr, tokenId, { value: salePrice });

      const sellerAfter = await ethers.provider.getBalance(seller.address);
      const ownerAfter = await ethers.provider.getBalance(owner.address);

      expect(sellerAfter - sellerBefore).to.equal(sellerProceeds);
      expect(ownerAfter - ownerBefore).to.equal(royalty);

      const accFees = await marketplace.accumulatedFees();
      expect(accFees).to.equal(platformFeeAmt);
    });

    it("should refund excess ETH to buyer", async function () {
      const excess = ethers.parseEther("0.5");
      const buyerBefore = await ethers.provider.getBalance(buyer.address);

      const tx = await marketplace
        .connect(buyer)
        .buyItem(nftAddr, tokenId, { value: LIST_PRICE + excess });
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      const buyerAfter = await ethers.provider.getBalance(buyer.address);
      // Buyer should have paid only the LIST_PRICE + gas
      expect(buyerBefore - buyerAfter).to.be.closeTo(LIST_PRICE + gasUsed, ethers.parseEther("0.0001"));
    });

    it("should revert if not listed", async function () {
      const tokenId2 = await mintNFT(seller);
      await expect(
        marketplace.connect(buyer).buyItem(nftAddr, tokenId2, { value: LIST_PRICE })
      ).to.be.revertedWith("Marketplace: not listed");
    });

    it("should revert if insufficient payment", async function () {
      const lowPayment = ethers.parseEther("0.5");
      await expect(
        marketplace.connect(buyer).buyItem(nftAddr, tokenId, { value: lowPayment })
      ).to.be.revertedWith("Marketplace: insufficient payment");
    });
  });

  // ── Cancel Listing ────────────────────────────────────────────────────────

  describe("cancelListing", function () {
    let tokenId;
    let nftAddr;

    beforeEach(async function () {
      tokenId = await mintNFT(seller);
      await approveMarketplace(seller, tokenId);
      nftAddr = await nft.getAddress();
      await marketplace.connect(seller).listItem(nftAddr, tokenId, LIST_PRICE);
    });

    it("should cancel an active listing", async function () {
      await expect(marketplace.connect(seller).cancelListing(nftAddr, tokenId))
        .to.emit(marketplace, "ListingCancelled")
        .withArgs(nftAddr, tokenId);

      const listing = await marketplace.getListing(nftAddr, tokenId);
      expect(listing.active).to.be.false;
    });

    it("should revert if not the seller", async function () {
      await expect(
        marketplace.connect(buyer).cancelListing(nftAddr, tokenId)
      ).to.be.revertedWith("Marketplace: not the seller");
    });

    it("should revert if listing is not active", async function () {
      await marketplace.connect(seller).cancelListing(nftAddr, tokenId);
      await expect(
        marketplace.connect(seller).cancelListing(nftAddr, tokenId)
      ).to.be.revertedWith("Marketplace: not listed");
    });
  });

  // ── Auction Flow ──────────────────────────────────────────────────────────

  describe("Auction flow", function () {
    let tokenId;
    let nftAddr;
    const START_PRICE = ethers.parseEther("0.5");

    beforeEach(async function () {
      tokenId = await mintNFT(seller);
      await approveMarketplace(seller, tokenId);
      nftAddr = await nft.getAddress();
    });

    it("should create an auction and emit AuctionCreated", async function () {
      const tx = await marketplace
        .connect(seller)
        .createAuction(nftAddr, tokenId, START_PRICE, ONE_DAY);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);
      const expectedEndTime = block.timestamp + ONE_DAY;

      await expect(tx)
        .to.emit(marketplace, "AuctionCreated")
        .withArgs(seller.address, nftAddr, tokenId, START_PRICE, expectedEndTime);

      const auction = await marketplace.getAuction(nftAddr, tokenId);
      expect(auction.active).to.be.true;
      expect(auction.startPrice).to.equal(START_PRICE);
    });

    it("should accept a bid and emit BidPlaced", async function () {
      await marketplace
        .connect(seller)
        .createAuction(nftAddr, tokenId, START_PRICE, ONE_DAY);

      const bidAmount = ethers.parseEther("0.6");
      await expect(
        marketplace.connect(bidder1).placeBid(nftAddr, tokenId, { value: bidAmount })
      )
        .to.emit(marketplace, "BidPlaced")
        .withArgs(bidder1.address, nftAddr, tokenId, bidAmount);
    });

    it("should refund previous bidder when outbid", async function () {
      await marketplace
        .connect(seller)
        .createAuction(nftAddr, tokenId, START_PRICE, ONE_DAY);

      const bid1 = ethers.parseEther("0.6");
      const bid2 = ethers.parseEther("0.9");

      await marketplace.connect(bidder1).placeBid(nftAddr, tokenId, { value: bid1 });

      const bidder1Before = await ethers.provider.getBalance(bidder1.address);
      await marketplace.connect(bidder2).placeBid(nftAddr, tokenId, { value: bid2 });
      const bidder1After = await ethers.provider.getBalance(bidder1.address);

      // bidder1 should have been refunded bid1
      expect(bidder1After - bidder1Before).to.equal(bid1);
    });

    it("should end auction and transfer NFT to highest bidder", async function () {
      await marketplace
        .connect(seller)
        .createAuction(nftAddr, tokenId, START_PRICE, ONE_DAY);

      const bidAmount = ethers.parseEther("0.8");
      await marketplace.connect(bidder1).placeBid(nftAddr, tokenId, { value: bidAmount });

      // Advance time past auction end
      await time.increase(ONE_DAY + 1);

      await expect(marketplace.connect(owner).endAuction(nftAddr, tokenId))
        .to.emit(marketplace, "AuctionEnded")
        .withArgs(bidder1.address, nftAddr, tokenId, bidAmount);

      expect(await nft.ownerOf(tokenId)).to.equal(bidder1.address);
    });

    it("should end auction with no winner if no bids", async function () {
      await marketplace
        .connect(seller)
        .createAuction(nftAddr, tokenId, START_PRICE, ONE_DAY);

      await time.increase(ONE_DAY + 1);

      await expect(marketplace.connect(owner).endAuction(nftAddr, tokenId))
        .to.emit(marketplace, "AuctionEnded")
        .withArgs(ethers.ZeroAddress, nftAddr, tokenId, 0);

      // NFT should remain with seller
      expect(await nft.ownerOf(tokenId)).to.equal(seller.address);
    });

    it("should revert endAuction if not yet expired", async function () {
      await marketplace
        .connect(seller)
        .createAuction(nftAddr, tokenId, START_PRICE, ONE_DAY);

      await expect(marketplace.connect(owner).endAuction(nftAddr, tokenId)).to.be.revertedWith(
        "Marketplace: auction not yet ended"
      );
    });

    it("should revert placeBid below start price", async function () {
      await marketplace
        .connect(seller)
        .createAuction(nftAddr, tokenId, START_PRICE, ONE_DAY);

      await expect(
        marketplace.connect(bidder1).placeBid(nftAddr, tokenId, {
          value: ethers.parseEther("0.1"),
        })
      ).to.be.revertedWith("Marketplace: bid below start price");
    });

    it("should revert placeBid not higher than current highest bid", async function () {
      await marketplace
        .connect(seller)
        .createAuction(nftAddr, tokenId, START_PRICE, ONE_DAY);

      const bid1 = ethers.parseEther("0.7");
      await marketplace.connect(bidder1).placeBid(nftAddr, tokenId, { value: bid1 });

      await expect(
        marketplace.connect(bidder2).placeBid(nftAddr, tokenId, { value: bid1 })
      ).to.be.revertedWith("Marketplace: bid too low");
    });
  });

  // ── Platform fees ────────────────────────────────────────────────────────

  describe("Platform fees", function () {
    it("should allow owner to withdraw accumulated fees", async function () {
      const tokenId = await mintNFT(seller);
      await approveMarketplace(seller, tokenId);
      const nftAddr = await nft.getAddress();
      await marketplace.connect(seller).listItem(nftAddr, tokenId, LIST_PRICE);
      await marketplace.connect(buyer).buyItem(nftAddr, tokenId, { value: LIST_PRICE });

      const expected = (LIST_PRICE * 250n) / 10_000n;
      expect(await marketplace.accumulatedFees()).to.equal(expected);

      await expect(marketplace.connect(owner).withdrawFees()).to.not.be.reverted;
      expect(await marketplace.accumulatedFees()).to.equal(0);
    });

    it("should revert withdrawFees if no fees accumulated", async function () {
      await expect(marketplace.connect(owner).withdrawFees()).to.be.revertedWith(
        "Marketplace: no fees to withdraw"
      );
    });
  });

  // ── Auction duration limit ────────────────────────────────────────────────

  describe("Auction duration limit", function () {
    let tokenId;
    let nftAddr;
    const START_PRICE = ethers.parseEther("0.5");

    beforeEach(async function () {
      tokenId = await mintNFT(seller);
      await approveMarketplace(seller, tokenId);
      nftAddr = await nft.getAddress();
    });

    it("should expose MAX_AUCTION_DURATION constant", async function () {
      const max = await marketplace.MAX_AUCTION_DURATION();
      expect(max).to.equal(30 * 24 * 3600); // 30 days in seconds
    });

    it("should revert createAuction if duration exceeds 30 days", async function () {
      const tooLong = 30 * 24 * 3600 + 1;
      await expect(
        marketplace.connect(seller).createAuction(nftAddr, tokenId, START_PRICE, tooLong)
      ).to.be.revertedWith("Marketplace: duration exceeds maximum");
    });

    it("should accept createAuction at exactly 30 days", async function () {
      const exactMax = 30 * 24 * 3600;
      await expect(
        marketplace.connect(seller).createAuction(nftAddr, tokenId, START_PRICE, exactMax)
      ).not.to.be.reverted;
    });
  });

  // ── delistItem (emergency delist) ─────────────────────────────────────────

  describe("delistItem", function () {
    let tokenId;
    let nftAddr;

    beforeEach(async function () {
      tokenId = await mintNFT(seller);
      await approveMarketplace(seller, tokenId);
      nftAddr = await nft.getAddress();
      await marketplace.connect(seller).listItem(nftAddr, tokenId, LIST_PRICE);
    });

    it("should allow owner to force-delist an active listing", async function () {
      await expect(marketplace.connect(owner).delistItem(nftAddr, tokenId))
        .to.emit(marketplace, "ListingCancelled")
        .withArgs(nftAddr, tokenId);

      const listing = await marketplace.getListing(nftAddr, tokenId);
      expect(listing.active).to.be.false;
    });

    it("should revert delistItem if listing is not active", async function () {
      await marketplace.connect(owner).delistItem(nftAddr, tokenId);
      await expect(
        marketplace.connect(owner).delistItem(nftAddr, tokenId)
      ).to.be.revertedWith("Marketplace: not listed");
    });

    it("should revert delistItem when called by non-owner", async function () {
      await expect(
        marketplace.connect(buyer).delistItem(nftAddr, tokenId)
      ).to.be.revertedWithCustomError(marketplace, "OwnableUnauthorizedAccount");
    });
  });

  // ── cancelAuction (emergency cancel) ─────────────────────────────────────

  describe("cancelAuction", function () {
    let tokenId;
    let nftAddr;
    const START_PRICE = ethers.parseEther("0.5");

    beforeEach(async function () {
      tokenId = await mintNFT(seller);
      await approveMarketplace(seller, tokenId);
      nftAddr = await nft.getAddress();
      await marketplace.connect(seller).createAuction(nftAddr, tokenId, START_PRICE, ONE_DAY);
    });

    it("should allow owner to cancel an active auction with no bids", async function () {
      await expect(marketplace.connect(owner).cancelAuction(nftAddr, tokenId))
        .to.emit(marketplace, "AuctionCancelled")
        .withArgs(nftAddr, tokenId);

      const auction = await marketplace.getAuction(nftAddr, tokenId);
      expect(auction.active).to.be.false;
    });

    it("should refund the highest bidder when auction is cancelled", async function () {
      const bidAmount = ethers.parseEther("0.7");
      await marketplace.connect(bidder1).placeBid(nftAddr, tokenId, { value: bidAmount });

      const bidder1Before = await ethers.provider.getBalance(bidder1.address);
      await marketplace.connect(owner).cancelAuction(nftAddr, tokenId);
      const bidder1After = await ethers.provider.getBalance(bidder1.address);

      expect(bidder1After - bidder1Before).to.equal(bidAmount);
    });

    it("should revert cancelAuction if no active auction", async function () {
      await marketplace.connect(owner).cancelAuction(nftAddr, tokenId);
      await expect(
        marketplace.connect(owner).cancelAuction(nftAddr, tokenId)
      ).to.be.revertedWith("Marketplace: no active auction");
    });

    it("should revert cancelAuction when called by non-owner", async function () {
      await expect(
        marketplace.connect(buyer).cancelAuction(nftAddr, tokenId)
      ).to.be.revertedWithCustomError(marketplace, "OwnableUnauthorizedAccount");
    });
  });

  // ── Marketplace Pausable ──────────────────────────────────────────────────

  describe("Pausable", function () {
    let tokenId;
    let nftAddr;
    const START_PRICE = ethers.parseEther("0.5");

    beforeEach(async function () {
      tokenId = await mintNFT(seller);
      await approveMarketplace(seller, tokenId);
      nftAddr = await nft.getAddress();
    });

    it("should allow owner to pause the marketplace", async function () {
      await marketplace.connect(owner).pause();
      expect(await marketplace.paused()).to.be.true;
    });

    it("should allow owner to unpause the marketplace", async function () {
      await marketplace.connect(owner).pause();
      await marketplace.connect(owner).unpause();
      expect(await marketplace.paused()).to.be.false;
    });

    it("should revert listItem when paused", async function () {
      await marketplace.connect(owner).pause();
      await expect(
        marketplace.connect(seller).listItem(nftAddr, tokenId, LIST_PRICE)
      ).to.be.revertedWithCustomError(marketplace, "EnforcedPause");
    });

    it("should revert buyItem when paused", async function () {
      await marketplace.connect(seller).listItem(nftAddr, tokenId, LIST_PRICE);
      await marketplace.connect(owner).pause();
      await expect(
        marketplace.connect(buyer).buyItem(nftAddr, tokenId, { value: LIST_PRICE })
      ).to.be.revertedWithCustomError(marketplace, "EnforcedPause");
    });

    it("should revert createAuction when paused", async function () {
      await marketplace.connect(owner).pause();
      await expect(
        marketplace.connect(seller).createAuction(nftAddr, tokenId, START_PRICE, ONE_DAY)
      ).to.be.revertedWithCustomError(marketplace, "EnforcedPause");
    });

    it("should revert placeBid when paused", async function () {
      await marketplace.connect(seller).createAuction(nftAddr, tokenId, START_PRICE, ONE_DAY);
      await marketplace.connect(owner).pause();
      await expect(
        marketplace.connect(bidder1).placeBid(nftAddr, tokenId, { value: ethers.parseEther("0.6") })
      ).to.be.revertedWithCustomError(marketplace, "EnforcedPause");
    });

    it("should allow operations again after unpause", async function () {
      await marketplace.connect(owner).pause();
      await marketplace.connect(owner).unpause();
      await expect(
        marketplace.connect(seller).listItem(nftAddr, tokenId, LIST_PRICE)
      ).not.to.be.reverted;
    });

    it("should revert pause when called by non-owner", async function () {
      await expect(
        marketplace.connect(buyer).pause()
      ).to.be.revertedWithCustomError(marketplace, "OwnableUnauthorizedAccount");
    });
  });
});
