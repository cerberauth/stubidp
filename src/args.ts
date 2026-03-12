import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

export const argv = yargs(hideBin(process.argv))
  .options({
    'client-id': { type: 'string', demandOption: false, description: 'Client ID (auto-generated if omitted)' },
    'client-secret': { type: 'string', demandOption: false, description: 'Client Secret (auto-generated if omitted)' },
    'redirect-uri': { type: 'string', demandOption: true, description: 'Redirect URI' },
    'jwks-file': { type: 'string', demandOption: false, description: 'Path to a JWKS JSON file (key pair auto-generated if omitted)' },
  })
  .parseSync()
