import { transports, format, createLogger } from "winston";
import "winston-mongodb";

const { combine, timestamp, json, metadata, simple, colorize } = format;
const LOG_DB_CONN_STRING = process.env.MONGO_LOGS_URL ?? process.env.MONGO_URL;
const mongodbTransport = new transports.MongoDB({
  level: process.env.LOG_LEVEL,
  db: LOG_DB_CONN_STRING,
  collection: "logs",
  decolorize: true,
  options: { useUnifiedTopology: true },
  expireAfterSeconds: 604800, // delete logs after one week
});

const fileTransport = new transports.File({ filename: "./logs/logs.log" });
const consoleTransport = new transports.Console({
  format: combine(colorize({ all: true }), timestamp(), simple()),
});
export const logger = createLogger({
  level: process.env.LOG_LEVEL || "debug",
  format: combine(timestamp(), json(), metadata()),
  defaultMeta: {
    service: "GRAPHQL_API",
    app_env: process.env.APP_ENV ?? "development",
  },
  transports: [fileTransport, mongodbTransport, consoleTransport],
});

/**
 * Logger for no defaultMeta
 */
export const customLogger = createLogger({
  level: process.env.LOG_LEVEL || "debug",
  format: combine(timestamp(), json(), metadata()),
  transports: [fileTransport, mongodbTransport, consoleTransport],
});
