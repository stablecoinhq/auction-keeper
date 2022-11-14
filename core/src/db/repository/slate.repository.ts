import { DataSource, Repository } from "typeorm";
import { Slate } from "../entity/slate.entity";

export class SlateRepository extends Repository<Slate> {
  constructor(dataSource: DataSource) {
    super(Slate, dataSource.createEntityManager());
  }

  async addSlate(slate: string, address: string) {
    const isRegistered = await this.findOneBy({ slate, address });
    if (!isRegistered) {
      try {
        const newAddress = this.create({ slate, address });
        await this.save(newAddress);
      } catch (e) {
        console.log(e);
      }
    }
  }

  async addSlates(slate: string, addresses: Set<string>) {
    if (addresses.size > 0) {
      for (const address of addresses.values()) {
        await this.addSlate(slate, address);
      }
    }
  }

  async getAddresses(slate?: string): Promise<string[]> {
    const slates = slate ? await this.findBy({ slate }) : await this.find();
    return slates.map((v) => v.address);
  }
}
