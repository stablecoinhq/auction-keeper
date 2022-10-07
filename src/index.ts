import { ethers } from "ethers";

import Dog from "./Dog/dog";
import Clip from "./clip";

require("dotenv").config();

const envs = {
  RPC_HOST: process.env.RPC_HOST!,
  VAT_ADDRESS: process.env.VAT_ADDRESS!,
  DOG_ADDRESS: process.env.DOG_ADDRESS!,
  MNEMONICS: process.env.MNEMONICS!,
  CLIP_ADDRESS: process.env.CLIP_ADDRESS!,
};

process.on("SIGINT", function () {
  console.log("\nGracefully shutting down from SIGINT (Ctrl-C)");
  // some other closing procedures go here
  process.exit(0);
});

async function main() {
  // singletonにする
  const signer = ethers.Wallet.fromMnemonic(envs.MNEMONICS);
  const provider = new ethers.providers.JsonRpcProvider(envs.RPC_HOST);

  console.log({
    RPC_HOST: envs.RPC_HOST,
    VAT_ADDRESS: envs.VAT_ADDRESS,
    DOG_ADDRESS: envs.DOG_ADDRESS,
    SIGNER_ADDRESS: signer.address,
  });
  const dog = new Dog({
    vatAddress: envs.VAT_ADDRESS,
    dogAddress: envs.DOG_ADDRESS,
    signer: signer,
    provider: provider,
  });
  const clip = new Clip({
    clipAddress: envs.CLIP_ADDRESS,
    signer: signer,
    provider: provider,
  });
  Promise.all([dog.start(), clip.start()]);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
