import { Entity, PrimaryColumn } from "typeorm";

@Entity()
export class Block {
  @PrimaryColumn()
  number!: number;
}
