import {
  Dog as DogContract,
  Vat as VatContract,
  Vat__factory,
  Dog__factory,
} from "../../types/ethers-contracts/index";
import { BigNumber, constants } from "ethers";
import { displayUnits, Unit, constants as unitConstants } from "../units";
import { UrnsByIlk } from "./event-parser";
import { ethers } from "ethers";
import { parseEventsAndGroup, parseEventAndGroup } from "./event-parser";

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

function displayUrnInfo(urnAddress: string, urnInfo: UrnInfo) {
  const { art, ink } = urnInfo;
  const normalized = {
    address: urnAddress,
    ink: displayUnits(ink, Unit.Wad),
    art: displayUnits(art, Unit.Wad),
  };
  console.log(normalized);
}

export interface CanBark {
  ilk: string;
  address: string;
}

export interface DogConfig {
  vatAddress: string;
  dogAddress: string;
  rcpHost: string;
  mnemonic: string;
}

export default class Dog {
  readonly vat: VatContract;
  readonly dog: DogContract;
  private signer: ethers.Wallet;
  Dirt: BigNumber = BigNumber.from(0);
  Hole: BigNumber = BigNumber.from(0);

  constructor(config: DogConfig) {
    const { vatAddress, dogAddress, rcpHost, mnemonic } = config;
    this.signer = ethers.Wallet.fromMnemonic(mnemonic);
    const provider = new ethers.providers.JsonRpcProvider(rcpHost);
    this.signer.connect(provider);
    this.vat = Vat__factory.connect(vatAddress, provider);
    this.dog = Dog__factory.connect(dogAddress, provider);
  }

  async start(): Promise<void> {
    this.Dirt = await this.dog.Hole();
    this.Hole = await this.dog.Dirt();
    const isVatLive = (await this.vat.live()).eq(1);
    const isDogLive = (await this.dog.live()).eq(1);

    if (!isVatLive) {
      return console.log(`Vat ${this.vat.address} is not live`);
    }

    if (!isDogLive) {
      return console.log(`Dog ${this.dog.address} is not live`);
    }
    const Hole = await this.dog.Hole();
    const Dirt = await this.dog.Dirt();
    console.log(`dog.Hole, ${displayUnits(Hole, Unit.Rad)}`);
    console.log(`dog.Dirt, ${displayUnits(Dirt, Unit.Rad)}`);
    console.log("Fetching past events...");
    const eventsFilter =
      this.vat.filters["LogNote(bytes4,bytes32,bytes32,bytes32,bytes)"]();
    const events = await this.vat.queryFilter(eventsFilter, 7287536, "latest");
    const eventRawData = events.map((logNoteEvent) => {
      return logNoteEvent.data;
    });
    const urnsByIlk = parseEventsAndGroup(eventRawData);
    for (const u of urnsByIlk) {
      const unsafeVaults = await this._checkUrns(u);
      for (const { ilk, address } of unsafeVaults) {
        console.log(`Barking at: ${ilk}, ${address}`);
        await this.dog.bark(ilk, address, this.signer.address);
      }
    }

    console.log("Start listening to ongoing events...");
    this.vat.on(eventsFilter, async (...args) => {
      const [, , , , , logNoteEvent] = args;
      const urnsByIlk = parseEventAndGroup(logNoteEvent.address);
      for (const u of urnsByIlk) {
        const unsafeVaults = await this._checkUrns(u);
        console.log("Unsafe vaults", unsafeVaults);
        for (const { ilk, address } of unsafeVaults) {
          console.log(`Barking at: ${ilk}, ${address}`);
          await this.dog.bark(ilk, address, this.signer.address);
        }
      }
    });
  }

  private async _checkUrns(urnsByIlk: UrnsByIlk): Promise<CanBark[]> {
    const { ilk, urnAddresses } = urnsByIlk;
    const vatIlkInfo = await this.vat.ilks(ilk.value);
    const dogIlk = await this.dog.ilks(ilk.value);
    displayVatIlkInfo(vatIlkInfo);
    displayDogIlkInfo(dogIlk);

    const isLiquidationLimitSafe =
      this.Hole.gt(this.Dirt) && dogIlk.hole.gt(dogIlk.dirt);
    // オークションがDAI上限に達している
    if (!isLiquidationLimitSafe) {
      return [];
    }

    const barks = await Promise.all(
      urnAddresses.map(async (urnAddress) => {
        const urnInfo = await this.vat.urns(ilk.value, urnAddress.value);
        displayUrnInfo(urnAddress.value, urnInfo);
        return {
          address: urnAddress.value,
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
        return { ilk: ilk.value, address: v.address };
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
    const normalizedRoom = room.div(unitConstants.WAD).div(rate).div(chop);
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
