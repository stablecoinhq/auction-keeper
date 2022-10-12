import { BigNumber, ethers } from "ethers";
import {
  Clip as ClipContract,
  Clip__factory,
  Vat__factory,
  Vat as VatContract,
} from "../types/ethers-contracts/index";
import { displayUnits, constants as unitContants } from "./units";

export interface ClipConfig {
  clipAddress: string;
  vatAddress: string;
  ilk: string;
  signer: ethers.Wallet;
}

export interface AuctionInfo {
  auctionId: BigNumber; // オークションId
  tab: BigNumber; // 精算に必要なDAI
  lot: BigNumber; // 精算される通貨総数量
  usr: string; // 対象のVault
  tic: BigNumber; // オークション開始時刻
  top: BigNumber; // 開始価格
  auctionPrice: BigNumber; //現在の価格
  needsRedo: boolean; // 再オークション
}

function displayAuctionInfo(auctionInfo: AuctionInfo): void {
  const {
    auctionId,
    tab,
    lot,
    usr,
    tic,
    top,
    auctionPrice: price,
    needsRedo,
  } = auctionInfo;
  const normalised = {
    auctionId: auctionId.toString(),
    vault: usr,
    daiToRaise: displayUnits(tab, unitContants.RAD),
    amountBeingAuctioned: displayUnits(lot, unitContants.WAD),
    startingPrice: displayUnits(top, unitContants.RAY),
    currentPrice: displayUnits(price, unitContants.RAY),
    startAt: tic.eq(0) ? 0 : new Date(tic.toNumber() * 10 ** 3),
    ended: lot.eq(0) || needsRedo,
  };
  console.log(normalised);
}

// 通貨毎にClipがあるので、それぞれインスタンス化必要がある
export default class Clip {
  readonly clip: ClipContract;
  readonly vat: VatContract;
  readonly ilk: string;
  private signer: ethers.Wallet;
  signerAddress: string;

  constructor(args: ClipConfig) {
    const { clipAddress, vatAddress, ilk, signer } = args;
    this.signer = signer;
    this.ilk = ilk;
    this.signerAddress = this.signer.address;
    this.clip = Clip__factory.connect(clipAddress, this.signer);
    this.vat = Vat__factory.connect(vatAddress, this.signer);
  }
  
  async hope() {
    return this.vat.hope(this.clip.address);
  }

  async start() {
    const ilk = await this.clip.ilk();
    const count = await this.clip.count();
    if (count.eq(0)) {
      console.log(`No auctions available for ${ilk}`);
      return;
    }
    const activeAuctionIds = await this.clip.list();
    await Promise.all(
      activeAuctionIds.map(async (auctionId) => {
        const { tic, top, tab, lot, usr } = await this.clip.sales(auctionId);
        const { needsRedo, price } = await this.clip.getStatus(auctionId);
        const auctionInfo: AuctionInfo = {
          auctionId,
          tic,
          top,
          tab,
          lot,
          usr,
          auctionPrice: price,
          needsRedo,
        };
        displayAuctionInfo(auctionInfo);
        this._take(auctionInfo);
        return auctionInfo;
      })
    );
  }

  private async _take(auctionInfo: AuctionInfo) {
    // ここでオークションに参加する
    const { auctionId, lot, auctionPrice } = auctionInfo;
    const availableDai = await this.vat.dai(this.signer.address);
    const amountWeCanAfford = availableDai.div(auctionPrice);
    if (availableDai.lte(0) || amountWeCanAfford.lte(0)) {
      console.log(`We have no available dai to participate in auction: ${displayUnits(availableDai, unitContants.RAD)}`);
      return;
    }
    const amountToPurchase = amountWeCanAfford.lt(lot)
      ? amountWeCanAfford
      : lot;
    const result = await this.clip.take(
      auctionId,
      amountToPurchase,
      auctionPrice,
      this.signer.address,
      []
    );
    console.log(`Bidding submitted ${result.hash}, ${amountToPurchase} at the price of ${auctionPrice}`)
  }
}
