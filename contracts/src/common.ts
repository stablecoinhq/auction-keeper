import { ethers, network } from "hardhat";
import { BigNumber } from "ethers";
import { Wallet } from "@auction-keeper/core";

export async function forkNetwork(n?: number): Promise<void> {
  const rpcURL = `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY!}`;
  const forkObj = n
    ? {
        jsonRpcUrl: rpcURL,
        blockNumber: n,
      }
    : { jsonRpcUrl: rpcURL };
  await network.provider.request({
    method: "hardhat_reset",
    params: [
      {
        forking: forkObj,
      },
    ],
  });
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const VOID_ADDRESS = "0x0000000000000000000000000000000000000000";

export const signer = Wallet.fromMnemonic(
  "test test test test test test test test test test test junk"
).connect(ethers.provider);

export const VOW_ADDRESS = "0xA950524441892A31ebddF91d3cEEFa04Bf454466";
export const VAT_ADDRESS = "0x35D1b3F3D7966A1DFe207aa4514C12a259A0492B";

export const Units = {
  WAD: BigNumber.from(10).pow(18),
  RAY: BigNumber.from(10).pow(27),
  RAD: BigNumber.from(10).pow(45),
};

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

export const Commands = {
  vow: toHex("vow"),
  Hole: toHex("Hole"),
  hole: toHex("hole"),
  clip: toHex("clip"),
  chop: toHex("chop"),
  buf: toHex("buf"),
  spot: toHex("spot"),
  lid: toHex("lid"),
  sump: toHex("sump"),
  bump: toHex("bump"),
  dump: toHex("dump"),
  hump: toHex("hump"),
  wait: toHex("wait"),
  Line: toHex("Line"),
  ttl: toHex("ttl"),
  tau: toHex("tau"),
};

export const ilk = toHex("ETH-A");
