import express, { Express } from 'express'
import { rateLimit } from 'express-rate-limit'
import type { Provider } from 'oidc-provider'
import helmet from 'helmet'
import * as url from 'node:url'

import type { DatabaseInstance } from './db/db.js'
import { livenessHandler, pingDb, readinessHandler } from './health.js'
import { createInteractionRouter } from './interactions.js'
import { createProvider, ProviderOptions } from './provider.js'
import { homePage } from './views/index.js'

export interface RateLimitOptions {
  windowMs?: number
  max?: number
  disabled?: boolean
}

export interface AppOptions extends ProviderOptions {
  rateLimit?: RateLimitOptions
  skipPrompt?: boolean
  trustProxy?: boolean
  httpsRedirect?: boolean
  securityHeaders?: boolean
}

export async function createApp(options: AppOptions): Promise<Express> {
  const app: Express = express()
  const oidc: Provider = await createProvider(options)

  let resolvedDb: DatabaseInstance | null = options.db ?? null
  if (!resolvedDb && process.env.STUBIDP_DATABASE_DIALECT) {
    const { db } = await import('./db/db.js')
    resolvedDb = db
  }

  const readinessChecks: Record<string, () => Promise<void>> = {
    oidc: async () => {
      if (!oidc.issuer) throw new Error('provider not initialized')
    },
  }
  if (resolvedDb) {
    const db = resolvedDb
    readinessChecks.db = () => pingDb(db)
  }

  app.get('/healthz', livenessHandler)
  app.get('/readyz', readinessHandler(readinessChecks))

  if (options.securityHeaders) {
    const directives = helmet.contentSecurityPolicy.getDefaultDirectives()
    delete directives['form-action']
    delete directives['upgrade-insecure-requests']
    if (options.httpsRedirect) {
      directives['upgrade-insecure-requests'] = []
    }
    app.use(
      helmet({
        contentSecurityPolicy: {
          useDefaults: false,
          directives,
        },
      }),
    )
  }

  const rl = options.rateLimit ?? {}
  if (!rl.disabled) {
    app.use(
      rateLimit({
        windowMs: rl.windowMs ?? 15 * 60 * 1000,
        limit: rl.max ?? 100,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
      }),
    )
  }

  if (options.trustProxy) {
    app.enable('trust proxy')
    oidc.proxy = true
  }

  if (options.httpsRedirect) {
    app.use((req, res, next) => {
      if (req.secure) {
        next()
      } else if (req.method === 'GET' || req.method === 'HEAD') {
        res.redirect(
          url.format({
            protocol: 'https',
            host: req.get('host'),
            pathname: req.originalUrl,
          }),
        )
      } else {
        res.status(400).json({
          error: 'invalid_request',
          error_description: 'do yourself a favor and only use https',
        })
      }
    })
  }

  app.get('/', (_req, res) => {
    res.type('html').send(homePage(oidc.issuer))
  })
  app.use(
    '/interaction',
    createInteractionRouter(oidc, { skipPrompt: options.skipPrompt, defaultUser: options.defaultUser }),
  )
  app.use('/', oidc.callback())

  return app
}
