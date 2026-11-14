#!/usr/bin/env node

import { randomBytes } from 'crypto'
import { readFile } from 'fs/promises'
import { argv, optionNames } from '../build/args.js'
import { argvToEnv, resolveConfig } from '../build/config.js'
import { createApp } from '../build/server.js'
import { getPreset } from '../build/presets.js'
import { initNodeTelemetry, shutdownNodeTelemetry } from '../build/telemetry.js'
import { ErrorCategory, countSetOptions, startUsageAnalytics, stopUsageAnalytics } from '../build/usage-analytics.js'
import pkg from '../package.json' with { type: 'json' }

process.env.STUBIDP_SERVE_STATIC ??= '../public'

initNodeTelemetry()
startUsageAnalytics(pkg.version, argv['disable-telemetry'], undefined, () => countSetOptions(argv, optionNames))

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

async function fail(message) {
  console.error(`Error: ${message}`)
  await stopUsageAnalytics(ErrorCategory.User)
  process.exit(1)
}

// STUBIDP_* variables, overridden by flags, go through the same resolver as the Worker bindings
const env = { ...process.env, ...argvToEnv(argv, optionNames) }
try {
  if (argv['jwks-file']) env.STUBIDP_JWKS = await readFile(argv['jwks-file'], 'utf-8')
  if (argv['client-jwks-file']) env.STUBIDP_CLIENT_JWKS = await readFile(argv['client-jwks-file'], 'utf-8')
} catch (err) {
  await fail(err.message)
}

let config
try {
  config = resolveConfig(env)
} catch (err) {
  await fail(err.message)
}

const issuer = config.issuer ?? `http://localhost:${port}`
const clientId =
  config.clientId ?? `${randomElement(ADJECTIVES)}-${randomElement(NOUNS)}-${randomBytes(3).toString('hex')}`
const clientSecret = argv['public-client'] ? undefined : (config.clientSecret ?? randomBytes(32).toString('base64url'))
const enableRegistration = config.enableRegistration ?? false
const initialAccessToken = config.initialAccessToken
const redirectUri = config.redirectUri ?? preset?.defaultRedirectUri

if (!redirectUri && !enableRegistration) {
  await fail(
    '--redirect-uri is required when not using a preset or --enable-registration (or set STUBIDP_REDIRECT_URI)',
  )
}

const app = await createApp({
  ...config,
  issuer,
  clientId: redirectUri ? clientId : undefined,
  clientSecret: redirectUri ? clientSecret : undefined,
  redirectUri,
  grantTypes: preset?.grantTypes,
  enableRegistration,
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
    await Promise.all([shutdownNodeTelemetry(), stopUsageAnalytics()])
    process.exit(0)
  })
}
