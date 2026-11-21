import type { Configuration, SigningAlgorithmWithNone } from 'oidc-provider'

import type { DefaultUser } from './provider.js'
import type { AppOptions } from './server.js'

/** A set of `STUBIDP_*` settings: process.env, Worker bindings, or CLI flags mapped to their variable names. */
export type ConfigEnv = Record<string, unknown>

const ACCESS_TOKEN_FORMATS = ['opaque', 'jwt'] as const

function invalid(name: string, reason: string): Error {
  return new Error(`${name} ${reason}`)
}

/** Reads a setting as a string, treating empty values and non-string bindings (D1, KV...) as unset. */
function str(env: ConfigEnv, name: string): string | undefined {
  const value = env[name]
  return typeof value === 'string' && value !== '' ? value : undefined
}

function bool(env: ConfigEnv, name: string): boolean | undefined {
  const value = str(env, name)
  if (value === undefined) return undefined
  if (['true', '1', 'yes'].includes(value.toLowerCase())) return true
  if (['false', '0', 'no'].includes(value.toLowerCase())) return false
  throw invalid(name, `must be true or false`)
}

function num(env: ConfigEnv, name: string): number | undefined {
  const value = str(env, name)
  if (value === undefined) return undefined
  const parsed = Number(value)
  if (Number.isNaN(parsed)) {
    throw invalid(name, `must be a number`)
  }
  return parsed
}

function list(env: ConfigEnv, name: string): string[] | undefined {
  const value = str(env, name)
  if (value === undefined) return undefined
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function json<T>(env: ConfigEnv, name: string, what: string): T | undefined {
  const value = str(env, name)
  if (value === undefined) return undefined
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    // JSON.parse errors quote the input, which can be a private key: never include them
    throw invalid(name, `must be ${what}`)
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw invalid(name, `must be ${what}`)
  }
  return parsed as T
}

function oneOf<T extends string>(env: ConfigEnv, name: string, choices: readonly T[]): T | undefined {
  const value = str(env, name)
  if (value === undefined) return undefined
  if (!choices.includes(value as T)) {
    throw invalid(name, `must be one of ${choices.join(', ')}`)
  }
  return value as T
}

/**
 * Turns `STUBIDP_*` settings into app options. Both the CLI (flags and env,
 * through {@link argvToEnv}) and the Worker (bindings) go through this, so a
 * setting is parsed the same way everywhere and a new one is added once.
 * Settings left unset come back undefined and get the provider's defaults.
 */
