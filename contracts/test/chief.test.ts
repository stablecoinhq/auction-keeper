/* eslint-disable no-unexpected-multiline */
// Testing chief keeper
import { ethers } from "hardhat";
// import { BigNumber } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { Chief, createDataSource, Database } from "@auction-keeper/core";
import { forkNetwork, Contracts, signer, sleep } from "../src/common";

// Create dss-spell contract
// Fork from goerli chain
// deploy lib
// deploy spell
// Run chief keeper
// Vote spell
// Check spell was scheduled
// Check spell was executed

const ONE = BigNumber.from(10).pow(18);

const ADDRESS_WITH_TOKEN = "0x24bbfC323FC8f0e09aB7B433Cc8408c75dac8193";
const BLOCK_NUMBER = 7949089;

// https://goerli.etherscan.io/block/7949089
// 2022/11/14時点でのブロック高
// Fork from goerli chain
// deploy lib
// deploy spell
// impersonate account
async function prepare() {
  await forkNetwork("goerli", BLOCK_NUMBER);
  const Lib = await ethers.getContractFactory("DssExecLib");
  const lib = await Lib.deploy();
  await lib.deployed();
  const Spell = await ethers.getContractFactory("DssSpell", {
    libraries: { DssExecLib: lib.address },
  });
  const spell = await Spell.deploy();
  await spell.deployed();
  const myAccount = await ethers.getImpersonatedSigner(ADDRESS_WITH_TOKEN);

  const chiefAddress = await lib.getChangelogAddress(Contracts.chief);

  const chief = await ethers.getContractAt("DssChief", chiefAddress);
  const govTokenAddress = await chief.GOV();
  const governanceToken = await ethers.getContractAt(
    "DsToken",
    govTokenAddress
  );

  const pauseAddress = await lib.getChangelogAddress(Contracts.pause);

  // approve all
  await governanceToken.connect(myAccount)["approve(address)"](chief.address);
  const dataSource = await createDataSource(Database.memory);
  return {
    lib,
    spell,
    myAccount,
    chief,
    governanceToken,
    pauseAddress,
    dataSource,
  };
}

