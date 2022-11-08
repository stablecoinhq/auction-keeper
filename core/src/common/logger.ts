import * as winston from "winston";
import path from "path";
import { loadConfig } from "./config";

loadConfig();

const { LOG_DIR } = process.env;

// Be careful not to access this before having called init logger, or it will be undefined
let logger: winston.Logger | undefined;

function initLogger() {
  const transports: winston.transport[] = [new winston.transports.Console()];
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
    transports,
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.printf(
        ({ timestamp, level, message, service }) =>
          `[${timestamp}] ${level} [${service}]: ${message}`
      )
    ),
  });
}

export function getLogger(): winston.Logger {
  if (logger) {
    return logger;
  }
  logger = initLogger();
  return logger;
}
