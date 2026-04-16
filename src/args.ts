import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

export const argv = yargs(hideBin(process.argv))
  .options({
    'client-id': {
      type: 'string',
      demandOption: false,
      env: 'STUBIDP_CLIENT_ID',
      description: 'Client ID (auto-generated if omitted) [env: STUBIDP_CLIENT_ID]',
    },
    'client-secret': {
      type: 'string',
      demandOption: false,
      env: 'STUBIDP_CLIENT_SECRET',
      description: 'Client Secret (auto-generated if omitted) [env: STUBIDP_CLIENT_SECRET]',
    },
    'redirect-uri': { type: 'string', demandOption: false, description: 'Redirect URI [env: STUBIDP_REDIRECT_URI]' },
    'jwks-file': {
      type: 'string',
      demandOption: false,
      env: 'STUBIDP_JWKS_FILE',
      description: 'Path to a JWKS JSON file (key pair auto-generated if omitted) [env: STUBIDP_JWKS_FILE]',
    },
    'rate-limit-window-ms': {
      type: 'number',
      demandOption: false,
      env: 'STUBIDP_RATE_LIMIT_WINDOW_MS',
      description:
        'Rate limit time window in milliseconds (default: 900000 = 15 min) [env: STUBIDP_RATE_LIMIT_WINDOW_MS]',
    },
    'rate-limit-max': {
      type: 'number',
      demandOption: false,
      env: 'STUBIDP_RATE_LIMIT_MAX',
      description: 'Max requests per window per IP (default: 100) [env: STUBIDP_RATE_LIMIT_MAX]',
    },
    'rate-limit-disabled': {
      type: 'boolean',
      demandOption: false,
      env: 'STUBIDP_RATE_LIMIT_DISABLED',
      description: 'Disable rate limiting [env: STUBIDP_RATE_LIMIT_DISABLED]',
    },
    preset: {
      type: 'string',
      demandOption: false,
      choices: ['better-auth', 'next-auth'] as const,
      description: 'Preconfigure for a specific auth library (better-auth, next-auth)',
    },
  })
  .env('STUBIDP')
  .parseSync()
