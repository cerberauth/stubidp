#!/usr/bin/env node

import { randomBytes } from 'crypto'
import { argv } from '../build/args.js'
import { createApp } from '../build/server.js'
import logger from '../build/logger.js'

const port = parseInt(process.env.PORT || '3000', 10)

const ADJECTIVES = ['brave', 'calm', 'dark', 'eager', 'fast', 'glad', 'high', 'icy', 'jolly', 'keen', 'lush', 'mild', 'neat', 'odd', 'proud', 'quick', 'rare', 'safe', 'tall', 'vast', 'warm', 'wise', 'zany']
const NOUNS = ['badger', 'canyon', 'dagger', 'eagle', 'falcon', 'glacier', 'harbor', 'island', 'jaguar', 'kestrel', 'lagoon', 'marble', 'nebula', 'osprey', 'panther', 'quartz', 'raven', 'summit', 'tiger', 'vortex', 'walrus', 'xenon', 'yonder', 'zenith']

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

const clientId = argv.clientId ?? `${randomElement(ADJECTIVES)}-${randomElement(NOUNS)}-${randomBytes(3).toString('hex')}`
const clientSecret = argv.clientSecret ?? randomBytes(32).toString('base64url')

const app = await createApp({
  clientId,
  clientSecret,
  redirectUri: argv.redirectUri,
})

app.listen(port, () => {
  logger.info(
    {
      port,
      clientId,
      clientSecret,
      discoveryUrl: `http://localhost:${port}/oauth2/.well-known/openid-configuration`,
    },
    'OIDC provider started',
  )
})
