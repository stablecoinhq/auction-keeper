import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { Commands } from "../src/common";

async function main() {
  /**
   * DeployTokens
   */
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

  const auctionAmount = BigNumber.from(
    "30000000000000000000000000000000000000000000000000"
  );
  const dump = BigNumber.from("250000000000000000000");
  const sump = BigNumber.from(
    "50000000000000000000000000000000000000000000000000"
  );
  const mkrAmount = BigNumber.from(
    "10000000000000000000000000000000000000000000000000"
  );
  // ttl, tauを変更する
  await flapper.connect(addr1).file(Commands.ttl, 10 * 60);
  await flapper.connect(addr1).file(Commands.tau, 20 * 60);
  // オークション用にDAIをmintしておく
  await mockVat.mint(owner.address, auctionAmount);
  // ownerに対してMKRをmintして、allowanceも引き上げる
  await mockDSToken.mint(owner.address, mkrAmount);
  await mockDSToken["approve(address)"](flapper.address);
  // DAIをmintしてflopperに対してhopeする
  await mockVat.mint(owner.address, sump);
  await mockVat.mint(addr1.address, sump);
  await mockVat.hope(flopper.address);
  console.log(`Kick auction`);
  console.log(`Owner address ${owner.address}`);
  // 過去に実際にあったオークション
  // {
  //   id: 1861,
  //   bid: '0',
  //   lot: '30000000000000000000000000000000000000000000000000',
  //   guy: '0xA950524441892A31ebddF91d3cEEFa04Bf454466',
  //   price: '1',
  //   tic: 0,
  //   end: 2022-01-25T00:33:02.000Z
  // }

  // オークションを開始する
  await flapper.connect(addr1).kick(auctionAmount, BigNumber.from(0));
  console.log("Started surplus auction id 1");

  const { guy } = await flapper.bids(1);
  console.log(`Flapper auction hosted by: ${guy}`);
  await flopper.kick(addr1.address, dump, sump);

  const flopperAuction = await flopper.bids(1);
  console.log(`Started debt auction id 1 by ${flopperAuction.guy}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
