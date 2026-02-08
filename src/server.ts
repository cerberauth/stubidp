import express, { Express } from 'express'
import { createProvider, ProviderOptions } from './provider.js'
import type { Provider } from 'oidc-provider'

export async function createApp(options: ProviderOptions): Promise<Express> {
  const app: Express = express()
  const oidc: Provider = await createProvider(options)

  app.use('/oauth2', oidc.callback())

  return app
}
