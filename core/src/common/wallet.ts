// Create custom signer
// https://docs.ethers.io/ethers.js/v3.0/html/api-contract.html#custom-signer

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

//https://medium.com/@chris_marois/asynchronous-locks-in-modern-javascript-8142c877baf
class AsyncLock {
  promise: Promise<void>;
  disable: () => void;

  constructor() {
    this.disable = () => {};
    this.promise = Promise.resolve();
  }

  enable() {
    this.promise = new Promise((resolve) => (this.disable = resolve));
  }
}

export class Wallet extends EtherWallet {
  private static instance: Wallet;
  private lock: AsyncLock = new AsyncLock();
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

  override async sendTransaction(
    transaction: Deferrable<TransactionRequest>
  ): Promise<TransactionResponse> {
    await this.lock.promise;
    this.lock.enable();
    const result = await super.sendTransaction(transaction);
    console.log(`Transaction submitted ${result.hash}`);
    this.lock.disable();
    return result;
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
    console.log(`Instantiating new wallet`);
    return new Wallet(
      HDNode.fromMnemonic(mnemonic, undefined, wordlist).derivePath(path)
    );
  }
}
