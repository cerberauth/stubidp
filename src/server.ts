import express, { Express } from 'express'
import { rateLimit } from 'express-rate-limit'
import type { Provider } from 'oidc-provider'

import { createInteractionRouter } from './interactions.js'
import { createProvider, ProviderOptions } from './provider.js'

export interface RateLimitOptions {
  windowMs?: number
  max?: number
  disabled?: boolean
}

export interface AppOptions extends ProviderOptions {
  rateLimit?: RateLimitOptions
}

export async function createApp(options: AppOptions): Promise<Express> {
  const app: Express = express()
  const oidc: Provider = await createProvider(options)

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

  app.use('/interaction', createInteractionRouter(oidc))
  app.use('/', oidc.callback())

  return app
}
