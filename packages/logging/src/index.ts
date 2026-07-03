export { createLogger } from "./logger";
export { formatJsonLogRecord } from "./formatters/json";
export { createConsoleTransport } from "./transports/console";
export type {
  CreateLoggerOptions,
  LogErrorDetails,
  LogLevel,
  LogRecord,
  LogTransport,
  Logger,
  RemoteLogTransportOptions,
} from "./types";
