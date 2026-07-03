export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogErrorDetails {
  message: string;
  stack?: string;
}

export interface LogRecord {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  context?: string;
  meta?: Record<string, unknown>;
  error?: LogErrorDetails;
}

export interface LogTransport {
  write(record: LogRecord): void;
}

/** Future remote transport contract — not implemented in M9. */
export interface RemoteLogTransportOptions {
  endpoint: string;
  apiKey?: string;
  batchSize?: number;
}

export interface CreateLoggerOptions {
  service: string;
  context?: string;
  transport: LogTransport;
  minLevel?: LogLevel;
}

export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}
