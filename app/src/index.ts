/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Dog,
  Clip,
  Vow,
  Auction,
  WebSocketProvider,
  Wallet,
  BaseService,
  getLogger,
  loadConfig,
  Chief,
} from "@auction-keeper/core";
import { getEnvs } from "./config";

loadConfig();

const logger = getLogger();

process.on("SIGINT", () => {
  logger.info("\nGracefully shutting down from SIGINT (Ctrl-C)");
  // some other closing procedures go here
  process.exit(0);
});

async function main() {
  const envs = getEnvs();

  // singletonにする
  const provider = new WebSocketProvider(envs.RPC_HOST);
  // const provider = new ethers.providers.JsonRpcProvider(envs.RPC_HOST);

  const signer = Wallet.fromMnemonic(envs.MNEMONIC).connect(provider);
  const dog = new Dog({
    dogAddress: envs.DOG_ADDRESS,
    signer,
    fromBlock: envs.FROM_BLOCK,
    toBlock: envs.TO_BLOCK,
    dataStoreMode: "file",
  });
  const vatAddress = await dog.getVatAddress();

  const vow = new Vow({
    vowAddress: envs.VOW_ADDRESS,
    vatAddress,
    signer,
  });

  const chief = new Chief({
    chiefAddress: envs.CHIEF_ADDRESS,
    pauseAddress: envs.DS_PAUSE_ADDRESS,
    signer
  });

  const flapperAddress = await vow.flapperAddress();
  const surplusAuction = new Auction({
    auctionType: "surplus",
    auctionAddress: flapperAddress,
    signer,
  });

  const flopperAddress = await vow.flopperAddress();
  const debtAuction = new Auction({
    auctionType: "debt",
    auctionAddress: flopperAddress,
    signer,
  });

  const clipAddresses = await dog.getClipAddresses(envs.ILKS);

  logger.info(
    JSON.stringify(
      {
        DOG_ADDRESS: envs.DOG_ADDRESS,
        VOW_ADDRESS: envs.VOW_ADDRESS,
        SIGNER_ADDRESS: signer.address,
        VAT_ADDRESS: vatAddress,
        CLIP_ADDRESSES: clipAddresses,
      },
      null,
      1
    )
  );

  const clips = clipAddresses.map(
    ({ ilk, address }) =>
      new Clip({
        clipAddress: address,
        vatAddress,
        ilk,
        signer,
      })
  );

  await Promise.all(
    [chief].map(async (v) => {
      const service = v as unknown as BaseService;
      await service.start();
    })
  );
}

main().catch((e) => {
  logger.error(e);
});
