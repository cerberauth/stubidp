import express, { Express } from 'express'
import type { Provider } from 'oidc-provider'

import { createInteractionRouter } from './interactions.js'
import { createProvider, ProviderOptions } from './provider.js'

export async function createApp(options: ProviderOptions): Promise<Express> {
  const app: Express = express()
  const oidc: Provider = await createProvider(options)

  app.use('/interaction', createInteractionRouter(oidc))
  app.use('/oauth2', oidc.callback())

  return app
}
