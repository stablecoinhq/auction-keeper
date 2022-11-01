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
import "../common/base-service.class";
import { BaseService } from "../common/base-service.class";
import { Wallet } from "../common/wallet";

function toAddress(data: string): string {
  return `0x${data.slice(26)}`;
}

export function getArgumentFromRawData(data: string, n: number): string {
  if (!data) {
    return "";
  }
  // 0x + 64Bytes + 4Bytes(ilk) + １argument is 32 bytes
  return data
    .slice(2)
    .slice(BYTES_32 * 2)
    .slice(8)
    .slice(BYTES_32 * (n - 1))
    .slice(0, BYTES_32);
}

// Config
export interface VowConfig {
  vowAddress: string; // Address of a vow contract
  vatAddress: string; // Address of a vat contract
  signer: Wallet; // Signer
}

/**
 * State of a vow contract
 */
export interface VowState {
  /**
   * sump
   */
  fixedDebtAuctionSize: BigNumber;
  /**
   * bump
   */
  fixedSurplusAuctionSize: BigNumber;
  /**
   * hump
   */
  auctionSizeBuffer: BigNumber;
  /**
   * Sin
   */
  queuedDebt: BigNumber;
  /**
   * Ash
   */
  onAuctionDebt: BigNumber;
  /**
   * dai
   */
  availableDai: BigNumber;
  /**
   * sin
   */
  unbackedDai: BigNumber;
}

// Surplus及びDebtオークションを開始させるBot
// Surplus auctions can be started when debt is zero and there is sufficient surplus DAI.
// Debt auctions can be initiated when surplus DAI is zero and there is sufficient debt within the system
/**
 * Service handling events emitted from Vow/Vat contract
 * - Start surplus auction
 * - Start debt auction
 */
export class Vow extends BaseService {
  readonly vow: VowContract;
  readonly vat: VatContract;

  constructor(config: VowConfig) {
    const { vowAddress, vatAddress, signer } = config;
    super(signer);
    this.vow = Vow__factory.connect(vowAddress, this.signer);
    this.vat = Vat__factory.connect(vatAddress, this.signer);
    this.signer.addOnReconnect(async () => await this._checkVowState());
  }

  async start() {
    await this._checkVowState();
    this._handleVowEvents();
    this._handleSurplusAuctionEvents();
    this._handleDebtAuctionEvents();
  }

  async flapperAddress() {
    return this.vow.flapper();
  }
  async flopperAddress() {
    return this.vow.flopper();
  }

  /**
   * Listen to events emitted from vow contract and handle them
   * accordingly
   */
  private async _handleVowEvents(): Promise<void> {
    console.log("Listening to heal events...");
    const healEventFilter = this.vow.filters[
      "LogNote(bytes4,address,bytes32,bytes32,bytes)"
    ](Events.heal);
    this.vow.on(healEventFilter, async (...args) => {
      const [rawEvent] = args;
      const eventTx = rawEvent as any as {
        topics: string[];
        transactionHash: string;
      };
      this._processEvent(eventTx, async () => {
        const [functionSig] = eventTx.topics;
        if (functionSig === Events.heal) {
          console.log(`Heal event triggered, checking vow state`);
          this._checkVowState();
        }
      });
    });

    // grab(bytes32,address,address,address,int256,int256): 4th
    // frob(bytes32,address,address,address,int256,int256): 4th
    // move(address,address,uint256): 1st and 2nd
    // fold(bytes32,address,int256): 2nd
    // suck(address,address,uint256): 1st and 2nd
    [Events.grab, Events.frob, Events.move, Events.fold, Events.suck].forEach(
      async (event) => {
        const eventFilter =
          this.vat.filters["LogNote(bytes4,bytes32,bytes32,bytes32,bytes)"](
            event
          );

        this.vat.on(eventFilter, async (strEventTx) => {
          const eventTx = strEventTx as any as {
            topics: string[];
            data: string;
            transactionHash: string;
          };
          this._processEvent(eventTx, async () => {
            const vowAddressToCheck = this.vow.address.toLowerCase();
            const [, arg1, arg2] = eventTx.topics;
            const arg4 = getArgumentFromRawData(eventTx.data, 4);
            const arg4Address = `0x${arg4.slice(24)}`;
            switch (event) {
              case Events.grab:
                if (arg4 && arg4Address === vowAddressToCheck) {
                  console.log("Grab on vow address");
                  this._checkStateAndHeal();
                }
                break;
              case Events.frob:
                if (arg4 && arg4Address === vowAddressToCheck) {
                  console.log("Frob on vow address");
                  this._checkStateAndHeal();
                }
                break;
              case Events.move:
                if (
                  (toAddress(arg1) && toAddress(arg1) === vowAddressToCheck) ||
                  (toAddress(arg2) && toAddress(arg2) === vowAddressToCheck)
                ) {
                  console.log("Move on vow address");
                  this._checkStateAndHeal();
                }
                break;
              case Events.fold:
                if (toAddress(arg2) && toAddress(arg2) === vowAddressToCheck) {
                  console.log("Fold called");
                  this._checkStateAndHeal();
                }
                break;
              case Events.suck:
                if (
                  (toAddress(arg1) && toAddress(arg1) === vowAddressToCheck) ||
                  (toAddress(arg2) && toAddress(arg2) === vowAddressToCheck)
                ) {
                  console.log("Suck on vow address");
                  this._checkStateAndHeal();
                }
                break;
              default:
                break;
            }
          });
        });
      }
    );
  }

