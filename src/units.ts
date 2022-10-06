import { BigNumber } from "ethers";
// 単位変換

// https://github.com/makerdao/dss/blob/master/DEVELOPING.md#units
const constants = {
  WAD: BigNumber.from(10).pow(18),
  RAY: BigNumber.from(10).pow(27),
  RAD: BigNumber.from(10).pow(45),
};

export enum Unit {
  Wad,
  Ray,
  Rad,
}

export function convert(num: BigNumber, unit: Unit): BigNumber {
  switch (unit) {
    case Unit.Wad:
      return num.div(constants.WAD);
    case Unit.Ray:
      return num.div(constants.RAY);
    case Unit.Rad:
      return num.div(constants.RAD);
    default:
      return num;
  }
}
