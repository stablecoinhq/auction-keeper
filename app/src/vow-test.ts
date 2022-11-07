import { Vow, Wallet, WebSocketProvider } from "@auction-keeper/core";
import { getEnvs } from "./config";

const ENV_PATH = process.env.ENV_PATH || ".env";

require("dotenv").config({ path: ENV_PATH });

process.on("SIGINT", () => {
  console.log("\nGracefully shutting down from SIGINT (Ctrl-C)");
  // some other closing procedures go here
  process.exit(0);
});

async function main() {
  const envs = getEnvs();

  console.log(envs);

  const provider = new WebSocketProvider(envs.RPC_HOST);
  const signer = Wallet.fromMnemonic(envs.MNEMONIC).connect(provider);

  const vow = new Vow({
    vowAddress: envs.VOW_ADDRESS,
    vatAddress: process.env.VAT_ADDRESS!,
    signer,
  });

  await vow.start();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
