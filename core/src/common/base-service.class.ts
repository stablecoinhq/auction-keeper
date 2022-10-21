import { ContractTransaction, ethers } from "ethers";

/**
 * Base class for all services
 */
export default abstract class BaseService {
  processedTxHashes: Set<string> = new Set();

  constructor(protected readonly signer: ethers.Wallet) {}

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
    if (this.processedTxHashes.has(event.transactionHash)) {
      return;
    } else {
      this.processedTxHashes.add(event.transactionHash);
      await processFunction();
    }
  }

  // Handle exceptions when exception occurs
  // TODO: store db, send message via slack
  protected async _submitTx(
    txEvent: Promise<ContractTransaction | undefined>
  ): Promise<ContractTransaction | undefined> {
    const result = await txEvent.catch((e) => {
      if ("error" in e) {
        console.log(`Transaction failed with error ${e.error.reason}`);
      } else {
        console.log(e.message);
      }
      return undefined;
    });
    if (result) {
      console.log(`Transaction submitted ${result.hash}`);
    }
    return result;
  }
}
