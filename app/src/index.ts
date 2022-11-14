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
  createDataSource,
  Database,
  ChainLog,
} from "@auction-keeper/core";
import { getEnvs } from "./config";

loadConfig();

const logger = getLogger();

process.on("SIGINT", () => {
  logger.info("Gracefully shutting down from SIGINT (Ctrl-C)");
  // some other closing procedures go here
  process.exit(0);
});

async function main() {
  const envs = getEnvs();

  // singletonにする
  const provider = new WebSocketProvider(envs.RPC_HOST);
  const dataSource = await createDataSource(Database.file);
  const signer = Wallet.fromMnemonic(envs.MNEMONIC).connect(provider);
  const chainlog = new ChainLog({ address: envs.CHAINLOG_ADDRESS, provider });

  const dogAddress = await chainlog.getAddressOf("MCD_DOG");
  const vowAddress = await chainlog.getAddressOf("MCD_VOW");
  const vatAddress = await chainlog.getAddressOf("MCD_VAT");
  const chiefAddress = await chainlog.getAddressOf("MCD_ADM");
  const pauseAddress = await chainlog.getAddressOf("MCD_PAUSE");
  const flapperAddress = await chainlog.getAddressOf("MCD_FLAP");
  const flopperAddress = await chainlog.getAddressOf("MCD_FLOP");

  const dog = new Dog({
    dogAddress,
    signer,
    fromBlock: envs.FROM_BLOCK,
    toBlock: envs.TO_BLOCK,
    dataSource,
  });

  const vow = new Vow({
    vowAddress,
    vatAddress,
    signer,
  });

  const chief = new Chief({
    chiefAddress,
    pauseAddress,
    fromBlock: envs.FROM_BLOCK,
    toBlock: envs.TO_BLOCK,
    signer,
    dataSource,
  });

  const surplusAuction = new Auction({
    auctionType: "surplus",
    auctionAddress: flapperAddress,
    signer,
  });

  const debtAuction = new Auction({
    auctionType: "debt",
    auctionAddress: flopperAddress,
    signer,
  });

  const clipAddresses = await dog.getClipAddresses(envs.ILKS);

  logger.info(
    JSON.stringify(
      {
        DOG_ADDRESS: dogAddress,
        VOW_ADDRESS: vowAddress,
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
