import { ContractTransaction } from "ethers";
import { Logger } from "winston";
import { AsyncLock } from "./util";
import { Wallet } from "./wallet";
import { WebSocketProvider } from "./provider";
import { getLogger } from "./logger";

/**
 * Base class for all services
 */
export abstract class BaseService {
  protected logger: Logger;

  processedTxHashes: Set<string> = new Set();

  private lock = new AsyncLock();

  constructor(
    protected readonly signer: Wallet,
    private readonly contractAddress: string
  ) {
    this.logger = getLogger().child({ service: this.constructor.name });
  }

  /**
   * Register job to process when web socket is reconnected
   * @param job Job to run when reconnected
   */
  addReconnect(job: () => Promise<void>) {
    if (this.signer.provider instanceof WebSocketProvider) {
      this.signer.provider.onReconnect.set(
        `${this.constructor.name}-${this.contractAddress}`,
        job
      );
    }
  }

  /**
   * Start service
   */
  abstract start(): Promise<void>;

  stop() {
    this.signer.provider.removeAllListeners();
  }

  /** Process events
   */
  protected _processEvent(
    event: { transactionHash: string },
    processFunction: () => Promise<void>
  ): void {
    const { transactionHash } = event;
    this.lock
      .run(async () => {
        if (this.processedTxHashes.has(transactionHash)) {
          this.logger.debug(`Event ${transactionHash} already processed`);
        } else {
          this.logger.debug(`Processing event: ${transactionHash}`);
          await processFunction();
          this.processedTxHashes.add(transactionHash);
        }
      })
      .catch((e) => this.logger.warn(e));
  }

  // Handle exceptions when exception occurs
  // TODO: store db, send message via slack
  protected async _submitTx(
    txEvent: Promise<ContractTransaction | undefined>
  ): Promise<ContractTransaction | undefined> {
    const result = await txEvent.catch((e) => {
      if ("error" in e) {
        this.logger.warn(e.error);
      } else {
        this.logger.warn(e.message);
      }
      return undefined;
    });
    return result;
  }
}
