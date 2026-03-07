import express, { Express } from 'express'
import type { Provider } from 'oidc-provider'

import { createProvider, ProviderOptions } from './provider.js'
import { createInteractionRouter } from './interactions.js'
import { homePage } from './views/index.js'

export async function createApp(options: ProviderOptions): Promise<Express> {
  const app: Express = express()
  const oidc: Provider = await createProvider(options)

  app.get('/', (_req, res) => {
    res.type('html').send(homePage(oidc.issuer))
  })

  app.use('/interaction', createInteractionRouter(oidc))

  app.use('/oauth2', oidc.callback())

  return app
}
