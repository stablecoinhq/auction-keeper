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
      return this._merge([vs]);
    }
    return this._merge(vs);
  }

  // Merge other VaultCollections
  private _merge(
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


  static fromList(vaults: Vault[]): VaultCollection {
    const vaultCollection = new VaultCollection();
    for (const vault of vaults) {
      vaultCollection.addVault(vault.ilk, vault.address);
    }
    return vaultCollection;
  }

  static fromVaultCollections(
    vaultCollections: VaultCollection[]
  ): VaultCollection {
    return new VaultCollection()._merge(vaultCollections);
  }
}