  /**
   * Check the state of vow contract, start auction or heal if needed
   */
  private async _checkVowState() {
    const vowState = await this._getVowState();
    const canFlap = Vow.canFlap(vowState);
    if (canFlap) {
      console.log("Surplus auction can be started.");
      await this._startSurplusAuction();
    }
    const canFlop = Vow.canFlop(vowState);
    if (canFlop) {
      console.log("Debt auction can be started.");
      await this._startDebtAuction();
    }

    const { fixedSurplusAuctionSize, fixedDebtAuctionSize } = vowState;
    const minHealingAmount = fixedDebtAuctionSize.lt(fixedSurplusAuctionSize)
      ? fixedDebtAuctionSize
      : fixedSurplusAuctionSize;
    const [healingAmount, shouldHeal] = Vow.calculateHealingAmount(vowState);
    if (
      healingAmount.gt(0) &&
      (shouldHeal || healingAmount.gte(minHealingAmount))
    ) {
      await this._heal(healingAmount);
    }
  }

  /**
   * Check the state of vow contract, heal if needed
   */
  private async _checkStateAndHeal() {
    const vowState = await this._getVowState();
    const { fixedSurplusAuctionSize, fixedDebtAuctionSize } = vowState;
    const minHealingAmount = fixedDebtAuctionSize.lt(fixedSurplusAuctionSize)
      ? fixedDebtAuctionSize
      : fixedSurplusAuctionSize;
    const [healingAmount, shouldHeal] = Vow.calculateHealingAmount(vowState);
    if (shouldHeal || healingAmount.gte(minHealingAmount)) {
      this._heal(healingAmount);
    }
  }

  /**
   * Listen to flapper contract, check if the auction has started
   */
  private async _handleSurplusAuctionEvents() {
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

  /**
   * Listen to flopper contract, check if the auction has started
   */
  private async _handleDebtAuctionEvents() {
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

  /**
   * Start surplus auction
   */
  private async _startSurplusAuction() {
    console.log("Starting surplus auction.");
    this.vow.flap().catch((e) => {
      console.log(
        ` Surplus auction cannot be started with reason: ${e.error.reason}`
      );
    });
  }

  /**
   * Start debt auction
   */
  private async _startDebtAuction() {
    console.log("Starting debt auction.");
    this._submitTx(this.vow.flop());
  }

  /**
   * Call heal()
   * @param healingAmount Amount to heal
   */
  private async _heal(healingAmount: BigNumber) {
    console.log(`Healing with ${healingAmount.toString()}`);
    this._submitTx(this.vow.heal(healingAmount));
  }

  /**
   * Acquire the state of vow contract
   * @returns State of vow contract
   */
  private async _getVowState(): Promise<VowState> {
    /**
     * dai
     */
    const availableDai = await this.vat.dai(this.vow.address);
    /**
     * sin
     */
    const unbackedDai = await this.vat.sin(this.vow.address);
    /**
     * Sin
     */
    const queuedDebt = await this.vow.Sin();
    /**
     * Ash
     */
    const onAuctionDebt = await this.vow.Ash();
    /**
     * bump
     */
    const fixedSurplusAuctionSize = await this.vow.bump();
    /**
     * sump
     */
    const fixedDebtAuctionSize = await this.vow.sump();
    /**
     * hump
     */
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

  /**
   * Check if surplus auction can be started
   * @param vowState State of vow contract
   * @returns
   */
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

  /**
   * Check if debt auction can be started
   * @param vowState State of vow contract
   * @returns
   */
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

  /**
   * Calculate healing amount and return a flag indicating whether an auction can be
   * started
   * @param vowState State of vow contract
   * @returns
   */
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

    // If the debt or the surplus is 0, return [0, false]
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
