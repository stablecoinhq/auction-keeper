import { Entity, PrimaryColumn } from "typeorm";

@Entity()
export class Vault {
  @PrimaryColumn()
  ilk!: string;
  @PrimaryColumn()
  address!: string;
}