export function resolveConfig(env: ConfigEnv): AppOptions {
  const publicClient = bool(env, 'STUBIDP_PUBLIC_CLIENT')

  return {
    issuer: str(env, 'STUBIDP_ISSUER'),
    clientId: str(env, 'STUBIDP_CLIENT_ID'),
    clientSecret: publicClient ? undefined : str(env, 'STUBIDP_CLIENT_SECRET'),
    redirectUri: str(env, 'STUBIDP_REDIRECT_URI'),
    postLogoutRedirectUri: str(env, 'STUBIDP_POST_LOGOUT_REDIRECT_URI'),
    backchannelLogoutUri: str(env, 'STUBIDP_BACKCHANNEL_LOGOUT_URI'),
    jwks: json<NonNullable<Configuration['jwks']>>(env, 'STUBIDP_JWKS', 'a valid JWKS JSON document'),
    enableRegistration: bool(env, 'STUBIDP_ENABLE_REGISTRATION'),
    initialAccessToken: str(env, 'STUBIDP_REGISTRATION_INITIAL_ACCESS_TOKEN'),
    skipPrompt: bool(env, 'STUBIDP_SKIP_PROMPT'),
    defaultUser: json<DefaultUser>(env, 'STUBIDP_DEFAULT_USER', 'a JSON object of OIDC claims'),
    scopes: list(env, 'STUBIDP_SCOPES'),
    claims: json<NonNullable<Configuration['claims']>>(env, 'STUBIDP_CLAIMS', 'a JSON object mapping scopes to claims'),
    accessTokenFormat: oneOf(env, 'STUBIDP_ACCESS_TOKEN_FORMAT', ACCESS_TOKEN_FORMATS),
    idTokenIncludesUserInfoClaims: bool(env, 'STUBIDP_ID_TOKEN_INCLUDES_USERINFO_CLAIMS'),
    accessTokenTtl: num(env, 'STUBIDP_ACCESS_TOKEN_TTL'),
    idTokenTtl: num(env, 'STUBIDP_ID_TOKEN_TTL'),
    refreshTokenTtl: num(env, 'STUBIDP_REFRESH_TOKEN_TTL'),
    sessionTtl: num(env, 'STUBIDP_SESSION_TTL'),
    interactionPath: str(env, 'STUBIDP_INTERACTION_PATH'),
    disableTelemetry: bool(env, 'STUBIDP_DISABLE_TELEMETRY'),
    enableCimd: bool(env, 'STUBIDP_ENABLE_CIMD'),
    cimdTrustedOrigins: list(env, 'STUBIDP_CIMD_TRUSTED_ORIGINS'),
    enableJwtIntrospection: bool(env, 'STUBIDP_ENABLE_JWT_INTROSPECTION'),
    introspectionSignedResponseAlg: str(env, 'STUBIDP_INTROSPECTION_SIGNED_RESPONSE_ALG') as
      SigningAlgorithmWithNone | undefined,
    enableJwtUserinfo: bool(env, 'STUBIDP_ENABLE_JWT_USERINFO'),
    userinfoSignedResponseAlg: str(env, 'STUBIDP_USERINFO_SIGNED_RESPONSE_ALG') as SigningAlgorithmWithNone | undefined,
    enableJar: bool(env, 'STUBIDP_ENABLE_JAR'),
    requestObjectSigningAlg: str(env, 'STUBIDP_REQUEST_OBJECT_SIGNING_ALG') as SigningAlgorithmWithNone | undefined,
    requireSignedRequestObject: bool(env, 'STUBIDP_REQUIRE_SIGNED_REQUEST_OBJECT'),
    clientJwks: json<NonNullable<Configuration['jwks']>>(env, 'STUBIDP_CLIENT_JWKS', 'a valid JWKS JSON document'),
    clientJwksUri: str(env, 'STUBIDP_CLIENT_JWKS_URI'),
    trustProxy: bool(env, 'STUBIDP_TRUST_PROXY'),
    httpsRedirect: bool(env, 'STUBIDP_HTTPS_REDIRECT'),
    securityHeaders: bool(env, 'STUBIDP_SECURITY_HEADERS'),
    rateLimit: {
      windowMs: num(env, 'STUBIDP_RATE_LIMIT_WINDOW_MS'),
      max: num(env, 'STUBIDP_RATE_LIMIT_MAX'),
      disabled: bool(env, 'STUBIDP_RATE_LIMIT_DISABLED'),
    },
  }
}

/**
 * Maps parsed CLI options back to the `STUBIDP_*` variables they stand for
 * (`--skip-prompt` -> `STUBIDP_SKIP_PROMPT`), so the CLI can hand them to
 * {@link resolveConfig}. Options that were not set are left out.
 */
export function argvToEnv(argv: Record<string, unknown>, optionNames: readonly string[]): Record<string, string> {
  const env: Record<string, string> = {}
  for (const name of optionNames) {
    const value = argv[name]
    if (value === undefined || value === null) continue
    env[`STUBIDP_${name.toUpperCase().replaceAll('-', '_')}`] = String(value)
  }
  return env
}

/** A stable key covering every `STUBIDP_*` setting, to tell when the configuration changed. */
export function configCacheKey(env: ConfigEnv): string {
  return JSON.stringify(
    Object.entries(env)
      .filter(([name]) => name.startsWith('STUBIDP_'))
      .sort(([a], [b]) => a.localeCompare(b)),
  )
}
