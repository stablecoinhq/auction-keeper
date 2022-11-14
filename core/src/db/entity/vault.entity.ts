import { Entity, PrimaryColumn } from "typeorm";

/**
 * Vault entity
 */
@Entity()
export class Vault {
  /**
   * ilk
   */
  @PrimaryColumn()
  ilk!: string;

  /**
   * address
   */
  @PrimaryColumn()
  address!: string;
}
