import type { CreateLoggerOptions, LogLevel, Logger } from "./types";

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function shouldLog(level: LogLevel, minLevel: LogLevel): boolean {
  return LEVEL_RANK[level] >= LEVEL_RANK[minLevel];
}

export function createLogger(options: CreateLoggerOptions): Logger {
  const { service, context, transport, minLevel = "debug" } = options;

  const write = (level: LogLevel, message: string, meta?: Record<string, unknown>): void => {
    if (!shouldLog(level, minLevel)) {
      return;
    }

    transport.write({
      timestamp: new Date().toISOString(),
      level,
      service,
      context,
      message,
      meta,
    });
  };

  return {
    debug: (message, meta) => write("debug", message, meta),
    info: (message, meta) => write("info", message, meta),
    warn: (message, meta) => write("warn", message, meta),
    error: (message, meta) => write("error", message, meta),
  };
}
