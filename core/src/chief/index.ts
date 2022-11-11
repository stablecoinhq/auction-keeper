/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-loop-func */
import { BigNumber } from "ethers";
import { BaseService } from "../common/base-service.class";
import { Wallet } from "../common/wallet";
import {
  Chief as ChiefContract,
  Chief__factory,
  DsPause__factory,
  DsPause as DsPauseContract,
  DssExec__factory,
} from "../types/ether-contracts";
import { FunctionSigs } from "./constants";
import { splitBlocks } from "../common/util";

const VOID =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

const VOID_ADDRESS = "0x0000000000000000000000000000000000000000";

export interface ChiefConfig {
  chiefAddress: string;
  pauseAddress: string;
  signer: Wallet;
  fromBlock: number;
  toBlock: number | "latest";
}

/**
 * Chief is responsible for
 * 1. Lifting spell
 * 2. Scheduling spell
 * 3. Executing scheduled spell
 */
export class Chief extends BaseService {
  readonly chief: ChiefContract;

  readonly pause: DsPauseContract;

  readonly slates: Map<string, Set<string>> = new Map<string, Set<string>>();

  readonly schedulers: Map<string, NodeJS.Timeout> = new Map();

  readonly fromBlock: number;

  readonly toBlock: number | "latest";

  constructor(args: ChiefConfig) {
    const { chiefAddress, pauseAddress, signer, fromBlock, toBlock } = args;
    super(signer, chiefAddress);
    this.fromBlock = fromBlock;
    this.toBlock = toBlock;
    this.chief = Chief__factory.connect(chiefAddress, this.signer);
    this.pause = DsPause__factory.connect(pauseAddress, this.signer);
  }

  async start(): Promise<void> {
    this.logger.info("Starting chief");
    await this._lookupFromPastEvents();
    const hat = await this.chief.hat();
    await this._scheduleSpell();
    await this._executeSpell(hat);
    this._handleChiefEvents();
    this._handleEtchEvent();
    this._handlePauseEvents();
  }

  /**
   * Fetch past etch events
   */
  private async _lookupFromPastEvents() {
    this.logger.info("Fetching past events...");
    const latestBlock =
      this.toBlock === "latest"
        ? await this.signer.provider.getBlockNumber()
        : this.toBlock;
    const bunch = splitBlocks(this.fromBlock, latestBlock);
    const etches: Set<string> = new Set();
    if (this.fromBlock <= latestBlock) {
      this.logger.info(
        `Fetching vault data from past events from: ${this.fromBlock}, to: ${latestBlock}`
      );
      await Promise.all(
        bunch.map(async ({ from, to }) => {
          const es = await this._getPastEvents(from, to);
          for (const e of es) {
            etches.add(e);
          }
        })
      );
    }
    for (const etch of etches.values()) {
      const addresses = await this.getAddressesByEtch(etch);
      this.slates.set(etch, addresses);
    }
    this.logger.info("Finished fetching past events");
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
    to: number | "latest"
  ): Promise<string[]> {
    const eventFilter = this.chief.filters["Etch(bytes32)"]();
    const events = await this.chief.queryFilter(eventFilter, from, to);
    const eventRawData = events.map((event) => event.args[0]);
    return eventRawData;
  }

  /**
   * Handle events emitted from chief contract
   */
  private _handleChiefEvents() {
    [
      FunctionSigs.free,
      FunctionSigs.lift,
      FunctionSigs.lock,
      FunctionSigs.voteBySlate,
    ].forEach((functionSig) => {
      const eventFilter =
        this.chief.filters[
          "LogNote(bytes4,address,bytes32,bytes32,uint256,bytes)"
        ](functionSig);
      this.chief.on(eventFilter, (strEventTx) => {
        const eventTx = strEventTx as any as {
          topics: string[];
          data: string;
          transactionHash: string;
          blockNumber: number;
          address: string;
        };
        this._processEvent(eventTx, async () => {
          switch (functionSig) {
            // Free
            // You have to run through all the spell addresses in order to find out
            // who is the hat.
            case FunctionSigs.free:
              this.logger.info(`Address ${eventTx.address} freed some votes`);
              await this._checkAllAddresses();
              break;
            // Get the value of msg.sender
            // Then lookup who the user is voting for
            case FunctionSigs.lock: {
              this.logger.info(`Address ${eventTx.address} added some votes`);
              const etch = await this.chief.votes(eventTx.address);
              await this._checkAddressCanBeLifted(etch);
              break;
            }
            // vote
            // First argument is an etch, so get the list of spell addresses for that etch and
            // check whether the approval of each spell address is greater than of the hat.
            case FunctionSigs.voteBySlate: {
              const [, etch] = eventTx.topics;
              this.logger.info(
                `Address ${eventTx.address} voted on slate ${etch}`
              );
              await this._checkAddressCanBeLifted(etch);
              break;
            }

            // When lift is emitted, schedule spell
            case FunctionSigs.lift:
              this.logger.info("Hat was lifted, scheduling spell");
              await this._scheduleSpell();
              break;
            default:
              break;
          }
        });
      });
    });
  }

