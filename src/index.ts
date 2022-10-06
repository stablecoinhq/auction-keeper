import { ethers } from "ethers";

import { Vat__factory } from "../types/ethers-contracts/factories/Vat__factory";

import { parseEventsAndGroup, parseEventAndGroup } from "./event-parser";
import { Dog__factory } from "../types/ethers-contracts";
import { displayUnits, Unit } from "./units";
import { checkUrns } from "./dog";

require("dotenv").config();

const envs = {
  RPC_HOST: process.env.RPC_HOST || "",
  VAT_ADDRESS: process.env.VAT_ADDRESS || "",
  DOG_ADDRESS: process.env.DOG_ADDRESS || "",
  MNEMONICS: process.env.MNEMONICS || "",
};

process.on("SIGINT", function () {
  console.log("\nGracefully shutting down from SIGINT (Ctrl-C)");
  // some other closing procedures go here
  process.exit(0);
});

async function main() {
  const signer = ethers.Wallet.fromMnemonic(envs.MNEMONICS);
  const provider = new ethers.providers.JsonRpcProvider(envs.RPC_HOST);
  signer.connect(provider);
  console.log({
    RPC_HOST: envs.RPC_HOST,
    VAT_ADDRESS: envs.VAT_ADDRESS,
    DOG_ADDRESS: envs.DOG_ADDRESS,
    SIGNER_ADDRESS: signer.address,
  });
  const vat = Vat__factory.connect(envs.VAT_ADDRESS, provider);
  const dog = Dog__factory.connect(envs.DOG_ADDRESS, provider);
  const isVatLive = (await vat.live()).eq(1);
  const isDogLive = (await dog.live()).eq(1);

  if (!isVatLive) {
    return console.log(`Vat ${vat.address} is not live`);
  }

  if (!isDogLive) {
    return console.log(`Dog ${dog.address} is not live`);
  }

  const Hole = await dog.Hole();
  const Dirt = await dog.Dirt();
  console.log(`dog.Hole, ${displayUnits(Hole, Unit.Rad)}`);
  console.log(`dog.Dirt, ${displayUnits(Dirt, Unit.Rad)}`);

  console.log("Fetching past events...");
  const eventsFilter =
    vat.filters["LogNote(bytes4,bytes32,bytes32,bytes32,bytes)"]();
  const events = await vat.queryFilter(eventsFilter, 7287536, "latest");
  const eventRawData = events.map((logNoteEvent) => {
    return logNoteEvent.data;
  });
  const urnsByIlk = parseEventsAndGroup(eventRawData);
  for (const u of urnsByIlk) {
    const unsafeVaults = await checkUrns(vat, dog, Hole, Dirt, u);
    for (const { ilk, address } of unsafeVaults) {
      console.log(`Barking at: ${ilk}, ${address}`);
      await dog.bark(ilk, address, signer.address);
    }
  }

  console.log("Start listening to ongoing events...");
  vat.on(eventsFilter, async (...args) => {
    const [, , , , , logNoteEvent] = args;
    const urnsByIlk = parseEventAndGroup(logNoteEvent.address);
    for (const u of urnsByIlk) {
      const unsafeVaults = await checkUrns(vat, dog, Hole, Dirt, u);
      console.log("Unsafe vaults", unsafeVaults);
      for (const { ilk, address } of unsafeVaults) {
        console.log(`Barking at: ${ilk}, ${address}`);
        await dog.bark(ilk, address, signer.address);
      }
    }
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
