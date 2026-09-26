import { trace } from '@opentelemetry/api'
import { pino, type Logger } from 'pino'
import { errWithCause } from 'pino-std-serializers'

import { getRequestId } from './request-context.js'
import { emitOtelLogRecord } from './telemetry.js'

/**
 * Reads the active span's trace/span IDs, if any, so log lines can be pivoted
 * to a trace in whatever OTel backend they end up in. A no-op (returns
 * undefined for both) when tracing isn't initialized - see telemetry.ts.
 */
function activeTraceContext(): { traceId?: string; spanId?: string } {
  const spanContext = trace.getActiveSpan()?.spanContext()
  return spanContext ? { traceId: spanContext.traceId, spanId: spanContext.spanId } : {}
}

/**
 * Pino's log methods accept either `(msg)`, `(mergingObject)`, or
 * `(mergingObject, msg)`. Extracts both pieces regardless of which shape was
 * used, ignoring any printf-style interpolation args (unused in this codebase).
 */
function parseLogArgs(args: unknown[]): { mergingObject: Record<string, unknown>; message: string | undefined } {
  const [first, second] = args
  if (typeof first === 'string') {
    return { mergingObject: {}, message: first }
  }
  if (first && typeof first === 'object') {
    return { mergingObject: first as Record<string, unknown>, message: typeof second === 'string' ? second : undefined }
  }
  return { mergingObject: {}, message: undefined }
}

/**
 * Log levels supported by the logger
 */
export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent'

/**
 * Logger configuration options
 */
export interface LoggerOptions {
  level?: LogLevel
  pretty?: boolean
}

/**
 * Create a configured pino logger instance
 */
function createLogger(options: LoggerOptions = {}): Logger {
  const level = options.level || (process.env.STUBIDP_LOG_LEVEL as LogLevel) || 'info'

  return pino({
    level,
    base: {
      service: 'stubidp',
    },
    serializers: {
      err: errWithCause,
    },
    mixin() {
      const requestId = getRequestId()
      return { ...(requestId ? { requestId } : {}), ...activeTraceContext() }
    },
    hooks: {
      // Bridges every pino log call into the OTel Logs pipeline (a no-op
      // until telemetry.ts registers a LoggerProvider) - this is the only
      // hook point pino offers that works the same way in Node and the
      // browser build Cloudflare Workers falls back to (unlike `mixin`).
      logMethod(args, method, level) {
        // Trace/span IDs are attached automatically by the OTel Logs SDK
        // from the active span - no need to add them as attributes here
        // (contrast with `mixin` above, which feeds the plain pino JSON
        // output and has no such built-in correlation).
        const { mergingObject, message } = parseLogArgs(args)
        emitOtelLogRecord(level, message, { ...this.bindings(), ...mergingObject })
        method.apply(this, args)
      },
    },
    browser: {
      serialize: true,
      asObject: false,
    },
  })
}

/**
 * Default logger instance
 */
export const logger = createLogger()

/**
 * Create a child logger with additional context
 */
export function createChildLogger(bindings: Record<string, unknown>): Logger {
  return logger.child(bindings)
}

/**
 * Merges the current request ID and active trace/span IDs into a log
 * payload. Needed at call sites because pino's `mixin` (which does this
 * automatically) doesn't run under the browser build pino falls back to in
 * Cloudflare Workers.
 */
export function withRequestId<T extends Record<string, unknown>>(
  obj: T,
): T & { requestId?: string; traceId?: string; spanId?: string } {
  const requestId = getRequestId()
  return { ...obj, ...(requestId ? { requestId } : {}), ...activeTraceContext() }
}

export default logger
