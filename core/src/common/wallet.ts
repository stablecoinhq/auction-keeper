import {
  TransactionRequest,
  TransactionResponse,
  Provider,
} from "@ethersproject/providers";
import { ExternallyOwnedAccount } from "@ethersproject/abstract-signer";
import { SigningKey } from "@ethersproject/signing-key";
import { Wallet as EtherWallet, BytesLike, Wordlist } from "ethers";
import { Deferrable } from "ethers/lib/utils";
import { defaultPath, HDNode } from "@ethersproject/hdnode";
import { AsyncLock } from "./util";

/**
 * Customized wallet class
 * https://docs.ethers.io/ethers.js/v3.0/html/api-contract.html#custom-signer
 */
export class Wallet extends EtherWallet {
  private static instance: Wallet;
  private lock: AsyncLock = new AsyncLock();
  // Singleton constructor
  constructor(
    privateKey: BytesLike | ExternallyOwnedAccount | SigningKey,
    provider?: Provider
  ) {
    super(privateKey, provider);
    if (!Wallet.instance) {
      return this;
    } else {
      return Wallet.instance;
    }
  }

  // Use lock to make sure nonce does not overlap
  override async sendTransaction(
    transaction: Deferrable<TransactionRequest>
  ): Promise<TransactionResponse> {
    return this.lock.run(async () => {
      const result = await super.sendTransaction(transaction);
      console.log(`Transaction ${result.hash} submitted`)
      return result;
    });
  }

  override connect(provider: Provider): Wallet {
    return new Wallet(this, provider);
  }

  static fromMnemonic(
    mnemonic: string,
    path?: string | undefined,
    wordlist?: Wordlist | undefined
  ): Wallet {
    if (!path) {
      path = defaultPath;
    }
    return new Wallet(
      HDNode.fromMnemonic(mnemonic, undefined, wordlist).derivePath(path)
    );
  }
}
