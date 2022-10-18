import { BigNumber, ethers } from "ethers";
import {
  Vow__factory,
  Vow as VowContract,
  Vat__factory,
  Vat as VatContract,
  Flapper__factory,
  Flopper__factory,
} from "../types/ether-contracts";
import { Events, BYTES_32 } from "./constants";

// Config
export interface VowConfig {
  vowAddress: string; // Vowコントラクトのアドレス
  vatAddress: string; // Vatアドレスのアドレス
  signer: ethers.Wallet; // Signer
  minHealingAmount: BigNumber;
}

// Vowコントラクトの状態
export interface VowState {
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
    const healEventFilter = this.vow.filters[
      "LogNote(bytes4,address,bytes32,bytes32,bytes)"
    ](Events.heal);
    this.vow.on(healEventFilter, async (...args) => {
      const [rawEvent] = args;
      const parsedTopics = rawEvent as any as { topics: string[] };
      const [functionSig] = parsedTopics.topics;

      if (functionSig === Events.heal) {
        console.log(`Heal event triggered, checking vow state`);
        this._checkVow();
      }
    });

    // Vowコントラクトの財務状況確認
    // Vatコントラクトの以下の関数の引数がvowコントラクトのアドレスなら調べる
    // grab(bytes32,address,address,address,int256,int256): 4つ目の引数
    // frob(bytes32,address,address,address,int256,int256): 4つ目の引数
    // move(address,address,uint256): 2,3つ目の引数
    // fold(bytes32,address,int256): 2つ目の引数
    // suck(address,address,uint256): 2,3つ目の引数
    [Events.grab, Events.frob, Events.move, Events.fold, Events.suck].map(
      async (event) => {
        const eventFilter =
          this.vat.filters["LogNote(bytes4,bytes32,bytes32,bytes32,bytes)"](
            event
          );
        this.vat.on(eventFilter, async (...args) => {
          const [rawEvent] = args;
          const parsedTopics = rawEvent as any as {
            topics: string[];
            data: string;
          };
          const [, , arg2, arg3] = parsedTopics.topics;
          // 4つ目の引数はdataをパースしないと取得できない
          // 0x + 64バイト + 4バイト + １引数32バイト * 3
          const arg4 = parsedTopics.data
            .slice(2)
            .slice(BYTES_32 * 2)
            .slice(8)
            .slice(BYTES_32 * 3)
            .slice(0, BYTES_32);
          switch (event) {
            case Events.grab:
              if (arg4 && arg4 === this.vow.address) {
                console.log("Grab on vow address");
                this._checkState();
              }
              break;
            case Events.frob:
              if (arg4 && arg4 === this.vow.address) {
                console.log("Frob on vow address");
                this._checkState();
              }
              break;
            case Events.move:
              if (
                (arg2 && arg2 === this.vow.address) ||
                (arg3 && arg3 === this.vow.address)
              ) {
                console.log("Move on vow address");
                this._checkState();
              }
              break;
            case Events.fold:
              if (arg2 && arg2 === this.vow.address) {
                console.log("Fold on vow address");
                this._checkState();
              }
              break;
            case Events.suck:
              if (
                (arg2 && arg2 === this.vow.address) ||
                (arg3 && arg3 === this.vow.address)
              ) {
                console.log("Suck on vow address");
                this._checkState();
              }
              break;
            default:
              break;
          }
        });
      }
    );
  }

  // Check vow state, start auction if needed
  private async _checkVow() {
    const vowState = await this._getVowState();
    const canFlap = Vow.canFlap(vowState);
    if (canFlap) {
      console.log("Surplus auction can be started.");
      this._startSurplusAuction();
    }
    const canFlop = Vow.canFlop(vowState);
    if (canFlop) {
      console.log("Debt auction can be started.");
      this._startDebtAuction();
    }
    const [healingAmount, shouldHeal] = Vow.calculateHealingAmount(vowState);
    if (shouldHeal || healingAmount.gte(this.minHealingAmount)) {
      this._heal(healingAmount);
    }
  }

  private async _checkState() {
    const vowState = await this._getVowState();
    const [healingAmount, shouldHeal] = Vow.calculateHealingAmount(vowState);
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
  private async _getVowState(): Promise<VowState> {
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
  static canFlap(vowState: VowState): boolean {
    const {
      fixedSurplusAuctionSize,
      auctionSizeBuffer,
      queuedDebt,
      onAuctionDebt,
      availableDai,
      unbackedDai,
    } = vowState;
    this.displayVowState(vowState);
    const currentDebt = unbackedDai
      .add(fixedSurplusAuctionSize)
      .add(auctionSizeBuffer);
    const isSufficientSurplus = availableDai.gte(currentDebt);
    const isDebtZero = unbackedDai.sub(queuedDebt).sub(onAuctionDebt).eq(0);
    return isSufficientSurplus && isDebtZero;
  }

  // Debtオークションを開始できるか調べる
  static canFlop(vowState: VowState): boolean {
    const {
      fixedDebtAuctionSize,
      queuedDebt,
      onAuctionDebt,
      unbackedDai,
      availableDai,
    } = vowState;

    const remainingDebt = unbackedDai.sub(queuedDebt).sub(onAuctionDebt);
    const hasSufficientDebt = fixedDebtAuctionSize.lte(remainingDebt);
    const hasNoSurplus = availableDai.eq(0);
    return hasSufficientDebt && hasNoSurplus;
  }

  // Heal可能な数量及び、オークション可能の有無のフラグを返す
  static calculateHealingAmount(vowState: VowState): [BigNumber, boolean] {
    const {
      fixedSurplusAuctionSize,
      auctionSizeBuffer,
      queuedDebt,
      onAuctionDebt,
      availableDai,
      unbackedDai,
      fixedDebtAuctionSize,
    } = vowState;

    const remainingDebt = unbackedDai.sub(queuedDebt).sub(onAuctionDebt);
    // 負債、資産いずれかが0ならfalse
    if (remainingDebt.lte(0) || availableDai.lte(0)) {
      return [BigNumber.from(0), false];
    }

    const healingAmount = availableDai.gt(remainingDebt)
      ? remainingDebt
      : availableDai;

    const vowStateAfterHeal = {
      fixedSurplusAuctionSize,
      auctionSizeBuffer,
      queuedDebt,
      onAuctionDebt,
      availableDai: availableDai.sub(healingAmount),
      unbackedDai: unbackedDai.sub(healingAmount),
      fixedDebtAuctionSize,
    };
    const canFlop = Vow.canFlop(vowStateAfterHeal);
    const canFlap = Vow.canFlap(vowStateAfterHeal);

    return [healingAmount, canFlap || canFlop];
  }

  static displayVowState(vowState: VowState) {
    const {
      fixedSurplusAuctionSize,
      auctionSizeBuffer,
      queuedDebt,
      onAuctionDebt,
      availableDai,
      unbackedDai,
    } = vowState;
    const currentDebt = unbackedDai
      .sub(fixedSurplusAuctionSize)
      .sub(auctionSizeBuffer);
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
