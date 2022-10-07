import { BigNumber } from "ethers";
// 単位変換

// https://github.com/makerdao/dss/blob/master/DEVELOPING.md#units

export enum Unit {
  Wad = 18,
  Ray = 27,
  Rad = 45,
}

export const constants = {
  WAD: BigNumber.from(10).pow(Unit.Wad),
  RAY: BigNumber.from(10).pow(Unit.Ray),
  RAD: BigNumber.from(10).pow(Unit.Rad),
};

export function displayUnits(num: BigNumber, unit: Unit): String {
  const DECIMAL_PLACES = 10 ** 3;

  function toStandard(num: BigNumber, divBy: BigNumber): Number {
    return num.div(divBy.div(DECIMAL_PLACES)).toNumber() / DECIMAL_PLACES;
  }
  return toStandard(num, BigNumber.from(10).pow(unit)).toLocaleString();
}
