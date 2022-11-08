import { BigNumber, ContractTransaction } from "ethers";
import {
  Vat,
  DS_Token,
  Flapper__factory,
  Flopper__factory,
  DS_Token__factory,
  Vat__factory,
} from "../types/ether-contracts";
import { AuctionContract } from "./auction-contract";
import { EMPTY_ADDRESS, ONE, BEG, FunctionSig } from "./constants";
import { BaseService } from "../common/base-service.class";
import { Wallet } from "../common/wallet";

// https://docs.makerdao.com/keepers/auction-keepers/auction-keeper-bot-setup-guide

/**
 * Auction info
 */
export interface AuctionInfo {
  /**
   * Auction id
   */
  id: BigNumber;
  /**
   * Auction type(Debt/Surplus)
   */
  auctionType: AuctionType;
  /**
   * Current highest bid
   */
  bid: BigNumber;
  /**
   * Amount being currently auctioned
   */
  lot: BigNumber;
  /**
   * Ethereum address of the current highest bidder
   */
  guy: string;
  /**
   * Current price being tendered
   */
  price: BigNumber;
  /**
   * Time when the current bid will expire (0 when no one is bidding)
   */
  tic: number | Date;
  /**
   * Time when the entire auction will expire (end is set to 0 is the auction is no longer live)
   */
  end: Date;
}

/**
 * Auction type
 */
export enum AuctionType {
  /**
   * Flopper/Debt auction
   */
  Debt = "debt",
  /**
   * Surplus: surplus auction(Flapper)
   */
  Surplus = "surplus",
}

export interface AuctionConfig {
  auctionType: "debt" | "surplus";
  auctionAddress: string;
  signer: Wallet;
}

/**
 * Auction class. Main roles are
 * - Acquire list of ongoing auctions
 * - Bid on surplus/debt auction
 * - End auction
 * - Listen to events emitted from auction contract and take actions accordingly.
 *
 * If you want to customise the bidding method, extend this class and override the bid function.
 *
 *```
 * class MyAuction extends Auction {
 *   protected override async bid(this: Auction, auctionInfo: AuctionInfo):
 *     Promise<ContractTransaction | undefined>
 *       { // override with your own bidding strategy }
 * }
 *```
 * This service cannot start an auction (That's up to Vow)
 */
export class Auction extends BaseService {
  readonly auctionType: AuctionType;

  readonly vatContract: Promise<Vat>;

  readonly contract: AuctionContract;

  readonly DS_Token: Promise<DS_Token>;

  readonly auctionSchedulers: Map<BigNumber, NodeJS.Timeout> = new Map();

  constructor(config: AuctionConfig) {
    const { auctionType, auctionAddress, signer } = config;
    super(signer, auctionAddress);
    this.auctionType =
      auctionType === "debt" ? AuctionType.Debt : AuctionType.Surplus;
    this.contract =
      this.auctionType === AuctionType.Debt
        ? Flopper__factory.connect(auctionAddress, this.signer)
        : Flapper__factory.connect(auctionAddress, this.signer);
    this.DS_Token = this.contract
      .gem()
      .then((v) => DS_Token__factory.connect(v, this.signer));
    this.vatContract = this.contract
      .vat()
      .then((v) => Vat__factory.connect(v, this.signer));
    this.addReconnect(() => this._checkAuctionsOnStart());
  }

  /**
   * Start handling auction events
   */
  async start() {
    await this._checkAllowanceAndApprove();
    await this._checkAuctionsOnStart();
    this._handleKickEvents();
    this._handleLogEvents();
  }

  private async _checkAuctionsOnStart() {
    // TODO: participate in multiple auctions
    const auctions = await this.getAuctionInfos();
    if (auctions) {
      auctions.forEach((auction) => {
        const { id, auctionType, bid, lot, guy, price, tic, end } = auction;
        this.logger.info(
          JSON.stringify(
            {
              id: id.toString(),
              auctionType,
              bid: bid.toString(),
              lot: lot.toString(),
              guy,
              price: price.toString(),
              tic,
              end,
            },
            null,
            1
          )
        );
      });
    }
    auctions.forEach((auction) => void this._setTimerToEndAuction(auction));
    if (auctions[0]) {
      await this._bid(auctions[0]);
    }
  }

