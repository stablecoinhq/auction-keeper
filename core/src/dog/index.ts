import { BigNumber, constants, ethers } from "ethers";
import { DataSource } from "typeorm";
import {
  Dog as DogContract,
  Vat as VatContract,
  Vat__factory,
  Dog__factory,
} from "../types/ether-contracts";
import { displayUnits, constants as unitContants } from "../units";
import { parseEventsAndGroup, parseEventAndGroup } from "./event-parser";
import { VaultCollection } from "./vault-collection";
import { FunctionSigs, VOID_ADDRESS, SPOT } from "./constants";
import { BaseService } from "../common/base-service.class";
import { Wallet } from "../common/wallet";
import { DataStore } from "./data-store";
import { splitBlocks } from "../common/util";

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

/**
 * Compare two numbers, return the smaller one
 */
function min(a: BigNumber, b: BigNumber) {
  return a.lte(b) ? a : b;
}

/**
 * Information of a liquidatable vault
 */
export interface CanBark {
  /**
   * Currency type
   */
  ilk: string;
  /**
   * Address of a vault
   */
  address: string;
}

/**
 * Configuration
 */
export interface DogConfig {
  /**
   * Address of a dog contract
   */
  dogAddress: string;
  /**
   * Signer
   */
  signer: Wallet;
  /**
   * Block to start from
   */
  fromBlock: number;
  /**
   * Block to end
   */
  toBlock: number | "latest";

  dataSource: DataSource;
}

type NewType = {
  canBark: boolean;
  tab: BigNumber;
};

/**
 * Service that interacts with Dog/Vat contract
 * - Listens to events emitted from Vat contract
 * - Collect vault information that is being managed by Vat contract
 * - Start collateral auction if needed
 */
export class Dog extends BaseService {
  /**
   * Vat contract
   */
  readonly vatContract: Promise<VatContract>;

  /**
   * Dog contract
   */
  readonly dog: DogContract;

  /**
   * Block to start from
   */
  readonly fromBlock: number;

  /**
   * Block to end, "latest" if you want to fetch all the events up until now
   */
  readonly toBlock: number | "latest";
  /**
   * List of vaults grouped by ilk
   */
  // private vaultCollection: VaultCollection;

  private dataStore: DataStore;

  /**
   * Wallet address
   */
  readonly signerAddress: string;

  /**
   * Amount of DAI that's being put into collateral auction
   */
  readonly Dirt: Promise<BigNumber>;

  /**
   * Total amount of DAI that can be put into collateral auction
   */
  readonly Hole: Promise<BigNumber>;

  constructor(config: DogConfig) {
    const { dogAddress, signer, fromBlock, toBlock, dataSource } = config;
    super(signer, dogAddress);
    this.dataStore = new DataStore(dataSource);
    this.signerAddress = this.signer.address;
    this.fromBlock = fromBlock;
    this.toBlock = toBlock;
    // this.vaultCollection = new VaultCollection();
    this.dog = Dog__factory.connect(dogAddress, this.signer);
    this.vatContract = this.dog
      .vat()
      .then((v) => Vat__factory.connect(v, this.signer));
    this.Dirt = this.dog.Dirt();
    this.Hole = this.dog.Hole();
    this.addReconnect(() => this._lookupFromPastEvents());
  }

  /**
   * Return addresses of given ilks
   * @param ilks List of ilks
   * @returns
   */
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

  /**
   * Return contract address of a vat contract
   */
  async getVatAddress() {
    return (await this.vatContract).address;
  }

  /**
   * Start listening to Dog/Vat contract and handle them accordingly
   * @returns
   */
  async start(this: Dog): Promise<void> {
    const vat = await this.vatContract;
    const isVatLive = (await vat.live()).eq(1);
    const isDogLive = (await this.dog.live()).eq(1);

    if (!isVatLive) {
      this.logger.warn(`Vat ${vat.address} is not live`);
    }

    if (!isDogLive) {
      this.logger.warn(`Dog ${this.dog.address} is not live`);
    }

    await this._lookupFromPastEvents();
    await this._handleEvents();
  }

