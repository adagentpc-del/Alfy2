/**
 * Structured JSON logger. One event per line, always carrying trace/tenant context where available.
 * No secrets or full payloads — log identifiers and shapes (see docs/CODING_STANDARDS.md §7).
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  trace_id?: string;
  tenant_id?: string;
  [key: string]: unknown;
}

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export interface Logger {
  child(context: LogContext): Logger;
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}

export function createLogger(minLevel: LogLevel = "info", base: LogContext = {}): Logger {
  const emit = (level: LogLevel, message: string, context?: LogContext): void => {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel]) return;
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      level,
      message,
      ...base,
      ...context,
    });
    // eslint-disable-next-line no-console
    (level === "error" ? console.error : console.log)(line);
  };
  return {
    child: (context) => createLogger(minLevel, { ...base, ...context }),
    debug: (m, c) => emit("debug", m, c),
    info: (m, c) => emit("info", m, c),
    warn: (m, c) => emit("warn", m, c),
    error: (m, c) => emit("error", m, c),
  };
}
