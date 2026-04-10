const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("NFTMarketplace", function () {
  let nftCollection;
  let marketplace;
  let owner;
  let seller;
  let buyer;
  let bidder1;
  let bidder2;

  const MINT_FEE = ethers.parseEther("0.001");
  const TOKEN_URI = "ipfs://QmTestHash/metadata.json";
  const LISTING_PRICE = ethers.parseEther("1");
  const PLATFORM_FEE = 250; // 2.5%
  const ROYALTY_FEE = 500;  // 5%

  beforeEach(async function () {
    [owner, seller, buyer, bidder1, bidder2] = await ethers.getSigners();

    // Deploy NFT contract
    const AINFTCollection = await ethers.getContractFactory("AINFTCollection");
    nftCollection = await AINFTCollection.deploy("AI NFT Studio", "AINFT", ROYALTY_FEE);
    await nftCollection.waitForDeployment();

    // Deploy marketplace
    const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");
    marketplace = await NFTMarketplace.deploy(PLATFORM_FEE);
    await marketplace.waitForDeployment();

    // Mint an NFT to seller
    await nftCollection.connect(seller).mint(TOKEN_URI, { value: MINT_FEE });

    // Approve marketplace to transfer NFT
    await nftCollection.connect(seller).approve(await marketplace.getAddress(), 0);
  });

  describe("Deployment", function () {
    it("Should set correct platform fee", async function () {
      expect(await marketplace.platformFee()).to.equal(PLATFORM_FEE);
    });

    it("Should set correct owner", async function () {
      expect(await marketplace.owner()).to.equal(owner.address);
    });
  });

  describe("Listing", function () {
    it("Should list an NFT", async function () {
      await expect(
        marketplace.connect(seller).listItem(await nftCollection.getAddress(), 0, LISTING_PRICE)
      )
        .to.emit(marketplace, "ItemListed")
        .withArgs(0, seller.address, await nftCollection.getAddress(), 0, LISTING_PRICE);

      const listing = await marketplace.listings(0);
      expect(listing.seller).to.equal(seller.address);
      expect(listing.price).to.equal(LISTING_PRICE);
      expect(listing.active).to.equal(true);
    });

    it("Should revert listing with zero price", async function () {
      await expect(
        marketplace.connect(seller).listItem(await nftCollection.getAddress(), 0, 0)
      ).to.be.revertedWith("NFTMarketplace: price must be > 0");
    });

    it("Should transfer NFT to marketplace on listing", async function () {
      await marketplace.connect(seller).listItem(await nftCollection.getAddress(), 0, LISTING_PRICE);
      expect(await nftCollection.ownerOf(0)).to.equal(await marketplace.getAddress());
    });
  });

  describe("Buying", function () {
    beforeEach(async function () {
      await marketplace.connect(seller).listItem(await nftCollection.getAddress(), 0, LISTING_PRICE);
    });

    it("Should buy a listed NFT with correct fund distribution", async function () {
      const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);
      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);

      await marketplace.connect(buyer).buyItem(0, { value: LISTING_PRICE });

      // NFT transferred to buyer
      expect(await nftCollection.ownerOf(0)).to.equal(buyer.address);

      // Calculate expected amounts
      const royaltyAmount = (LISTING_PRICE * BigInt(ROYALTY_FEE)) / 10000n;
      const platformAmount = (LISTING_PRICE * BigInt(PLATFORM_FEE)) / 10000n;
      const sellerAmount = LISTING_PRICE - royaltyAmount - platformAmount;

      const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);

      // Royalty goes to owner (who set default royalty to themselves)
      // Owner receives: previous balance + royalty
      // Seller receives: previous balance + sellerAmount
      expect(sellerBalanceAfter - sellerBalanceBefore).to.equal(sellerAmount);
    });

    it("Should emit ItemSold event", async function () {
      await expect(
        marketplace.connect(buyer).buyItem(0, { value: LISTING_PRICE })
      )
        .to.emit(marketplace, "ItemSold")
        .withArgs(0, buyer.address, await nftCollection.getAddress(), 0, LISTING_PRICE);
    });

    it("Should revert if listing is not active", async function () {
      await marketplace.connect(buyer).buyItem(0, { value: LISTING_PRICE });
      await expect(
        marketplace.connect(buyer).buyItem(0, { value: LISTING_PRICE })
      ).to.be.revertedWith("NFTMarketplace: listing not active");
    });

    it("Should revert if payment is insufficient", async function () {
      await expect(
        marketplace.connect(buyer).buyItem(0, { value: ethers.parseEther("0.5") })
      ).to.be.revertedWith("NFTMarketplace: insufficient payment");
    });
  });

  describe("Cancel listing", function () {
    beforeEach(async function () {
      await marketplace.connect(seller).listItem(await nftCollection.getAddress(), 0, LISTING_PRICE);
    });

    it("Should cancel a listing and return NFT", async function () {
      await expect(marketplace.connect(seller).cancelListing(0))
        .to.emit(marketplace, "ItemCanceled")
        .withArgs(0, seller.address);

      expect(await nftCollection.ownerOf(0)).to.equal(seller.address);
      const listing = await marketplace.listings(0);
      expect(listing.active).to.equal(false);
    });

    it("Should revert cancel from non-seller", async function () {
      await expect(
        marketplace.connect(buyer).cancelListing(0)
      ).to.be.revertedWith("NFTMarketplace: not seller");
    });
  });

  describe("Auction", function () {
    const MIN_PRICE = ethers.parseEther("0.5");
    const DURATION = 3600; // 1 hour

    beforeEach(async function () {
      // Re-approve for auction
      await nftCollection.connect(seller).approve(await marketplace.getAddress(), 0);
    });

    it("Should create an auction", async function () {
      await expect(
        marketplace.connect(seller).createAuction(
          await nftCollection.getAddress(),
          0,
          MIN_PRICE,
          DURATION
        )
      ).to.emit(marketplace, "AuctionCreated");

      const auction = await marketplace.auctions(0);
      expect(auction.seller).to.equal(seller.address);
      expect(auction.minPrice).to.equal(MIN_PRICE);
      expect(auction.active).to.equal(true);
    });

    it("Should handle bidding correctly", async function () {
      await marketplace.connect(seller).createAuction(
        await nftCollection.getAddress(),
        0,
        MIN_PRICE,
        DURATION
      );

      const bid1 = ethers.parseEther("0.6");
      const bid2 = ethers.parseEther("0.9");

      await expect(
        marketplace.connect(bidder1).placeBid(0, { value: bid1 })
      ).to.emit(marketplace, "BidPlaced").withArgs(0, bidder1.address, bid1);

      const bidder1BalanceBefore = await ethers.provider.getBalance(bidder1.address);

      // bidder2 outbids bidder1
      await marketplace.connect(bidder2).placeBid(0, { value: bid2 });

      // bidder1 should be refunded
      const bidder1BalanceAfter = await ethers.provider.getBalance(bidder1.address);
      expect(bidder1BalanceAfter - bidder1BalanceBefore).to.be.closeTo(
        bid1,
        ethers.parseEther("0.001")
      );

      const auction = await marketplace.auctions(0);
      expect(auction.highestBidder).to.equal(bidder2.address);
      expect(auction.highestBid).to.equal(bid2);
    });

    it("Should revert bid below minimum price", async function () {
      await marketplace.connect(seller).createAuction(
        await nftCollection.getAddress(),
        0,
        MIN_PRICE,
        DURATION
      );

      await expect(
        marketplace.connect(bidder1).placeBid(0, { value: ethers.parseEther("0.1") })
      ).to.be.revertedWith("NFTMarketplace: below minimum price");
    });

    it("Should end auction and transfer NFT to winner", async function () {
      await marketplace.connect(seller).createAuction(
        await nftCollection.getAddress(),
        0,
        MIN_PRICE,
        DURATION
      );

      await marketplace.connect(bidder1).placeBid(0, { value: MIN_PRICE });

      // Fast-forward time past auction end
      await time.increase(DURATION + 1);

      await expect(marketplace.connect(buyer).endAuction(0))
        .to.emit(marketplace, "AuctionEnded")
        .withArgs(0, bidder1.address, MIN_PRICE);

      expect(await nftCollection.ownerOf(0)).to.equal(bidder1.address);
    });

    it("Should return NFT to seller if no bids when auction ends", async function () {
      await marketplace.connect(seller).createAuction(
        await nftCollection.getAddress(),
        0,
        MIN_PRICE,
        DURATION
      );

      await time.increase(DURATION + 1);

      await marketplace.connect(buyer).endAuction(0);
      expect(await nftCollection.ownerOf(0)).to.equal(seller.address);
    });

    it("Should revert endAuction before end time", async function () {
      await marketplace.connect(seller).createAuction(
        await nftCollection.getAddress(),
        0,
        MIN_PRICE,
        DURATION
      );

      await expect(
        marketplace.connect(buyer).endAuction(0)
      ).to.be.revertedWith("NFTMarketplace: auction not ended");
    });
  });

  describe("Platform fee management", function () {
    it("Should allow owner to set platform fee", async function () {
      await marketplace.setPlatformFee(300);
      expect(await marketplace.platformFee()).to.equal(300);
    });

    it("Should revert platform fee above 10%", async function () {
      await expect(marketplace.setPlatformFee(1001)).to.be.revertedWith(
        "NFTMarketplace: fee too high"
      );
    });

    it("Should revert setPlatformFee from non-owner", async function () {
      await expect(marketplace.connect(seller).setPlatformFee(100)).to.be.reverted;
    });
  });
});
