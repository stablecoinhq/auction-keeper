import { ethers } from "ethers";

import { Vat__factory } from "../types/ethers-contracts/factories/Vat__factory";

import { parseEventsAndGroup, parseEventAndGroup } from "./event-parser";
import { Dog__factory } from "../types/ethers-contracts";
import { convert, Unit } from "./units";
import { checkUrns } from "./dog";

require("dotenv").config();

const envs = {
  RPC_HOST: process.env.RPC_HOST || "",
  VAT_ADDRESS: process.env.VAT_ADDRESS || "",
  DOG_ADDRESS: process.env.DOG_ADDRESS || "",
};

console.log(envs);

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(envs.RPC_HOST);
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
  console.log(`dog.Hole, ${convert(Hole, Unit.Rad)}`);
  console.log(`dog.Dirt, ${convert(Dirt, Unit.Rad)}`);

  console.log("Fetching past events...");
  const eventsFilter =
    vat.filters["LogNote(bytes4,bytes32,bytes32,bytes32,bytes)"]();
  const events = await vat.queryFilter(eventsFilter, 7662016, "latest");
  const eventRawData = events.map((logNoteEvent) => {
    return logNoteEvent.data;
  });
  const urnsByIlk = parseEventsAndGroup(eventRawData);
  for (const u of urnsByIlk) {
    const barks = await checkUrns(vat, dog, Hole, Dirt, u);
    console.log("Unsafe vault", barks);
  }

  console.log("Start listening to ongoing events...");
  vat.on(eventsFilter, async (...args) => {
    const [, , , , , logNoteEvent] = args;
    const urnsByIlk = parseEventAndGroup(logNoteEvent.address);
    for (const u of urnsByIlk) {
      const unsafeVaults = await checkUrns(vat, dog, Hole, Dirt, u);
      console.log("Unsafe vaults", unsafeVaults);
    }
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
