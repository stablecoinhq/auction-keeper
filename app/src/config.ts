export interface Envs {
  RPC_HOST: string;
  MNEMONIC: string;
  FROM_BLOCK: number;
  TO_BLOCK: number | "latest";
  ILKS: string[];
  RUN_CLIP: boolean;
  CHAINLOG_ADDRESS: string;
}

export function getEnvs(): Envs {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const ilks: string[] = JSON.parse(process.env.ILKS ? process.env.ILKS : "[]");

  const toBlock: number | "latest" =
    process.env.TO_BLOCK! === "latest"
      ? "latest"
      : parseInt(process.env.TO_BLOCK!, 10);

  const runClip = process.env.RUN_CLIP
    ? (process.env.RUN_CLIP! as any as boolean)
    : false;

  return {
    RPC_HOST: process.env.RPC_HOST!,
    CHAINLOG_ADDRESS: process.env.CHAINLOG_ADDRESS!,
    MNEMONIC: process.env.MNEMONIC!,
    FROM_BLOCK: parseInt(process.env.FROM_BLOCK!, 10),
    TO_BLOCK: toBlock,
    ILKS: ilks,
    RUN_CLIP: runClip,
  };
}
