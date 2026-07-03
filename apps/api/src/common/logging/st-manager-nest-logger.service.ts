import { Injectable, type LoggerService } from "@nestjs/common";
import { createConsoleTransport, type LogLevel } from "@st-manager/logging";

const SERVICE_NAME = "st-manager-api";

function extractContext(optionalParams: unknown[]): {
  context?: string;
  rest: unknown[];
} {
  if (optionalParams.length === 0) {
    return { rest: [] };
  }

  const last = optionalParams[optionalParams.length - 1];
  if (typeof last === "string") {
    return { context: last, rest: optionalParams.slice(0, -1) };
  }

  return { rest: optionalParams };
}

@Injectable()
export class StManagerNestLoggerService implements LoggerService {
  private readonly transport = createConsoleTransport();

  private write(level: LogLevel, message: unknown, optionalParams: unknown[]): void {
    const { context, rest } = extractContext(optionalParams);

    this.transport.write({
      timestamp: new Date().toISOString(),
      level,
      service: SERVICE_NAME,
      context,
      message: String(message),
      meta:
        rest.length > 0 ? { params: rest.length === 1 ? rest[0] : rest } : undefined,
    });
  }

  log(message: unknown, ...optionalParams: unknown[]): void {
    this.write("info", message, optionalParams);
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    this.write("error", message, optionalParams);
  }

  warn(message: unknown, ...optionalParams: unknown[]): void {
    this.write("warn", message, optionalParams);
  }

  debug(message: unknown, ...optionalParams: unknown[]): void {
    this.write("debug", message, optionalParams);
  }

  verbose(message: unknown, ...optionalParams: unknown[]): void {
    this.write("debug", message, optionalParams);
  }

  fatal(message: unknown, ...optionalParams: unknown[]): void {
    this.write("error", message, optionalParams);
  }
}
