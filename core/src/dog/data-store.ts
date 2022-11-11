import { DataSource } from "typeorm";
import { Block, BlockRepository, VaultRepository } from "../db";
import { VaultCollection, Vault as VaultInterface } from "./vault-collection";
import "reflect-metadata";

/**
 * Class used to persist blockchain data within database
 */
export class DataStore {
  private vaultRepository: VaultRepository;

  private blockRepository: BlockRepository;

  constructor(dataSource: DataSource) {
    this.vaultRepository = new VaultRepository(dataSource);
    this.blockRepository = new BlockRepository(dataSource);
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
  addBlock(num: number): Promise<void> {
    return this.blockRepository.insertBlock(num);
  }

  /**
   * Returns the latest block height in the database
   */
  async getLatestBlock(): Promise<Block | undefined> {
    return this.blockRepository.getLatestBlock();
  }
}
