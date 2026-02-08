#!/usr/bin/env node

import { argv } from '../build/args.js'
import { createApp } from '../build/server.js'
import logger from '../build/logger.js'

const port = parseInt(process.env.PORT || '3000', 10)

const app = await createApp({
  clientId: argv.clientId,
  clientSecret: argv.clientSecret,
  redirectUri: argv.redirectUri,
})

app.listen(port, () => {
  logger.info(
    {
      port,
      discoveryUrl: `http://localhost:${port}/oauth2/.well-known/openid-configuration`,
    },
    'OIDC provider started',
  )
})
