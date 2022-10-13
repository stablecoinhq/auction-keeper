import { ethers } from "ethers";

import Dog from "./dog";
import Clip from "./clip";
import { getEnvs } from "./config";
import Vow from "./vow";

process.on("SIGINT", function () {
  console.log("\nGracefully shutting down from SIGINT (Ctrl-C)");
  // some other closing procedures go here
  process.exit(0);
});

async function main() {
  const ENV_PATH = process.env.ENV_PATH || ".env";

  require("dotenv").config({ path: ENV_PATH });

  const envs = getEnvs();

  console.log(envs);

  // singletonにする
  const provider = new ethers.providers.JsonRpcProvider(envs.RPC_HOST);
  const signer = ethers.Wallet.fromMnemonic(envs.MNEMONIC).connect(provider);
  const dog = new Dog({
    dogAddress: envs.DOG_ADDRESS,
    ilks: envs.ILKS,
    signer: signer,
    fromBlock: envs.FROM_BLOCK,
    toBlock: envs.TO_BLOCK,
  });

  const vatAddress = await dog.getVatAddress();

  const vow = new Vow({
    vowAddress: envs.VOW_ADDRESS,
    vatAddress: vatAddress,
    signer,
  });

  if (envs.RUN_CLIP === true) {
    const clipAddresses = await dog.getClipAddresses(envs.ILKS);

    console.log({
      RPC_HOST: envs.RPC_HOST,
      DOG_ADDRESS: envs.DOG_ADDRESS,
      VOW_ADDRESS: envs.VOW_ADDRESS,
      SIGNER_ADDRESS: signer.address,
      VAT_ADDRESS: vatAddress,
      CLIP_ADDRESSES: clipAddresses,
    });

    const clips = clipAddresses.map(({ ilk, address }) => {
      return new Clip({
        clipAddress: address,
        vatAddress: vatAddress,
        ilk: ilk,
        signer: signer,
      });
    });

    // これは事前にやっておく必要がある
    await Promise.all(
      clips.map(async (clip) => {
        clip.hope();
      })
    );

    Promise.all(
      [...clips, dog, vow].map((v) => {
        if (v instanceof Clip) {
          v.start();
        } else if (v instanceof Dog) {
          v.start();
        } else if (v instanceof Vow) {
          v.start();
        }
      })
    );
  } else {
    console.log({
      RPC_HOST: envs.RPC_HOST,
      DOG_ADDRESS: envs.DOG_ADDRESS,
      VOW_ADDRESS: envs.VOW_ADDRESS,
      SIGNER_ADDRESS: signer.address,
      VAT_ADDRESS: vatAddress,
    });
    dog.start();
    vow.start();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
