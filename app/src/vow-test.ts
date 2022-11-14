import {
  Vow,
  Wallet,
  WebSocketProvider,
  loadConfig,
  ChainLog,
} from "@auction-keeper/core";
import { getEnvs } from "./config";

loadConfig();

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
  const chainlog = new ChainLog({ address: envs.CHAINLOG_ADDRESS, provider });
  const vowAddress = await chainlog.getAddressOf("MCD_VOW");
  const vatAddress = await chainlog.getAddressOf("MCD_VAT");
  const vow = new Vow({
    vowAddress,
    vatAddress,
    signer,
  });

  await vow.start();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
