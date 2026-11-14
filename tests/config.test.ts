import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import { argvToEnv, configCacheKey, resolveConfig } from '../src/config.js'

const jwks = JSON.stringify({ keys: [{ kty: 'oct', k: 'c2VjcmV0', use: 'sig' }] })

/** One value for every setting the CLI and the Worker share. */
const env: Record<string, string> = {
  STUBIDP_ISSUER: 'https://idp.example.com',
  STUBIDP_CLIENT_ID: 'client',
  STUBIDP_CLIENT_SECRET: 'secret',
  STUBIDP_REDIRECT_URI: 'https://app.example.com/cb',
  STUBIDP_POST_LOGOUT_REDIRECT_URI: 'https://app.example.com/bye',
  STUBIDP_ENABLE_REGISTRATION: 'true',
  STUBIDP_REGISTRATION_INITIAL_ACCESS_TOKEN: 'iat',
  STUBIDP_SKIP_PROMPT: 'true',
  STUBIDP_DEFAULT_USER: '{"sub":"jane"}',
  STUBIDP_SCOPES: 'openid, email,,profile',
  STUBIDP_CLAIMS: '{"openid":["sub"],"email":["email"]}',
  STUBIDP_ACCESS_TOKEN_FORMAT: 'jwt',
  STUBIDP_ID_TOKEN_INCLUDES_USERINFO_CLAIMS: 'true',
  STUBIDP_ACCESS_TOKEN_TTL: '60',
  STUBIDP_ID_TOKEN_TTL: '120',
  STUBIDP_REFRESH_TOKEN_TTL: '180',
  STUBIDP_SESSION_TTL: '240',
  STUBIDP_INTERACTION_PATH: '/login',
  STUBIDP_DISABLE_TELEMETRY: 'true',
  STUBIDP_ENABLE_CIMD: 'true',
  STUBIDP_CIMD_TRUSTED_ORIGINS: 'https://a.example/, https://b.example/',
  STUBIDP_ENABLE_JWT_INTROSPECTION: 'true',
  STUBIDP_INTROSPECTION_SIGNED_RESPONSE_ALG: 'RS256',
  STUBIDP_ENABLE_JWT_USERINFO: 'true',
  STUBIDP_USERINFO_SIGNED_RESPONSE_ALG: 'RS256',
  STUBIDP_ENABLE_JAR: 'false',
  STUBIDP_REQUEST_OBJECT_SIGNING_ALG: 'HS256',
  STUBIDP_REQUIRE_SIGNED_REQUEST_OBJECT: 'true',
  STUBIDP_CLIENT_JWKS: jwks,
  STUBIDP_CLIENT_JWKS_URI: 'https://app.example.com/jwks',
  STUBIDP_TRUST_PROXY: 'true',
  STUBIDP_HTTPS_REDIRECT: 'true',
  STUBIDP_SECURITY_HEADERS: 'true',
  STUBIDP_RATE_LIMIT_WINDOW_MS: '1000',
  STUBIDP_RATE_LIMIT_MAX: '5',
  STUBIDP_RATE_LIMIT_DISABLED: 'false',
}

describe('resolveConfig', () => {
  it('parses every setting into typed options', () => {
    expect(resolveConfig(env)).toMatchObject({
      issuer: 'https://idp.example.com',
      enableRegistration: true,
      defaultUser: { sub: 'jane' },
      scopes: ['openid', 'email', 'profile'],
      claims: { openid: ['sub'], email: ['email'] },
      accessTokenFormat: 'jwt',
      accessTokenTtl: 60,
      cimdTrustedOrigins: ['https://a.example/', 'https://b.example/'],
      enableJar: false,
      requireSignedRequestObject: true,
      clientJwks: JSON.parse(jwks),
      rateLimit: { windowMs: 1000, max: 5, disabled: false },
    })
  })

  it('leaves unset and empty settings undefined so provider defaults apply', () => {
    const config = resolveConfig({ STUBIDP_SCOPES: '', STUBIDP_ENABLE_JAR: '' })
    expect(config.scopes).toBeUndefined()
    expect(config.enableJar).toBeUndefined()
    expect(config.issuer).toBeUndefined()
  })

  it('ignores non-string bindings such as a D1 database', () => {
    expect(resolveConfig({ DB: {}, STUBIDP_ISSUER: { not: 'a string' } }).issuer).toBeUndefined()
  })

  it('drops the client secret for a public client', () => {
    expect(resolveConfig({ ...env, STUBIDP_PUBLIC_CLIENT: 'true' }).clientSecret).toBeUndefined()
  })

  it.each([
    ['STUBIDP_CLAIMS', '{oops', /STUBIDP_CLAIMS must be a JSON object mapping scopes to claims/],
    ['STUBIDP_JWKS', 'not json', /STUBIDP_JWKS must be a valid JWKS JSON document/],
    ['STUBIDP_CLIENT_JWKS', '[]', /STUBIDP_CLIENT_JWKS must be a valid JWKS JSON document/],
    ['STUBIDP_DEFAULT_USER', '"jane"', /STUBIDP_DEFAULT_USER must be a JSON object/],
    ['STUBIDP_ACCESS_TOKEN_FORMAT', 'paseto', /STUBIDP_ACCESS_TOKEN_FORMAT must be one of opaque, jwt/],
    ['STUBIDP_SKIP_PROMPT', 'maybe', /STUBIDP_SKIP_PROMPT must be true or false/],
    ['STUBIDP_ACCESS_TOKEN_TTL', 'soon', /STUBIDP_ACCESS_TOKEN_TTL must be a number/],
  ])('names %s when its value is invalid', (name, value, message) => {
    expect(() => resolveConfig({ [name]: value })).toThrow(message)
  })
})

describe('CLI and Worker resolve the same settings the same way', () => {
  const originalArgv = process.argv

  beforeEach(() => {
    for (const name of Object.keys(process.env)) {
      if (name.startsWith('STUBIDP_')) vi.stubEnv(name, undefined)
    }
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    process.argv = originalArgv
  })

  async function cliConfig() {
    vi.resetModules()
    const { argv, optionNames } = await import('../src/args.js')
    return resolveConfig({ ...process.env, ...argvToEnv(argv, optionNames) })
  }

  it('from STUBIDP_* variables', async () => {
    for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value)
    process.argv = ['node', 'stubidp']

    expect(await cliConfig()).toEqual(resolveConfig(env))
  })

  it('from command-line flags', async () => {
    process.argv = [
      'node',
      'stubidp',
      '--skip-prompt',
      '--scopes',
      'openid,email',
      '--access-token-ttl',
      '60',
      '--claims',
      '{"openid":["sub"]}',
    ]

    expect(await cliConfig()).toEqual(
      resolveConfig({
        STUBIDP_SKIP_PROMPT: 'true',
        STUBIDP_SCOPES: 'openid,email',
        STUBIDP_ACCESS_TOKEN_TTL: '60',
        STUBIDP_CLAIMS: '{"openid":["sub"]}',
      }),
    )
  })
})

describe('configCacheKey', () => {
  it('covers only STUBIDP_* settings, in a stable order', () => {
    const a = configCacheKey({ STUBIDP_B: '2', STUBIDP_A: '1', DB: {} })
    const b = configCacheKey({ STUBIDP_A: '1', STUBIDP_B: '2' })
    expect(a).toBe(b)
    expect(configCacheKey({ STUBIDP_A: '1', STUBIDP_B: '3' })).not.toBe(a)
  })
})
