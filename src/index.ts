import { ethers } from "ethers";

import Dog from "./dog";
import Clip from "./clip";

const ENV_PATH = process.env.ENV_PATH ? process.env.ENV_PATH : ".env";

console.log(ENV_PATH);
require("dotenv").config({ path: ENV_PATH });

const addresses = JSON.parse(process.env.ADDRESSES ? process.env.ADDRESSES : "[]");
console.log(addresses);
const envs = {
  RPC_HOST: process.env.RPC_HOST!,
  VAT_ADDRESS: process.env.VAT_ADDRESS!,
  DOG_ADDRESS: process.env.DOG_ADDRESS!,
  MNEMONIC: process.env.MNEMONIC!,
  CLIP_ADDRESS: process.env.CLIP_ADDRESS!,
  FROM_BLOCK: parseInt(process.env.FROM_BLOCK!),
  ADDRESSES: addresses
};

process.on("SIGINT", function () {
  console.log("\nGracefully shutting down from SIGINT (Ctrl-C)");
  // some other closing procedures go here
  process.exit(0);
});

async function main() {
  // singletonにする
  const provider = new ethers.providers.JsonRpcProvider(envs.RPC_HOST);
  const signer = ethers.Wallet.fromMnemonic(envs.MNEMONIC).connect(provider);
  
  console.log({
    RPC_HOST: envs.RPC_HOST,
    DOG_ADDRESS: envs.DOG_ADDRESS,
    CLIP_ADDRESS: envs.CLIP_ADDRESS,
    SIGNER_ADDRESS: signer.address,
  });
  const dog = new Dog({
    dogAddress: envs.DOG_ADDRESS,
    addresses: envs.ADDRESSES,
    signer: signer,
    provider: provider,
    fromBlock: envs.FROM_BLOCK,
  });
  dog.start();
  // // 複数のClipを監視できるようにする
  // const clip = new Clip({
  //   clipAddress: envs.CLIP_ADDRESS,
  //   signer: signer,
  //   provider: provider,
  // });
  // Promise.all([dog.start(), clip.start()]);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
