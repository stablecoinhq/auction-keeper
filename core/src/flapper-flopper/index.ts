import { BigNumber, ContractTransaction, ethers } from "ethers";
import {
  Vat,
  DS_Token,
  Flapper__factory,
  Flopper__factory,
} from "../types/ether-contracts";
import { DS_Token__factory, Vat__factory } from "../types/ether-contracts";
import { AuctionContract } from "./auction-contract";
import { EMPTY_ADDRESS, ONE, BEG, FunctionSig } from "./constants";
import BaseService from "../common/base-service.class";
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
 * - Get list of ongoing auctions
 * - Bid on an auction
 * - End auction
 *
 * This service cannot start an auction (That's up to Vow)
 */
export class Auction extends BaseService {
  readonly auctionType: AuctionType;
  readonly vatContract: Promise<Vat>;
  readonly contract: AuctionContract;
  readonly DS_Token: Promise<DS_Token>;

  constructor(config: AuctionConfig) {
    const { auctionType, auctionAddress, signer } = config;
    super(signer);
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
  }

  /**
   * Start handling auction events
   */
  async start() {
    await this._checkAllowanceAndApprove();
    // TODO: participate in multiple auctions
    const [auction] = await this.getAuctionInfos();
    if (auction) {
      await this._bid(auction.id);
    }
    this._handleKickEvents();
    this._handleLogEvents();
  }

  async stop() {
    this.contract.removeAllListeners();
  }

  /**
   * Check Mkr and Dai allowance for auction contracts
   * approve if needed
   */
  private async _checkAllowanceAndApprove() {
    const vat = await this.vatContract;
    const canSpend = await vat.can(this.signer.address, this.contract.address);
    if (canSpend.eq(0)) {
      await this._submitTx(vat.hope(this.contract.address));
    }
    const mkr = await this.DS_Token;
    const allowance = await mkr.allowance(
      this.signer.address,
      this.contract.address
    );
    if (allowance.lte(0)) {
      await this._submitTx(mkr["approve(address)"](this.contract.address));
    }
  }

  /**
   * Handle `logEvent` emitted from auction contract
   */
  private async _handleLogEvents() {
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
      this.contract.on(eventFilter, async (strEventTx) => {
        const eventTx = strEventTx as any as {
          transactionHash: string;
          topics: string[];
        };
        await this._processEvent(eventTx, async () => {
          const auctionId = BigNumber.from(eventTx.topics.at(2));
          console.log(`Event occured on auction ${auctionId.toString()}`);
          switch (event) {
            // Auction is ended
            case FunctionSig.deal:
              console.log(`Auction ${auctionId.toString()} ended.`);
              break;
            // Someone bidded on Flopper/Debt auction
            case FunctionSig.dent:
              console.log(`Someone bidded on auction ${auctionId.toString()}`);
              await this._bid(auctionId);
              break;
            // Someone bidded on Flapper/Surplus auction
            case FunctionSig.tend:
              console.log(`Someone bidded on auction ${auctionId.toString()}`);
              await this._bid(auctionId);
              break;
            // Auction restarted
            case FunctionSig.tick:
              console.log(`Auction ${auctionId.toString()} restarted`);
              await this._bid(auctionId);
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
  private async _handleKickEvents() {
    if (this.auctionType === AuctionType.Debt) {
      const eventFilter =
        this.contract.filters["Kick(uint256,uint256,uint256,address)"]!();
      this.contract.on(eventFilter, async (id, _bid, _lot, _guy, kickEvent) => {
        this._processEvent(kickEvent, async () => {
          console.log(`Debt auction id ${id} started`);
          await this._bid(id);
        });
      });
    } else {
      const eventFilter =
        this.contract.filters["Kick(uint256,uint256,uint256)"]!();
      this.contract.on(eventFilter, async (id, _bid, _lot, kickEvent) => {
        this._processEvent(kickEvent, async () => {
          console.log(`Surplus auction id ${id} started`);
          await this._bid(id);
        });
      });
    }
  }

  // Surplus/Debt auctions have no reliable way of obtaining information on auctions that's being held.
  /**
   * Return list of ongoing auctions
   * @returns List on ongoing auctions
   */
  async getAuctionInfos(this: Auction): Promise<AuctionInfo[]> {
    const kicks = await this.contract.kicks();
    let i = kicks;
    let auctionInfos: AuctionInfo[] = [];
    while (i.gte(0)) {
      const auctionInfo = await this.getAuctionInfoById(i);
      if (
        i.eq(0) ||
        Auction.isAuctionExpired(auctionInfo) ||
        Auction.isEmptyAuction(auctionInfo)
      ) {
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
      tic.valueOf() != 0 && (bidEndTime < now || auctionEndTime < now);
    return auctionExpired;
  }

  /**
   * Big ignoring all the exceptions
   * @param id Auction ID
   */
  private async _bid(
    this: Auction,
    id: BigNumber
  ): Promise<ContractTransaction | undefined> {
    return this._submitTx(this.bid(id));
  }

  /**
   * Bid against an auction
   * @param id Auction ID
   */
  async bid(
    this: Auction,
    id: BigNumber
  ): Promise<ContractTransaction | undefined>;
  async bid(
    this: Auction,
    id: BigNumber,
    lot?: BigNumber,
    bid?: BigNumber
  ): Promise<ContractTransaction | undefined> {
    const auctionInfo = await this.getAuctionInfoById(id);

    // Highest bidder is us
    if (auctionInfo.guy === this.signer.address) {
      throw new Error(
        `Keeper ${this.signer.address} already bidded on auction ${id}`
      );
    }

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

    const { bidAmount, lotAmount, balance } =
      this.auctionType === AuctionType.Debt
        ? {
            bidAmount: auctionInfo.bid, // Bid is unchanged on debt auctions
            lotAmount: lot || auctionInfo.price,
            balance: await this.getDaiBalance(),
          }
        : {
            bidAmount: bid || auctionInfo.price,
            lotAmount: auctionInfo.lot, // Lot is unchanged on surplus auctions
            balance: await this.getMkrBalance(),
          };

    console.table({
      auctionType: this.auctionType,
      bid: bidAmount.toString(),
      lot: lotAmount.toString(),
      balance: balance.toString(),
    });

    if (balance.lt(bidAmount)) {
      throw new Error(
        `Insufficient balance to participate auction. Current balance: ${balance}, bid: ${bidAmount}`
      );
    }
    if (this.auctionType === AuctionType.Debt) {
      return this.contract.dent!(id, lotAmount, bidAmount);
    } else {
      return this.contract.tend!(id, lotAmount, bidAmount);
    }
  }
}
