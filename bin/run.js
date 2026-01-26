#!/usr/bin/env node

import '../build/args.js'
import app from '../build/server.js'
import logger from '../build/logger.js'

const port = parseInt(process.env.PORT || '3000', 10)

app.listen(port, () => {
  logger.info(
    {
      port,
      discoveryUrl: `http://localhost:${port}/oauth2/.well-known/openid-configuration`,
    },
    'OIDC provider started',
  )
})
