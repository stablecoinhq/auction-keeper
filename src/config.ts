export interface Envs {
  RPC_HOST: string;
  DOG_ADDRESS: string;
  MNEMONIC: string;
  FROM_BLOCK: number;
  TO_BLOCK: number | "latest";
  ILKS: string[];
  RUN_CLIP: boolean;
}

export function getEnvs(): Envs {
  const ilks = JSON.parse(process.env.ILKS ? process.env.ILKS : "[]");

  const toBlock: number | "latest" =
    process.env.TO_BLOCK! === "latest"
      ? "latest"
      : parseInt(process.env.TO_BLOCK!);

  const runClip = process.env.RUN_CLIP
    ? (process.env.RUN_CLIP! as any as boolean)
    : false;

  return {
    RPC_HOST: process.env.RPC_HOST!,
    DOG_ADDRESS: process.env.DOG_ADDRESS!,
    MNEMONIC: process.env.MNEMONIC!,
    FROM_BLOCK: parseInt(process.env.FROM_BLOCK!),
    TO_BLOCK: toBlock,
    ILKS: ilks,
    RUN_CLIP: runClip,
  };
}
