import { ethers } from "ethers";

// 全てのサービスの基本クラス
export default abstract class BaseService {
  processedTxHashes: Set<string> = new Set();

  constructor(protected readonly signer: ethers.Wallet) {}

  // 開始
  abstract start(): Promise<void>;

  // 同じイベントは処理しない
  protected async _processEvent(
    event: { transactionHash: string },
    processFunction: () => Promise<void>
  ): Promise<void> {
    if (this.processedTxHashes.has(event.transactionHash)) {
      console.log(`Event ${event.transactionHash} already processed`);
      return;
    } else {
      console.log(`Processing event ${event.transactionHash}`);
      this.processedTxHashes.add(event.transactionHash);
      await processFunction();
    }
  }

  // トランザクション発行時に例外を処理する
  protected async _submitTx<T>(txEvent: Promise<T>) {
    txEvent.catch((e) => {
      if ("error" in e) {
        console.log(`Transaction failed with error ${e.error.reason}`);
      } else {
        console.log(e);
      }
    });
  }
}
