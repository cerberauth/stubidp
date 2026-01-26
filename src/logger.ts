import { pino, type Logger } from 'pino'

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
  const level = options.level || (process.env.LOG_LEVEL as LogLevel) || 'info'

  return pino({
    level,
    base: {
      service: 'stubidp',
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

export default logger
