import type { Request, Response, NextFunction } from 'express'

import { createChildLogger, withRequestId } from './logger.js'

const log = createChildLogger({ component: 'http' })

/**
 * Paths that are typically hit by uptime monitors / orchestrators on a tight
 * interval - logged at debug level so they don't drown out real traffic.
 */
const QUIET_PATHS = new Set(['/healthz', '/readyz'])

/**
 * Express middleware that logs one structured line per request (method, path,
 * status, duration). Must run after `requestContext()` so the request ID is
 * available to `withRequestId`.
 */
export function accessLog() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startedAt = Date.now()

    res.on('finish', () => {
      const durationMs = Date.now() - startedAt
      const fields = withRequestId({
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs,
      })

      if (res.statusCode >= 500) {
        log.error(fields, 'request failed')
      } else if (res.statusCode >= 400) {
        log.warn(fields, 'request failed')
      } else if (QUIET_PATHS.has(req.path)) {
        log.debug(fields, 'request completed')
      } else {
        log.info(fields, 'request completed')
      }
    })

    next()
  }
}
