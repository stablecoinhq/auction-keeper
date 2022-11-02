import { Block } from "./entity/block.entity";
import { Vault } from "./entity/vault.entity";
import { BlockRepository } from "./repository/block.repository";
import { VaultRepository } from "./repository/vault.repository";
import { VaultCollection, Vault as VaultInterface } from "../vault-collection";
import "reflect-metadata";
import { DataSource } from "typeorm";

export class DataStore {
  vaultRepository!: VaultRepository;
  blockRepository!: BlockRepository;
  dataSource: DataSource;

  constructor(database: Database) {
    this.dataSource = getDataSource(database);
    this.dataSource.initialize().then((source) => {
      this.vaultRepository = new VaultRepository(source);
      this.blockRepository = new BlockRepository(source);
    });
  }
  async merge(vss: VaultCollection[]): Promise<void> {
    const vs = VaultCollection.fromVaultCollections(vss);
    this.vaultRepository.addVaults(vs);
  }
  async addVaults(vs: VaultCollection): Promise<void> {
    this.vaultRepository.addVaults(vs);
  }
  async addVault(vault: VaultInterface): Promise<void> {
    this.vaultRepository.addVault(vault);
  }

  async getAllVaults(): Promise<VaultCollection> {
    return this.vaultRepository.getAllVaults();
  }
  async getByIlk(ilk: string): Promise<VaultCollection> {
    return this.vaultRepository.getByIlk(ilk);
  }
  async addBlock(num: number): Promise<void> {
    this.blockRepository.insertBlock(num);
  }
  async getLatestBlock(): Promise<Block | undefined> {
    return this.blockRepository.getLatestBlock();
  }
}

export function getDataSource(path: string) {
  return new DataSource({
    type: "sqlite",
    database: path,
    synchronize: true,
    logging: false,
    entities: [Block, Vault],
    migrations: [],
    subscribers: [],
  });
}

export enum Database {
  memory = ":memory:",
  file = "database/database.sqlite",
}