  private async _setTimerToEndAuction(auction: AuctionInfo) {
    // 現在の時刻とtic, endどちらか小さい方の差分をタイマーとしたスケジューラーを起動する
    const { id, tic, end } = auction;
    // ticが0ならそもそもオークションを終了できないので何もしない
    if (typeof tic !== "number") {
      // Add buffer to delta
      const BUFFER = 60 * 1000;
      clearTimeout(this.auctionSchedulers.get(id));
      const ticTime = typeof tic === "number" ? new Date(tic) : tic;
      const endTime = end.getTime() <= ticTime.getTime() ? end : ticTime;
      const delta = endTime.getTime() - new Date().getTime();
      if (delta <= 0) {
        this.logger.info("Ending auction");
        await this._submitTx(this.contract.deal(id), `End auction ${id}`);
      } else {
        this.logger.info(`Ending auction at ${endTime}`);
        const timerId = setTimeout(() => {
          void this._submitTx(this.contract.deal(id), `End auction ${id}`);
        }, delta + BUFFER);
        this.auctionSchedulers.set(id, timerId);
      }
    }
  }

  /**
   * Check Mkr and Dai allowance for auction contracts
   * approve if needed
   */
  private async _checkAllowanceAndApprove() {
    const vat = await this.vatContract;
    const canSpend = await vat.can(this.signer.address, this.contract.address);
    if (canSpend.eq(0)) {
      await this._submitTx(
        vat.hope(this.contract.address),
        `Hope to ${this.auctionType} auction contract: ${this.contract.address}`
      );
    }
    const mkr = await this.DS_Token;
    const allowance = await mkr.allowance(
      this.signer.address,
      this.contract.address
    );
    if (allowance.lte(0)) {
      await this._submitTx(
        mkr["approve(address)"](this.contract.address),
        `Approve to ${this.auctionType} auction contract: ${this.contract.address}`
      );
    }
  }

  /**
   * Handle `logEvent` emitted from auction contract
   */
  private _handleLogEvents() {
    [
      FunctionSig.deal,
      FunctionSig.dent,
      FunctionSig.tend,
      FunctionSig.tick,
    ].forEach((event) => {
      const eventFilter =
        this.contract.filters["LogNote(bytes4,address,bytes32,bytes32,bytes)"](
          event
        );
      this.contract.on(eventFilter, (strEventTx) => {
        const eventTx = strEventTx as any as {
          transactionHash: string;
          topics: string[];
        };
        this._processEvent(eventTx, async () => {
          const auctionId = BigNumber.from(eventTx.topics.at(2));
          this.logger.info(`Event occured on auction ${auctionId.toString()}`);
          const auctionInfo = await this.getAuctionInfoById(auctionId);
          switch (event) {
            // Auction is ended
            case FunctionSig.deal:
              this.logger.info(`Auction ${auctionId.toString()} ended.`);
              break;
            // Someone bidded on Flopper/Debt auction
            case FunctionSig.dent:
              this.logger.info(
                `Someone bidded on auction ${auctionId.toString()}`
              );
              await this._bid(auctionInfo);
              await this._setTimerToEndAuction(auctionInfo);
              break;
            // Someone bidded on Flapper/Surplus auction
            case FunctionSig.tend:
              this.logger.info(
                `Someone bidded on auction ${auctionId.toString()}`
              );
              await this._bid(auctionInfo);
              await this._setTimerToEndAuction(auctionInfo);
              break;
            // Auction restarted
            case FunctionSig.tick:
              this.logger.info(`Auction ${auctionId.toString()} restarted`);
              await this._bid(auctionInfo);
              break;
            default:
              break;
          }
        });
      });
    });
  }

