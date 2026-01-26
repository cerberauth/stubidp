import { Provider, Configuration } from 'oidc-provider'
import { argv } from './args.js'

const issuer = process.env.OIDC_ISSUER || 'http://localhost:3000'

const configuration: Configuration = {
  clients: [
    {
      client_id: argv.clientId,
      client_secret: argv.clientSecret,
      redirect_uris: [argv.redirectUri],
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

const oidc = new Provider(issuer, configuration)

export default oidc
