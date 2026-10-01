// The single opt-out for everything usage-related that StubIdP sends to
// CerberAuth: today the Plausible page tracker on the HTML pages, and any CLI
// telemetry added later should check isTelemetryEnabled() too. Shared with the
// browser bundle (src/client/telemetry.ts), so keep this free of Node APIs at
// module level.
//
// Not to be confused with src/telemetry.ts, which is the opt-in OpenTelemetry
// export of the server's own traces/metrics/logs (configured with OTEL_*).

/** Plausible site, as registered in the Plausible instance. */
export const PLAUSIBLE_DOMAIN = 'stubidp.cerberauth.com'

/** Self-hosted Plausible instance; also the only origin the CSP lets pages call. */
export const PLAUSIBLE_ORIGIN = 'https://a.cerberauth.com'

/** Where the bundled tracker is served from (built to public/ by `npm run build:js`). */
export const TELEMETRY_SCRIPT_PATH = '/telemetry.js'

const TRUTHY = new Set(['1', 'true', 'yes'])

function isTruthy(value: string | undefined): boolean {
  return value !== undefined && TRUTHY.has(value.trim().toLowerCase())
}

/**
 * Telemetry is on unless switched off with the `disableTelemetry` option
 * (--disable-telemetry), STUBIDP_DISABLE_TELEMETRY, or the cross-tool
 * DO_NOT_TRACK convention (https://consoledonottrack.com). Any one of them wins.
 */
export function isTelemetryEnabled(
  disableTelemetry?: boolean,
  env: Record<string, string | undefined> = typeof process === 'undefined' ? {} : process.env,
): boolean {
  return !(disableTelemetry || isTruthy(env.STUBIDP_DISABLE_TELEMETRY) || isTruthy(env.DO_NOT_TRACK))
}