  /**
   * Handle `Kick` event emitted from auction contract
   */
  private _handleKickEvents() {
    if (this.auctionType === AuctionType.Debt) {
      const eventFilter =
        this.contract.filters["Kick(uint256,uint256,uint256,address)"]!();
      this.contract.on(eventFilter, (id, _bid, _lot, _guy, kickEvent) => {
        this._processEvent(kickEvent, async () => {
          this.logger.info(`Debt auction id ${id} started`);
          const auctionInfo = await this.getAuctionInfoById(id);
          await this._bid(auctionInfo);
        });
      });
    } else {
      const eventFilter =
        this.contract.filters["Kick(uint256,uint256,uint256)"]!();
      this.contract.on(eventFilter, (id, _bid, _lot, kickEvent) => {
        this._processEvent(kickEvent, async () => {
          this.logger.info(`Surplus auction id ${id} started`);
          const auctionInfo = await this.getAuctionInfoById(id);
          await this._bid(auctionInfo);
        });
      });
    }
  }

  // Surplus/Debt auctions have no reliable way of obtaining information on auctions
  // that's being held.
  /**
   * Return list of ongoing auctions
   * @returns List on ongoing auctions
   */
  async getAuctionInfos(this: Auction): Promise<AuctionInfo[]> {
    const kicks = await this.contract.kicks();
    let i = kicks;
    const auctionInfos: AuctionInfo[] = [];
    while (i.gte(0)) {
      const auctionInfo = await this.getAuctionInfoById(i);
      if (i.eq(0) || Auction.isEmptyAuction(auctionInfo)) {
        break;
      }
      auctionInfos.push(auctionInfo);
      i = i.sub(1);
    }
    return auctionInfos;
  }

  /**
   * End an auction
   * @param id Auction Id
   */
  async endAuction(this: Auction, id: BigNumber): Promise<ContractTransaction> {
    const auctionInfo = await this.getAuctionInfoById(id);
    if (Auction.isEmptyAuction(auctionInfo)) {
      throw new Error(`Auction id ${id}, is invalid auction`);
    }
    if (!Auction.isAuctionExpired(auctionInfo)) {
      throw new Error(`Auction id ${id}, is still ongoing`);
    }
    return this.contract.deal(id);
  }

  /**
   * Return balance of DAI
   * @returns Amount of DAI
   */
  async getDaiBalance(this: Auction): Promise<BigNumber> {
    const vat = await this.vatContract;
    return vat.dai(this.signer.address);
  }

  /**
   * Return balance of MKR token
   * @returns Amount of MKR
   */
  async getMkrBalance(this: Auction): Promise<BigNumber> {
    const mkr = await this.DS_Token;
    return mkr.balanceOf(this.signer.address);
  }

  /**
   * Returns auction information for a given ID
   * @param id Auction ID
   * @returns Auction information
   */
  async getAuctionInfoById(id: BigNumber): Promise<AuctionInfo> {
    const auctionInfo = await this.contract.bids(id);
    const { bid, lot, guy, tic, end } = auctionInfo;

    // Flopper/Debt
    // price: Current price being tendered
    // From Flopper.sol
    // require(lot <  bids[id].lot, "Flopper/lot-not-lower");
    // require(mul(beg, lot) <= mul(bids[id].lot, ONE), "Flopper/insufficient-decrease");
    // convert to an equation: beg * lot <= bids[id].lot * ONE
    // i.e price = lot <= bid[id].lot * ONE / beg

    // Flapper/Surplus
    // price: Current price being tendered
    // From Flapper.sol
    // require(bid >  bids[id].bid, "Flapper/bid-not-higher");
    // require(mul(bid, ONE) >= mul(beg, bids[id].bid), "Flapper/insufficient-increase");
    // Convert to an equation: bid * ONE >= beg * bids[id].bid
    // i.e. price = bid >= bids[id].bid * beg / ONE
    const price =
      this.auctionType === AuctionType.Debt
        ? lot.mul(ONE).div(BEG).sub(1) // ceiling
        : bid.mul(BEG).div(ONE).add(1); // floor
    return {
      id,
      auctionType: this.auctionType,
      bid,
      lot,
      guy,
      price,
      tic: tic === 0 ? 0 : new Date(tic * 10 ** 3),
      end: new Date(end * 10 ** 3),
    };
  }

