import { formatJsonLogRecord } from "../formatters/json";
import type { LogRecord, LogTransport } from "../types";

export interface ConsoleTransportOptions {
  formatter?: (record: LogRecord) => string;
}

export function createConsoleTransport(options: ConsoleTransportOptions = {}): LogTransport {
  const formatter = options.formatter ?? formatJsonLogRecord;

  return {
    write(record: LogRecord): void {
      process.stdout.write(`${formatter(record)}\n`);
    },
  };
}
