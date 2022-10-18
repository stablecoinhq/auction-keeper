import { BigNumber, ethers } from "ethers";
import {
  Vow__factory,
  Vow as VowContract,
  Vat__factory,
  Vat as VatContract,
  Flapper__factory,
  Flopper__factory,
} from "../types/ether-contracts";
import { HEAL } from "./constants";

// Config
export interface VowConfig {
  vowAddress: string; // Vowコントラクトのアドレス
  vatAddress: string; // Vatアドレスのアドレス
  signer: ethers.Wallet; // Signer
  minHealingAmount: BigNumber;
}

// Vowコントラクトの状態
export interface VowStatus {
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
  readonly minHealingAmount;

  constructor(config: VowConfig) {
    const { vowAddress, vatAddress, signer, minHealingAmount } = config;
    this.minHealingAmount = minHealingAmount;
    this.signer = signer;
    this.vow = Vow__factory.connect(vowAddress, this.signer);
    this.vat = Vat__factory.connect(vatAddress, this.signer);
  }

  async start() {
    await this._checkVow();
    this._listenToEvents();
    this._listenToSurplusAuction();
    this._listenToDebtAuction();
  }

  async flapperAddress() {
    return this.vow.flapper();
  }
  async flopperAddress() {
    return this.vow.flopper();
  }

  // vowコントラクトのイベントをListenし、オークションが開始可能か調べる
  private async _listenToEvents() {
    console.log("Listening to heal events...");
    const healEventFilter =
      this.vow.filters["LogNote(bytes4,address,bytes32,bytes32,bytes)"](HEAL);
    this.vow.on(healEventFilter, async (...args) => {
      const [rawEvent] = args;
      const parsedTopics = rawEvent as any as { topics: string[] };
      const [functionSig] = parsedTopics.topics;

      if (functionSig === HEAL) {
        console.log(`Heal event triggered, checking vow status`);
        this._checkVow();
      }
    });
  }

  // Check vow status, start auction if needed
  private async _checkVow() {
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
    const [healingAmount, shouldHeal] = Vow.calculateHealingAmount(vowStatus);
    if (shouldHeal || healingAmount.gte(this.minHealingAmount)) {
      this._heal(healingAmount);
    }
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

  // heal()を呼ぶ
  private async _heal(healingAmount: BigNumber) {
    console.log(`Healing with ${healingAmount.toString()}`);
    this.vow.heal(healingAmount).catch((e) => {
      console.log(`Heal was not successful with reason: ${e.error.reason}`);
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

  // Heal可能な数量及び、オークション可能の有無のフラグを返す
  static calculateHealingAmount(vowStatus: VowStatus): [BigNumber, boolean] {
    const {
      fixedSurplusAuctionSize,
      auctionSizeBuffer,
      queuedDebt,
      onAuctionDebt,
      availableDai,
      unbackedDai,
      fixedDebtAuctionSize,
    } = vowStatus;

    const remainingDebt = unbackedDai.sub(queuedDebt).sub(onAuctionDebt);
    // 負債、資産いずれかが0ならfalse
    if (remainingDebt.lte(0) || availableDai.lte(0)) {
      return [BigNumber.from(0), false];
    }

    const healingAmount = availableDai.gt(remainingDebt)
      ? remainingDebt
      : availableDai;

    const vowStatusAfterHeal = {
      fixedSurplusAuctionSize,
      auctionSizeBuffer,
      queuedDebt,
      onAuctionDebt,
      availableDai: availableDai.sub(healingAmount),
      unbackedDai: unbackedDai.sub(healingAmount),
      fixedDebtAuctionSize,
    };
    const canFlop = Vow.canFlop(vowStatusAfterHeal);
    const canFlap = Vow.canFlap(vowStatusAfterHeal);

    return [healingAmount, canFlap || canFlop];
  }

  static displayVowStatus(vowStatus: VowStatus) {
    const {
      fixedSurplusAuctionSize,
      auctionSizeBuffer,
      queuedDebt,
      onAuctionDebt,
      availableDai,
      unbackedDai,
    } = vowStatus;
    const currentDebt = unbackedDai
      .add(fixedSurplusAuctionSize)
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