  /**
   * Check given auction is valid
   * @param auctionInfo Auction information
   */
  static isEmptyAuction(auctionInfo: AuctionInfo): boolean {
    const { guy } = auctionInfo;
    return guy === EMPTY_ADDRESS;
  }

  /**
   * Check given auction is ended
   * @param auctionInfo Auction information
   * @returns
   */
  static isAuctionExpired(auctionInfo: AuctionInfo): boolean {
    const { tic, end } = auctionInfo;
    const now = new Date();
    const bidEndTime = tic;
    const auctionEndTime = end;
    const auctionExpired =
      tic.valueOf() !== 0 && (bidEndTime < now || auctionEndTime < now);
    return auctionExpired;
  }

  /**
   * Big ignoring all the exceptions
   * @param id Auction ID
   */
  private async _bid(
    this: Auction,
    auction: AuctionInfo
  ): Promise<ContractTransaction | undefined> {
    return this._submitTx(
      this.bid(auction),
      `Bidding on ${auction.auctionType} auction ${auction.id}`
    );
  }

  /**
   * Bid against an auction.Ï
   * @param auctionInfo Auction info
   */
  protected async bid(
    this: Auction,
    auctionInfo: AuctionInfo
  ): Promise<ContractTransaction | undefined> {
    const { id, tic } = auctionInfo;

    if (typeof tic !== "number") {
      throw new Error(`Someone already bidded on ${id}`);
    }

    // Highest bidder is us
    if (auctionInfo.guy === this.signer.address) {
      throw new Error(
        `Keeper ${this.signer.address} already bidded on auction ${id}`
      );
    }

    const { bid, lot, balance } =
      this.auctionType === AuctionType.Debt
        ? {
            bid: auctionInfo.bid, // Bid is fixed on debt auctions
            lot: auctionInfo.price,
            balance: await this.getDaiBalance(),
          }
        : {
            bid: auctionInfo.price,
            lot: auctionInfo.lot, // Lot is fixed on surplus auctions
            balance: await this.getMkrBalance(),
          };

    if (
      Auction.isAuctionExpired(auctionInfo) ||
      Auction.isEmptyAuction(auctionInfo)
    ) {
      throw new Error(`Auction ${id}, is expired or does not exist`);
    }

    // For Debt auctions, the LOT must be below the price
    if (
      this.auctionType === AuctionType.Debt &&
      (lot?.gt(auctionInfo.price) || false)
    ) {
      throw new Error(
        `Invalid lot amount: lot ${lot}, must be at most ${auctionInfo.price} `
      );
    }

    // For Surplus auctions, bid must exceed price
    if (
      this.auctionType === AuctionType.Surplus &&
      (bid?.lt(auctionInfo.price) || false)
    ) {
      throw new Error(
        `Invalid bid amount: bid ${bid}, must be at least ${auctionInfo.price} `
      );
    }

    this.logger.info(
      JSON.stringify(
        {
          guy: this.signer.address,
          auctionType: this.auctionType,
          bid: bid.toString(),
          lot: lot.toString(),
          balance: balance.toString(),
        },
        null,
        1
      )
    );

    if (balance.lt(bid)) {
      throw new Error(
        `Insufficient balance to participate auction. Current balance: ${balance}, bid: ${bid}`
      );
    }
    if (this.auctionType === AuctionType.Debt) {
      return this.contract.dent!(id, lot, bid);
    }
    return this.contract.tend!(id, lot, bid);
  }
}
