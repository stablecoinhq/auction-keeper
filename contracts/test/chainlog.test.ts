import { ChainLog, Contract } from "@auction-keeper/core";
import { expect } from "chai";
import { ethers } from "hardhat";
import { forkNetwork } from "./util";

describe("Chainlog", () => {
  it("Should fetch all contract address properly", async () => {
    await forkNetwork("goerli", 7949089);
    const chainlog = new ChainLog({
      address: "0xA25435EFc77767e17CB41dA5c33685d6bDEc1f61",
      provider: ethers.provider,
    });
    const contracts: Contract[] = [
      "MCD_ADM",
      "MCD_PAUSE",
      "MCD_DOG",
      "MCD_FLAP",
      "MCD_FLOP",
      "MCD_VOW",
      "MCD_VAT",
      "MCD_GOV",
      "MCD_JOIN_DAI",
      "MCD_DAI",
    ];
    const dict: Map<Contract, string> = new Map();
    await Promise.all(
      contracts.map(async (k) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const address = await chainlog.getAddressOf(k as Contract);
        dict.set(k, address);
      })
    );
    expect(dict.get("MCD_ADM")).eq(
      "0x8c7FAeFDCE1438cF99B6654C3c3De3816eC0e879"
    );
    expect(dict.get("MCD_PAUSE")).eq(
      "0x07d37F3B95C35C88C6Ed4B12689D317Dbc7c681C"
    );
    expect(dict.get("MCD_DOG")).eq(
      "0x85D5AFA199d212189fb4ed397245f93fA4514D27"
    );
    expect(dict.get("MCD_FLAP")).eq(
      "0x66cfE4CC02505f2BB19C5147A68F376E5F92f798"
    );
    expect(dict.get("MCD_FLOP")).eq(
      "0x53EEc18c7178f1317d8D7DFc124f37Ed3ba36769"
    );
    expect(dict.get("MCD_VOW")).eq(
      "0xd3563E656734650251556E7604dd24C3da9342B3"
    );
    expect(dict.get("MCD_VAT")).eq(
      "0x1b1FE236166eD0Ac829fa230afE38E61bC281C5e"
    );
    expect(dict.get("MCD_GOV")).eq(
      "0xa1A07333CAfDFCaF5767961B2e2ac1d108e0e7A3"
    );
    expect(dict.get("MCD_JOIN_DAI")).eq(
      "0xC760D220eB874e323D072E3F3073C0e688CFD5D2"
    );
    expect(dict.get("MCD_DAI")).eq(
      "0xd3EbE14668bDa053605339B76996955d942b8B74"
    );
  });
});