  /**
   * Collect vault information by looking into past events
   */
  private async _lookupFromPastEvents(): Promise<void> {
    this.logger.info("Fetching past events...");
    const latestBlock =
      this.toBlock === "latest"
        ? await this.signer.provider.getBlockNumber()
        : this.toBlock;
    const fromBlock =
      (await this.dataStore.getLatestBlock())?.number || this.fromBlock;
    const bunch = splitBlocks(fromBlock, latestBlock);

    let vaultCollections: VaultCollection[] = [];
    if (fromBlock <= latestBlock) {
      this.logger.info(
        `Fetching vault data from past events from: ${fromBlock}, to: ${latestBlock}`
      );
      vaultCollections = await Promise.all(
        bunch.map(async ({ from, to }) =>
          [FunctionSigs.fork, FunctionSigs.frob].reduce(async (prev, event) => {
            const prevs = await prev;
            const eventRawData = await this._getPastEvents(from, to, event);
            const urnsByIlk = parseEventsAndGroup(eventRawData, prevs);
            return urnsByIlk;
          }, Promise.resolve(new VaultCollection()))
        )
      );
      await this.dataStore.addBlock(latestBlock);
    }

    const allVaults = await this.dataStore.getAllVaults();
    const toCheck = VaultCollection.fromVaultCollections([
      ...vaultCollections,
      allVaults,
    ]);
    const barkResult = await this._checkVaultCollections(toCheck);
    await this.dataStore.addVaults(
      VaultCollection.fromVaultCollections(vaultCollections)
    );

    barkResult.forEach(({ ilk, address }) => {
      this.logger.info(`Barked at ilk: ${ilk}, address: ${address}`);
    });
  }

  /**
   * Handle current events
   */
  private async _handleEvents(): Promise<void> {
    if (this.toBlock !== "latest") {
      return;
    }
    const vat = await this.vatContract;
    this.logger.info("Start listening to ongoing events...");

    [
      FunctionSigs.fold,
      FunctionSigs.fork,
      FunctionSigs.frob,
      FunctionSigs.file,
    ].forEach((event) => {
      const eventFilter =
        vat.filters["LogNote(bytes4,bytes32,bytes32,bytes32,bytes)"](event);
      vat.on(eventFilter, (strEventTx) => {
        const eventTx = strEventTx as any as {
          topics: string[];
          data: string;
          transactionHash: string;
          blockNumber: number;
        };
        this._processEvent(eventTx, async () => {
          const [, ilk, arg2] = eventTx.topics;
          const eventRawData = eventTx.data;
          await this.dataStore.addBlock(eventTx.blockNumber);

          switch (event) {
            case FunctionSigs.fold: {
              // Check vault that are affected by fold (Change of stability fee rate)
              this.logger.debug(`Fee rate of ${ilk} changed, checking vaults`);
              // eslint-disable-next-line no-case-declarations
              const targets = await this.dataStore.getByIlk(ilk);
              await this._checkVaultCollections(targets);
              break;
            }
            case FunctionSigs.file: {
              // Check vaults that are affected by spot (Change of token price)
              if (arg2 === SPOT) {
                this.logger.debug(
                  `Safey margin of ${ilk} changed, checking vaults`
                );
                const targets = await this.dataStore.getByIlk(ilk);
                await this._checkVaultCollections(targets);
              }
              break;
            }
            default: {
              const vaultCollection = parseEventAndGroup(eventRawData);
              await this.dataStore.addVaults(vaultCollection);
              await this._checkVaultCollections(vaultCollection);
              break;
            }
          }
        });
      });
    });
  }

  /**
   * Check all the vaults
   * @param vaultCollections Collection of vaults
   * @returns
   */
  private async _checkVaultCollections(
    vaultCollections: VaultCollection
  ): Promise<CanBark[]> {
    const result = await Promise.all(
      Array.from(vaultCollections.entries()).map(
        async ([ilk, urnAddresses]) => {
          const addrs: string[] = Array.from(urnAddresses);
          const unsafeVaults: CanBark[] = await this._checkVaults(ilk, addrs);
          const barkResult = unsafeVaults.reduce(async (prev, unsafeVault) => {
            const prevResult = await prev;
            const { address } = unsafeVault;
            const res = await this._startCollateralAuction(ilk, address);
            if (res) {
              this.logger.info("Bark success");
              return [...prevResult, unsafeVault];
            }
            this.logger.info("Bark was not successful");
            return prevResult;
          }, Promise.resolve([]) as Promise<CanBark[]>);
          return barkResult;
        }
      )
    );

    return result.flat();
  }

  /**
   * Start collateral auction
   * @param ilk ilk
   * @param address vault address
   * @returns
   */
  private async _startCollateralAuction(
    ilk: string,
    address: string
  ): Promise<ethers.ContractTransaction | undefined> {
    return this._submitTx(
      this.dog.bark(ilk, address, this.signer.address),
      `Barking at ilk: ${ilk}, address: ${address}`
    );
  }

