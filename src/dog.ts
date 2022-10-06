import { Dog, Vat } from "../types/ethers-contracts";
import { BigNumber } from "ethers";
import { convert, Unit } from "./units";
import { UrnsByIlk } from "./event-parser";

interface VatIlkInfo {
  Art: BigNumber;
  rate: BigNumber;
  spot: BigNumber;
  dust: BigNumber;
}

interface DogIlkInfo {
  clip: string;
  chop: BigNumber;
  hole: BigNumber;
  dirt: BigNumber;
}

interface UrnInfo {
  art: BigNumber;
  ink: BigNumber;
}

function displayVatIlkInfo(vatInfo: {
  Art: BigNumber;
  rate: BigNumber;
  spot: BigNumber;
  dust: BigNumber;
}) {
  const { Art, rate, spot, dust } = vatInfo;
  const normalized = {
    Art: convert(Art, Unit.Wad).toString(),
    rate: convert(rate, Unit.Ray).toString(),
    spot: convert(spot, Unit.Ray).toString(),
    dust: convert(dust, Unit.Rad).toString(),
  };
  console.log(JSON.stringify(normalized, null, 2));
}

function displayDogIlkInfo(dogInfo: DogIlkInfo) {
  const { clip, chop, hole, dirt } = dogInfo;
  const normalized = {
    clip: clip,
    chop: convert(chop, Unit.Wad).toString(),
    hole: convert(hole, Unit.Rad).toString(),
    dirt: convert(dirt, Unit.Rad).toString(),
  };
  console.log(JSON.stringify(normalized, null, 2));
}

function displayUrnInfo(urnAddress: string, urnInfo: UrnInfo) {
  const { art, ink } = urnInfo;
  const normalized = {
    address: urnAddress,
    ink: convert(ink, Unit.Wad).toString(),
    art: convert(art, Unit.Wad).toString(),
  };
  console.log(JSON.stringify(normalized, null, 2));
}

// 任意のurnをオークションすべきか判断する
// ローカルでbarkと同様の計算を行う
// https://github.com/makerdao/dss/blob/master/src/dog.sol#L156-L237
function canBark(
  Hole: BigNumber,
  Dirt: BigNumber,
  urnInfo: UrnInfo,
  vatIlkInfo: VatIlkInfo,
  dogIlk: DogIlkInfo
): boolean {
  const { ink, art } = urnInfo;
  const { spot, rate, dust } = vatIlkInfo;
  const { hole, dirt, chop } = dogIlk;
  // オークション可能か
  const room = Hole.sub(Dirt).lte(hole.sub(dirt))
    ? Hole.sub(Dirt)
    : hole.sub(dirt);
  // roomを正規化
  const normalizedRoom = convert(room, Unit.Wad).div(rate).div(chop);
  const dart = art.lte(normalizedRoom) ? art : normalizedRoom;
  // Vaultの金額が少額
  const isDust = dart.mul(rate).lt(dust);
  // Spot(通貨毎のDAI最大発行可能枚数)が0以下
  // ink(担保されている通貨数量) * Spotが負債(art * rate)より小さければ安全
  const isVaultSafe = spot.gt(0) && ink.mul(spot).lt(art.mul(rate));
  // dart, dinkがオーバーフローしていない
  const isDartUnsafe = dart.gt(BigNumber.from(2).pow(255));
  const dink = ink.mul(dart).div(art);
  // dinkが0より小さい
  const isDinkBelowZero = dink.lte(0);
  const isDinkUnsafe = dink.gt(BigNumber.from(2).pow(255));
  if (
    isDartUnsafe ||
    isDinkUnsafe ||
    isDinkBelowZero ||
    isDust ||
    !isVaultSafe
  ) {
    return false;
  } else {
    return true;
  }
}

export interface CanBark {
  ilk: string;
  address: string;
}

// それぞれのUrnを調べる
export async function checkUrns(
  vat: Vat,
  dog: Dog,
  Hole: BigNumber,
  Dirt: BigNumber,
  urnsByIlk: UrnsByIlk
): Promise<CanBark[]> {
  const { ilk, urnAddresses } = urnsByIlk;
  const vatIlkInfo = await vat.ilks(ilk.value);
  const dogIlk = await dog.ilks(ilk.value);
  displayVatIlkInfo(vatIlkInfo);
  displayDogIlkInfo(dogIlk);

  const isLiquidationLimitSafe = Hole.gt(Dirt) && dogIlk.hole.gt(dogIlk.dirt);
  // オークションがDAI上限に達している
  if (!isLiquidationLimitSafe) {
    return [];
  }

  const barks = await Promise.all(
    urnAddresses.map(async (urnAddress) => {
      const urnInfo = await vat.urns(ilk.value, urnAddress.value);
      displayUrnInfo(urnAddress.value, urnInfo);
      return {
        address: urnAddress.value,
        canBark: canBark(Hole, Dirt, urnInfo, vatIlkInfo, dogIlk),
      };
    })
  );

  return barks
    .filter((v) => v.canBark)
    .map((v) => {
      return { ilk: ilk.value, address: v.address };
    });
}
