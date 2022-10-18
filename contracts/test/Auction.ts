import { expect } from "chai";
import { ethers, network } from "hardhat";
import {
  Clip__factory,
  Flapper__factory,
  Flopper__factory,
  Vow__factory,
  Dog,
  Vow,
  Vat__factory,
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const signer = ethers.Wallet.fromMnemonic(
  "test test test test test test test test test test test junk"
).connect(ethers.provider);

const VOW_ADDRESS = "0xA950524441892A31ebddF91d3cEEFa04Bf454466";
const VAT_ADDRESS = "0x35D1b3F3D7966A1DFe207aa4514C12a259A0492B";
async function load() {
  const vow = new Vow({
    vatAddress: VAT_ADDRESS,
    vowAddress: VOW_ADDRESS,
    signer: signer,
  });

  const vowContract = Vow__factory.connect(VOW_ADDRESS, signer);

  const vatContract = Vat__factory.connect(VAT_ADDRESS, signer);

  return {
    vow,
    vowContract,
    vatContract,
  };
}

// Vow contract status at block 9656038
// sin:  799633423869610118558897679808725321089545663422952
// Sin:  799627146321970172679137907073248701355171709933777
// debt:      6277547639945879759772735476619734373953489175
// Ash:                                                    0
// dai: 1320302957743658775780635933257026780505783697347709
// sump:  50000000000000000000000000000000000000000000000000
describe("auction keeper", function () {
  describe("Surplus auction", function () {
    this.beforeEach(async () => {
      forkNetwork(9656038);
    });

    it("Should start surplus auction", async function () {
      const { vow, vatContract, vowContract } = await load();
      vow.start();
      const flapperAddress = await vow.flapperAddress();
      const flapper = Flapper__factory.connect(flapperAddress, signer);
      const before = await flapper.kicks();
      await sleep(6000);
      const after = await flapper.kicks();
      const debt = await vatContract.sin(VOW_ADDRESS);
      const Sin = await vowContract.Sin();
      expect(before).lessThan(after);
      expect(debt.sub(Sin)).eq(BigNumber.from(0));
    });
  });

  // Vow contract status at block 9702725
  // sin:  5352717687602463247348389574350717041371353504848889
  // Sin:  5197804266009517028869893069587589708363041203444877
  // debt:  154913421592946218478496504763127333008312301404012
  // Ash:                                                     0
  // dai:    43182088423581837831814105867170163957827142136124
  // sump:   50000000000000000000000000000000000000000000000000
  // When the surplus dai becomes 0, the debt auction will start
  describe("Debt auction start", function () {
    this.beforeEach(async () => {
      forkNetwork(9702725);
    });
    it("Should start debt auction", async function () {
      const { vow, vatContract } = await load();
      vow.start();
      const flopperAddress = await vow.flopperAddress();
      const flopper = Flopper__factory.connect(flopperAddress, signer);
      const before = await flopper.kicks();
      await sleep(6000);
      const after = await flopper.kicks();
      const availableDai = await vatContract.dai(VOW_ADDRESS);
      expect(before).lessThan(after);
      expect(availableDai).eq(BigNumber.from(0));
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
