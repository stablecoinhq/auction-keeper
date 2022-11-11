import { DataSource } from "typeorm";
import {
  Block,
  BlockRepository,
  SlateRepository,
  SpellRepository,
} from "../db";

export class DataStore {
  private slateRepository: SlateRepository;

  private blockRepository: BlockRepository;

  private spellRepository: SpellRepository;

  constructor(dataSource: DataSource) {
    this.blockRepository = new BlockRepository(dataSource);
    this.slateRepository = new SlateRepository(dataSource);
    this.spellRepository = new SpellRepository(dataSource);
  }

  async addSpell(address: string) {
    return this.spellRepository.addSpell(address);
  }

  async markSpellAsDone(address: string) {
    return this.spellRepository.markSpellAsDone(address);
  }

  async addSlates(slate: string, addresses: Set<string>) {
    return this.slateRepository.addSlates(slate, addresses);
  }

  async addSlate(slate: string, address: string) {
    return this.slateRepository.addSlate(slate, address);
  }

  async getAddresses(slate?: string) {
    return this.slateRepository.getAddresses(slate);
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
