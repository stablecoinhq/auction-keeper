import { expect } from "chai";
import {
  Clip__factory,
  Flapper__factory,
  Flopper__factory,
  Vow__factory,
  Dog,
  Vow,
  Vat__factory,
  createDataSource,
  Database,
} from "@auction-keeper/core";
import { BigNumber } from "ethers";
import {
  VAT_ADDRESS,
  VOW_ADDRESS,
  signer,
  forkNetwork,
  sleep,
} from "../src/common";

require("dotenv").config();

function load() {
  const vow = new Vow({
    vatAddress: VAT_ADDRESS,
    vowAddress: VOW_ADDRESS,
    signer,
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
describe("auction keeper", () => {
  describe("Surplus auction", () => {
    beforeEach(async () => {
      await forkNetwork("mainnet", 9656038);
    });

    it("Should start surplus auction", async () => {
      const { vow, vatContract, vowContract } = load();
      void vow.start();
      const flapperAddress = await vow.flapperAddress();
      console.log(`flapperAddress ${flapperAddress}`);
      const flapper = Flapper__factory.connect(flapperAddress, signer);
      const before = await flapper.kicks();
      await sleep(10000);
      const after = await flapper.kicks();
      const debt = await vatContract.sin(VOW_ADDRESS);
      const Sin = await vowContract.Sin();
      expect(before).lessThan(after);
      expect(debt.sub(Sin)).eq(BigNumber.from(0));
      vow.stop();
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
  describe("Debt auction start", () => {
    beforeEach(async () => {
      await forkNetwork("mainnet", 9702725);
    });
    it("Should start debt auction", async () => {
      const { vow, vatContract } = load();
      void vow.start();
      const flopperAddress = await vow.flopperAddress();
      const flopper = Flopper__factory.connect(flopperAddress, signer);
      const before = await flopper.kicks();
      await sleep(10000);
      const after = await flopper.kicks();
      const availableDai = await vatContract.dai(VOW_ADDRESS);
      expect(before).lessThan(after);
      expect(availableDai).eq(BigNumber.from(0));
      vow.stop();
    });
  });

  describe("Collateral auction", () => {
    beforeEach(async () => {
      await forkNetwork("mainnet", 12317309);
    });

    it("Should start collateral auction", async () => {
      const dataSource = await createDataSource(Database.memory);
      const dog = new Dog({
        dogAddress: "0x135954d155898D42C90D2a57824C690e0c7BEf1B",
        signer,
        fromBlock: 12316454,
        toBlock: 12317309,
        dataSource,
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
      clipper.on(kickEventFilter, (after) => {
        expect(before).lessThan(after);
      });
      dog.stop();
    });
  });
});
