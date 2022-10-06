import { BigNumber } from "ethers";
// 単位変換

// https://github.com/makerdao/dss/blob/master/DEVELOPING.md#units
export const constants = {
  WAD: BigNumber.from(10).pow(18),
  RAY: BigNumber.from(10).pow(27),
  RAD: BigNumber.from(10).pow(45),
};

export enum Unit {
  Wad,
  Ray,
  Rad,
}

export function displayUnits(num: BigNumber, unit: Unit): String {
  const DECIMAL_PLACES = 10 ** 3;

  function toStandard(num: BigNumber, divBy: BigNumber): Number {
    return num.div(divBy.div(DECIMAL_PLACES)).toNumber() / DECIMAL_PLACES;
  }
  switch (unit) {
    case Unit.Wad:
      return toStandard(num, constants.WAD).toLocaleString();
    case Unit.Ray:
      return toStandard(num, constants.RAY).toLocaleString();
    case Unit.Rad:
      return toStandard(num, constants.RAD).toLocaleString();
    default:
      return num.toBigInt().toLocaleString();
  }
}
