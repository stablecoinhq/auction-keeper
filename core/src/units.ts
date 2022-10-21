import { BigNumber } from "ethers";

// https://github.com/makerdao/dss/blob/master/DEVELOPING.md#units

enum Unit {
  Wad = 18,
  Ray = 27,
  Rad = 45,
}

export const constants = {
  WAD: BigNumber.from(10).pow(Unit.Wad),
  RAY: BigNumber.from(10).pow(Unit.Ray),
  RAD: BigNumber.from(10).pow(Unit.Rad),
};

export function displayUnits(num: BigNumber, decimalPlaces: BigNumber): string {
  function toStandard(num: BigNumber, divBy: BigNumber): string {
    return num.div(divBy).toString();
  }
  return toStandard(num, decimalPlaces);
}
