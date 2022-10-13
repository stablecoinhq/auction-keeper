import { BigNumber, ethers } from "ethers";
import {
  Vow__factory,
  Vow as VowContract,
  Vat__factory,
  Vat as VatContract,
  Flapper as FlapperContract,
  Flapper__factory,
} from "../../types/ethers-contracts/index";
import { HEAL } from "./constants";

export interface VowConfig {
  vowAddress: string;
  vatAddress: string;
  signer: ethers.Wallet;
}

interface VowStatus {
  fixedAuctionSize: BigNumber; // bump
  auctionSizeBuffer: BigNumber; // hump
  queuedDebt: BigNumber; // Sin
  onAuctionDebt: BigNumber; //  Ash
  availableDai: BigNumber; // dai
  unbackedDai: BigNumber; // sin
}

// Surplusオークションを開始させるBot
// オークションは負債が0かつ、十分な余剰DAIが存在するときに開始できる
export default class Vow {
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
          this._startAuction();
        }
      }
      console.log("Listening to flapper events...");
      const flapperAddress = await this.vow.flapper();
      const flapper = Flapper__factory.connect(flapperAddress, this.signer);
      const kickEventFilter =
        flapper.filters["Kick(uint256,uint256,uint256)"]();
      flapper.on(kickEventFilter, async (id, lot, bid) => {
        console.log(
          `Surplus auction ${id} started. Amount: ${lot}, bid: ${bid}`
        );
      });
    });
  }

  private async _startAuction() {
    console.log("Starting surplus auction.");
    this.vow.flap().catch((e) => {
      console.log(`Auction cannot be started with reason: ${e.error.reason}`);
    });
  }

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
    const fixedAuctionSize = await this.vow.bump();
    // hump
    const auctionSizeBuffer = await this.vow.hump();
    return {
      availableDai,
      unbackedDai,
      queuedDebt,
      onAuctionDebt,
      fixedAuctionSize,
      auctionSizeBuffer,
    };
  }

  // Surplusオークションを開始できるか調べる
  static canFlap(vowStatus: VowStatus): boolean {
    const {
      fixedAuctionSize,
      auctionSizeBuffer,
      queuedDebt,
      onAuctionDebt,
      availableDai,
      unbackedDai,
    } = vowStatus;
    this.displayVowStatus(vowStatus);
    const currentDebt = unbackedDai
      .add(fixedAuctionSize)
      .add(auctionSizeBuffer);
    const isSufficientSurplus = availableDai.gte(currentDebt);
    const isDebtZero = unbackedDai.sub(queuedDebt).sub(onAuctionDebt).eq(0);
    return isSufficientSurplus && isDebtZero;
  }

  static displayVowStatus(vowStatus: VowStatus) {
    const {
      fixedAuctionSize,
      auctionSizeBuffer,
      queuedDebt,
      onAuctionDebt,
      availableDai,
      unbackedDai,
    } = vowStatus;
    const currentDebt = unbackedDai
      .add(fixedAuctionSize)
      .add(auctionSizeBuffer);
    console.log({
      surplus: availableDai.sub(currentDebt).toString(),
      auctionSizeBuffer: auctionSizeBuffer.toString(),
      debt: unbackedDai.sub(queuedDebt).sub(onAuctionDebt).toString(),
    });
  }
}
