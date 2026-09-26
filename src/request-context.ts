import { AsyncLocalStorage } from 'node:async_hooks'
import { context, trace, SpanKind, SpanStatusCode } from '@opentelemetry/api'
import type { Request, Response, NextFunction } from 'express'

import { tracer } from './telemetry.js'

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
 * or `x-request-id` if a caller already supplied one), makes it available to
 * the rest of the request's async call graph via AsyncLocalStorage, and opens
 * a root span for the request (a no-op span when tracing isn't initialized -
 * see telemetry.ts).
 */
export function requestContext() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const requestId = (req.get('cf-ray') || req.get('x-request-id') || globalThis.crypto.randomUUID()).trim()
    res.setHeader('x-request-id', requestId)

    const span = tracer.startSpan(
      `${req.method} ${req.path}`,
      { kind: SpanKind.SERVER, attributes: { 'http.request.method': req.method, 'url.path': req.path, requestId } },
      context.active(),
    )
    res.on('finish', () => {
      span.setAttribute('http.response.status_code', res.statusCode)
      if (res.statusCode >= 500) {
        span.setStatus({ code: SpanStatusCode.ERROR })
      }
      span.end()
    })

    storage.run({ requestId }, () => context.with(trace.setSpan(context.active(), span), next))
  }
}
