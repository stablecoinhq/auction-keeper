import { ContractTransaction } from "ethers";
import { Logger } from "winston";
import { WebClient } from "@slack/web-api";
import { AsyncLock } from "./util";
import { Wallet } from "./wallet";
import { WebSocketProvider } from "./provider";
import { getLogger } from "./logger";
import { loadConfig } from "./config";

/**
 * Base class for all services
 */
export abstract class BaseService {
  protected logger: Logger;

  protected web: WebClient | undefined;

  protected channel: string | undefined;

  processedTxHashes: Set<string> = new Set();

  private lock = new AsyncLock();

  constructor(
    protected readonly signer: Wallet,
    private readonly contractAddress: string
  ) {
    this.logger = getLogger().child({ service: this.constructor.name });
    loadConfig();
    const { SLACK_TOKEN, SLACK_CHANNEL } = process.env;
    if (SLACK_TOKEN && SLACK_CHANNEL) {
      this.web = new WebClient(process.env.SLACK_TOKEN);
      this.channel = SLACK_CHANNEL;
    }
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

  /**
   * Send notification via slack api
   * @param msg Message to send
   */
  protected async notify(msg: string): Promise<void> {
    if (this.web && this.channel) {
      await this.web.chat.postMessage({
        channel: this.channel,
        text: msg,
      });
    }
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
    txEvent: Promise<ContractTransaction | undefined>,
    context: string
  ): Promise<ContractTransaction | undefined> {
    this.logger.info(`Submitting transaction for: ${context}`);
    await this.notify(context);
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
