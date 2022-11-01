import { ContractTransaction, ethers } from "ethers";
import { AsyncLock } from "./util";
import { Wallet } from "./wallet";

/**
 * Base class for all services
 */
export abstract class BaseService {
  processedTxHashes: Set<string> = new Set();
  private lock = new AsyncLock();

  constructor(protected readonly signer: Wallet) {}

  /**
   * Start service
   */
  abstract start(): Promise<void>;

  /** Process events
   */
  protected async _processEvent(
    event: { transactionHash: string },
    processFunction: () => Promise<void>
  ): Promise<void> {
    const { transactionHash } = event;
    this.lock.run(async () => {
      if (this.processedTxHashes.has(transactionHash)) {
        console.log(`Event ${transactionHash} already processed`);
        return;
      } else {
        console.log(`Processing ${transactionHash}`);
        await processFunction();
        this.processedTxHashes.add(transactionHash);
      }
    });
  }

  // Handle exceptions when exception occurs
  // TODO: store db, send message via slack
  protected async _submitTx(
    txEvent: Promise<ContractTransaction | undefined>
  ): Promise<ContractTransaction | undefined> {
    const result = await txEvent.catch((e) => {
      if ("error" in e) {
        console.log(e.error);
      } else {
        console.log(e.message);
      }
      return undefined;
    });
    return result;
  }
}
