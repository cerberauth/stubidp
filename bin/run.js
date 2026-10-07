#!/usr/bin/env node

import { randomBytes } from 'crypto'
import { readFile } from 'fs/promises'
import { argv } from '../build/args.js'
import { createApp } from '../build/server.js'
import { getPreset } from '../build/presets.js'
import { initNodeTelemetry, shutdownNodeTelemetry } from '../build/telemetry.js'

process.env.STUBIDP_SERVE_STATIC ??= '../public'

initNodeTelemetry()

const port = parseInt(process.env.STUBIDP_PORT || '8484', 10)

const preset = argv['preset'] ? getPreset(argv['preset']) : null

const ADJECTIVES = [
  'brave',
  'calm',
  'dark',
  'eager',
  'fast',
  'glad',
  'high',
  'icy',
  'jolly',
  'keen',
  'lush',
  'mild',
  'neat',
  'odd',
  'proud',
  'quick',
  'rare',
  'safe',
  'tall',
  'vast',
  'warm',
  'wise',
  'zany',
]
const NOUNS = [
  'badger',
  'canyon',
  'dagger',
  'eagle',
  'falcon',
  'glacier',
  'harbor',
  'island',
  'jaguar',
  'kestrel',
  'lagoon',
  'marble',
  'nebula',
  'osprey',
  'panther',
  'quartz',
  'raven',
  'summit',
  'tiger',
  'vortex',
  'walrus',
  'xenon',
  'yonder',
  'zenith',
]

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

const issuer = process.env.STUBIDP_ISSUER ?? `http://localhost:${port}`
const clientId =
  argv['client-id'] ?? `${randomElement(ADJECTIVES)}-${randomElement(NOUNS)}-${randomBytes(3).toString('hex')}`
const clientSecret = argv['public-client']
  ? undefined
  : (argv['client-secret'] ?? randomBytes(32).toString('base64url'))
const enableRegistration = argv['enable-registration'] ?? false
const initialAccessToken = argv['registration-initial-access-token']
const redirectUri = argv['redirect-uri'] ?? process.env.STUBIDP_REDIRECT_URI ?? preset?.defaultRedirectUri
const postLogoutRedirectUri = argv['post-logout-redirect-uri'] ?? process.env.STUBIDP_POST_LOGOUT_REDIRECT_URI

if (!redirectUri && !enableRegistration) {
  console.error(
    'Error: --redirect-uri is required when not using a preset or --enable-registration (or set STUBIDP_REDIRECT_URI)',
  )
  process.exit(1)
}

let jwks
if (argv['jwks-file']) {
  const raw = await readFile(argv['jwks-file'], 'utf-8')
  jwks = JSON.parse(raw)
}

let clientJwks
if (argv['client-jwks-file']) {
  const raw = await readFile(argv['client-jwks-file'], 'utf-8')
  clientJwks = JSON.parse(raw)
} else if (argv['client-jwks']) {
  clientJwks = JSON.parse(argv['client-jwks'])
}

let defaultUser
if (argv['default-user']) {
  try {
    defaultUser = JSON.parse(argv['default-user'])
  } catch {
    console.error('Error: --default-user must be a valid JSON object')
    process.exit(1)
  }
}

const app = await createApp({
  issuer,
  clientId: redirectUri ? clientId : undefined,
  clientSecret: redirectUri ? clientSecret : undefined,
  redirectUri,
  postLogoutRedirectUri,
  grantTypes: preset?.grantTypes,
  jwks,
  enableRegistration,
  initialAccessToken,
  scopes: argv['scopes'] ? argv['scopes'].split(',').map((s) => s.trim()) : undefined,
  claims: argv['claims'] ? JSON.parse(argv['claims']) : undefined,
  skipPrompt: argv['skip-prompt'],
  defaultUser,
  accessTokenFormat: argv['access-token-format'],
  accessTokenTtl: argv['access-token-ttl'],
  idTokenTtl: argv['id-token-ttl'],
  refreshTokenTtl: argv['refresh-token-ttl'],
  sessionTtl: argv['session-ttl'],
  interactionPath: argv['interaction-path'],
  idTokenIncludesUserInfoClaims: argv['id-token-includes-userinfo-claims'],
  enableCimd: argv['enable-cimd'],
  cimdTrustedOrigins: argv['cimd-trusted-origins']
    ? argv['cimd-trusted-origins'].split(',').map((s) => s.trim())
    : undefined,
  enableJwtIntrospection: argv['enable-jwt-introspection'],
  introspectionSignedResponseAlg: argv['introspection-signed-response-alg'],
  enableJwtUserinfo: argv['enable-jwt-userinfo'],
  userinfoSignedResponseAlg: argv['userinfo-signed-response-alg'],
  enableJar: argv['enable-jar'],
  requestObjectSigningAlg: argv['request-object-signing-alg'],
  requireSignedRequestObject: argv['require-signed-request-object'],
  clientJwks,
  clientJwksUri: argv['client-jwks-uri'],
  disableTelemetry: argv['disable-telemetry'],
  trustProxy: argv['trust-proxy'],
  httpsRedirect: argv['https-redirect'],
  securityHeaders: argv['security-headers'],
  rateLimit: {
    windowMs: argv['rate-limit-window-ms'],
    max: argv['rate-limit-max'],
    disabled: argv['rate-limit-disabled'],
  },
})

app.listen(port, () => {
  const rows = [
    ...(redirectUri
      ? [
          ['Client ID', clientId],
          ...(clientSecret ? [['Client Secret', clientSecret]] : [['Token Auth Method', 'none (public client)']]),
          ['Redirect URI', redirectUri],
        ]
      : []),
    ['Discovery URL', `${issuer}/.well-known/openid-configuration`],
    ...(enableRegistration
      ? [
          ['Registration URL', `${issuer}/register`],
          ...(initialAccessToken ? [['Initial Access Token', initialAccessToken]] : []),
        ]
      : []),
  ]
  const col1 = Math.max(...rows.map(([k]) => k.length))
  const col2 = Math.max(...rows.map(([, v]) => v.length))
  const line = `+-${'-'.repeat(col1)}-+-${'-'.repeat(col2)}-+`
  console.log('\nStubIdP started\n')
  console.log(line)
  for (const [key, val] of rows) {
    console.log(`| ${key.padEnd(col1)} | ${val.padEnd(col2)} |`)
  }
  console.log(line + '\n')

  if (preset) {
    preset.printInstructions({ issuer, clientId, clientSecret })
  }
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    await shutdownNodeTelemetry()
    process.exit(0)
  })
}
