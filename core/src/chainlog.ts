import { Provider } from "@ethersproject/providers";
import {
  Chainlog as ChainLogContract,
  Chainlog__factory,
} from "./types/ether-contracts";

export interface ChainlogConfig {
  address: string;
  provider: Provider;
}

function asciiToHexa(str: string) {
  const arr = [];
  for (let n = 0, l = str.length; n < l; n += 1) {
    const hex = Number(str.charCodeAt(n)).toString(16);
    arr.push(hex);
  }
  return arr.join("");
}

function toHex(str: string) {
  const ARRAY_LENGTH = 64;
  const hex = asciiToHexa(str);
  const rest = "0".repeat(ARRAY_LENGTH - hex.length);
  return `0x${hex}${rest}`;
}

export type Contract =
  | "MCD_ADM"
  | "MCD_PAUSE"
  | "MCD_DOG"
  | "MCD_FLAP"
  | "MCD_FLOP"
  | "MCD_VOW"
  | "MCD_VAT"
  | "MCD_GOV"
  | "MCD_JOIN_DAI"
  | "MCD_DAI";

export class ChainLog {
  private chainlog: ChainLogContract;

  constructor(arg: ChainlogConfig) {
    const { address, provider } = arg;
    this.chainlog = Chainlog__factory.connect(address, provider);
  }

  async getAddressOf(contract: Contract) {
    return this.chainlog.getAddress(toHex(contract));
  }
}
