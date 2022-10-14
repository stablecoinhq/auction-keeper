import { BigNumber, ethers } from "ethers";
import {
  Vow__factory,
  Vow as VowContract,
  Vat__factory,
  Vat as VatContract,
  Flapper__factory,
  Flopper__factory,
} from "../../types/ethers-contracts/index";
import { HEAL } from "./constants";

// Config
export interface VowConfig {
  vowAddress: string; // Vowコントラクトのアドレス
  vatAddress: string; // Vatアドレスのアドレス
  signer: ethers.Wallet; // Signer
}

// Vowコントラクトの状態
interface VowStatus {
  fixedDebtAuctionSize: BigNumber; // sump
  fixedSurplusAuctionSize: BigNumber; // bump
  auctionSizeBuffer: BigNumber; // hump
  queuedDebt: BigNumber; // Sin
  onAuctionDebt: BigNumber; //  Ash
  availableDai: BigNumber; // dai
  unbackedDai: BigNumber; // sin
}

// Surplus及びDebtオークションを開始させるBot
// Surplusオークションは負債が0かつ、十分な余剰DAIが存在するときに開始できる
// Debtオークションは余剰DAIが0かつ、負債が十分に存在するときに開始できる
export class Vow {
  readonly vow: VowContract;
  readonly vat: VatContract;
  private readonly signer: ethers.Wallet;

  constructor(config: VowConfig) {
    const { vowAddress, vatAddress, signer } = config;
    this.signer = signer;
    this.vow = Vow__factory.connect(vowAddress, this.signer);
    this.vat = Vat__factory.connect(vatAddress, this.signer);
  }

  async start() {
    this._listenToVow();
    this._listenToSurplusAuction();
    this._listenToDebtAuction();
  }

  // vowコントラクトのイベントをListenし、オークションが開始可能か調べる
  private async _listenToVow() {
    console.log("Listening to heal events...");
    const healEventFilter =
      this.vow.filters["LogNote(bytes4,address,bytes32,bytes32,bytes)"](HEAL);
    this.vow.on(healEventFilter, async (...args) => {
      const [rawEvent] = args;
      const parsedTopics = rawEvent as any as { topics: string[] };
      const [functionSig] = parsedTopics.topics;

      if (functionSig === HEAL) {
        console.log(`Heal event triggered, checking vow status`);
        const vowStatus = await this._getVowStatus();
        const canFlap = Vow.canFlap(vowStatus);
        if (canFlap) {
          console.log("Surplus auction can be started.");
          this._startSurplusAuction();
        }
        const canFlop = Vow.canFlop(vowStatus);
        if (canFlop) {
          console.log("Debt auction can be started.");
          this._startDebtAuction();
        }
      }
    });
  }

  // flapperコントラクトのイベントをListenし、Surplusオークションが開始されたか調べる
  private async _listenToSurplusAuction() {
    const flapperAddress = await this.vow.flapper();
    const flapper = Flapper__factory.connect(flapperAddress, this.signer);
    const flapperEventFilter =
      flapper.filters["Kick(uint256,uint256,uint256)"]();
    flapper.on(flapperEventFilter, async (id, lot, bid) => {
      console.log(`Surplus auction ${id} started.`);
      console.log({
        id: id.toString(),
        amount: lot.toString(),
        bid: bid.toString(),
      });
    });
  }

  // flopperコントラクトのイベントをListenし、Debtオークションが開始されたか調べる
  private async _listenToDebtAuction() {
    const flopperAddress = await this.vow.flopper();
    const flopper = Flopper__factory.connect(flopperAddress, this.signer);
    const flopperEventFilter =
      flopper.filters["Kick(uint256,uint256,uint256,address)"]();
    flopper.on(flopperEventFilter, async (id, lot, bid, bidder) => {
      console.log(`Debt auction ${id} started.`);
      console.log({
        id: id.toString(),
        amount: lot.toString(),
        bidder: bidder,
        bid: bid.toString(),
      });
    });
  }

  // Surplusオークションを開始する
  private async _startSurplusAuction() {
    console.log("Starting surplus auction.");
    this.vow.flap().catch((e) => {
      console.log(
        ` Surplus auction cannot be started with reason: ${e.error.reason}`
      );
    });
  }

  // Debtオークションを開始する
  private async _startDebtAuction() {
    console.log("Starting debt auction.");
    this.vow.flop().catch((e) => {
      console.log(
        `Debt auction cannot be started with reason: ${e.error.reason}`
      );
    });
  }

  // Vowコントラクトの状態を取得する
  private async _getVowStatus(): Promise<VowStatus> {
    // dai
    const availableDai = await this.vat.dai(this.vow.address);
    // sin
    const unbackedDai = await this.vat.sin(this.vow.address);
    // Sin
    const queuedDebt = await this.vow.Sin();
    // Ash
    const onAuctionDebt = await this.vow.Ash();
    // bump
    const fixedSurplusAuctionSize = await this.vow.bump();
    // sump
    const fixedDebtAuctionSize = await this.vow.sump();
    // hump
    const auctionSizeBuffer = await this.vow.hump();
    return {
      availableDai,
      unbackedDai,
      queuedDebt,
      onAuctionDebt,
      fixedSurplusAuctionSize,
      fixedDebtAuctionSize,
      auctionSizeBuffer,
    };
  }

  // Surplusオークションを開始できるか調べる
  static canFlap(vowStatus: VowStatus): boolean {
    const {
      fixedSurplusAuctionSize,
      auctionSizeBuffer,
      queuedDebt,
      onAuctionDebt,
      availableDai,
      unbackedDai,
    } = vowStatus;
    this.displayVowStatus(vowStatus);
    const currentDebt = unbackedDai
      .add(fixedSurplusAuctionSize)
      .add(auctionSizeBuffer);
    const isSufficientSurplus = availableDai.gte(currentDebt);
    const isDebtZero = unbackedDai.sub(queuedDebt).sub(onAuctionDebt).eq(0);
    return isSufficientSurplus && isDebtZero;
  }

  // Debtオークションを開始できるか調べる
  static canFlop(vowStatus: VowStatus): boolean {
    const {
      fixedDebtAuctionSize,
      queuedDebt,
      onAuctionDebt,
      unbackedDai,
      availableDai,
    } = vowStatus;

    const remainingDebt = unbackedDai.sub(queuedDebt).sub(onAuctionDebt);
    const hasSufficientDebt = fixedDebtAuctionSize.lte(remainingDebt);
    const hasNoSurplus = availableDai.eq(0);
    return hasSufficientDebt && hasNoSurplus;
  }

  static displayVowStatus(vowStatus: VowStatus) {
    const {
      fixedSurplusAuctionSize: fixedAuctionSize,
      auctionSizeBuffer,
      queuedDebt,
      onAuctionDebt,
      availableDai,
      unbackedDai,
    } = vowStatus;
    const currentDebt = unbackedDai
      .add(fixedAuctionSize)
      .add(auctionSizeBuffer);
    const remainingDebt = unbackedDai.sub(queuedDebt).sub(onAuctionDebt);
    console.log({
      availableDai: availableDai.toString(),
      unbackedDai: unbackedDai.toString(),
      surplus: availableDai.sub(currentDebt).toString(),
      auctionSizeBuffer: auctionSizeBuffer.toString(),
      remainingDebt: remainingDebt.toString(),
    });
  }
}
