import { Provider, Configuration } from 'oidc-provider'

const issuer = process.env.OIDC_ISSUER || 'http://localhost:3000'

export interface ProviderOptions {
  clientId: string
  clientSecret: string
  redirectUri: string
}

export async function createProvider(options: ProviderOptions): Promise<Provider> {
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

  if (process.env.DATABASE_DIALECT) {
    const { DrizzleAdapter } = await import('./adapter.js')
    const { db } = await import('./db/db.js')
    configuration.adapter = (name: string) => new DrizzleAdapter(db, name)
  }

  return new Provider(issuer, configuration)
}
