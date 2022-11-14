import { DataSource } from "typeorm";
import { Block } from "./entity/block.entity";
import { Vault } from "./entity/vault.entity";
import { Spell } from "./entity/spell.entity";
import { Slate } from "./entity/slate.entity";

export { BlockRepository } from "./repository/block.repository";
export { SlateRepository } from "./repository/slate.repository";
export { SpellRepository } from "./repository/spell.repository";
export { VaultRepository } from "./repository/vault.repository";
export { Block } from "./entity/block.entity";
export { Vault } from "./entity/vault.entity";
export { Spell } from "./entity/spell.entity";
export { Slate } from "./entity/slate.entity";
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

export async function createDataSource(database: Database) {
  const dataSource = new DataSource({
    type: "sqlite",
    database,
    synchronize: true,
    logging: false,
    entities: [Block, Vault, Spell, Slate],
    migrations: [],
    subscribers: [],
  });
  return dataSource.initialize();
}