  /**
   * Handle events emitted from ds-pause
   */
  private _handlePauseEvents() {
    const eventFilter = this.pause.filters[
      "LogNote(bytes4,address,bytes32,bytes32,uint256,bytes)"
    ](FunctionSigs.plot);

    this.pause.on(eventFilter, (strEventTx) => {
      const eventTx = strEventTx as any as {
        topics: string[];
        data: string;
        transactionHash: string;
        blockNumber: number;
        address: string;
      };
      this._processEvent(eventTx, async () => {
        // 1st argument of plot() is spell address
        const [, addressArg] = eventTx.topics;
        const address = `0x${addressArg.slice(26)}`;
        await this._executeSpell(address);
      });
    });
  }

  /**
   * Handle Etch event from chief
   */
  private _handleEtchEvent() {
    const eventFilter = this.chief.filters["Etch(bytes32)"]();
    this.chief.on(eventFilter, (etch, eventTx) => {
      this._processEvent(eventTx, async () => {
        await this._checkAddressCanBeLifted(etch);
      });
    });
  }

  /**
   * Get list of addresses associated with given etch, then check whether any of them can be lifted
   * @param etch etch
   */
  private async _checkAddressCanBeLifted(etch: string) {
    const addresses = await this.getAddressesByEtch(etch);
    this.slates.set(etch, addresses);
    let spellWithApproval = {
      address: VOID_ADDRESS,
      approval: BigNumber.from(0),
    };
    for (const address of addresses.values()) {
      const approval = await this.chief.approvals(address);
      if (approval.gte(spellWithApproval.approval)) {
        spellWithApproval = { address, approval };
      }
    }
    const hat = await this.chief.hat();
    const hatApproval = await this.chief.approvals(hat);
    if (
      spellWithApproval.approval.gt(hatApproval) &&
      spellWithApproval.address !== VOID_ADDRESS
    ) {
      await this._submitTx(
        this.chief.lift(spellWithApproval.address),
        `Lifting address ${spellWithApproval.address} as hat`
      );
    }
  }

  /**
   * Check all addresses to see if any of them can be lifted
   */
  private async _checkAllAddresses() {
    let spellWithApproval = {
      address: VOID_ADDRESS,
      approval: BigNumber.from(0),
    };
    for (const addresses of this.slates.values()) {
      for (const address of addresses.values()) {
        const approval = await this.chief.approvals(address);
        if (approval.gte(spellWithApproval.approval)) {
          spellWithApproval = { address, approval };
        }
      }
    }
    const hat = await this.chief.hat();
    const hatApproval = await this.chief.approvals(hat);
    if (
      spellWithApproval.approval.gt(hatApproval) &&
      spellWithApproval.address !== VOID_ADDRESS
    ) {
      await this._submitTx(
        this.chief.lift(spellWithApproval.address),
        `Lifting address ${spellWithApproval.address} as hat`
      );
    }
  }

  /**
   * Schedule a spell
   */
  private async _scheduleSpell() {
    const hat = await this.chief.hat();
    this.logger.info(`Scheduling spell ${hat} to execute`);
    const spell = DssExec__factory.connect(hat, this.signer);
    // hat could could be some random adress
    try {
      const done = await spell.done();
      const eta = await spell.eta();
      if (!done && eta.lte(0)) {
        const result = await this._submitTx(
          spell.schedule(),
          `Scheduling spell ${spell.address}`
        );
        return result;
      }
      this.logger.info(`Spell ${hat} is already scheduled`);
      return undefined;
    } catch {
      this.logger.warn(
        `hat ${hat} is not a spell therefore cannot be executed`
      );
      return undefined;
    }
  }

  /**
   * Set time on executable spell
   */
  private async _executeSpell(address: string) {
    const BUFFER = 60 * 1000;
    if (!this.schedulers.has(address)) {
      const spell = DssExec__factory.connect(address, this.signer);
      const isDone = await spell.done();
      if (!isDone) {
        const nextCastTime = await spell.nextCastTime();
        const now = new Date().getTime();
        const delta = nextCastTime.toNumber() * 1000 - now;
        this.logger.debug(`Delta ${delta}`);
        if (delta <= 0) {
          const timerId = setTimeout(() => {
            void this._submitTx(
              spell.cast(),
              `Executing spell ${spell.address}`
            );
          }, BUFFER);
          this.schedulers.set(address, timerId);
        } else {
          const timerId = setTimeout(() => {
            void this._submitTx(
              spell.cast(),
              `Executing spell ${spell.address}`
            );
          }, delta + BUFFER);
          this.schedulers.set(address, timerId);
        }
      }
    }
  }

  async getAddressesByEtch(etch: string): Promise<Set<string>> {
    const addresses: Set<string> = new Set();
    if (etch === VOID) {
      return addresses;
    }
    let i = 0;
    let keepGoing = true;
    while (keepGoing) {
      const spellAddress = await this.chief
        .slates(etch, i)
        .catch(() => undefined);
      if (spellAddress) {
        i += 1;
        addresses.add(spellAddress);
      } else {
        keepGoing = false;
      }
    }

    return addresses;
  }
}
