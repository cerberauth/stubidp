import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

export const argv = yargs(hideBin(process.argv))
  .options({
    clientId: { type: 'string', demandOption: false, description: 'Client ID (auto-generated if omitted)' },
    clientSecret: { type: 'string', demandOption: false, description: 'Client Secret (auto-generated if omitted)' },
    redirectUri: { type: 'string', demandOption: true, description: 'Redirect URI' },
  })
  .parseSync()
