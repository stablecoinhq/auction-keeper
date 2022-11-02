import { Entity, PrimaryColumn } from "typeorm";

/**
 * Block entity
 */
@Entity()
export class Block {
  /**
   * Block number
   */
  @PrimaryColumn()
  number!: number;
}