describe("Chief keeper", () => {
  describe("prepare", () => {
    // Check prepare properly deploys everything needed.
    it("Should properly deploy spell", async () => {
      const { myAccount, chief, governanceToken, spell } = await loadFixture(
        prepare
      );
      expect(myAccount.address).eq(
        "0x24bbfC323FC8f0e09aB7B433Cc8408c75dac8193"
      );
      expect(chief.address).eq("0x8c7FAeFDCE1438cF99B6654C3c3De3816eC0e879");
      const myTokenDeposits = await governanceToken.balanceOf(
        myAccount.address
      );
      expect(myTokenDeposits).eq(BigNumber.from(100000).mul(ONE));
      const allowance = await governanceToken.allowance(
        myAccount.address,
        chief.address
      );
      expect(allowance.gte(BigNumber.from(100000).mul(ONE))).eq(true);
      const eta = await spell.eta();
      expect(eta.eq(0)).eq(true);
      const isDone = await spell.done();
      expect(isDone).eq(false);
    });
  });

  describe("Keeper", () => {
    it("Should lift and schedule spell, lock then vote", async () => {
      const {
        myAccount,
        chief,
        governanceToken,
        spell,
        pauseAddress,
        dataSource,
      } = await loadFixture(prepare);
      const currentHat = await chief.hat();
      const hatApproval = await chief.approvals(currentHat);
      const keeper = new Chief({
        chiefAddress: chief.address,
        pauseAddress,
        signer,
        fromBlock: BLOCK_NUMBER,
        toBlock: "latest",
        dataSource,
      });
      await keeper.start();
      const deposits = await chief.deposits(myAccount.address);
      if (hatApproval.gt(deposits)) {
        const balance = await governanceToken.balanceOf(myAccount.address);
        const amountOfVoteNeeded = hatApproval.add(1);
        const amountToVote = amountOfVoteNeeded.gte(deposits.add(balance))
          ? deposits.add(balance)
          : amountOfVoteNeeded.sub(deposits);
        if (amountToVote.gt(0)) {
          await chief.connect(myAccount).lock(amountToVote);
        }
      }

      await chief.connect(myAccount)["vote(address[])"]([spell.address]);
      await sleep(10000);
      const nextCastTime = await spell.nextCastTime();
      const hatAfter = await chief.hat();
      const now = BigNumber.from("1668389125");
      expect(hatAfter).eq(spell.address);
      expect(nextCastTime.gte(now)).eq(true);
      keeper.stop();
    });

    it("Should lift and schedule spell, vote then lock", async () => {
      const {
        myAccount,
        chief,
        governanceToken,
        spell,
        pauseAddress,
        dataSource,
      } = await loadFixture(prepare);
      const currentHat = await chief.hat();
      const hatApproval = await chief.approvals(currentHat);
      const keeper = new Chief({
        chiefAddress: chief.address,
        pauseAddress,
        signer,
        fromBlock: BLOCK_NUMBER,
        toBlock: "latest",
        dataSource,
      });
      await keeper.start();
      await chief.connect(myAccount)["vote(address[])"]([spell.address]);

      const deposits = await chief.deposits(myAccount.address);
      if (hatApproval.gt(deposits)) {
        const balance = await governanceToken.balanceOf(myAccount.address);
        const amountOfVoteNeeded = hatApproval.add(1);
        const amountToVote = amountOfVoteNeeded.gte(deposits.add(balance))
          ? deposits.add(balance)
          : amountOfVoteNeeded.sub(deposits);
        if (amountToVote.gt(0)) {
          await chief.connect(myAccount).lock(amountToVote);
        }
      }

      await sleep(10000);
      const nextCastTime = await spell.nextCastTime();
      const hatAfter = await chief.hat();
      const now = BigNumber.from("1668389125");
      expect(hatAfter).eq(spell.address);
      expect(nextCastTime.gte(now)).eq(true);
      keeper.stop();
    });

    it("Should do nothing when the spell was voted with exact amount", async () => {
      const {
        myAccount,
        chief,
        governanceToken,
        spell,
        pauseAddress,
        dataSource,
      } = await loadFixture(prepare);
      const currentHat = await chief.hat();
      const hatApproval = await chief.approvals(currentHat);
      const keeper = new Chief({
        chiefAddress: chief.address,
        pauseAddress,
        signer,
        fromBlock: BLOCK_NUMBER,
        toBlock: "latest",
        dataSource,
      });
      await keeper.start();
      const deposits = await chief.deposits(myAccount.address);
      if (hatApproval.gt(deposits)) {
        const balance = await governanceToken.balanceOf(myAccount.address);
        const amountOfVoteNeeded = hatApproval;
        const amountToVote = amountOfVoteNeeded.gte(deposits.add(balance))
          ? deposits.add(balance)
          : amountOfVoteNeeded.sub(deposits);
        if (amountToVote.gt(0)) {
          await chief.connect(myAccount).lock(amountToVote);
        }
      }

      await chief.connect(myAccount)["vote(address[])"]([spell.address]);
      await sleep(10000);
      const eta = await spell.eta();
      const hatAfter = await chief.hat();
      expect(hatAfter).eq(currentHat);
      expect(eta.eq(0)).eq(true);
      keeper.stop();
    });

    // Do nothing when not enough votes
    it("Should do nothing when there's not enough votes", async () => {
      const { myAccount, chief, spell, pauseAddress, dataSource } =
        await loadFixture(prepare);
      const currentHat = await chief.hat();
      const keeper = new Chief({
        chiefAddress: chief.address,
        pauseAddress,
        signer,
        fromBlock: BLOCK_NUMBER,
        toBlock: "latest",
        dataSource,
      });
      await keeper.start();
      const amountToVote = BigNumber.from(100).mul(ONE);
      await chief.connect(myAccount).lock(amountToVote);

      await chief.connect(myAccount)["vote(address[])"]([spell.address]);
      await sleep(10000);
      const eta = await spell.eta();
      const hatAfter = await chief.hat();
      expect(hatAfter).eq(currentHat);
      expect(eta.eq(0)).eq(true);
      keeper.stop();
    });
  });
});
