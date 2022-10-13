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

  const provider = new ethers.providers.JsonRpcProvider(envs.RPC_HOST);
  const signer = ethers.Wallet.fromMnemonic(envs.MNEMONIC).connect(provider);

  const vatAddress = "0xA950524441892A31ebddF91d3cEEFa04Bf454466";

  const vow = new Vow({
    vowAddress: envs.VOW_ADDRESS,
    vatAddress: vatAddress,
    signer,
  });

  vow.start();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
