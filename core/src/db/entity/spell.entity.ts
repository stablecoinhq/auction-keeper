import { Column, Entity, PrimaryColumn } from "typeorm";

/**
 * Spell entity
 */
@Entity()
export class Spell {
  /**
   * Spell address
   */
  @PrimaryColumn()
  address!: string;

  @Column()
  isCasted: boolean = false;
}
