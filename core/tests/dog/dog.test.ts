import { Dog } from "../../src";
import { BigNumber } from "ethers";

describe("Dog", () => {
  describe("canBark", () => {
    // 問題ないVaultは精算できない
    it("Should not bark on safe vaults", () => {
      const urnInfo = {
        art: BigNumber.from("1759060675923698738620"),
        ink: BigNumber.from("70000000000000000000"),
      };
      const vatIlkInfo = {
        Art: BigNumber.from("531705883192813680666096"),
        rate: BigNumber.from("1007548713374104353292660714"),
        spot: BigNumber.from("304615085714285714285714285714"),
        dust: BigNumber.from(
          "100000000000000000000000000000000000000000000000"
        ),
      };
      const dogIlkInfo = {
        clip: "clip",
        chop: BigNumber.from("1130000000000000000"),
        hole: BigNumber.from(
          "5000000000000000000000000000000000000000000000000"
        ),
        dirt: BigNumber.from("0"),
      };

      const Hole = BigNumber.from(
        "5000000000000000000000000000000000000000000000000"
      );
      const Dirt = BigNumber.from(0);
      const dirt = BigNumber.from(0);
      const result = Dog.canBark(
        Hole,
        Dirt,
        dirt,
        urnInfo,
        vatIlkInfo,
        dogIlkInfo
      );
      expect(result.canBark).toBe(false);
      expect(result.tab).toEqual(BigNumber.from(0));
    });

    // 価格が下がって精算された
    it("Should bark on un-safe vaults", () => {
      const urnInfo = {
        art: BigNumber.from("1759060675923698738620"),
        ink: BigNumber.from("70000000000000000000"),
      };
      const vatIlkInfo = {
        Art: BigNumber.from("531705883192813680666096"),
        rate: BigNumber.from("1007548713374104353292660714"),
        spot: BigNumber.from("10461508571428571428571428571"),
        dust: BigNumber.from(
          "100000000000000000000000000000000000000000000000"
        ),
      };
      const dogIlkInfo = {
        clip: "clip",
        chop: BigNumber.from("1130000000000000000"),
        hole: BigNumber.from(
          "5000000000000000000000000000000000000000000000000"
        ),
        dirt: BigNumber.from("0"),
      };

      const Hole = BigNumber.from(
        "5000000000000000000000000000000000000000000000000"
      );
      const Dirt = BigNumber.from(0);
      const dirt = BigNumber.from(0);
      const result = Dog.canBark(
        Hole,
        Dirt,
        dirt,
        urnInfo,
        vatIlkInfo,
        dogIlkInfo
      );
      expect(result.canBark).toBe(true);
      expect(result.tab.gte(BigNumber.from(0))).toBe(true);
    });

    // 精算するべきVaultだが、オークションが上限に達している
    it("Should not bark on un-safe vaults because auction has reached it's capacity", () => {
      const urnInfo = {
        art: BigNumber.from("1759060675923698738620"),
        ink: BigNumber.from("70000000000000000000"),
      };
      const vatIlkInfo = {
        Art: BigNumber.from("531705883192813680666096"),
        rate: BigNumber.from("1007548713374104353292660714"),
        spot: BigNumber.from("10461508571428571428571428571"),
        dust: BigNumber.from(
          "100000000000000000000000000000000000000000000000"
        ),
      };
      const dogIlkInfo = {
        clip: "clip",
        chop: BigNumber.from("1130000000000000000"),
        hole: BigNumber.from(
          "5000000000000000000000000000000000000000000000000"
        ),
        dirt: BigNumber.from("0"),
      };

      const Hole = BigNumber.from(
        "5000000000000000000000000000000000000000000000000"
      );
      const Dirt = BigNumber.from(
        "4999999999999999999999172958408805740266082547305"
      );
      const dirt = BigNumber.from(
        "4999999999999999999999172958408805740266082547305"
      );
      const result = Dog.canBark(
        Hole,
        Dirt,
        dirt,
        urnInfo,
        vatIlkInfo,
        dogIlkInfo
      );
      expect(result.canBark).toBe(false);
      expect(result.tab).toEqual(BigNumber.from(0));
    });
  });
});
