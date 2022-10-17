type ilk = string;
type address = string;
export interface Vault {
  ilk: ilk;
  address: address;
}

// Data structure used to store vault information
export class VaultCollection {
  _vaults: Map<string, Set<string>>;

  constructor(vault: Map<string, Set<string>>);
  constructor();
  constructor(vault?: Map<string, Set<string>>) {
    this._vaults = vault || new Map();
  }

  // Return number of vaults stored within VaultCollection
  size(): number {
    return this._vaults.size;
  }

  // Add a vault
  addVault(this: VaultCollection, ilk: ilk, address: address): VaultCollection {
    const addrs = this._vaults.get(ilk) || new Set();
    this._vaults.set(ilk, addrs.add(address));
    return this;
  }

  push(
    this: VaultCollection,
    vaultCollection: VaultCollection
  ): VaultCollection;
  push(
    this: VaultCollection,
    vaultCollection: VaultCollection[]
  ): VaultCollection;
  push(
    this: VaultCollection,
    vs: VaultCollection | VaultCollection[]
  ): VaultCollection {
    if (vs instanceof VaultCollection) {
      return this.merge([vs]);
    }
    return this.merge(vs);
  }

  // Merge other VaultCollections
  merge(
    this: VaultCollection,
    vaultCollections: VaultCollection[]
  ): VaultCollection {
    vaultCollections.forEach((collection) => {
      for (const vault of collection.vaultEntries()) {
        this.addVault(vault.ilk, vault.address);
      }
    });
    return this;
  }

  // Return list of vault addresses grouped by ilk
  entries(): IterableIterator<[ilk, Set<address>]> {
    return this._vaults.entries();
  }

  // Return all the vault addresses
  addresses(): IterableIterator<Set<address>> {
    return this._vaults.values();
  }

  // Return list of vaults
  vaultEntries(): IterableIterator<Vault> {
    let ls: Set<Vault> = new Set();
    for (const [ilk, addrs] of this._vaults.entries()) {
      for (const address of addrs.values()) {
        const vault: Vault = {
          ilk,
          address,
        };
        ls.add(vault);
      }
    }
    return ls.values();
  }

  // Return VaultCollection of specific ilk
  getByIlk(ilk: string): VaultCollection {
    const addresses = this._vaults.get(ilk) || new Set();
    const vaults = new Map().set(ilk, addresses);
    return new VaultCollection(vaults);
  }
}