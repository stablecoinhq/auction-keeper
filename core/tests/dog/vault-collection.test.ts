import { ethers } from "ethers";
import { VaultCollection, Vault } from "../../src/dog/vault-collection";

function asciiToHexa(str: string) {
  const arr = [];
  for (let n = 0, l = str.length; n < l; n += 1) {
    const hex = Number(str.charCodeAt(n)).toString(16);
    arr.push(hex);
  }
  return arr.join("");
}

function toHex(str: string) {
  const ARRAY_LENGTH = 64;
  const hex = asciiToHexa(str);
  const rest = "0".repeat(ARRAY_LENGTH - hex.length);
  return `0x${hex}${rest}`;
}

function createAddress(): string {
  const ADDR_LENGTH = 20;
  const rand = ethers.utils.randomBytes(ADDR_LENGTH);
  return `${"0".repeat(24)}${Buffer.from(rand).toString("hex")}`;
}

const ETH = toHex("ETH-A");
const DAI = toHex("DAI-A");

describe("Vault collection", () => {
  describe("addVault", () => {
    it("Should properly add vault", () => {
      const v = new VaultCollection();
      const addr = createAddress();
      const added = v.addVault(ETH, addr);
      const list = added._vaults.get(ETH)!;
      expect(list.size).toBe(1);
      expect(list.has(addr)).toBe(true);
    });
    it("Should not have duplicate vault", () => {
      const v = new VaultCollection();
      const addr = createAddress();
      const added = v.addVault(ETH, addr).addVault(ETH, addr);
      const list = added._vaults.get(ETH)!;
      expect(list.size).toBe(1);
    });
    it("Register separately if the ILKs are different.", () => {
      const v = new VaultCollection();
      const addr = createAddress();
      const added = v.addVault(ETH, addr).addVault(DAI, addr);
      const list: Vault[] = [];
      for (const address of added.vaultEntries()) {
        list.push(address);
      }
      expect(list.length).toBe(2);
    });
  });
  describe("vaultEntries", () => {
    const v = new VaultCollection()
      .addVault(ETH, createAddress())
      .addVault(ETH, createAddress())
      .addVault(DAI, createAddress());
    const list: Vault[] = [];
    for (const address of v.vaultEntries()) {
      list.push(address);
    }
    expect(list.length).toBe(3);
    const eths = list.filter((vault) => vault.ilk === ETH);
    expect(eths.length).toBe(2);
    const dais = list.filter((vault) => vault.ilk === DAI);
    expect(dais.length).toBe(1);
  });
  describe("push", () => {
    const v1 = new VaultCollection().addVault(ETH, createAddress());
    const v2 = new VaultCollection().addVault(DAI, createAddress());
    const combined = v1.push(v2);
    const list: Vault[] = [];
    for (const address of combined.vaultEntries()) {
      list.push(address);
    }
    expect(list.length).toBe(2);
  });
});
