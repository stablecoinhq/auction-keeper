import {
  Dog as DogContract,
  Vat as VatContract,
  Vat__factory,
  Dog__factory,
} from "../../types/ethers-contracts/index";
import { BigNumber, constants } from "ethers";
import { displayUnits, Unit, constants as unitContants } from "../units";
import { ethers } from "ethers";
import {
  parseEventsAndGroup,
  parseEventAndGroup,
  UrnsByIlk,
  groupUrns,
} from "./event-parser";

const fork =
  "0x870c616d00000000000000000000000000000000000000000000000000000000";
const frob =
  "0x7608870300000000000000000000000000000000000000000000000000000000";

const functionSignatures = [fork, frob];

const voidAddress = "0x0000000000000000000000000000000000000000";

// Split
const SPLIT_BY = 10000;

// ブロックを一定数分割する
// 過去のイベントをまとめて取得しようとすると失敗するため
function splitBlocks(
  from: number,
  latest: number
): { from: number; to: number }[] {
  let ls: { from: number; to: number }[] = [];
  for (let i = from; i <= latest; i += SPLIT_BY) {
    const from = i;
    const to = i + SPLIT_BY >= latest ? latest : i + SPLIT_BY;
    ls.push({ from, to });
  }
  return ls;
}

export interface CanBark {
  ilk: string;
  address: string;
}

export interface DogConfig {
  dogAddress: string;
  signer: ethers.Wallet;
  provider: ethers.providers.JsonRpcProvider;
  fromBlock: number;
  toBlock: number | "latest";
  addresses: string[];
}

export default class Dog {
  readonly vatContract: Promise<VatContract>;
  readonly dog: DogContract;
  readonly fromBlock: number;
  readonly toBlock: number | "latest";
  readonly addresses: string[];
  private signer: ethers.Wallet;
  signerAddress: string;
  Dirt: BigNumber = BigNumber.from(0);
  Hole: BigNumber = BigNumber.from(0);

  constructor(config: DogConfig) {
    const { dogAddress, signer, fromBlock, toBlock, addresses } = config;
    this.addresses = addresses;
    this.signer = signer;
    this.signerAddress = this.signer.address;
    this.fromBlock = fromBlock;
    this.toBlock = toBlock;
    this.dog = Dog__factory.connect(dogAddress, this.signer);
    this.vatContract = this.dog
      .vat()
      .then((v) => Vat__factory.connect(v, this.signer));
  }