  /**
   * Check vaults of given ilk
   * @param ilk
   * @param urnAddresses
   * @returns
   */
  private async _checkVaults(
    this: Dog,
    ilk: string,
    urnAddresses: string[]
  ): Promise<CanBark[]> {
    const vat = await this.vatContract;
    const Hole = await this.Hole;
    const Dirt = await this.Dirt;
    const vatIlkInfo = await vat.ilks(ilk);
    const dogIlk = await this.dog.ilks(ilk);
    const { clip, hole, dirt } = dogIlk;
    // Do nothing when clip is void address or when hole is 0
    if (clip === VOID_ADDRESS || hole.eq(BigNumber.from(0))) {
      return [];
    }

    const isLiquidationLimitSafe = Hole.gt(Dirt) && dogIlk.hole.gt(dogIlk.dirt);
    // Auction has exceeded it's limit
    if (!isLiquidationLimitSafe) {
      this.logger.debug(`Auction has reached it's capacity for ${ilk}`);
      return [];
    }

    const base = {
      Dirt,
      dirt,
      urns: [] as string[],
    };

    const barks = await urnAddresses.reduce(async (prev, urnAddress) => {
      const acc = await prev;
      const urnInfo = await vat.urns(ilk, urnAddress);
      this._displayUrnInfo(ilk, urnAddress, vatIlkInfo, urnInfo);
      const { canBark, tab } = Dog.canBark(
        Hole,
        acc.Dirt,
        acc.dirt,
        urnInfo,
        vatIlkInfo,
        dogIlk
      );
      const accDirt = acc.Dirt.add(tab);
      const accdirt = acc.dirt.add(tab);
      const ls = canBark ? [...acc.urns, urnAddress] : acc.urns;
      return {
        Dirt: accDirt,
        dirt: accdirt,
        urns: ls,
      };
    }, Promise.resolve(base));

    return barks.urns.map((address) => ({ ilk, address }));
  }

  // Retrieve events in the specified block range.
  /**
   * Fetch
   * @param from
   * @param to
   * @param functionSig
   * @returns
   */
  private async _getPastEvents(
    from: number,
    to: number | "latest",
    functionSig: string
  ): Promise<string[]> {
    const vat = await this.vatContract;
    const eventFilter =
      vat.filters["LogNote(bytes4,bytes32,bytes32,bytes32,bytes)"](functionSig);
    const events = await vat.queryFilter(eventFilter, from, to);
    const eventRawData = events.map((logNoteEvent) => logNoteEvent.data);
    return eventRawData;
  }

  /**
   * Check if given vault can be liquidated
   * @returns
   */
  static canBark(
    Hole: BigNumber,
    Dirt: BigNumber,
    dirt: BigNumber,
    urnInfo: UrnInfo,
    vatIlkInfo: VatIlkInfo,
    dogIlk: DogIlkInfo
  ): NewType {
    const { ink, art } = urnInfo;
    const { spot, rate, dust } = vatIlkInfo;
    const { hole, chop } = dogIlk;
    // Do we have room to start auction?
    const room = min(Hole.sub(Dirt), hole.sub(dirt));
    const liquidationLimitHit = Hole.lte(Dirt) || hole.lte(dirt);
    // Normalize room
    const normalizedRoom = room.mul(unitContants.WAD).div(rate).div(chop);
    const dart = min(art, normalizedRoom);
    // Vault is dusty
    const isDust =
      art.gt(dart) &&
      !rate.mul(art.sub(dart)).lt(dust) &&
      !dart.mul(rate).gte(dust);
    // Check that
    // - Spot(Maximum number of DAI per currency that can be issued) is non-zero
    // - Ink (quantity of currency collateralized) * Spot is less than debt (art * rate).
    const isUnsafeVault = spot.gt(0) && ink.mul(spot).lt(art.mul(rate));
    // Value dart, dink is valid
    const isDartUnsafe = dart.gt(constants.MaxUint256);
    const dink = art.eq(0) ? BigNumber.from(0) : ink.mul(dart).div(art);
    // dink is less than zero
    const isDinkBelowZero = dink.lte(0);
    const isDinkUnsafe = dink.gt(constants.MaxUint256);
    const canBark =
      liquidationLimitHit ||
      isDartUnsafe ||
      isDinkUnsafe ||
      isDinkBelowZero ||
      isDust
        ? false
        : isUnsafeVault;

    const tab = canBark
      ? dart.mul(rate).mul(chop).div(unitContants.WAD)
      : BigNumber.from(0);
    return {
      canBark,
      tab,
    };
  }

  private _displayUrnInfo(
    ilk: string,
    urnAddress: string,
    ilkInfo: IlkInfo,
    urnInfo: UrnInfo
  ) {
    const { art, ink } = urnInfo;
    const { rate, spot } = ilkInfo;
    const debt = art.mul(rate);
    const maximumAllowedDebt = ink.mul(spot);
    const untilLiquidation = maximumAllowedDebt.sub(debt);
    const normalized = {
      ilk,
      address: urnAddress,
      spot: displayUnits(spot, unitContants.RAY),
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
    this.logger.info(JSON.stringify(normalized, null, 1));
  }
}
