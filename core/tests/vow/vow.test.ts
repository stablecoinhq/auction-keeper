import { BigNumber, ethers } from "ethers";
import { Vow, VowStatus } from "../../src/index";
import { getArgumentFromRawData } from "../../src/vow";

const BYTES_32 = 64;

// 与えられたデータをアドレスに整形する
function toAddress(data: string): string {
  return `0x${data.slice(24)}`;
}

describe("Vow", () => {
  describe("calculateHealingAmount", () => {
    // Surplusオークションが開けるならtrue
    it("Should return true when surplus auction can be started", () => {
      // Surplus
      const surplusVowStatus: VowStatus = {
        availableDai: BigNumber.from(
          "1320302957743658775780635933257026780505783697347709"
        ),
        unbackedDai: BigNumber.from(
          "799633423869610118558897679808725321089545663422952"
        ),
        // Sin
        queuedDebt: BigNumber.from(
          "799627146321970172679137907073248701355171709933777"
        ),
        // Ash
        onAuctionDebt: BigNumber.from(0),
        // bump
        fixedSurplusAuctionSize: BigNumber.from(
          "10000000000000000000000000000000000000000000000000"
        ),
        // sump
        fixedDebtAuctionSize: BigNumber.from(
          "50000000000000000000000000000000000000000000000000"
        ),
        // hump
        auctionSizeBuffer: BigNumber.from(
          "500000000000000000000000000000000000000000000000000"
        ),
      };
      const [healingAmount, shouldHeal] =
        Vow.calculateHealingAmount(surplusVowStatus);

      expect(healingAmount).toEqual(
        BigNumber.from("6277547639945879759772735476619734373953489175")
      );
      expect(shouldHeal).toBe(true);
    });
    // あと1 rad DAIでオークションを開けるなら[1, true]を返す
    it("Should return true when surplus auction can be started, even with 1rad dai", () => {
      // Surplus
      const surplusVowStatus: VowStatus = {
        availableDai: BigNumber.from(
          "1320302957743658775780635933257026780505783697347709"
        ),
        unbackedDai: BigNumber.from(
          "799627146321970172679137907073248701355171709933778"
        ),
        // Sin
        queuedDebt: BigNumber.from(
          "799627146321970172679137907073248701355171709933777"
        ),
        // Ash
        onAuctionDebt: BigNumber.from(0),
        // bump
        fixedSurplusAuctionSize: BigNumber.from(
          "10000000000000000000000000000000000000000000000000"
        ),
        // sump
        fixedDebtAuctionSize: BigNumber.from(
          "50000000000000000000000000000000000000000000000000"
        ),
        // hump
        auctionSizeBuffer: BigNumber.from(
          "500000000000000000000000000000000000000000000000000"
        ),
      };
      const [healingAmount, shouldHeal] =
        Vow.calculateHealingAmount(surplusVowStatus);

      expect(healingAmount).toEqual(BigNumber.from("1"));
      expect(shouldHeal).toBe(true);
    });

    // 負債がないなら[0, false]を返す
    it("Should return false when there's no debt", () => {
      // Surplus
      const surplusVowStatus: VowStatus = {
        availableDai: BigNumber.from(
          "1320302957743658775780635933257026780505783697347709"
        ),
        unbackedDai: BigNumber.from(
          "799627146321970172679137907073248701355171709933777"
        ),
        // Sin
        queuedDebt: BigNumber.from(
          "799627146321970172679137907073248701355171709933777"
        ),
        // Ash
        onAuctionDebt: BigNumber.from(0),
        // bump
        fixedSurplusAuctionSize: BigNumber.from(
          "10000000000000000000000000000000000000000000000000"
        ),
        // sump
        fixedDebtAuctionSize: BigNumber.from(
          "50000000000000000000000000000000000000000000000000"
        ),
        // hump
        auctionSizeBuffer: BigNumber.from(
          "500000000000000000000000000000000000000000000000000"
        ),
      };
      const [healingAmount, shouldHeal] =
        Vow.calculateHealingAmount(surplusVowStatus);
      expect(healingAmount).toEqual(BigNumber.from("0"));
      expect(shouldHeal).toBe(false);
    });
    // Debtオークションが始められる
    it("Should return true when debt auction can be started", () => {
      // Debt
      const debtVowStatus: VowStatus = {
        availableDai: BigNumber.from(
          "43182088423581837831814105867170163957827142136124"
        ),
        unbackedDai: BigNumber.from(
          "5352717687602463247348389574350717041371353504848889"
        ),
        // Sin
        queuedDebt: BigNumber.from(
          "5197804266009517028869893069587589708363041203444877"
        ),
        // Ash
        onAuctionDebt: BigNumber.from(0),
        // bump
        fixedSurplusAuctionSize: BigNumber.from(
          "10000000000000000000000000000000000000000000000000"
        ),
        // sump
        fixedDebtAuctionSize: BigNumber.from(
          "50000000000000000000000000000000000000000000000000"
        ),
        // hump
        auctionSizeBuffer: BigNumber.from(
          "500000000000000000000000000000000000000000000000000"
        ),
      };
      const [healingAmount, shouldHeal] =
        Vow.calculateHealingAmount(debtVowStatus);
      expect(healingAmount).toEqual(
        BigNumber.from("43182088423581837831814105867170163957827142136124")
      );
      expect(shouldHeal).toEqual(true);
    });

    // あと1rad daiでオークションが開けるなら[1, true]を返す
    it("Should return true when debt auction can be started", () => {
      // Debt
      const debtVowStatus: VowStatus = {
        availableDai: BigNumber.from("1"),
        unbackedDai: BigNumber.from(
          "5352717687602463247348389574350717041371353504848889"
        ),
        // Sin
        queuedDebt: BigNumber.from(
          "5197804266009517028869893069587589708363041203444877"
        ),
        // Ash
        onAuctionDebt: BigNumber.from(0),
        // bump
        fixedSurplusAuctionSize: BigNumber.from(
          "10000000000000000000000000000000000000000000000000"
        ),
        // sump
        fixedDebtAuctionSize: BigNumber.from(
          "50000000000000000000000000000000000000000000000000"
        ),
        // hump
        auctionSizeBuffer: BigNumber.from(
          "500000000000000000000000000000000000000000000000000"
        ),
      };
      const [healingAmount, shouldHeal] =
        Vow.calculateHealingAmount(debtVowStatus);
      expect(healingAmount).toEqual(BigNumber.from("1"));
      expect(shouldHeal).toEqual(true);
    });
    // 資産DAIが0なら[0, false]を返す
    it("Should return true when debt auction can be started", () => {
      // Debt
      const debtVowStatus: VowStatus = {
        availableDai: BigNumber.from("0"),
        unbackedDai: BigNumber.from(
          "5352717687602463247348389574350717041371353504848889"
        ),
        // Sin
        queuedDebt: BigNumber.from(
          "5197804266009517028869893069587589708363041203444877"
        ),
        // Ash
        onAuctionDebt: BigNumber.from(0),
        // bump
        fixedSurplusAuctionSize: BigNumber.from(
          "10000000000000000000000000000000000000000000000000"
        ),
        // sump
        fixedDebtAuctionSize: BigNumber.from(
          "50000000000000000000000000000000000000000000000000"
        ),
        // hump
        auctionSizeBuffer: BigNumber.from(
          "500000000000000000000000000000000000000000000000000"
        ),
      };
      const [healingAmount, shouldHeal] =
        Vow.calculateHealingAmount(debtVowStatus);
      expect(healingAmount).toEqual(BigNumber.from("0"));
      expect(shouldHeal).toEqual(false);
    });
  });
  describe("Vat.frob", () => {
    it("Should parse raw frob event", () => {
      // https://etherscan.io/tx/0x8711d01114bdf0c3afadecea6fb28e711ef3a953e98e4e3b20b190f9d3123376#eventlog
      const rawEvent =
        "0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000e0760887034554482d43000000000000000000000000000000000000000000000000000000000000000000000000000000ae721fb008c3035e568f4d9ac0c9a6bccff4f87f000000000000000000000000ae721fb008c3035e568f4d9ac0c9a6bccff4f87f00000000000000000000000056d48a77e5f302dc369f2f93e1aa86cd1f9470f2000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000017b7883c0691660000000000000000000000000000000000000000000000000000000000000";
      const fourthArgument = rawEvent
        .slice(2)
        .slice(BYTES_32 * 2)
        .slice(8)
        .slice(BYTES_32 * 3)
        .slice(0, BYTES_32);

      console.log(toAddress(fourthArgument));
      expect(fourthArgument).toBe(
        "00000000000000000000000056d48a77e5f302dc369f2f93e1aa86cd1f9470f2"
      );
      expect(ethers.utils.isAddress(toAddress(fourthArgument))).toBe(true);
    });
    it("Should parse raw grab event", () => {
      // https://etherscan.io/tx/0x8711d01114bdf0c3afadecea6fb28e711ef3a953e98e4e3b20b190f9d3123376#eventlog
      const rawEvent =
        "0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000e07bab3f404554482d43000000000000000000000000000000000000000000000000000000000000000000000000000000ae721fb008c3035e568f4d9ac0c9a6bccff4f87f000000000000000000000000ae721fb008c3035e568f4d9ac0c9a6bccff4f87f00000000000000000000000056d48a77e5f302dc369f2f93e1aa86cd1f9470f2000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000017b7883c0691660000000000000000000000000000000000000000000000000000000000000";
      const fourthArgument = getArgumentFromRawData(rawEvent, 4);
      expect(fourthArgument).toBe(
        "00000000000000000000000056d48a77e5f302dc369f2f93e1aa86cd1f9470f2"
      );
      expect(ethers.utils.isAddress(toAddress(fourthArgument))).toBe(true);
    });
  });
});
