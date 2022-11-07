import { DataSource } from "typeorm";
import { Block } from "./entity/block.entity";
import { Vault } from "./entity/vault.entity";
import { BlockRepository } from "./repository/block.repository";
import { VaultRepository } from "./repository/vault.repository";
import { VaultCollection, Vault as VaultInterface } from "../vault-collection";
import "reflect-metadata";

/**
 * Class used to persist blockchain data within database
 */
export class DataStore {
  private vaultRepository!: VaultRepository;

  private blockRepository!: BlockRepository;

  private dataSource: DataSource;

  constructor(database: Database) {
    this.dataSource = new DataSource({
      type: "sqlite",
      database,
      synchronize: true,
      logging: false,
      entities: [Block, Vault],
      migrations: [],
      subscribers: [],
    });
    this.dataSource
      .initialize()
      .then((source) => {
        this.vaultRepository = new VaultRepository(source);
        this.blockRepository = new BlockRepository(source);
      })
      .catch((e) => console.log(e));
  }

  /**
   * Insert vault collection to database
   * @param vs VaultCollection
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async addVaults(vs: VaultCollection): Promise<void> {
    this.vaultRepository.addVaults(vs);
  }

  /**
   * Insert single vault to database
   * @param vault Vault
   */
  async addVault(vault: VaultInterface): Promise<void> {
    await this.vaultRepository.addVault(vault);
  }

  /**
   * Return all vault data within database
   * @returns Vault collections
   */
  async getAllVaults(): Promise<VaultCollection> {
    return this.vaultRepository.getAllVaults();
  }

  /**
   * Get vault by given ilk
   * @param ilk ilk
   * @returns
   */
  async getByIlk(ilk: string): Promise<VaultCollection> {
    return this.vaultRepository.getByIlk(ilk);
  }

  /**
   * Add block to database
   * @param num blockNumber
   */
  addBlock(num: number): void {
    void this.blockRepository.insertBlock(num);
  }

  /**
   * Returns the latest block height in the database
   */
  async getLatestBlock(): Promise<Block | undefined> {
    return this.blockRepository.getLatestBlock();
  }
}

/**
 * Where to store database
 */
export enum Database {
  /**
   * Within memory
   */
  memory = ":memory:",
  /**
   * On a file
   */
  file = "database/database.sqlite",
}
