#!/usr/bin/env node

import { randomBytes } from 'crypto'
import { readFile } from 'fs/promises'
import { argv } from '../build/args.js'
import { createApp } from '../build/server.js'
import { getPreset } from '../build/presets.js'
import logger from '../build/logger.js'

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
const clientSecret = argv['client-secret'] ?? randomBytes(32).toString('base64url')
const enableRegistration = argv['enable-registration'] ?? false
const initialAccessToken = argv['registration-initial-access-token']
const redirectUri = argv['redirect-uri'] ?? process.env.STUBIDP_REDIRECT_URI ?? preset?.defaultRedirectUri

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

const app = await createApp({
  issuer,
  clientId: redirectUri ? clientId : undefined,
  clientSecret: redirectUri ? clientSecret : undefined,
  redirectUri,
  grantTypes: preset?.grantTypes,
  jwks,
  enableRegistration,
  initialAccessToken,
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
          ['Client Secret', clientSecret],
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
  console.log('\nstubIdP started\n')
  console.log(line)
  for (const [key, val] of rows) {
    console.log(`| ${key.padEnd(col1)} | ${val.padEnd(col2)} |`)
  }
  console.log(line + '\n')

  if (preset) {
    preset.printInstructions({ issuer, clientId, clientSecret })
  }
})
