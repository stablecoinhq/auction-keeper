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

const VOID =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

export interface ChiefConfig {
  chiefAddress: string;
  pauseAddress: string;
  signer: Wallet;
}
export class Chief extends BaseService {
  readonly chief: ChiefContract;

  readonly pause: DsPauseContract;

  readonly slates: Map<string, Set<string>> = new Map<string, Set<string>>();

  readonly schedulers: Map<string, NodeJS.Timeout> = new Map();

  constructor(args: ChiefConfig) {
    const { chiefAddress, pauseAddress, signer } = args;
    super(signer, chiefAddress);
    this.chief = Chief__factory.connect(chiefAddress, this.signer);
    this.pause = DsPause__factory.connect(pauseAddress, this.signer);
  }

  async start(): Promise<void> {
    this._handleChiefEvents();
    this._handleEtch();
    this._handlePauseEvents();
  }

  // 過去のEtchイベントを取得する
  // dbに格納する
  // そのslateからspell address一覧を取得して
  // それぞれのspell addressのapproveがhatより上回っているか確認する

  private _handleChiefEvents() {
    [
      FunctionSigs.free,
      FunctionSigs.lift,
      FunctionSigs.lock,
      FunctionSigs.voteByAddresses,
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
              await this._checkAllSpells();
              break;
            // Get the value of msg.sender
            // Then lookup who the user is voting for
            case FunctionSigs.lock: {
              const etch = await this.chief.votes(eventTx.address);
              await this._checkSpellCanBeLifted(etch);
              break;
            }
            // vote
            // First argument is an etch, so get the list of spell addresses for that etch and
            // check whether the approve of each spell address is greater than hat.
            case FunctionSigs.voteByAddresses:
            case FunctionSigs.voteBySlate: {
              const [, etch] = eventTx.topics;
              await this._checkSpellCanBeLifted(etch);
              break;
            }

            // When lift is emitted, schedule spell
            case FunctionSigs.lift:
              await this._scheduleSpell();
              break;
            default:
              break;
          }
        });
      });
    });
  }

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
        // The one who calls plot is the DssExec contract
        await this._executeSpell(eventTx.address);
      });
    });
  }

  private async _checkSpellCanBeLifted(etch: string) {
    const spellAddresses = await this.getSpellAddressesByEtch(etch);
    let spellWithApproval = {
      spellAddress: "0x",
      approval: BigNumber.from(0),
    };
    for (const spellAddress of spellAddresses.values()) {
      const approval = await this.chief.approvals(spellAddress);
      if (approval.gte(spellWithApproval.approval)) {
        spellWithApproval = { spellAddress, approval };
      }
    }
    const hat = await this.chief.hat();
    const hatApproval = await this.chief.approvals(hat);
    if (spellWithApproval.approval.gt(hatApproval)) {
      await this.chief.lift(spellWithApproval.spellAddress);
    }
  }

  private async _checkAllSpells() {
    let spellWithApproval = {
      spellAddress: "0x",
      approval: BigNumber.from(0),
    };
    for (const spellAddresses of this.slates.values()) {
      for (const spellAddress of spellAddresses.values()) {
        const approval = await this.chief.approvals(spellAddress);
        if (approval.gte(spellWithApproval.approval)) {
          spellWithApproval = { spellAddress, approval };
        }
      }
    }
    const hat = await this.chief.hat();
    const hatApproval = await this.chief.approvals(hat);
    if (spellWithApproval.approval.gt(hatApproval)) {
      await this.chief.lift(spellWithApproval.spellAddress);
    }
  }

  private async _scheduleSpell() {
    const hat = await this.chief.hat();
    const spell = DssExec__factory.connect(hat, this.signer);
    // hat could could be some random adress
    try {
      const done = await spell.done();
      const eta = await spell.eta();
      if (!done && eta.gt(0)) {
        const result = await this._submitTx(
          spell.schedule(),
          `Scheduling spell ${spell.address}`
        );
        return result;
      }
      return undefined;
    } catch {
      console.log(`hat ${hat} is not a spell therefore cannot be executed`);
      return undefined;
    }
  }

  private async _executeSpell(address: string) {
    const BUFFER = 60 * 1000;
    if (!this.schedulers.has(address)) {
      const spell = DssExec__factory.connect(address, this.signer);
      const nextCastTime = await spell.nextCastTime();
      const now = Math.floor(new Date().getTime() / 10 ** 3);
      const delta = nextCastTime.toNumber() - now;
      if (delta <= 0) {
        await spell.cast();
      } else {
        const timerId = setTimeout(() => {
          void spell.cast();
        }, delta * (10 ** 3) + BUFFER);
        this.schedulers.set(address, timerId);
      }
    }
  }

  private _handleEtch() {
    const eventFilter = this.chief.filters.Etch();
    this.chief.on(eventFilter, (etch, eventTx) => {
      this._processEvent(eventTx, async () => {
        const spells = await this.getSpellAddressesByEtch(etch);
        this.slates.set(etch, spells);
      });
    });
  }

  async getSpellAddressesByEtch(etch: string): Promise<Set<string>> {
    const spellAddresses: Set<string> = new Set();
    if (etch === VOID) {
      return spellAddresses;
    }
    let i = 0;
    let keepGoing = true;
    while (keepGoing) {
      const spellAddress = await this.chief.slates(etch, i).catch(() => {
        console.log(`Slate ${i} does not exist`);
        return undefined;
      });
      if (spellAddress) {
        i += 1;
        spellAddresses.add(spellAddress);
      } else {
        keepGoing = false;
      }
    }

    return spellAddresses;
  }
}
