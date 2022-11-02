import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { forkNetwork, signer, sleep } from "../src/common";
import { Auction, AuctionType } from "@auction-keeper/core";
const surplusAuctionAmount = BigNumber.from(
  "30000000000000000000000000000000000000000000000000"
);
const dump = BigNumber.from("250000000000000000000");
const sump = BigNumber.from(
  "50000000000000000000000000000000000000000000000000"
);

async function startAuctions() {
  // Deploy auction
  await forkNetwork();
  const [owner, addr1] = await ethers.getSigners();
  const MockDSToken = await ethers.getContractFactory("MockDSToken");
  const MockVat = await ethers.getContractFactory("MockVat");
  const Flapper = await ethers.getContractFactory("Flapper");
  const Flopper = await ethers.getContractFactory("Flopper");

  const mockDSToken = await MockDSToken.deploy();
  const mockVat = await MockVat.deploy();
  await mockDSToken.deployed();
  await mockVat.deployed();
  const flapper = await Flapper.connect(addr1).deploy(
    mockVat.address,
    mockDSToken.address
  );
  await flapper.deployed();
  const flopper = await Flopper.connect(addr1).deploy(
    mockVat.address,
    mockDSToken.address
  );
  await flopper.deployed();

  console.log(`MockGem ${mockDSToken.address}`);
  console.log(`MockVat ${mockVat.address}`);
  console.log(`Flapper ${flapper.address}`);
  console.log(`Flopper ${flopper.address}`);

  const mkrAmount = BigNumber.from(
    "10000000000000000000000000000000000000000000000000"
  );
  // Mint DAI for auction
  await mockVat.mint(owner.address, surplusAuctionAmount);
  // Mint Token for the owner
  await mockDSToken.mint(owner.address, mkrAmount);
  await mockDSToken["approve(address)"](flapper.address);
  // Mint DAI for the owner
  await mockVat.mint(owner.address, sump);
  await mockVat.mint(addr1.address, sump);
  await mockVat.hope(flopper.address);
  console.log(`Kick auction`);
  console.log(`Owner address ${owner.address}`);
  // Actual auction data
  // {
  //   id: 1861,
  //   bid: '0',
  //   lot: '30000000000000000000000000000000000000000000000000',
  //   guy: '0xA950524441892A31ebddF91d3cEEFa04Bf454466',
  //   price: '1',
  //   tic: 0,
  //   end: 2022-01-25T00:33:02.000Z
  // }

  // Start auction
  await flapper.connect(addr1).kick(surplusAuctionAmount, BigNumber.from(0));
  console.log("Started surplus auction id 1");

  const { guy } = await flapper.bids(1);
  console.log(`Flapper auction hosted by: ${guy}`);
  await flopper.kick(addr1.address, dump, sump);

  const flopperAuction = await flopper.bids(1);
  console.log(`Started debt auction id 1 by ${flopperAuction.guy}`);
  return {
    flapper,
    flopper,
    owner,
    auctionId: 1,
  };
}

describe("Surplus auction", function () {
  describe("signer", function () {
    it("signer should be owner", async () => {
      const { owner } = await loadFixture(startAuctions);
      expect(owner.address).eq(signer.address);
    });
  });
  // Check that startAuctions kicks off auctions properly
  describe("startAuctions", function () {
    it("should start surplus auction", async function () {
      const { flapper } = await loadFixture(startAuctions);
      const auction = new Auction({
        auctionType: "surplus",
        auctionAddress: flapper.address,
        signer,
      });
      const auctions = await auction.getAuctionInfos();
      expect(auctions.length).eq(1);
      const { id, auctionType, bid, lot, guy, price, tic } = auctions[0];
      expect(guy).not.eq(signer.address);
      expect(bid).eq(BigNumber.from(0));
      expect(lot).eq(surplusAuctionAmount);
      expect(id).eq(BigNumber.from(1));
      expect(price).eq(BigNumber.from(1));
      expect(auctionType).eq(AuctionType.Surplus);
      expect(tic).eq(0);
    });
    it("should start debt auction", async function () {
      const { flopper } = await loadFixture(startAuctions);
      const auction = new Auction({
        auctionType: "debt",
        auctionAddress: flopper.address,
        signer,
      });
      const auctions = await auction.getAuctionInfos();
      expect(auctions.length).eq(1);
      const { id, auctionType, bid, lot, guy, price, tic } = auctions[0];
      expect(guy).not.eq(signer.address);
      expect(bid).eq(sump);
      expect(lot).eq(dump);
      expect(id).eq(BigNumber.from(1));
      expect(price).eq(BigNumber.from("238095238095238095237"));
      expect(auctionType).eq(AuctionType.Debt);
      expect(tic).eq(0);
    });
  });
  describe("Surplus auction", function () {
    it("Should bid on surplus auction", async () => {
      const { flapper } = await loadFixture(startAuctions);
      const auction = new Auction({
        auctionType: "surplus",
        auctionAddress: flapper.address,
        signer,
      });
      auction.start();
      await sleep(3000);
      const auctionInfo = await auction.getAuctionInfoById(BigNumber.from(1));
      expect(auctionInfo.guy).eq(signer.address);
      auction.stop();
    });
    it("Should over bid on surplus auction", async () => {
      const { flapper, auctionId } = await loadFixture(startAuctions);
      const [, addr1] = await ethers.getSigners();
      const auction = new Auction({
        auctionType: "surplus",
        auctionAddress: flapper.address,
        signer,
      });
      auction.start();
      await sleep(1000);
      await flapper.connect(addr1).tend(auctionId, surplusAuctionAmount, 10);
      await sleep(5000);
      const auctionInfo = await auction.getAuctionInfoById(BigNumber.from(1));
      expect(auctionInfo.guy).eq(signer.address);
      auction.stop();
    });
    // TODO: stop bidding on certain condition
    // TODO: end auction
  });
  describe("Debt auction", function () {
    it("Should bid on debt auction", async () => {
      const { flopper } = await loadFixture(startAuctions);
      const auction = new Auction({
        auctionType: "debt",
        auctionAddress: flopper.address,
        signer,
      });
      auction.start();
      await sleep(1000);
      const auctionInfo = await auction.getAuctionInfoById(BigNumber.from(1));
      expect(auctionInfo.guy).eq(signer.address);
      auction.stop();
    });
    it("Should out bid on debt auctions", async () => {
      const { flopper, auctionId } = await loadFixture(startAuctions);
      const [, addr1] = await ethers.getSigners();
      const auction = new Auction({
        auctionType: "debt",
        auctionAddress: flopper.address,
        signer,
      });
      auction.start();
      await sleep(1000);
      // Someone else bidded
      await flopper
        .connect(addr1)
        .dent(auctionId, BigNumber.from("200000000000000000000"), sump);
      await sleep(5000);
      const auctionInfo = await auction.getAuctionInfoById(BigNumber.from(1));
      expect(auctionInfo.guy).eq(signer.address);
      auction.stop();
    });
    // TODO: stop bidding on certain condition
    // TODO: end auction
  });
});
