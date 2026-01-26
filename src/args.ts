import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

export const argv = yargs(hideBin(process.argv))
  .options({
    clientId: { type: 'string', demandOption: true, description: 'Client ID' },
    clientSecret: { type: 'string', demandOption: true, description: 'Client Secret' },
    redirectUri: { type: 'string', demandOption: true, description: 'Redirect URI' },
  })
  .parseSync()
