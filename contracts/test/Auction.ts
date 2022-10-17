import { expect } from "chai";
import { ethers, network } from "hardhat";
import {
  Clip__factory,
  Flapper__factory,
  Flopper__factory,
  Vow__factory,
  Dog, 
  Vow
} from "@auction-keeper/core";
import { BigNumber } from "ethers";

require("dotenv").config();

async function forkNetwork(n: number): Promise<void> {
  const rpcURL = `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY!}`;
  network.provider.request({
    method: "hardhat_reset",
    params: [
      {
        forking: {
          jsonRpcUrl: rpcURL,
          blockNumber: n,
        },
      },
    ],
  });
}

const signer = ethers.Wallet.fromMnemonic(
  "test test test test test test test test test test test junk"
).connect(ethers.provider);

async function load() {
  const vow = new Vow({
    vatAddress: "0x35D1b3F3D7966A1DFe207aa4514C12a259A0492B",
    vowAddress: "0xA950524441892A31ebddF91d3cEEFa04Bf454466",
    signer: signer,
  });

  const vowContract = Vow__factory.connect(
    "0xA950524441892A31ebddF91d3cEEFa04Bf454466",
    signer
  );

  return {
    vow,
    vowContract,
  };
}

describe("auction keeper", function () {
  describe("Surplus auction", function () {
    this.beforeEach(async () => {
      forkNetwork(9656038);
    });

    it("Should start surplus auction", async function () {
      const { vow, vowContract } = await load();
      vow.start();
      const flapperAddress = await vow.flapperAddress();
      const flapper = Flapper__factory.connect(flapperAddress, signer);
      const before = await flapper.kicks();
      await vowContract.heal(
        BigNumber.from("6277547639945879759772735476619734373953489175")
      );
      const eventFilter = flapper.filters["Kick(uint256,uint256,uint256)"]();
      flapper.on(eventFilter, async (after) => {
        expect(before).lessThan(after);
      });
    });
  });

  describe("Debt auction", function () {
    this.beforeEach(async () => {
      forkNetwork(9702725);
    });
    it("Should start debt auction", async function () {
      const { vow, vowContract } = await load();
      vow.start();
      const flopperAddress = await vow.flopperAddress();
      const flopper = Flopper__factory.connect(flopperAddress, signer);
      const before = await flopper.kicks();
      await vowContract.heal(
        BigNumber.from("43182088423581837831814105867170163957827142136124")
      );
      const eventFilter =
        flopper.filters["Kick(uint256,uint256,uint256,address)"]();
      flopper.on(eventFilter, async (after) => {
        expect(before).lessThan(after);
      });
    });
  });

  describe("Collateral auction", function () {
    this.beforeEach(async () => {
      forkNetwork(12317309);
    });

    it("Should start collateral auction", async function () {
      const dog = new Dog({
        dogAddress: "0x135954d155898D42C90D2a57824C690e0c7BEf1B",
        signer,
        fromBlock: 12316454,
        toBlock: 12317309,
      });
      const [{ address }] = await dog.getClipAddresses([
        "0x4c494e4b2d410000000000000000000000000000000000000000000000000000",
      ]);
      const clipper = Clip__factory.connect(address, signer);
      const before = await clipper.count();
      await dog.start();
      const kickEventFilter =
        clipper.filters[
          "Kick(uint256,uint256,uint256,uint256,address,address,uint256)"
        ]();
      clipper.on(kickEventFilter, async (after) => {
        expect(before).lessThan(after);
      });
    });
  });
});
