import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

export const argv = yargs(hideBin(process.argv))
  .options({
    'client-id': { type: 'string', demandOption: false, description: 'Client ID (auto-generated if omitted) [env: OIDC_CLIENT_ID]' },
    'client-secret': { type: 'string', demandOption: false, description: 'Client Secret (auto-generated if omitted) [env: OIDC_CLIENT_SECRET]' },
    'redirect-uri': { type: 'string', demandOption: false, description: 'Redirect URI [env: OIDC_REDIRECT_URI]' },
    'jwks-file': { type: 'string', demandOption: false, description: 'Path to a JWKS JSON file (key pair auto-generated if omitted) [env: OIDC_JWKS_FILE]' },
  })
  .env('OIDC')
  .parseSync()
