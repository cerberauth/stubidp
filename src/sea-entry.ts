import { isSea } from 'node:sea'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { createApp } from './server.js'
import logger from './logger.js'

const argv = yargs(isSea() ? process.argv.slice(1) : hideBin(process.argv))
  .options({
    clientId: { type: 'string', demandOption: true, description: 'Client ID' },
    clientSecret: { type: 'string', demandOption: true, description: 'Client Secret' },
    redirectUri: { type: 'string', demandOption: true, description: 'Redirect URI' },
  })
  .parseSync()

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
      mode: 'single-executable',
      discoveryUrl: `http://localhost:${port}/oauth2/.well-known/openid-configuration`,
    },
    'OIDC provider started (in-memory mode)',
  )
})
