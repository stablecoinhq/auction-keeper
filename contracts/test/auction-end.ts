import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import {
  Commands,
  forkNetwork,
  signer,
  sleep,
  VOID_ADDRESS,
} from "../src/common";
import { Auction } from "@auction-keeper/core";
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
  await flapper.connect(addr1).file(Commands.ttl, 5);
  await flapper.connect(addr1).file(Commands.tau, 60);
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
  it("Should end surplus auction", async () => {
    const { flapper, auctionId } = await loadFixture(startAuctions);
    const auction = new Auction({
      auctionType: "surplus",
      auctionAddress: flapper.address,
      signer,
    });
    auction.start();
    // let the keeper time to bid
    await sleep(3000);
    // mine the block so that the auction can end
    await ethers.provider.send("evm_increaseTime", [20]);
    await ethers.provider.send("evm_mine", []);
    await sleep(5000);
    const auctionInfo = await auction.getAuctionInfoById(BigNumber.from(auctionId));
    expect(auctionInfo.guy).eq(VOID_ADDRESS);
    auction.stop();
  });
  it("Should update and end surplus auction", async () => {
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
    await ethers.provider.send("evm_increaseTime", [30]);
    await ethers.provider.send("evm_mine", []);
    await sleep(5000);
    const auctionInfo = await auction.getAuctionInfoById(BigNumber.from(auctionId));
    expect(auctionInfo.guy).eq(VOID_ADDRESS);
    auction.stop();
  });
});
