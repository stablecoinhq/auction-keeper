import { getEnvs } from "./config";
import {
  Dog,
  Clip,
  Vow,
  Auction,
  WebSocketProvider,
  Wallet,
  BaseService,
} from "@auction-keeper/core";

process.on("SIGINT", function () {
  console.log("\nGracefully shutting down from SIGINT (Ctrl-C)");
  // some other closing procedures go here
  process.exit(0);
});

async function main() {
  const ENV_PATH = process.env.ENV_PATH || ".env";

  require("dotenv").config({ path: ENV_PATH });

  const envs = getEnvs();

  // singletonにする
  const provider = new WebSocketProvider(envs.RPC_HOST);
  // const provider = new ethers.providers.JsonRpcProvider(envs.RPC_HOST);

  const signer = Wallet.fromMnemonic(envs.MNEMONIC).connect(provider);
  const dog = new Dog({
    dogAddress: envs.DOG_ADDRESS,
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

  const flapperAddress = await vow.flapperAddress();
  const surplusAuction = new Auction({
    auctionType: "surplus",
    auctionAddress: "0xCbac2F6865964712FfDaE404cd6a366914aB26c9",
    signer,
  });

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
    [surplusAuction].map((v) => {
      const service = v as unknown as BaseService;
      service.start();
    })
  );
}

main().catch((e) => {
  console.error(e);
});
