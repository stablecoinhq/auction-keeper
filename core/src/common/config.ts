import * as dotenv from "dotenv";

export function loadConfig() {
  const ENV_PATH = process.env.ENV_PATH || ".env";
  dotenv.config({ path: ENV_PATH });
}
