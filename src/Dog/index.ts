import {
  Dog as DogContract,
  Vat as VatContract,
  Vat__factory,
  Dog__factory,
} from "../../types/ethers-contracts/index";
import { BigNumber, constants } from "ethers";
import { displayUnits, constants as unitContants } from "../units";
import { ethers } from "ethers";
import {
  parseEventsAndGroup,
  parseEventAndGroup,
  UrnsByIlk,
  groupUrns,
} from "./event-parser";
import { Events, VOID_ADDRESS, SPOT } from "./constants";

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
  const debt = art.mul(rate);
  // 許容可能な負債(DAI)
  const maximumAllowedDebt = ink.mul(spot);

  // 許容可能な負債 - 現在の負債 = 精算までのDAI
  const untilLiquidation = maximumAllowedDebt.sub(debt);
  const normalized = {
    ilk: ilk,
    address: urnAddress,
    ink: displayUnits(ink, unitContants.WAD),
    art: displayUnits(art, unitContants.WAD),
    debt: displayUnits(debt, unitContants.WAD.mul(unitContants.RAY)),
    maximumAllowedDebt: displayUnits(
      maximumAllowedDebt,
      unitContants.WAD.mul(unitContants.RAY)
    ),
    untilLiquidation: displayUnits(
      untilLiquidation,
      unitContants.WAD.mul(unitContants.RAY)
    ),
  };
  console.log(normalized);
}

// ブロックを一定数分割する
// 過去のイベントをまとめて取得しようとすると失敗するため
function splitBlocks(
  from: number,
  latest: number
): { from: number; to: number }[] {
  const SPLIT_BY = 10000;
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
  fromBlock: number;
  ilks: string[];
  toBlock: number | "latest";
}

export default class Dog {
  readonly vatContract: Promise<VatContract>;
  readonly dog: DogContract;
  readonly fromBlock: number;
  readonly ilks: string[];
  readonly toBlock: number | "latest";
  private readonly signer: ethers.Wallet;
  private urnByIlks: UrnsByIlk;
  readonly signerAddress: string;
  readonly Dirt: Promise<BigNumber>;
  readonly Hole: Promise<BigNumber>;

  constructor(config: DogConfig) {
    const { dogAddress, signer, fromBlock, toBlock, ilks } = config;
    this.ilks = ilks.map((v) => {
      return v.toLowerCase();
    });
    this.signer = signer;
    this.signerAddress = this.signer.address;
    this.fromBlock = fromBlock;
    this.toBlock = toBlock;
    this.urnByIlks = new Map();
    this.dog = Dog__factory.connect(dogAddress, this.signer);
    this.vatContract = this.dog
      .vat()
      .then((v) => Vat__factory.connect(v, this.signer));
    this.Dirt = this.dog.Dirt();
    this.Hole = this.dog.Hole();
  }

