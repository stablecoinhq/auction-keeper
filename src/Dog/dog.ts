import {
  Dog as DogContract,
  Vat as VatContract,
  Vat__factory,
  Dog__factory,
} from "../../types/ethers-contracts/index";
import { BigNumber, constants } from "ethers";
import { displayUnits, Unit, constants as unitContants } from "../units";
import { ethers } from "ethers";
import { parseEventsAndGroup, parseEventAndGroup } from "./event-parser";

export interface CanBark {
  ilk: string;
  address: string;
}

export interface DogConfig {
  vatAddress: string;
  dogAddress: string;
  signer: ethers.Wallet;
  provider: ethers.providers.JsonRpcProvider;
}

export default class Dog {
  readonly vat: VatContract;
  readonly dog: DogContract;
  private signer: ethers.Wallet;
  signerAddress: string;
  Dirt: BigNumber = BigNumber.from(0);
  Hole: BigNumber = BigNumber.from(0);

  constructor(config: DogConfig) {
    const { vatAddress, dogAddress, signer } = config;
    this.signer = signer;
    this.signerAddress = this.signer.address;
    this.vat = Vat__factory.connect(vatAddress, this.signer);
    this.dog = Dog__factory.connect(dogAddress, this.signer);
  }

  async start(this: Dog): Promise<void> {
    const isVatLive = (await this.vat.live()).eq(1);
    const isDogLive = (await this.dog.live()).eq(1);

    if (!isVatLive) {
      return console.log(`Vat ${this.vat.address} is not live`);
    }

    if (!isDogLive) {
      return console.log(`Dog ${this.dog.address} is not live`);
    }
    this.Dirt = await this.dog.Dirt();
    this.Hole = await this.dog.Hole();
    console.log("Fetching past events...");
    const eventsFilter =
      this.vat.filters["LogNote(bytes4,bytes32,bytes32,bytes32,bytes)"]();
    const events = await this.vat.queryFilter(eventsFilter, 7287536, "latest");
    const eventRawData = events.map((logNoteEvent) => {
      return logNoteEvent.data;
    });
    const urnsByIlk = parseEventsAndGroup(eventRawData);
    for (const [ilk, urnAddresses] of urnsByIlk.entries()) {
      console.log(`Ilk: ${ilk}`);
      const addrs = Array.from(urnAddresses);
      const unsafeVaults = await this._checkUrns(ilk, addrs);
      for (const { ilk, address } of unsafeVaults) {
        console.log(`Barking at: ${ilk}, ${address}`);
        await this.dog.bark(ilk, address, this.signer.address);
      }
    }

    console.log("Start listening to ongoing events...");
    this.vat.on(eventsFilter, async (...args) => {
      const [, , , , , logNoteEvent] = args;
      const urnsByIlk = parseEventAndGroup(logNoteEvent.address);
      for (const [ilk, urnAddresses] of urnsByIlk.entries()) {
        const addrs = Array.from(urnAddresses);
        const unsafeVaults = await this._checkUrns(ilk, addrs);
        console.log("Unsafe vaults", unsafeVaults);
        for (const { ilk, address } of unsafeVaults) {
          console.log(`Barking at: ${ilk}, ${address}`);
          await this.dog.bark(ilk, address, this.signer.address);
        }
      }
    });
  }

  private async _checkUrns(
    this: Dog,
    ilk: string,
    urnAddresses: string[]
  ): Promise<CanBark[]> {
    const vatIlkInfo = await this.vat.ilks(ilk);
    const dogIlk = await this.dog.ilks(ilk);
    displayVatIlkInfo(vatIlkInfo);
    displayDogIlkInfo(dogIlk);

    const isLiquidationLimitSafe =
      this.Hole.gt(this.Dirt) && dogIlk.hole.gt(dogIlk.dirt);
    // オークションがDAI上限に達している
    if (!isLiquidationLimitSafe) {
      console.log(`Auction has reached it's capacity for ${ilk}`);
      return [];
    }

    const barks = await Promise.all(
      urnAddresses.map(async (urnAddress) => {
        const urnInfo = await this.vat.urns(ilk, urnAddress);
        displayUrnInfo(urnAddress, vatIlkInfo, urnInfo);
        return {
          address: urnAddress,
          canBark: Dog.canBark(
            this.Hole,
            this.Dirt,
            urnInfo,
            vatIlkInfo,
            dogIlk
          ),
        };
      })
    );

    return barks
      .filter((v) => v.canBark)
      .map((v) => {
        return { ilk: ilk, address: v.address };
      });
  }

  static canBark(
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
    const normalizedRoom = room.div(Unit.Wad).div(rate).div(chop);
    const dart = art.lte(normalizedRoom) ? art : normalizedRoom;
    // Vaultの金額が少額
    const isDust = dart.mul(rate).lt(dust);
    // Spot(通貨毎のDAI最大発行可能枚数)が0以下
    // ink(担保されている通貨数量) * Spotが負債(art * rate)より小さければ安全
    const isVaultSafe = spot.gt(0) && ink.mul(spot).lt(art.mul(rate));
    // dart, dinkがオーバーフローしていない
    const isDartUnsafe = dart.gt(constants.MaxUint256);
    const dink = ink.mul(dart).div(art);
    // dinkが0より小さい
    const isDinkBelowZero = dink.lte(0);
    const isDinkUnsafe = dink.gt(constants.MaxUint256);
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
}

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

interface IlkInfo {
  Art: BigNumber;
  rate: BigNumber;
  spot: BigNumber;
  dust: BigNumber;
}

function displayVatIlkInfo(ilkInfo: IlkInfo) {
  const { Art, rate, spot, dust } = ilkInfo;
  const normalized = {
    Art: displayUnits(Art, Unit.Wad),
    rate: displayUnits(rate, Unit.Ray),
    spot: displayUnits(spot, Unit.Ray),
    dust: displayUnits(dust, Unit.Rad),
  };
  console.log(normalized);
}

function displayDogIlkInfo(dogInfo: DogIlkInfo) {
  const { clip, chop, hole, dirt } = dogInfo;
  const normalized = {
    clip: clip,
    chop: displayUnits(chop, Unit.Wad),
    hole: displayUnits(hole, Unit.Rad),
    dirt: displayUnits(dirt, Unit.Rad),
  };
  console.log(normalized);
}

function displayUrnInfo(
  urnAddress: string,
  ilkInfo: IlkInfo,
  urnInfo: UrnInfo
) {
  const { art, ink } = urnInfo;
  const { rate, spot } = ilkInfo;
  // 現在の負債(DAI)
  const debt = art.mul(rate).div(unitContants.WAD).div(unitContants.RAY)
  // 許容可能な負債(DAI)
  const maximumAllowedDebt = ink.mul(spot).div(unitContants.WAD).div(unitContants.RAY);
  // 許容可能な負債 - 現在の負債 = 精算までのDAI
  const untilCollaterization = maximumAllowedDebt.sub(debt);
  const normalized = {
    address: urnAddress,
    ink: displayUnits(ink, Unit.Wad),
    art: displayUnits(art, Unit.Wad),
    debt: debt.toString(),
    maximumAllowedDebt: maximumAllowedDebt.toString(),
    untilLiquidation: untilCollaterization.toString(),
  };
  console.log(normalized);
}
