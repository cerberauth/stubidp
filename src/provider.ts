import { Provider, Configuration } from 'oidc-provider'
import type { DatabaseInstance } from './db/db.js'

export interface ProviderOptions {
  clientId: string
  clientSecret: string
  redirectUri: string
  db?: DatabaseInstance
  issuer?: string
}

export async function createProvider(options: ProviderOptions): Promise<Provider> {
  const issuer = options.issuer ?? process.env.OIDC_ISSUER ?? 'http://localhost:3000'
  const configuration: Configuration = {
    clients: [
      {
        client_id: options.clientId,
        client_secret: options.clientSecret,
        redirect_uris: [options.redirectUri],
        response_types: ['code'],
        grant_types: ['authorization_code'],
      },
    ],
    features: {
      devInteractions: { enabled: true },
    },
  }

  if (options.db) {
    // Worker path: db already initialized with D1 binding
    const { DrizzleAdapter } = await import('./adapter.js')
    const db = options.db
    configuration.adapter = (name: string) => new DrizzleAdapter(db, name)
  } else if (process.env.DATABASE_DIALECT) {
    // Node.js CLI path: initialize DB from env vars
    const { DrizzleAdapter } = await import('./adapter.js')
    const { db } = await import('./db/db.js')
    configuration.adapter = (name: string) => new DrizzleAdapter(db, name)
  }

  return new Provider(issuer, configuration)
}
