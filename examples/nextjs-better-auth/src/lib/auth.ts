import { betterAuth } from 'better-auth'
import { genericOAuth } from 'better-auth/plugins'
import Database from 'better-sqlite3'

export const auth = betterAuth({
  database: new Database('./auth.db'),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3001',
  plugins: [
    genericOAuth({
      config: [
        {
          providerId: 'stubidp',
          clientId: process.env.STUBIDP_CLIENT_ID!,
          clientSecret: process.env.STUBIDP_CLIENT_SECRET!,
          discoveryUrl: `${process.env.STUBIDP_ISSUER || 'http://localhost:3000'}/oauth2/.well-known/openid-configuration`,
          scopes: ['openid', 'profile', 'email'],
        },
      ],
    }),
  ],
})
