import * as winston from "winston";
import path from "path";

// TODO: Refactor
const ENV_PATH = process.env.ENV_PATH || ".env";
require("dotenv").config({ path: ENV_PATH });
const LOG_DIR = process.env.LOG_DIR;

//Be careful not to access this before having called init logger, or it will be undefined
let logger: winston.Logger | undefined;

export function getLogger(): winston.Logger {
  if (logger) {
    return logger;
  } else {
    logger = initLogger();
    return logger;
  }
}

function initLogger() {
  let transports: winston.transport[] = [new winston.transports.Console()];
  if (LOG_DIR) {
    const logPath = path.join(LOG_DIR, "keeper.log");
    console.log(`Logpath: ${logPath}`);
    transports.push(
      new winston.transports.File({
        filename: logPath,
        level: "info",
      })
    );
  }
  return winston.createLogger({
    transports: transports,
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.printf(({ timestamp, level, message, service }) => {
        return `[${timestamp}] ${level} [${service}]: ${message}`;
      })
    ),
  });
}
