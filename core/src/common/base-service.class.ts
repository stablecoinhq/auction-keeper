import { ContractTransaction, ethers } from "ethers";
import { SimpleChannel } from "./channel";

interface EventJob {
  transactionHash: string;
  processFunction: () => Promise<void>;
}

/**
 * Base class for all services
 */
export default abstract class BaseService {
  // よくわからん。。SimpleChannelは本当に必要？
  processedTxHashes: Set<string> = new Set();
  private channel: SimpleChannel<EventJob> = new SimpleChannel<EventJob>();

  constructor(protected readonly signer: ethers.Wallet) {
    this.handleJobs(this.channel);
  }

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
    this.channel.send({
      transactionHash: event.transactionHash,
      processFunction,
    });
  }

  private async handleJobs(chan: SimpleChannel<EventJob>) {
    for await (const { transactionHash, processFunction } of chan) {
      if (this.processedTxHashes.has(transactionHash)) {
        console.log(`${transactionHash} already processed`);
        return;
      } else {
        console.log(`Processing ${transactionHash}`);
        await processFunction();
        this.processedTxHashes.add(transactionHash);
      }
    }
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
    if (result) {
      console.log(`Transaction submitted ${result.hash}`);
    }
    return result;
  }
}
