import { BigNumber } from "ethers";
// 単位変換

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

export function displayUnits(num: BigNumber, decimalPlaces: BigNumber): number {
  const DECIMAL_PLACES = 10 ** 10;

  function toStandard(num: BigNumber, divBy: BigNumber): number {
    return num.mul(DECIMAL_PLACES).div(divBy).toNumber() / DECIMAL_PLACES;
  }
  return toStandard(num, decimalPlaces);
}
