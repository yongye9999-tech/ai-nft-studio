const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("NFTMarketplace", function () {
  let nftCollection;
  let marketplace;
  let owner, seller, buyer, platform, royaltyReceiver;

  const MINT_FEE = ethers.parseEther("0.01");
  const PLATFORM_FEE_BPS = 250; // 2.5%
  const NFT_PRICE = ethers.parseEther("1.0");
  const TOKEN_URI = "ipfs://QmTestMarketplace";

  beforeEach(async function () {
    [owner, seller, buyer, platform, royaltyReceiver] = await ethers.getSigners();

    // 部署 NFT合约
    const AINFTCollection = await ethers.getContractFactory("AINFTCollection");
    nftCollection = await AINFTCollection.deploy(
      "AI NFT Studio",
      "AINFT",
      MINT_FEE,
      500, // 5% royalty
      0,
      platform.address
    );
    await nftCollection.waitForDeployment();

    // 部署市场合约
    const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");
    marketplace = await NFTMarketplace.deploy(PLATFORM_FEE_BPS, platform.address);
    await marketplace.waitForDeployment();

    // seller铸造一个NFT
    await nftCollection.connect(seller).mintNFT(TOKEN_URI, royaltyReceiver.address, 500, { value: MINT_FEE });

    // seller授权市场合约操作其NFT
    await nftCollection.connect(seller).setApprovalForAll(await marketplace.getAddress(), true);
  });

  describe("部署 / Deployment", function () {
    it("应正确设置平台手续费", async function () {
      expect(await marketplace.platformFeeBps()).to.equal(PLATFORM_FEE_BPS);
    });

    it("应正确设置平台地址", async function () {
      expect(await marketplace.platformAddress()).to.equal(platform.address);
    });
  });

  describe("上架 / Listing", function () {
    it("应成功上架NFT", async function () {
      const tx = await marketplace.connect(seller).listItem(
        await nftCollection.getAddress(),
        1,
        NFT_PRICE
      );
      await tx.wait();

      const listing = await marketplace.listings(1);
      expect(listing.seller).to.equal(seller.address);
      expect(listing.price).to.equal(NFT_PRICE);
      expect(listing.status).to.equal(0); // Active
    });

    it("上架应触发ItemListed事件", async function () {
      await expect(
        marketplace.connect(seller).listItem(await nftCollection.getAddress(), 1, NFT_PRICE)
      )
        .to.emit(marketplace, "ItemListed")
        .withArgs(1, await nftCollection.getAddress(), 1, seller.address, NFT_PRICE);
    });

    it("非owner上架应revert", async function () {
      await expect(
        marketplace.connect(buyer).listItem(await nftCollection.getAddress(), 1, NFT_PRICE)
      ).to.be.revertedWith("NFTMarketplace: Not token owner");
    });

    it("价格为0时上架应revert", async function () {
      await expect(
        marketplace.connect(seller).listItem(await nftCollection.getAddress(), 1, 0)
      ).to.be.revertedWith("NFTMarketplace: Price must be > 0");
    });
  });

  describe("购买 / Buying", function () {
    let listingId;

    beforeEach(async function () {
      const tx = await marketplace.connect(seller).listItem(
        await nftCollection.getAddress(),
        1,
        NFT_PRICE
      );
      await tx.wait();
      listingId = 1;
    });

    it("应成功购买NFT并分配资金", async function () {
      const platformBalanceBefore = await ethers.provider.getBalance(platform.address);
      const royaltyBalanceBefore = await ethers.provider.getBalance(royaltyReceiver.address);
      const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);

      await marketplace.connect(buyer).buyItem(listingId, { value: NFT_PRICE });

      // 验证NFT转移
      expect(await nftCollection.ownerOf(1)).to.equal(buyer.address);

      // 验证平台手续费 (2.5%)
      const platformFee = (NFT_PRICE * 250n) / 10000n;
      const platformBalanceAfter = await ethers.provider.getBalance(platform.address);
      expect(platformBalanceAfter - platformBalanceBefore).to.equal(platformFee);

      // 验证版税 (5%)
      const royaltyAmount = (NFT_PRICE * 500n) / 10000n;
      const royaltyBalanceAfter = await ethers.provider.getBalance(royaltyReceiver.address);
      expect(royaltyBalanceAfter - royaltyBalanceBefore).to.equal(royaltyAmount);

      // 验证卖家收入
      const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);
      const expectedSellerAmount = NFT_PRICE - platformFee - royaltyAmount;
      // 由于gas，seller余额变化比expectedSellerAmount稍少（seller也是接受转账）
      expect(sellerBalanceAfter - sellerBalanceBefore).to.equal(expectedSellerAmount);
    });

    it("购买应触发ItemSold事件", async function () {
      const platformFee = (NFT_PRICE * 250n) / 10000n;
      const royaltyAmount = (NFT_PRICE * 500n) / 10000n;

      await expect(
        marketplace.connect(buyer).buyItem(listingId, { value: NFT_PRICE })
      )
        .to.emit(marketplace, "ItemSold")
        .withArgs(
          listingId,
          await nftCollection.getAddress(),
          1,
          seller.address,
          buyer.address,
          NFT_PRICE,
          platformFee,
          royaltyAmount
        );
    });

    it("付款不足时购买应revert", async function () {
      await expect(
        marketplace.connect(buyer).buyItem(listingId, { value: ethers.parseEther("0.5") })
      ).to.be.revertedWith("NFTMarketplace: Insufficient payment");
    });

    it("卖家不能购买自己的上架", async function () {
      await expect(
        marketplace.connect(seller).buyItem(listingId, { value: NFT_PRICE })
      ).to.be.revertedWith("NFTMarketplace: Seller cannot buy own listing");
    });

    it("购买后再次购买应revert", async function () {
      await marketplace.connect(buyer).buyItem(listingId, { value: NFT_PRICE });
      await expect(
        marketplace.connect(buyer).buyItem(listingId, { value: NFT_PRICE })
      ).to.be.revertedWith("NFTMarketplace: Listing not active");
    });
  });

  describe("取消上架 / Cancel Listing", function () {
    beforeEach(async function () {
      await marketplace.connect(seller).listItem(await nftCollection.getAddress(), 1, NFT_PRICE);
    });

    it("卖家应能取消上架", async function () {
      await marketplace.connect(seller).cancelListing(1);
      const listing = await marketplace.listings(1);
      expect(listing.status).to.equal(2); // Cancelled
    });

    it("取消应触发ListingCancelled事件", async function () {
      await expect(marketplace.connect(seller).cancelListing(1))
        .to.emit(marketplace, "ListingCancelled")
        .withArgs(1, seller.address);
    });

    it("非卖家取消应revert", async function () {
      await expect(
        marketplace.connect(buyer).cancelListing(1)
      ).to.be.revertedWith("NFTMarketplace: Unauthorized");
    });
  });

  describe("拍卖 / Auction", function () {
    const STARTING_PRICE = ethers.parseEther("0.1");
    const RESERVE_PRICE = ethers.parseEther("0.5");
    const DURATION = 3600; // 1 hour

    beforeEach(async function () {
      // 确保seller还拥有tokenId=1 (未上架购买)
    });

    it("应成功创建拍卖", async function () {
      const tx = await marketplace.connect(seller).createAuction(
        await nftCollection.getAddress(),
        1,
        STARTING_PRICE,
        RESERVE_PRICE,
        DURATION
      );
      await tx.wait();

      const auction = await marketplace.auctions(1);
      expect(auction.seller).to.equal(seller.address);
      expect(auction.startingPrice).to.equal(STARTING_PRICE);
      expect(auction.status).to.equal(0); // Active
    });

    it("应成功出价", async function () {
      await marketplace.connect(seller).createAuction(
        await nftCollection.getAddress(),
        1,
        STARTING_PRICE,
        RESERVE_PRICE,
        DURATION
      );

      await marketplace.connect(buyer).placeBid(1, { value: STARTING_PRICE });
      const auction = await marketplace.auctions(1);
      expect(auction.currentBid).to.equal(STARTING_PRICE);
      expect(auction.currentBidder).to.equal(buyer.address);
    });

    it("出价低于起拍价应revert", async function () {
      await marketplace.connect(seller).createAuction(
        await nftCollection.getAddress(),
        1,
        STARTING_PRICE,
        RESERVE_PRICE,
        DURATION
      );

      await expect(
        marketplace.connect(buyer).placeBid(1, { value: ethers.parseEther("0.05") })
      ).to.be.revertedWith("NFTMarketplace: Bid too low");
    });

    it("拍卖结束后应能结算", async function () {
      await marketplace.connect(seller).createAuction(
        await nftCollection.getAddress(),
        1,
        STARTING_PRICE,
        0, // 无保留价
        DURATION
      );

      await marketplace.connect(buyer).placeBid(1, { value: ethers.parseEther("1.0") });

      // 快进时间
      await time.increase(DURATION + 1);

      await marketplace.connect(buyer).endAuction(1);
      expect(await nftCollection.ownerOf(1)).to.equal(buyer.address);
    });

    it("卖家在无出价时可取消拍卖", async function () {
      await marketplace.connect(seller).createAuction(
        await nftCollection.getAddress(),
        1,
        STARTING_PRICE,
        RESERVE_PRICE,
        DURATION
      );

      await marketplace.connect(seller).cancelAuction(1);
      const auction = await marketplace.auctions(1);
      expect(auction.status).to.equal(2); // Cancelled
    });

    it("有出价时取消拍卖应revert", async function () {
      await marketplace.connect(seller).createAuction(
        await nftCollection.getAddress(),
        1,
        STARTING_PRICE,
        RESERVE_PRICE,
        DURATION
      );

      await marketplace.connect(buyer).placeBid(1, { value: STARTING_PRICE });

      await expect(
        marketplace.connect(seller).cancelAuction(1)
      ).to.be.revertedWith("NFTMarketplace: Cannot cancel with active bids");
    });
  });

  describe("待提款 / Pending Withdrawals", function () {
    it("被超越出价者应能提取资金", async function () {
      const [, , , , , outbidder] = await ethers.getSigners();

      await marketplace.connect(seller).createAuction(
        await nftCollection.getAddress(),
        1,
        ethers.parseEther("0.1"),
        0,
        3600
      );

      // buyer先出价
      await marketplace.connect(buyer).placeBid(1, { value: ethers.parseEther("0.2") });

      // outbidder出更高价
      await marketplace.connect(outbidder).placeBid(1, { value: ethers.parseEther("0.5") });

      // buyer应有待提取资金
      expect(await marketplace.pendingWithdrawals(buyer.address)).to.equal(ethers.parseEther("0.2"));

      // buyer提取资金
      const balanceBefore = await ethers.provider.getBalance(buyer.address);
      const tx = await marketplace.connect(buyer).withdrawPending();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const balanceAfter = await ethers.provider.getBalance(buyer.address);

      expect(balanceAfter - balanceBefore + gasUsed).to.equal(ethers.parseEther("0.2"));
    });
  });

  describe("管理功能 / Admin", function () {
    it("Owner应能更新平台手续费", async function () {
      await marketplace.connect(owner).setPlatformFee(300);
      expect(await marketplace.platformFeeBps()).to.equal(300);
    });

    it("手续费超5%应revert", async function () {
      await expect(
        marketplace.connect(owner).setPlatformFee(600)
      ).to.be.revertedWith("NFTMarketplace: Fee too high (max 5%)");
    });
  });
});
