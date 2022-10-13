import { ethers } from "ethers";

import Dog from "./dog";
import Clip from "./clip";

const ENV_PATH = process.env.ENV_PATH ? process.env.ENV_PATH : ".env";

console.log(ENV_PATH);
require("dotenv").config({ path: ENV_PATH });

const ilks = JSON.parse(process.env.ILKS ? process.env.ILKS : "[]");


const toBlock: number | "latest" = (process.env.TO_BLOCK! === "latest") ? "latest" : parseInt(process.env.TO_BLOCK!);

const envs = {
  RPC_HOST: process.env.RPC_HOST!,
  DOG_ADDRESS: process.env.DOG_ADDRESS!,
  MNEMONIC: process.env.MNEMONIC!,
  FROM_BLOCK: parseInt(process.env.FROM_BLOCK!),
  TO_BLOCK: toBlock,
  ILKS: ilks,
};

console.log(envs);

process.on("SIGINT", function () {
  console.log("\nGracefully shutting down from SIGINT (Ctrl-C)");
  // some other closing procedures go here
  process.exit(0);
});

async function main() {
  // singletonにする
  const provider = new ethers.providers.JsonRpcProvider(envs.RPC_HOST);
  const signer = ethers.Wallet.fromMnemonic(envs.MNEMONIC).connect(provider);
  const dog = new Dog({
    dogAddress: envs.DOG_ADDRESS,
    ilks: envs.ILKS,
    signer: signer,
    provider: provider,
    fromBlock: envs.FROM_BLOCK,
    toBlock: envs.TO_BLOCK,
  });

  const clipAddresses = await dog.getClipAddresses(envs.ILKS);
  const vatAddress = await dog.getVatAddress();

  console.log({
    RPC_HOST: envs.RPC_HOST,
    DOG_ADDRESS: envs.DOG_ADDRESS,
    SIGNER_ADDRESS: signer.address,
    VAT_ADDRESS: vatAddress,
    CLIP_ADDRESSES: clipAddresses,
  });

  dog.start();

  // const clips = clipAddresses.map(({ ilk, address }) => {
  //   return new Clip({
  //     clipAddress: address,
  //     vatAddress: vatAddress,
  //     ilk: ilk,
  //     signer: signer,
  //   });
  // });

  // // これは事前にやっておく必要がある
  // await Promise.all(clips.map(async (clip) => {
  //   clip.hope();
  // }))

  // Promise.all(
  //   [...clips, dog].map((v) => {
  //     if (v instanceof Clip) {
  //       v.start();
  //     } else if (v instanceof Dog) {
  //       v.start();
  //     }
  //   })
  // );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
