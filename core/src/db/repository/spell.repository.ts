import { DataSource, Repository } from "typeorm";
import { Spell } from "../entity/spell.entity";

export class SpellRepository extends Repository<Spell> {
  constructor(dataSource: DataSource) {
    super(Spell, dataSource.createEntityManager());
  }

  async addSpell(address: string) {
    const isRegistered = await this.findOneBy({ address });
    if (!isRegistered) {
      try {
        const newAddress = this.create({ address, isCasted: false });
        await this.save(newAddress);
      } catch (e) {
        console.log(e);
      }
    } else {
      await this.update({ address }, { isCasted: false });
    }
  }

  async addSpells(addresses: string[]) {
    for (const address of addresses) {
      await this.addSpell(address);
    }
  }

  async getSpells() {
    return this.findBy({ isCasted: false });
  }

  async markSpellAsDone(address: string) {
    const isRegistered = await this.findOneBy({ address });
    if (isRegistered) {
      return this.update({ address }, { isCasted: true });
    }
    const newSpell = this.create({ address, isCasted: false });
    return this.save(newSpell);
  }
}
