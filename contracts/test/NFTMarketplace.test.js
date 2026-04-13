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

    it("should revert listing a token that is already in an active auction", async function () {
      const tokenId = await mintNFT(seller);
      await approveMarketplace(seller, tokenId);
      const nftAddr = await nft.getAddress();

      await marketplace.connect(seller).createAuction(nftAddr, tokenId, LIST_PRICE, ONE_DAY);
      await expect(
        marketplace.connect(seller).listItem(nftAddr, tokenId, LIST_PRICE)
      ).to.be.revertedWith("Marketplace: token already in auction");
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

    it("should distribute royalty, treasury, rewards, ops, and seller proceeds correctly", async function () {
      // Default royalty 5%, platform fee 2.5% (mid-tier for 1 ETH)
      const salePrice = LIST_PRICE;
      const royalty = (salePrice * 500n) / 10_000n;
      const platformFeeAmt = (salePrice * 250n) / 10_000n;
      const rewards = (platformFeeAmt * 30n) / 100n;
      const ops = (platformFeeAmt * 10n) / 100n;
      const treasury = platformFeeAmt - rewards - ops;
      const sellerProceeds = salePrice - royalty - platformFeeAmt;

      const sellerBefore = await ethers.provider.getBalance(seller.address);
      const ownerBefore = await ethers.provider.getBalance(owner.address); // royalty receiver = deployer

      await marketplace.connect(buyer).buyItem(nftAddr, tokenId, { value: salePrice });

      const sellerAfter = await ethers.provider.getBalance(seller.address);
      const ownerAfter = await ethers.provider.getBalance(owner.address);

      expect(sellerAfter - sellerBefore).to.equal(sellerProceeds);
      expect(ownerAfter - ownerBefore).to.equal(royalty);

      expect(await marketplace.accumulatedFees()).to.equal(platformFeeAmt);
      expect(await marketplace.treasuryBalance()).to.equal(treasury);
      expect(await marketplace.rewardsPoolBalance()).to.equal(rewards);
      expect(await marketplace.opsFundBalance()).to.equal(ops);
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

    it("should delete listing storage after sale", async function () {
      await marketplace.connect(buyer).buyItem(nftAddr, tokenId, { value: LIST_PRICE });
      const listing = await marketplace.getListing(nftAddr, tokenId);
      expect(listing.active).to.be.false;
      expect(listing.seller).to.equal(ethers.ZeroAddress);
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

    it("should revert creating an auction for a token that is already listed", async function () {
      await marketplace.connect(seller).listItem(nftAddr, tokenId, LIST_PRICE);
      await expect(
        marketplace.connect(seller).createAuction(nftAddr, tokenId, START_PRICE, ONE_DAY)
      ).to.be.revertedWith("Marketplace: token already listed");
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

    it("should store outbid amount in pendingReturns (pull pattern)", async function () {
      await marketplace
        .connect(seller)
        .createAuction(nftAddr, tokenId, START_PRICE, ONE_DAY);

      const bid1 = ethers.parseEther("0.6");
      // bid2 must exceed bid1 + 1% (= 0.606 ETH minimum)
      const bid2 = ethers.parseEther("0.7");

      await marketplace.connect(bidder1).placeBid(nftAddr, tokenId, { value: bid1 });
      await marketplace.connect(bidder2).placeBid(nftAddr, tokenId, { value: bid2 });

      // bidder1's funds are now in pendingReturns, not immediately pushed
      expect(await marketplace.pendingReturns(bidder1.address)).to.equal(bid1);
    });

    it("should allow outbid bidder to withdraw via withdrawBid()", async function () {
      await marketplace
        .connect(seller)
        .createAuction(nftAddr, tokenId, START_PRICE, ONE_DAY);

      const bid1 = ethers.parseEther("0.6");
      const bid2 = ethers.parseEther("0.7");

      await marketplace.connect(bidder1).placeBid(nftAddr, tokenId, { value: bid1 });
      await marketplace.connect(bidder2).placeBid(nftAddr, tokenId, { value: bid2 });

      const bidder1Before = await ethers.provider.getBalance(bidder1.address);
      const tx = await marketplace.connect(bidder1).withdrawBid();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const bidder1After = await ethers.provider.getBalance(bidder1.address);

      expect(bidder1After - bidder1Before + gasUsed).to.equal(bid1);
      expect(await marketplace.pendingReturns(bidder1.address)).to.equal(0);
    });

    it("should revert withdrawBid if no pending returns", async function () {
      await expect(marketplace.connect(bidder1).withdrawBid()).to.be.revertedWith(
        "Marketplace: no pending returns"
      );
    });

    it("should revert placeBid if increment is too small (below 1%)", async function () {
      await marketplace
        .connect(seller)
        .createAuction(nftAddr, tokenId, START_PRICE, ONE_DAY);

      const bid1 = ethers.parseEther("0.6");
      await marketplace.connect(bidder1).placeBid(nftAddr, tokenId, { value: bid1 });

      // bid2 = bid1 + 0.1% — below minBidIncrementBps (1%)
      const tooLow = bid1 + (bid1 * 10n) / 10_000n;
      await expect(
        marketplace.connect(bidder2).placeBid(nftAddr, tokenId, { value: tooLow })
      ).to.be.revertedWith("Marketplace: bid increment too low");
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

    it("should delete auction storage after endAuction", async function () {
      await marketplace
        .connect(seller)
        .createAuction(nftAddr, tokenId, START_PRICE, ONE_DAY);
      await time.increase(ONE_DAY + 1);
      await marketplace.connect(owner).endAuction(nftAddr, tokenId);

      const auction = await marketplace.getAuction(nftAddr, tokenId);
      expect(auction.active).to.be.false;
      expect(auction.seller).to.equal(ethers.ZeroAddress);
    });

    it("should revert endAuction if not yet expired", async function () {
      await marketplace
        .connect(seller)
        .createAuction(nftAddr, tokenId, START_PRICE, ONE_DAY);

      await expect(marketplace.connect(owner).endAuction(nftAddr, tokenId)).to.be.revertedWith(
        "Marketplace: auction not yet ended"
      );
    });

    it("should revert endAuction when contract is paused", async function () {
      await marketplace
        .connect(seller)
        .createAuction(nftAddr, tokenId, START_PRICE, ONE_DAY);
      await time.increase(ONE_DAY + 1);
      await marketplace.connect(owner).pause();
      await expect(
        marketplace.connect(owner).endAuction(nftAddr, tokenId)
      ).to.be.revertedWithCustomError(marketplace, "EnforcedPause");
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

    it("should revert placeBid not higher than current highest bid (equal amount)", async function () {
      await marketplace
        .connect(seller)
        .createAuction(nftAddr, tokenId, START_PRICE, ONE_DAY);

      const bid1 = ethers.parseEther("0.7");
      await marketplace.connect(bidder1).placeBid(nftAddr, tokenId, { value: bid1 });

      await expect(
        marketplace.connect(bidder2).placeBid(nftAddr, tokenId, { value: bid1 })
      ).to.be.revertedWith("Marketplace: bid increment too low");
    });
  });

  // ── Platform fees ────────────────────────────────────────────────────────

  describe("Platform fees", function () {
    let tokenId;
    let nftAddr;

    beforeEach(async function () {
      tokenId = await mintNFT(seller);
      await approveMarketplace(seller, tokenId);
      nftAddr = await nft.getAddress();
      await marketplace.connect(seller).listItem(nftAddr, tokenId, LIST_PRICE);
      await marketplace.connect(buyer).buyItem(nftAddr, tokenId, { value: LIST_PRICE });
    });

    it("should accumulate fees in the correct sub-balances", async function () {
      const fee = (LIST_PRICE * 250n) / 10_000n;
      const rewards = (fee * 30n) / 100n;
      const ops = (fee * 10n) / 100n;
      const treasury = fee - rewards - ops;

      expect(await marketplace.accumulatedFees()).to.equal(fee);
      expect(await marketplace.treasuryBalance()).to.equal(treasury);
      expect(await marketplace.rewardsPoolBalance()).to.equal(rewards);
      expect(await marketplace.opsFundBalance()).to.equal(ops);
    });

    it("should allow owner to withdraw treasury fees via withdrawFees()", async function () {
      const fee = (LIST_PRICE * 250n) / 10_000n;
      const treasury = fee - (fee * 30n) / 100n - (fee * 10n) / 100n;

      await expect(marketplace.connect(owner).withdrawFees())
        .to.emit(marketplace, "FeesWithdrawn")
        .withArgs(treasury);

      expect(await marketplace.treasuryBalance()).to.equal(0);
      // rewards and ops portions remain
      expect(await marketplace.rewardsPoolBalance()).to.be.gt(0);
    });

    it("should allow owner to withdraw rewards pool via withdrawRewardsPool()", async function () {
      const fee = (LIST_PRICE * 250n) / 10_000n;
      const rewards = (fee * 30n) / 100n;

      await expect(marketplace.connect(owner).withdrawRewardsPool())
        .to.emit(marketplace, "RewardsWithdrawn")
        .withArgs(rewards);

      expect(await marketplace.rewardsPoolBalance()).to.equal(0);
    });

    it("should allow owner to withdraw ops fund via withdrawOpsFund()", async function () {
      const fee = (LIST_PRICE * 250n) / 10_000n;
      const ops = (fee * 10n) / 100n;

      await expect(marketplace.connect(owner).withdrawOpsFund())
        .to.emit(marketplace, "OpsFundWithdrawn")
        .withArgs(ops);

      expect(await marketplace.opsFundBalance()).to.equal(0);
    });

    it("should revert withdrawFees if no treasury balance", async function () {
      await marketplace.connect(owner).withdrawFees(); // drain treasury
      await expect(marketplace.connect(owner).withdrawFees()).to.be.revertedWith(
        "Marketplace: no fees to withdraw"
      );
    });

    it("should revert withdrawRewardsPool if no rewards balance", async function () {
      await marketplace.connect(owner).withdrawRewardsPool();
      await expect(marketplace.connect(owner).withdrawRewardsPool()).to.be.revertedWith(
        "Marketplace: no rewards to withdraw"
      );
    });

    it("should revert withdrawOpsFund if no ops balance", async function () {
      await marketplace.connect(owner).withdrawOpsFund();
      await expect(marketplace.connect(owner).withdrawOpsFund()).to.be.revertedWith(
        "Marketplace: no ops balance to withdraw"
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

    it("should allow owner to force-delist and emit ForcedDelisted", async function () {
      await expect(marketplace.connect(owner).delistItem(nftAddr, tokenId))
        .to.emit(marketplace, "ForcedDelisted")
        .withArgs(nftAddr, tokenId);

      const listing = await marketplace.getListing(nftAddr, tokenId);
      expect(listing.active).to.be.false;
    });

    it("should NOT emit ListingCancelled on forced delist", async function () {
      const tx = await marketplace.connect(owner).delistItem(nftAddr, tokenId);
      const receipt = await tx.wait();
      const listingCancelledEvents = receipt.logs.filter(
        (log) => {
          try { return marketplace.interface.parseLog(log).name === "ListingCancelled"; }
          catch { return false; }
        }
      );
      expect(listingCancelledEvents.length).to.equal(0);
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

    it("should allow owner to cancel an active auction and emit ForcedAuctionCancelled", async function () {
      await expect(marketplace.connect(owner).cancelAuction(nftAddr, tokenId))
        .to.emit(marketplace, "ForcedAuctionCancelled")
        .withArgs(nftAddr, tokenId);

      const auction = await marketplace.getAuction(nftAddr, tokenId);
      expect(auction.active).to.be.false;
    });

    it("should NOT emit AuctionCancelled on forced cancel", async function () {
      const tx = await marketplace.connect(owner).cancelAuction(nftAddr, tokenId);
      const receipt = await tx.wait();
      const auctionCancelledEvents = receipt.logs.filter(
        (log) => {
          try { return marketplace.interface.parseLog(log).name === "AuctionCancelled"; }
          catch { return false; }
        }
      );
      expect(auctionCancelledEvents.length).to.equal(0);
    });

    it("should store highest bid in pendingReturns when auction is cancelled", async function () {
      const bidAmount = ethers.parseEther("0.7");
      await marketplace.connect(bidder1).placeBid(nftAddr, tokenId, { value: bidAmount });

      await marketplace.connect(owner).cancelAuction(nftAddr, tokenId);

      // bidder1's ETH is now in pendingReturns
      expect(await marketplace.pendingReturns(bidder1.address)).to.equal(bidAmount);
    });

    it("should allow bidder to withdraw via withdrawBid() after auction cancel", async function () {
      const bidAmount = ethers.parseEther("0.7");
      await marketplace.connect(bidder1).placeBid(nftAddr, tokenId, { value: bidAmount });
      await marketplace.connect(owner).cancelAuction(nftAddr, tokenId);

      const bidder1Before = await ethers.provider.getBalance(bidder1.address);
      const tx = await marketplace.connect(bidder1).withdrawBid();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const bidder1After = await ethers.provider.getBalance(bidder1.address);

      expect(bidder1After - bidder1Before + gasUsed).to.equal(bidAmount);
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

  // ── Fee tier setters with timelock ────────────────────────────────────────

  describe("Fee tier setters (timelock)", function () {
    it("should allow owner to propose and execute a new platformFee", async function () {
      await marketplace.connect(owner).proposePlatformFee(300); // 3%
      expect(await marketplace.pendingPlatformFee()).to.equal(300);

      await time.increase(48 * 3600 + 1);
      await marketplace.connect(owner).executePlatformFee();
      expect(await marketplace.platformFee()).to.equal(300);
    });

    it("should allow owner to propose and execute a new feeRateLow", async function () {
      await marketplace.connect(owner).proposeFeeRateLow(200);
      expect(await marketplace.pendingFeeRateLow()).to.equal(200);

      await time.increase(48 * 3600 + 1);
      await marketplace.connect(owner).executeFeeRateLow();
      expect(await marketplace.feeRateLow()).to.equal(200);
    });

    it("should allow owner to propose and execute a new feeRateHigh", async function () {
      await marketplace.connect(owner).proposeFeeRateHigh(150);
      expect(await marketplace.pendingFeeRateHigh()).to.equal(150);

      await time.increase(48 * 3600 + 1);
      await marketplace.connect(owner).executeFeeRateHigh();
      expect(await marketplace.feeRateHigh()).to.equal(150);
    });

    it("should revert proposeFeeRateLow above 5%", async function () {
      await expect(marketplace.connect(owner).proposeFeeRateLow(501)).to.be.revertedWith(
        "Marketplace: low fee cannot exceed 5%"
      );
    });

    it("should revert proposeFeeRateHigh above 5%", async function () {
      await expect(marketplace.connect(owner).proposeFeeRateHigh(501)).to.be.revertedWith(
        "Marketplace: high fee cannot exceed 5%"
      );
    });

    it("should revert executeFeeRateLow before timelock expires", async function () {
      await marketplace.connect(owner).proposeFeeRateLow(200);
      await expect(marketplace.connect(owner).executeFeeRateLow()).to.be.revertedWith(
        "Marketplace: timelock not expired"
      );
    });

    it("should revert executeFeeRateHigh before timelock expires", async function () {
      await marketplace.connect(owner).proposeFeeRateHigh(150);
      await expect(marketplace.connect(owner).executeFeeRateHigh()).to.be.revertedWith(
        "Marketplace: timelock not expired"
      );
    });

    it("should revert executeFeeRateLow if no pending change", async function () {
      await expect(marketplace.connect(owner).executeFeeRateLow()).to.be.revertedWith(
        "Marketplace: no pending low fee change"
      );
    });

    it("should revert executeFeeRateHigh if no pending change", async function () {
      await expect(marketplace.connect(owner).executeFeeRateHigh()).to.be.revertedWith(
        "Marketplace: no pending high fee change"
      );
    });
  });

  // ── Minimum bid increment ─────────────────────────────────────────────────

  describe("Minimum bid increment", function () {
    let tokenId;
    let nftAddr;
    const START_PRICE = ethers.parseEther("0.5");

    beforeEach(async function () {
      tokenId = await mintNFT(seller);
      await approveMarketplace(seller, tokenId);
      nftAddr = await nft.getAddress();
    });

    it("should default minBidIncrementBps to 100 (1%)", async function () {
      expect(await marketplace.minBidIncrementBps()).to.equal(100);
    });

    it("should allow owner to set a new minimum bid increment", async function () {
      await expect(marketplace.connect(owner).setMinBidIncrement(200))
        .to.emit(marketplace, "MinBidIncrementUpdated")
        .withArgs(200);
      expect(await marketplace.minBidIncrementBps()).to.equal(200);
    });

    it("should revert setMinBidIncrement above 10%", async function () {
      await expect(marketplace.connect(owner).setMinBidIncrement(1001)).to.be.revertedWith(
        "Marketplace: increment cannot exceed 10%"
      );
    });

    it("should accept a bid at exactly the minimum increment boundary", async function () {
      await marketplace.connect(seller).createAuction(nftAddr, tokenId, START_PRICE, ONE_DAY);

      const bid1 = ethers.parseEther("0.6");
      await marketplace.connect(bidder1).placeBid(nftAddr, tokenId, { value: bid1 });

      // Minimum next bid = bid1 + 1% of bid1 = 0.606 ETH exactly
      const exactMinNext = bid1 + (bid1 * 100n) / 10_000n;
      await expect(
        marketplace.connect(bidder2).placeBid(nftAddr, tokenId, { value: exactMinNext })
      ).not.to.be.reverted;
    });

    it("should reject a bid one wei below the minimum increment boundary", async function () {
      await marketplace.connect(seller).createAuction(nftAddr, tokenId, START_PRICE, ONE_DAY);

      const bid1 = ethers.parseEther("0.6");
      await marketplace.connect(bidder1).placeBid(nftAddr, tokenId, { value: bid1 });

      // One wei below the exact minimum (0.606 ETH - 1 wei)
      const justBelowMin = bid1 + (bid1 * 100n) / 10_000n - 1n;
      await expect(
        marketplace.connect(bidder2).placeBid(nftAddr, tokenId, { value: justBelowMin })
      ).to.be.revertedWith("Marketplace: bid increment too low");
    });
  });

  // ── _distributePayment royalty bounds check ────────────────────────────────

  describe("_distributePayment royalty bounds check", function () {
    it("should skip excessive royalty (150% of salePrice) and complete the sale", async function () {
      // Deploy the mock NFT that reports 150% royalty
      const MockHighRoyaltyNFT = await ethers.getContractFactory("MockHighRoyaltyNFT");
      const mockNFT = await MockHighRoyaltyNFT.deploy();
      const mockNFTAddr = await mockNFT.getAddress();

      // Seller mints a token from the mock
      const tx = await mockNFT.connect(seller).mint(seller.address);
      const receipt = await tx.wait();
      const tokenId = 1n; // first token minted

      // Approve marketplace
      await mockNFT.connect(seller).approve(await marketplace.getAddress(), tokenId);

      // List and buy — royalty (150%) + fee (2.5%) would exceed salePrice if applied
      await marketplace.connect(seller).listItem(mockNFTAddr, tokenId, LIST_PRICE);

      const sellerBefore = await ethers.provider.getBalance(seller.address);
      await marketplace.connect(buyer).buyItem(mockNFTAddr, tokenId, { value: LIST_PRICE });
      const sellerAfter = await ethers.provider.getBalance(seller.address);

      // Royalty was skipped; seller should receive salePrice minus platform fee
      const fee = (LIST_PRICE * 250n) / 10_000n;
      expect(sellerAfter - sellerBefore).to.equal(LIST_PRICE - fee);
    });

    it("should apply royalty when it is within safe bounds", async function () {
      const tokenId = await mintNFT(seller);
      await approveMarketplace(seller, tokenId);
      const nftAddr = await nft.getAddress();
      await marketplace.connect(seller).listItem(nftAddr, tokenId, LIST_PRICE);

      // Normal 5% royalty + 2.5% fee = 7.5% — within salePrice
      await expect(
        marketplace.connect(buyer).buyItem(nftAddr, tokenId, { value: LIST_PRICE })
      ).not.to.be.reverted;
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
