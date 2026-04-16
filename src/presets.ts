export type PresetName = 'better-auth' | 'next-auth'

export interface Preset {
  name: PresetName
  defaultRedirectUri: string
  grantTypes: string[]
  printInstructions: (params: { issuer: string; clientId: string; clientSecret: string }) => void
}

export const PRESETS: Record<PresetName, Preset> = {
  'better-auth': {
    name: 'better-auth',
    defaultRedirectUri: 'http://localhost:3000/api/auth/callback/stubidp',
    grantTypes: ['authorization_code', 'refresh_token'],
    printInstructions({ issuer, clientId, clientSecret }) {
      console.log('To use stubIdP with better-auth, add to your auth.ts:\n')
      console.log(`  import { betterAuth } from 'better-auth'
  import { genericOAuth } from 'better-auth/plugins'

  export const auth = betterAuth({
    plugins: [
      genericOAuth({
        config: [{
          providerId: 'stubidp',
          clientId: process.env.STUBIDP_CLIENT_ID,
          clientSecret: process.env.STUBIDP_CLIENT_SECRET,
          discoveryUrl: \`\${process.env.STUBIDP_ISSUER}/.well-known/openid-configuration\`,
          scopes: ['openid', 'profile', 'email'],
          pkce: true,
        }],
      }),
    ],
  })
`)
      console.log('Set these environment variables in your app:\n')
      console.log(`  STUBIDP_CLIENT_ID=${clientId}`)
      console.log(`  STUBIDP_CLIENT_SECRET=${clientSecret}`)
      console.log(`  STUBIDP_ISSUER=${issuer}\n`)
    },
  },
  'next-auth': {
    name: 'next-auth',
    defaultRedirectUri: 'http://localhost:3000/api/auth/callback/stubidp',
    grantTypes: ['authorization_code', 'refresh_token'],
    printInstructions({ issuer, clientId, clientSecret }) {
      console.log('To use stubIdP with NextAuth (Auth.js v5), add to your auth.ts:\n')
      console.log(`  import NextAuth from 'next-auth'

  export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
      {
        id: 'stubidp',
        name: 'StubIdP',
        type: 'oidc',
        issuer: process.env.AUTH_STUBIDP_ISSUER,
        clientId: process.env.AUTH_STUBIDP_ID,
        clientSecret: process.env.AUTH_STUBIDP_SECRET,
      },
    ],
  })
`)
      console.log('Set these environment variables in your app:\n')
      console.log(`  AUTH_STUBIDP_ISSUER=${issuer}`)
      console.log(`  AUTH_STUBIDP_ID=${clientId}`)
      console.log(`  AUTH_STUBIDP_SECRET=${clientSecret}\n`)
    },
  },
}

export function getPreset(name: string): Preset {
  const preset = PRESETS[name as PresetName]
  if (!preset) throw new Error(`Unknown preset: ${name}`)
  return preset
}
