import { ethers } from "ethers";
import { getEnvs } from "./config";
import { Vow } from "@auction-keeper/core";

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

  const vatAddress = "0x35D1b3F3D7966A1DFe207aa4514C12a259A0492B";

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