  async start(this: Dog): Promise<void> {
    const vat = await this.vatContract;
    const isVatLive = (await vat.live()).eq(1);
    const isDogLive = (await this.dog.live()).eq(1);

    if (!isVatLive) {
      return console.log(`Vat ${vat.address} is not live`);
    }

    if (!isDogLive) {
      return console.log(`Dog ${this.dog.address} is not live`);
    }

    this.Dirt = await this.dog.Dirt();
    this.Hole = await this.dog.Hole();
    console.log("Fetching past events...");
    const latestBlock =
      this.toBlock === "latest"
        ? await this.signer.provider.getBlockNumber()
        : this.toBlock;
    const bunch = splitBlocks(this.fromBlock, latestBlock);
    console.log(bunch);

    const urns = await Promise.all(
      bunch.map(async ({ from, to }) => {
        return functionSignatures.reduce(async (prev, currentEvent) => {
          const prevs = await prev;
          const eventRawData = await this.getPastEvents(from, to, currentEvent);
          const urnsByIlk = parseEventsAndGroup(eventRawData, prevs);
          return urnsByIlk;
        }, Promise.resolve(new Map()) as Promise<UrnsByIlk>);
      })
    );

    const urnsByIlk = groupUrns(urns);

    console.log(urnsByIlk);

    const barkResult = await Promise.all(
      Array.from(urnsByIlk.entries()).map(async ([ilk, urnAddresses]) => {
        const addrs = Array.from(urnAddresses);
        const unsafeVaults = await this._checkUrns(ilk, addrs);
        const barkResult = unsafeVaults.reduce(async (prev, unsafeVault) => {
          const result = await prev;
          const { ilk, address } = unsafeVault;
          console.log(`Barking at: ${ilk}, ${address}`);
          await this.dog.bark(ilk, address, this.signer.address);
          return [...result, unsafeVault];
        }, Promise.resolve([]) as Promise<CanBark[]>);
        return barkResult;
      })
    );

    const r = barkResult.flat();

    r.forEach((v) => {
      console.log(v);
    });

    if (this.toBlock === "latest") {
      console.log("Start listening to ongoing events...");
      await Promise.all(
        functionSignatures.map(async (sig) => {
          const eventFilter =
            vat.filters["LogNote(bytes4,bytes32,bytes32,bytes32,bytes)"](sig);
          vat.on(eventFilter, async (...args) => {
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
        })
      );
    }
  }

  private async _checkUrns(
    this: Dog,
    ilk: string,
    urnAddresses: string[]
  ): Promise<CanBark[]> {
    const vat = await this.vatContract;
    const vatIlkInfo = await vat.ilks(ilk);
    const dogIlk = await this.dog.ilks(ilk);
    const { clip, hole } = dogIlk;
    // Clipがないなら何もしない
    // holeが0なら何もしない
    if (clip === voidAddress || hole.eq(BigNumber.from(0))) {
      return [];
    }

    const isLiquidationLimitSafe =
      this.Hole.gt(this.Dirt) && dogIlk.hole.gt(dogIlk.dirt);
    // オークションがDAI上限に達している
    if (!isLiquidationLimitSafe) {
      console.log(`Auction has reached it's capacity for ${ilk}`);
      return [];
    }

    const barks = await Promise.all(
      urnAddresses.map(async (urnAddress) => {
        if (!this.addresses.find((v) => v === urnAddress)) {
          return {
            address: urnAddress,
            canBark: false,
          };
        }
        const urnInfo = await vat.urns(ilk, urnAddress);
        displayUrnInfo(ilk, urnAddress, vatIlkInfo, urnInfo);
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

  private async getPastEvents(
    from: number,
    to: number | "latest",
    currentEvent: string
  ) {
    const vat = await this.vatContract;
    const eventFilter =
      vat.filters["LogNote(bytes4,bytes32,bytes32,bytes32,bytes)"](
        currentEvent
      );
    const events = await vat.queryFilter(eventFilter, from, to);
    const eventRawData = events.map((logNoteEvent) => {
      return logNoteEvent.data;
    });
    return eventRawData;
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
    const isDust = dart.mul(rate).gte(dust);
    // Spot(通貨毎のDAI最大発行可能枚数)が0以下
    // ink(担保されている通貨数量) * Spotが負債(art * rate)より小さければ安全
    const isUnsafeVault = spot.gt(0) && ink.mul(spot).lt(art.mul(rate));
    // dart, dinkがオーバーフローしていない
    const isDartUnsafe = dart.gt(constants.MaxUint256);
    const dink = art.eq(0) ? BigNumber.from(0) : ink.mul(dart).div(art);
    // dinkが0より小さい
    const isDinkBelowZero = dink.lte(0);
    const isDinkUnsafe = dink.gt(constants.MaxUint256);
    if (isDartUnsafe || isDinkUnsafe || isDinkBelowZero || isDust) {
      return false;
    } else {
      return isUnsafeVault;
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

function displayUrnInfo(
  ilk: string,
  urnAddress: string,
  ilkInfo: IlkInfo,
  urnInfo: UrnInfo
) {
  const { art, ink } = urnInfo;
  const { rate, spot } = ilkInfo;
  // 現在の負債(DAI)
  const debt = art.mul(rate).div(unitContants.WAD).div(unitContants.RAY);
  // 許容可能な負債(DAI)
  const maximumAllowedDebt = ink
    .mul(spot)
    .div(unitContants.WAD)
    .div(unitContants.RAY);
  // 許容可能な負債 - 現在の負債 = 精算までのDAI
  const untilCollaterization = maximumAllowedDebt.sub(debt);
  const normalized = {
    ilk: ilk,
    address: urnAddress,
    ink: displayUnits(ink, Unit.Wad),
    art: displayUnits(art, Unit.Wad),
    debt: debt.toString(),
    maximumAllowedDebt: maximumAllowedDebt.toString(),
    untilLiquidation: untilCollaterization.toString(),
  };
  console.log(normalized);
}
