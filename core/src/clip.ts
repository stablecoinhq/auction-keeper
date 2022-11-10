import { BigNumber, BigNumberish } from "ethers";
import { BaseService } from "./common/base-service.class";
import {
  Clip as ClipContract,
  Clip__factory,
  Vat__factory,
  Vat as VatContract,
} from "./types/ether-contracts";
import { Wallet } from "./common/wallet";

/**
 * Configuration for clip
 */
export interface ClipConfig {
  clipAddress: string;
  vatAddress: string;
  ilk: string;
  signer: Wallet;
}

/**
 * Auction information
 */
export interface CollateralAuctionInfo {
  /**
   * Auction id
   */
  auctionId: BigNumber;
  /**
   * Dai to raise
   */
  tab: BigNumber;
  /**
   * Collateral to sell [wad]
   */
  lot: BigNumber;
  /**
   * Address of an liquidated vault
   */
  usr: string;
  /**
   * Auction start time
   */
  tic: BigNumber;
  /**
   * Starting price
   */
  top: BigNumber;
  /**
   * Current bidding price
   */
  auctionPrice: BigNumber;
  /**
   * Did auction end
   */
  ended: boolean;
}

/**
 * - Participate collateral auction
 * - Each token has is own Clip contract so we need to instantiate them respectively
 *
 * If you want to customise the bidding strategy, extend this class and override the bid function.
 *
 *```
 * class MyClip extends Clip {
 *   protected override async bid(this: Clip, auctionInfo: AuctionInfo, availableDai: BigNumber):
 *     Promise<ContractTransaction | undefined>
 *       { // override with your own bidding strategy }
 * }
 *```
 */
export class Clip extends BaseService {
  readonly clip: ClipContract;

  readonly vat: VatContract;

  readonly ilk: string;

  constructor(args: ClipConfig) {
    const { clipAddress, vatAddress, ilk, signer } = args;
    super(signer, clipAddress);
    this.ilk = ilk;
    this.clip = Clip__factory.connect(clipAddress, this.signer);
    this.vat = Vat__factory.connect(vatAddress, this.signer);
    this.addReconnect(() => this._participate());
  }

  async hope(): Promise<undefined> {
    const allowed = await this.vat.can(this.signer.address, this.clip.address);
    if (allowed.eq(1)) {
      return;
    }
    await this.vat.hope(this.clip.address);
  }

  async start() {
    await this._participate();
    const kickEventFilter =
      this.clip.filters[
        "Kick(uint256,uint256,uint256,uint256,address,address,uint256)"
      ]();
    this.clip.on(kickEventFilter, (...args) => {
      const [auctionId, , , , , , , eventTx] = args;
      this._processEvent(eventTx, async () => {
        this.logger.info(`Auction id: ${auctionId.toString()} started.`);
        const availableDai = await this.vat.dai(this.signer.address);
        await this._paricipateAuction(auctionId, availableDai);
      });
    });
    const takeEventFilter =
      this.clip.filters[
        "Take(uint256,uint256,uint256,uint256,uint256,uint256,address)"
      ]();
    this.clip.on(takeEventFilter, (...args) => {
      const [id, , , , , , , eventTx] = args;
      this._processEvent(eventTx, async () => {
        const gem = await this.vat.gem(this.ilk, this.signer.address);
        this.logger.info(`Auction id ${id.toString()}, gem purchased: ${gem}`);
      });
    });
  }

  private async _participate() {
    const ilk = await this.clip.ilk();
    const count = await this.clip.count();
    if (count.eq(0)) {
      this.logger.info(`No auctions available for ${ilk}`);
    } else {
      const activeAuctionIds = await this.clip.list();
      if (activeAuctionIds) {
        const availableDai = await this.vat.dai(this.signer.address);
        await activeAuctionIds.reduce(async (prev, curr) => {
          const currenDai = await prev;
          if (currenDai.eq(0)) {
            return currenDai;
          }
          const rest = await this._paricipateAuction(curr, currenDai);
          return rest;
        }, Promise.resolve(availableDai));
      }
    }
  }

  private async _paricipateAuction(
    auctionId: BigNumber,
    availableDai: BigNumber
  ) {
    const { tic, top, tab, lot, usr } = await this.clip.sales(auctionId);
    const { needsRedo, price } = await this.clip.getStatus(auctionId);
    const ended = lot.eq(0) || needsRedo;
    const auctionInfo: CollateralAuctionInfo = {
      auctionId,
      tic,
      top,
      tab,
      lot,
      usr,
      auctionPrice: price,
      ended,
    };
    this.displayAuctionInfo(auctionInfo);
    const remaining = await this.bid(auctionInfo, availableDai);
    return remaining;
  }

  /**
   * Bid on collateral auction. This function should return the remaining DAI balance in order to
   * participate in multiple auctions.
   * @param auctionInfo Auction info
   * @param availableDai Available dai
   * @returns
   */
  protected async bid(
    this: Clip,
    auctionInfo: CollateralAuctionInfo,
    availableDai: BigNumber
  ): Promise<BigNumber> {
    const { auctionId, lot, auctionPrice, ended } = auctionInfo;
    if (ended) {
      this.logger.info(`Auction ${auctionId} is finished`);
      return availableDai;
    }
    const amountWeCanAfford = availableDai.div(auctionPrice);
    if (availableDai.lte(0) || amountWeCanAfford.lte(0)) {
      this.logger.info(
        `Address ${this.signer.address} have no available dai to participate in auction: ${availableDai}`
      );
      return availableDai;
    }
    const amountToPurchase = amountWeCanAfford.lt(lot)
      ? amountWeCanAfford
      : lot;
    return this.submitBid(
      auctionId,
      availableDai,
      amountToPurchase,
      auctionPrice,
      this.signer.address
    );
  }

  async submitBid(
    id: BigNumberish,
    availableDai: BigNumber,
    amountToPurchase: BigNumber,
    auctionPrice: BigNumber,
    receiver: string
  ) {
    await this._submitTx(
      this.clip.take(id, amountToPurchase, auctionPrice, receiver, []),
      `Bidding on collateral auction ${id}, with price ${auctionPrice}`
    );
    return availableDai.sub(amountToPurchase.mul(auctionPrice));
  }

  displayAuctionInfo(auctionInfo: CollateralAuctionInfo): void {
    const {
      auctionId,
      tab,
      lot,
      usr,
      tic,
      top,
      auctionPrice: price,
      ended: needsRedo,
    } = auctionInfo;
    const normalised = {
      auctionId: auctionId.toString(),
      vault: usr,
      daiToRaise: tab.toString(),
      amountBeingAuctioned: lot.toString(),
      startingPrice: top.toString(),
      currentPrice: price.toString(),
      startedAt: tic.eq(0) ? 0 : new Date(tic.toNumber() * 10 ** 3),
      ended: lot.eq(0) || needsRedo,
    };
    this.logger.info(normalised);
  }
}
