import { generateKeyPair, exportJWK } from 'jose'
import { Provider, Configuration } from 'oidc-provider'
import type { DatabaseInstance } from './db/db.js'

export interface ProviderOptions {
  clientId: string
  clientSecret: string
  redirectUri: string
  db?: DatabaseInstance
  issuer?: string
  jwks?: Configuration['jwks']
}

export async function createProvider(options: ProviderOptions): Promise<Provider> {
  const issuer = options.issuer ?? process.env.STUBIDP_ISSUER ?? 'http://localhost:3000'

  let jwks = options.jwks
  if (!jwks) {
    const { privateKey } = await generateKeyPair('RS256', { extractable: true })
    const privateJwk = await exportJWK(privateKey)
    jwks = { keys: [{ ...privateJwk, use: 'sig', alg: 'RS256' }] }
  }

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
    jwks,
    features: {
      devInteractions: { enabled: false },
    },
    interactions: {
      url: (_ctx, interaction) => `/interaction/${interaction.uid}`,
    },
  }

  if (options.db) {
    // Worker path: db already initialized with D1 binding
    const { DrizzleAdapter } = await import('./adapter.js')
    const db = options.db
    configuration.adapter = (name: string) => new DrizzleAdapter(db, name)
  } else if (process.env.STUBIDP_DATABASE_DIALECT) {
    // Node.js CLI path: initialize DB from env vars
    const { DrizzleAdapter } = await import('./adapter.js')
    const { db } = await import('./db/db.js')
    configuration.adapter = (name: string) => new DrizzleAdapter(db, name)
  } else {
    const { MemoryAdapter } = await import('./memory-adapter.js')
    configuration.adapter = (name: string) => new MemoryAdapter(name)
  }

  return new Provider(issuer, configuration)
}
