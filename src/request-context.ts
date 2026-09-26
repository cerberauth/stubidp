import { AsyncLocalStorage } from 'node:async_hooks'
import type { Request, Response, NextFunction } from 'express'

interface RequestContext {
  requestId: string
}

/**
 * AsyncLocalStorage works natively in both the Node.js CLI and the Cloudflare
 * Workers runtime (with `nodejs_compat`), so this is the single mechanism used
 * to correlate log lines with the HTTP request that produced them, regardless
 * of which entrypoint (bin/run.js or worker.ts) is serving the request.
 */
const storage = new AsyncLocalStorage<RequestContext>()

/**
 * Returns the request ID for the request currently being handled, if any.
 * Safe to call from anywhere (adapter, provider event handlers, etc.) without
 * threading the request through every function signature.
 */
export function getRequestId(): string | undefined {
  return storage.getStore()?.requestId
}

/**
 * Express middleware that assigns a request ID (reusing `cf-ray` on Cloudflare
 * or `x-request-id` if a caller already supplied one) and makes it available
 * to the rest of the request's async call graph via AsyncLocalStorage.
 */
export function requestContext() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const requestId = (req.get('cf-ray') || req.get('x-request-id') || globalThis.crypto.randomUUID()).trim()
    res.setHeader('x-request-id', requestId)
    storage.run({ requestId }, next)
  }
}
