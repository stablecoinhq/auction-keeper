import { DataSource, MoreThanOrEqual, Repository } from "typeorm";
import { Block } from "../entity/block.entity";

export class BlockRepository extends Repository<Block> {
  constructor(dataSource: DataSource) {
    super(Block, dataSource.createEntityManager());
  }

  async insertBlock(blockNum: number): Promise<void> {
    const block = this.create({ number: blockNum });
    const hasBiggerBlockNum = await this.findOneBy({
      number: MoreThanOrEqual(blockNum),
    });

    if (hasBiggerBlockNum) {
      return;
    } else {
      try {
        await this.save(block);
      } catch (error) {
        console.log(error);
        // do something
      }
    }
  }

  async getLatestBlock(): Promise<Block | undefined> {
    const [block] = await this.find({ order: { number: "DESC" }, take: 1 });
    if (block) {
      return block;
    } else {
      return undefined;
    }
  }
}
