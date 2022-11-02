import { DataSource, Repository } from "typeorm";
import { Vault } from "../entity/vault.entity";
import {
  VaultCollection,
  Vault as VaultInterface,
} from "../../vault-collection";

export class VaultRepository extends Repository<Vault> {
  constructor(dataSource: DataSource) {
    super(Vault, dataSource.createEntityManager());
  }
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

  async addVaults(vaultCollection: VaultCollection): Promise<void> {
    Array.from(vaultCollection.vaultEntries()).map(async (vault) => {
      // TODO: 高速化
      await this.addVault(vault);
    });
  }

  async getAllVaults(): Promise<VaultCollection> {
    const vaultList = await this.find();
    return VaultCollection.fromList(vaultList);
  }

  async getByIlk(ilk: string): Promise<VaultCollection> {
    const vaultlist = await this.findBy({ ilk });
    const vaults = new Set(vaultlist.map((v) => v.address));
    return new VaultCollection(new Map().set(ilk, vaults));
  }
}
