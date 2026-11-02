import {
  chainProviders,
  createClient,
  EnvConsentProvider,
  ErrorCategory,
  StaticProvider,
  Tier,
  type Client,
  type CounterHandle,
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

// Product metrics, declared in argvio.metrics.yaml. Every dimension value
// comes from a fixed list below: never a client ID, a user, a URL or a token.
let serveStarted: CounterHandle | undefined
let oidcEvents: CounterHandle | undefined
let grants: CounterHandle | undefined

const PRESETS = ['better-auth', 'next-auth']
const GRANT_TYPES: Readonly<Record<string, string>> = {
  authorization_code: 'authorization_code',
  client_credentials: 'client_credentials',
  refresh_token: 'refresh_token',
  'urn:ietf:params:oauth:grant-type:device_code': 'device_code',
  'urn:ietf:params:oauth:grant-type:token-exchange': 'token_exchange',
  'urn:openid:params:grant-type:ciba': 'ciba',
}

/** Events of oidc-provider counted in oidc.events, as [event, outcome]. */
const PROVIDER_EVENTS: ReadonlyArray<readonly [string, string, string]> = [
  ['authorization.success', 'authorization', 'success'],
  ['authorization.error', 'authorization', 'error'],
  ['end_session.success', 'end_session', 'success'],
  ['end_session.error', 'end_session', 'error'],
  ['revocation.success', 'revocation', 'success'],
  ['revocation.error', 'revocation', 'error'],
  ['introspection.error', 'introspection', 'error'],
  ['userinfo.error', 'userinfo', 'error'],
  ['server_error', 'server', 'error'],
]

/** Narrows `value` to one of `allowed`, or "other". */
export function vocab(value: unknown, allowed: readonly string[]): string {
  return typeof value === 'string' && allowed.includes(value) ? value : 'other'
}

/** Names an OAuth grant type for the metrics: short, fixed, "other" if unknown. */
export function grantTypeLabel(grantType: unknown): string {
  return (typeof grantType === 'string' && GRANT_TYPES[grantType]) || 'other'
}

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

/**
 * Counts the options the user set, out of `names`, in the parsed `values`. Only
 * the number is meant to leave the process, never an option name or value.
 * yargs' built-in `help` and `version` are not configuration.
 */
export function countSetOptions(values: Readonly<Record<string, unknown>>, names: readonly string[]): number {
  return names.filter((name) => name !== 'help' && name !== 'version' && values[name] !== undefined).length
}

/**
 * Records the `stubidp` invocation. Safe to call when telemetry is disabled.
 *
 * `customizedCount` is how many options the user set. It is a callback so it
 * runs only when the user's consent tier allows it, and only the number is sent.
 */
export function startUsageAnalytics(
  version: string,
  disableTelemetry?: boolean,
  args: readonly string[] = process.argv.slice(2),
  customizedCount?: () => number,
): void {
  client = createClient(API_KEY, COMMAND_PATH, version, {
    endpoint: ENDPOINT,
    transport: 'http',
    disabled: !isTelemetryEnabled(disableTelemetry),
    consentProvider: chainProviders(new EnvConsentProvider(), new StaticProvider(Tier.Basic)),
    exportTimeoutMs: TIMEOUT_MS,
    shutdownTimeoutMs: TIMEOUT_MS,
    ...(customizedCount ? { configCustomizedCount: customizedCount } : {}),
  })
  serveStarted = client.counter('serve.started', { dims: ['preset', 'storage'] })
  oidcEvents = client.counter('oidc.events', { dims: ['event', 'outcome'] })
  grants = client.counter('oidc.grants', { dims: ['grant_type', 'outcome'] })
  startedAt = Date.now()
  flags = flagNames(args)
  client.recordSessionStart()
  client.recordCommandInvocation(COMMAND_PATH, flags)
}

/**
 * Records that the server started, with the preset it was started with
 * ("none" without one) and whether it keeps its state in a database.
 */
export function recordServeStarted(preset: string | undefined, database: boolean): void {
  serveStarted?.add(1, {
    preset: preset ? vocab(preset, PRESETS) : 'none',
    storage: database ? 'database' : 'memory',
  })
}

interface ProviderLike {
  on(event: string, listener: (...args: unknown[]) => void): unknown
}

interface GrantContext {
  oidc?: { params?: { grant_type?: unknown } }
}

/**
 * Counts the OIDC flows `provider` (an oidc-provider instance) serves by
 * outcome, and token grants by grant type. Does nothing unless usage analytics
 * started in this process, so the hosted Worker never reports.
 */
export function watchProvider(provider: ProviderLike): void {
  if (!client) {
    return
  }
  for (const [name, event, outcome] of PROVIDER_EVENTS) {
    provider.on(name, () => oidcEvents?.add(1, { event, outcome }))
  }
  for (const outcome of ['success', 'error']) {
    provider.on(`grant.${outcome}`, (ctx: unknown) => {
      const grantType = (ctx as GrantContext | undefined)?.oidc?.params?.grant_type
      grants?.add(1, { grant_type: grantTypeLabel(grantType), outcome })
    })
  }
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