  // Clipアドレス一覧を返却
  async getClipAddresses(
    ilks: string[]
  ): Promise<{ ilk: string; address: string }[]> {
    return Promise.all(
      ilks.map(async (ilk) => {
        const { clip } = await this.dog.ilks(ilk);
        return {
          ilk,
          address: clip,
        };
      })
    );
  }
  async getVatAddress() {
    return (await this.vatContract).address;
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

    console.log("Fetching past events...");
    const latestBlock =
      this.toBlock === "latest"
        ? await this.signer.provider.getBlockNumber()
        : this.toBlock;
    const bunch = splitBlocks(this.fromBlock, latestBlock);

    const urns = await Promise.all(
      bunch.map(async ({ from, to }) => {
        console.log(
          `Fetching events from block ${from.toLocaleString()} to ${to.toLocaleString()}`
        );
        return [Events.fork, Events.frob].reduce(async (prev, currentEvent) => {
          const prevs = await prev;
          const eventRawData = await this.getPastEvents(from, to, currentEvent);
          const urnsByIlk = parseEventsAndGroup(eventRawData, prevs);
          return urnsByIlk;
        }, Promise.resolve(new Map()) as Promise<UrnsByIlk>);
      })
    );

    this.urnByIlks = groupUrns(urns);

    const barkResult = await Promise.all(
      Array.from(this.urnByIlks.entries()).map(async ([ilk, urnAddresses]) => {
        const addrs: string[] = Array.from(urnAddresses);
        const unsafeVaults: CanBark[] = await this._checkUrns(ilk, addrs);
        const barkResult = unsafeVaults.reduce(async (prev, unsafeVault) => {
          const result = await prev;
          const { ilk, address } = unsafeVault;
          const barkResult = await this._bark(ilk, address);
          if (barkResult) {
            console.log("Bark success");
            return [...result, unsafeVault];
          } else {
            console.log("Bark was not successful");
            return result;
          }
        }, Promise.resolve([]) as Promise<CanBark[]>);
        return barkResult;
      })
    );

    barkResult.flat().forEach(({ ilk, address }) => {
      console.log(`Barked at ilk: ${ilk}, address: ${address}`);
    });

    if (this.toBlock !== "latest") {
      return;
    }

    console.log("Start listening to ongoing events...");

    [Events.fold, Events.fork, Events.frob, Events.file].map(async (event) => {
      const eventFilter =
        vat.filters["LogNote(bytes4,bytes32,bytes32,bytes32,bytes)"](event);
      vat.on(eventFilter, async (...args) => {
        const [rawEvent] = args;
        const parsedTopics = rawEvent as any as { topics: string[] };
        const [, ilk, arg2] = parsedTopics.topics;
        const eventRawData = rawEvent as any as { data: string };

        switch (event) {
          case Events.fold:
            // foldによって価格が変動した場合には調べる
            console.log(`Price of ${ilk} changed, checking vaults`);
            const targets = this.urnByIlks.get(ilk) || new Set();
            this._checkUrnsByIlk(new Map().set(ilk, targets));
            break;
          case Events.file:
            // spotによって担保率が変動した際には、変動した通貨に関するVaultを調べる
            if (arg2 === SPOT) {
              console.log(`Safey margin of ${ilk} changed, checking vaults`);
              const targets = this.urnByIlks.get(ilk) || new Set();
              this._checkUrnsByIlk(new Map().set(ilk, targets));
            }
            break;
          default:
            const urnsByIlk = parseEventAndGroup(eventRawData.data);
            this.urnByIlks = groupUrns([this.urnByIlks, urnsByIlk]);
            this._checkUrnsByIlk(urnsByIlk);
            break;
        }
      });
    });
  }

  private async _checkUrnsByIlk(urnsByIlk: UrnsByIlk) {
    for (const [ilk, urnAddresses] of urnsByIlk.entries()) {
      const addrs = Array.from(urnAddresses);
      const unsafeVaults = await this._checkUrns(ilk, addrs);
      console.log("Unsafe vaults", unsafeVaults);
      for (const { ilk, address } of unsafeVaults) {
        await this._bark(ilk, address);
      }
    }
  }

  private async _bark(
    ilk: string,
    address: string
  ): Promise<ethers.ContractTransaction | undefined> {
    console.log(`Barking at ilk: ${ilk}, address: ${address}`);
    return this.dog.bark(ilk, address, this.signer.address).catch((e) => {
      console.log(`Barking failed: ${e.error.reason}`);
      return undefined;
    });
  }

  private async _checkUrns(
    this: Dog,
    ilk: string,
    urnAddresses: string[]
  ): Promise<CanBark[]> {
    const vat = await this.vatContract;
    const Hole = await this.Hole;
    const Dirt = await this.Dirt;
    const vatIlkInfo = await vat.ilks(ilk);
    const dogIlk = await this.dog.ilks(ilk);
    const { clip, hole } = dogIlk;
    // Clipがないなら何もしない
    // holeが0なら何もしない
    if (clip === VOID_ADDRESS || hole.eq(BigNumber.from(0))) {
      return [];
    }

    const isLiquidationLimitSafe = Hole.gt(Dirt) && dogIlk.hole.gt(dogIlk.dirt);
    // オークションがDAI上限に達している
    if (!isLiquidationLimitSafe) {
      console.log(`Auction has reached it's capacity for ${ilk}`);
      return [];
    }

    const barks = await Promise.all(
      urnAddresses.map(async (urnAddress) => {
        const urnInfo = await vat.urns(ilk, urnAddress);
        displayUrnInfo(ilk, urnAddress, vatIlkInfo, urnInfo);
        return {
          address: urnAddress,
          canBark: Dog.canBark(Hole, Dirt, urnInfo, vatIlkInfo, dogIlk),
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
    const normalizedRoom = room.mul(unitContants.WAD).div(rate).div(chop);
    const dart = art.lte(normalizedRoom) ? art : normalizedRoom;
    // 精算されるVaultの金額が少額
    const isDust = dart.mul(rate).lt(dust);
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
