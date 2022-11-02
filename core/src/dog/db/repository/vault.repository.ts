import { DataSource, Repository } from "typeorm";
import { Vault } from "../entity/vault.entity";
import {
  VaultCollection,
  Vault as VaultInterface,
} from "../../vault-collection";

/**
 * Customized repository for Vault entity
 */
export class VaultRepository extends Repository<Vault> {
  constructor(dataSource: DataSource) {
    super(Vault, dataSource.createEntityManager());
  }
  /**
   * Insert vault to database
   * @param vault Vault to add
   * @returns
   */
  async addVault(vault: VaultInterface): Promise<void> {
    const { ilk, address } = vault;
    const vaultExists = await this.findOneBy({ ilk, address });
    if (vaultExists) {
      return;
    } else {
      try {
        const vault = this.create({ ilk, address });
        await this.save(vault);
      } catch (error) {
        // do something
      }
    }
  }

  /**
   * Insert vault collections into database
   * @param vaultCollection VaultCollection
   */
  async addVaults(vaultCollection: VaultCollection): Promise<void> {
    Array.from(vaultCollection.vaultEntries()).map(async (vault) => {
      // TODO: Make it faster
      await this.addVault(vault);
    });
  }

  /**
   * Return all vaults within database
   */
  async getAllVaults(): Promise<VaultCollection> {
    const vaultList = await this.find();
    return VaultCollection.fromList(vaultList);
  }

  /**
   * Return vault collection by ilk
   */
  async getByIlk(ilk: string): Promise<VaultCollection> {
    const vaultlist = await this.findBy({ ilk });
    const vaults = new Set(vaultlist.map((v) => v.address));
    return new VaultCollection(new Map().set(ilk, vaults));
  }
}
