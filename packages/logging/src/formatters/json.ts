import type { LogRecord } from "../types";

export function formatJsonLogRecord(record: LogRecord): string {
  return JSON.stringify(record);
}
