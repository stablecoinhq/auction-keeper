import { Entity, PrimaryColumn } from "typeorm";

/**
 * Slate entity
 */
@Entity()
export class Slate {
  /**
   * ilk
   */
  @PrimaryColumn()
  slate!: string;

  /**
   * address
   */
  @PrimaryColumn()
  address!: string;
}
