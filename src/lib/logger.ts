// =============================================================
// Structured Logger — Production-grade logging utility
// Outputs structured JSON logs with levels, timestamps, context.
// Ready for log aggregation (Vercel, Datadog, Axiom, etc.)
// =============================================================

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MIN_LEVEL: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) ??
  (process.env.NODE_ENV === "production" ? "info" : "debug");

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LEVEL];
}

function emit(entry: LogEntry): void {
  if (!shouldLog(entry.level)) return;

  const output = JSON.stringify(entry);

  switch (entry.level) {
    case "error":
      console.error(output);
      break;
    case "warn":
      console.warn(output);
      break;
    case "debug":
      console.debug(output);
      break;
    default:
      console.log(output);
  }
}

function createEntry(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
  error?: Error,
): LogEntry {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
  };

  if (context && Object.keys(context).length > 0) {
    entry.context = context;
  }

  if (error) {
    entry.error = {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV !== "production" ? error.stack : undefined,
    };
  }

  return entry;
}

/**
 * Structured logger for the application.
 *
 * @example
 * logger.info("Agent executed", { agentId, userId, durationMs: 123 });
 * logger.error("Payment failed", { tenantId }, error);
 */
export const logger = {
  debug(message: string, context?: Record<string, unknown>): void {
    emit(createEntry("debug", message, context));
  },

  info(message: string, context?: Record<string, unknown>): void {
    emit(createEntry("info", message, context));
  },

  warn(message: string, context?: Record<string, unknown>): void {
    emit(createEntry("warn", message, context));
  },

  error(
    message: string,
    context?: Record<string, unknown>,
    error?: Error,
  ): void {
    emit(createEntry("error", message, context, error));
  },
};
