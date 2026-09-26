import { pino, type Logger } from 'pino'
import { errWithCause } from 'pino-std-serializers'

import { getRequestId } from './request-context.js'

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
      return requestId ? { requestId } : {}
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
 * Merges the current request ID into a log payload. Needed at call sites
 * because pino's `mixin` (which does this automatically) doesn't run under
 * the browser build pino falls back to in Cloudflare Workers.
 */
export function withRequestId<T extends Record<string, unknown>>(obj: T): T & { requestId?: string } {
  const requestId = getRequestId()
  return requestId ? { ...obj, requestId } : obj
}

export default logger
