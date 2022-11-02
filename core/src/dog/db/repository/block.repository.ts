import { Repository } from "typeorm";
import { Block } from "../entity/block.entity";

export class BlockRepository extends Repository<Block> {
  async insertBlock(blockNum: number, hash: string): Promise<void> {
    const block = this.create({ number: blockNum, hash });
    try {
      await this.save(block);
    } catch (error) {
      // do something
    }
  }

  async getLatestBlock(): Promise<Block | undefined> {
    const block = await this.findOne({ order: { number: "DESC" } });
    if (block) {
      return block;
    } else {
      return undefined;
    }
  }
}
