import { BigNumber } from "ethers";
import { Vow, VowStatus } from "../../src/index";

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

      console.log(healingAmount.toString());
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

      console.log(healingAmount.toString());
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
});
