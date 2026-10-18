import {
  chainProviders,
  createClient,
  EnvConsentProvider,
  ErrorCategory,
  StaticProvider,
  Tier,
  type Client,
} from '@getargvio/argvio'
import { isTelemetryEnabled } from './telemetry-settings.js'

// CLI usage analytics for the `stubidp` command, sent to CerberAuth's
// collector, which forwards it to Argvio (https://github.com/getargvio).
// Reports that the command ran, which flags were passed (names only, never
// values) and how it exited. Interactive runs report at the Basic tier, CI
// runs at Anonymous. Shares the --disable-telemetry/STUBIDP_DISABLE_TELEMETRY/
// DO_NOT_TRACK opt-out with the Plausible page tracker (see
// telemetry-settings.ts); ARGVIO_DISABLED=1 is honored by the SDK too.
//
// Not to be confused with src/telemetry.ts, which exports the server's own
// traces/metrics/logs to a collector of the user's choosing.

const ENDPOINT = 'https://telemetry.cerberauth.com'

// StubIdP's public_ingest-scoped Argvio API key, selecting the "stubidp"
// tenant its usage analytics land in. It only allows sending usage data, so
// it is safe to embed; the collector forwards it to Argvio as is.
const API_KEY = 'argv_live_pub_qzKbHVg0P8zcY93ATt29GCe5aZVienlk'

const COMMAND_PATH = 'stubidp'

const TIMEOUT_MS = 1000

let client: Client | undefined
let startedAt = 0
let flags: string[] = []

/**
 * Returns the names of the long flags in `args`, without their values, e.g.
 * `['--preset', 'next-auth', '--client-id=abc']` gives `['preset', 'client-id']`.
 */
export function flagNames(args: readonly string[]): string[] {
  const names = new Set<string>()
  for (const arg of args) {
    if (arg === '--') {
      break
    }
    if (arg.startsWith('--') && arg.length > 2) {
      names.add(arg.slice(2).split('=', 1)[0])
    }
  }
  return [...names]
}

/** Records the `stubidp` invocation. Safe to call when telemetry is disabled. */
export function startUsageAnalytics(
  version: string,
  disableTelemetry?: boolean,
  args: readonly string[] = process.argv.slice(2),
): void {
  client = createClient(API_KEY, COMMAND_PATH, version, {
    endpoint: ENDPOINT,
    transport: 'http',
    disabled: !isTelemetryEnabled(disableTelemetry),
    consentProvider: chainProviders(new EnvConsentProvider(), new StaticProvider(Tier.Basic)),
    exportTimeoutMs: TIMEOUT_MS,
    shutdownTimeoutMs: TIMEOUT_MS,
  })
  startedAt = Date.now()
  flags = flagNames(args)
  client.recordSessionStart()
  client.recordCommandInvocation(COMMAND_PATH, flags)
}

/**
 * Records how the process is exiting and flushes, never throwing. Pass an
 * error category when exiting on an error.
 */
export async function stopUsageAnalytics(error?: ErrorCategory): Promise<void> {
  if (!client) {
    return
  }
  const current = client
  client = undefined
  if (error) {
    current.recordError(COMMAND_PATH, error)
  }
  current.recordCommand({
    path: COMMAND_PATH,
    flagNames: flags,
    startMs: startedAt,
    durationMs: Date.now() - startedAt,
    exitCode: error ? 1 : 0,
  })
  try {
    await current.shutdown(TIMEOUT_MS)
  } catch {
    // best-effort: the collector may be unreachable, nothing more to do here
  }
}

export { ErrorCategory }
