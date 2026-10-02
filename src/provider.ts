import { trace, SpanStatusCode } from '@opentelemetry/api'
import { generateKeyPair, exportJWK } from 'jose'
import { isEmail, isPhone } from './hint.js'
import { isTelemetryEnabled } from './telemetry-settings.js'
import { logoutPage, logoutSuccessPage } from './views/index.js'
import { Provider, Configuration, SigningAlgorithmWithNone } from 'oidc-provider'
import type { DatabaseInstance } from './db/db.js'
import logger, { withRequestId } from './logger.js'

export interface DefaultUser {
  sub?: string
  name?: string
  given_name?: string
  family_name?: string
  middle_name?: string
  nickname?: string
  preferred_username?: string
  profile?: string
  picture?: string
  website?: string
  email?: string
  email_verified?: boolean
  gender?: string
  birthdate?: string
  zoneinfo?: string
  locale?: string
  phone_number?: string
  phone_number_verified?: boolean
  address?: Record<string, string>
  updated_at?: number
  [key: string]: unknown
}

export interface ProviderOptions {
  enableRegistration?: boolean
  initialAccessToken?: boolean | string
  clientId?: string
  clientSecret?: string
  redirectUri?: string
  postLogoutRedirectUri?: string
  grantTypes?: string[]
  db?: DatabaseInstance
  issuer?: string
  jwks?: Configuration['jwks']
  scopes?: string[]
  claims?: Configuration['claims']
  defaultUser?: DefaultUser
  skipPrompt?: boolean
  accessTokenFormat?: 'opaque' | 'jwt'
  idTokenIncludesUserInfoClaims?: boolean
  interactionPath?: string
  enableCimd?: boolean
  cimdTrustedOrigins?: string[]
  enableJwtIntrospection?: boolean
  introspectionSignedResponseAlg?: SigningAlgorithmWithNone
  enableJwtUserinfo?: boolean
  userinfoSignedResponseAlg?: SigningAlgorithmWithNone
  accessTokenTtl?: number
  idTokenTtl?: number
  refreshTokenTtl?: number
  sessionTtl?: number
  /** Don't load the Plausible tracker on the HTML pages. See src/telemetry-settings.ts. */
  disableTelemetry?: boolean
}

const DEFAULT_CIMD_TRUSTED_ORIGINS = ['https://cimd.cerberauth.com/t/']

// seconds, same as oidc-provider's own defaults
const DEFAULT_ACCESS_TOKEN_TTL = 60 * 60
const DEFAULT_ID_TOKEN_TTL = 60 * 60
const DEFAULT_REFRESH_TOKEN_TTL = 14 * 24 * 60 * 60
const DEFAULT_SESSION_TTL = 14 * 24 * 60 * 60

function resolveTtl(name: string, option: number | undefined, envValue: string | undefined, fallback: number) {
  const value = option ?? (envValue ? Number(envValue) : fallback)
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer number of seconds, got: ${option ?? envValue}`)
  }
  return value
}

function parseJwksEnv(value: string | undefined): Configuration['jwks'] | undefined {
  if (!value) return undefined
  try {
    return JSON.parse(value) as Configuration['jwks']
  } catch (err) {
    throw new Error(`STUBIDP_JWKS must be a valid JWKS JSON document: ${(err as Error).message}`)
  }
}

function identityClaimsFor(sub: string, defaultUser?: DefaultUser) {
  return {
    ...defaultUser,
    sub,
    ...(defaultUser?.email === undefined && isEmail(sub) ? { email: sub } : {}),
    ...(defaultUser?.phone_number === undefined && isPhone(sub) ? { phone_number: sub } : {}),
  }
}

export async function createProvider(options: ProviderOptions): Promise<Provider> {
  const issuer = options.issuer ?? process.env.STUBIDP_ISSUER ?? 'http://localhost:8484'
  const telemetry = isTelemetryEnabled(options.disableTelemetry)

  let jwks = options.jwks ?? parseJwksEnv(process.env.STUBIDP_JWKS)
  if (!jwks) {
    const { privateKey } = await generateKeyPair('RS256', { extractable: true })
    const privateJwk = await exportJWK(privateKey)
    jwks = { keys: [{ ...privateJwk, use: 'sig', alg: 'RS256' }] }
  }

  const grantTypes = options.grantTypes ?? [
    'authorization_code',
    'refresh_token',
    'client_credentials',
    'urn:ietf:params:oauth:grant-type:device_code',
  ]

  const introspectionSignedResponseAlg =
    options.introspectionSignedResponseAlg ??
    (process.env.STUBIDP_INTROSPECTION_SIGNED_RESPONSE_ALG as SigningAlgorithmWithNone | undefined)

  const userinfoSignedResponseAlg =
    options.userinfoSignedResponseAlg ??
    (process.env.STUBIDP_USERINFO_SIGNED_RESPONSE_ALG as SigningAlgorithmWithNone | undefined)

  const staticClient =
    options.clientId && options.redirectUri
      ? [
          {
            client_id: options.clientId,
            ...(options.clientSecret
              ? { client_secret: options.clientSecret }
              : { token_endpoint_auth_method: 'none' as const }),
            redirect_uris: [options.redirectUri],
            ...(options.postLogoutRedirectUri ? { post_logout_redirect_uris: [options.postLogoutRedirectUri] } : {}),
            response_types: ['code'] as ['code'],
            grant_types: grantTypes,
            ...(introspectionSignedResponseAlg
              ? { introspection_signed_response_alg: introspectionSignedResponseAlg }
              : {}),
            ...(userinfoSignedResponseAlg ? { userinfo_signed_response_alg: userinfoSignedResponseAlg } : {}),
          },
        ]
      : []

  const accessTokenFormat =
    options.accessTokenFormat ?? (process.env.STUBIDP_ACCESS_TOKEN_FORMAT as 'opaque' | 'jwt' | undefined) ?? 'opaque'

  const idTokenIncludesUserInfoClaims =
    options.idTokenIncludesUserInfoClaims ?? process.env.STUBIDP_ID_TOKEN_INCLUDES_USERINFO_CLAIMS === 'true'

  const interactionPath = (options.interactionPath ?? process.env.STUBIDP_INTERACTION_PATH ?? '/interaction').replace(
    /\/$/,
    '',
  )

  const enableJwtIntrospection =
    options.enableJwtIntrospection ?? process.env.STUBIDP_ENABLE_JWT_INTROSPECTION === 'true'

  const enableJwtUserinfo = options.enableJwtUserinfo ?? process.env.STUBIDP_ENABLE_JWT_USERINFO === 'true'

  const enableCimd = options.enableCimd ?? process.env.STUBIDP_ENABLE_CIMD === 'true'

  const cimdTrustedOrigins =
    options.cimdTrustedOrigins ??
    process.env.STUBIDP_CIMD_TRUSTED_ORIGINS?.split(',')
      .map((s) => s.trim())
      .filter(Boolean) ??
    DEFAULT_CIMD_TRUSTED_ORIGINS

  const accessTokenTtl = resolveTtl(
    'STUBIDP_ACCESS_TOKEN_TTL',
    options.accessTokenTtl,
    process.env.STUBIDP_ACCESS_TOKEN_TTL,
    DEFAULT_ACCESS_TOKEN_TTL,
  )
  const idTokenTtl = resolveTtl(
    'STUBIDP_ID_TOKEN_TTL',
    options.idTokenTtl,
    process.env.STUBIDP_ID_TOKEN_TTL,
    DEFAULT_ID_TOKEN_TTL,
  )
  const refreshTokenTtl = resolveTtl(
    'STUBIDP_REFRESH_TOKEN_TTL',
    options.refreshTokenTtl,
    process.env.STUBIDP_REFRESH_TOKEN_TTL,
    DEFAULT_REFRESH_TOKEN_TTL,
  )
  const sessionTtl = resolveTtl(
    'STUBIDP_SESSION_TTL',
    options.sessionTtl,
    process.env.STUBIDP_SESSION_TTL,
    DEFAULT_SESSION_TTL,
  )

  const resolvedScopes = options.scopes ??
    process.env.STUBIDP_SCOPES?.split(',').map((s) => s.trim()) ?? [
      'openid',
      'offline_access',
      'email',
      'profile',
      'phone',
      'address',
    ]

  const allDefaultClaims: Configuration['claims'] = {
    openid: ['sub'],
    email: ['email', 'email_verified'],
    profile: [
      'name',
      'given_name',
      'family_name',
      'middle_name',
      'nickname',
      'preferred_username',
      'profile',
      'picture',
      'website',
      'gender',
      'birthdate',
      'zoneinfo',
      'locale',
      'updated_at',
    ],
    phone: ['phone_number', 'phone_number_verified'],
    address: ['address'],
  }

  const resolvedClaims: Configuration['claims'] =
    options.claims ??
    (process.env.STUBIDP_CLAIMS ? (JSON.parse(process.env.STUBIDP_CLAIMS) as Configuration['claims']) : undefined) ??
    (Object.fromEntries(
      Object.entries(allDefaultClaims).filter(([scope]) => resolvedScopes.includes(scope)),
    ) as Configuration['claims'])

  const configuration: Configuration = {
    scopes: resolvedScopes,
    claims: resolvedClaims,
    clients: staticClient,
    jwks,
    // opt-in: keep requested claims in the ID token instead of splitting them
    // off to the UserInfo endpoint, so clients get email/profile without a /me call
    conformIdTokenClaims: !idTokenIncludesUserInfoClaims,
    features: {
      devInteractions: { enabled: false },
      claimsParameter: { enabled: true },
      rpInitiatedLogout: {
        enabled: true,
        async logoutSource(ctx, form) {
          const clientId = ctx.oidc.client?.clientId
          if (options.skipPrompt) {
            const { session, provider } = ctx.oidc
            if (!session) {
              ctx.body = logoutPage({ clientId, form, telemetry })
              return
            }

            const { accountId } = session
            if (accountId) {
              await Promise.all(
                Object.keys(session.authorizations ?? {}).map(async (cid) => {
                  const client = await provider.Client.find(cid)
                  const backchannel = (client as unknown as Record<string, unknown>)?.backchannelLogout
                  const sid = session.sidFor(cid)
                  if (client?.backchannelLogoutUri && typeof backchannel === 'function' && sid) {
                    await (backchannel as (accountId: string, sid: string) => Promise<void>)
                      .call(client, accountId, sid)
                      .then(() => provider.emit('backchannel.success', ctx, client, accountId, sid))
                      .catch((err: unknown) => provider.emit('backchannel.error', ctx, err, client, accountId, sid))
                  }
                }),
              )
            }

            const postLogoutRedirectUri = session.state?.postLogoutRedirectUri as string | undefined
            const stateParam = session.state?.state as string | undefined
            await session.destroy()

            let target: string
            if (postLogoutRedirectUri) {
              const url = new URL(postLogoutRedirectUri)
              if (stateParam) url.searchParams.set('state', stateParam)
              target = url.href
            } else {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              target = (ctx.oidc as any).urlFor('end_session_success')
            }
            ctx.redirect(target)
            return
          }
          ctx.body = logoutPage({ clientId, form, telemetry })
        },
        async postLogoutSuccessSource(ctx) {
          const clientId = ctx.oidc.client?.clientId
          ctx.body = logoutSuccessPage({ clientId, telemetry })
        },
      },
      registration: options.enableRegistration
        ? {
            enabled: true,
            initialAccessToken: options.initialAccessToken ?? false,
          }
        : { enabled: false },
      registrationManagement: options.enableRegistration
        ? {
            enabled: true,
            rotateRegistrationAccessToken: false,
          }
        : { enabled: false },
      resourceIndicators:
        accessTokenFormat === 'jwt'
          ? {
              enabled: true,
              defaultResource: () => issuer,
              useGrantedResource: () => true,
              getResourceServerInfo: async (_ctx, resourceIndicator) => ({
                scope: resolvedScopes.join(' '),
                audience: resourceIndicator,
                accessTokenFormat: 'jwt' as const,
                jwt: { sign: { alg: 'RS256' as const } },
              }),
            }
          : { enabled: false },
      deviceFlow: {
        enabled: true,
      },
      clientCredentials: {
        enabled: true,
      },
      revocation: {
        enabled: true,
      },
      introspection: {
        enabled: true,
      },
      jwtIntrospection: {
        enabled: enableJwtIntrospection,
      },
      jwtUserinfo: {
        enabled: enableJwtUserinfo,
      },
      clientIdMetadataDocument: enableCimd
        ? {
            enabled: true,
            ack: 'draft-02',
            async allowFetch(_ctx, clientId) {
              return cimdTrustedOrigins.some((origin) =>
                origin.endsWith('/') ? clientId.startsWith(origin) : clientId === origin,
              )
            },
          }
        : { enabled: false },
    },
    ttl: {
      AccessToken: accessTokenTtl,
      ClientCredentials: accessTokenTtl,
      IdToken: idTokenTtl,
      RefreshToken: refreshTokenTtl,
      Session: sessionTtl,
      Grant: Math.max(sessionTtl, refreshTokenTtl),
      Interaction: 60 * 60,
    },
    interactions: {
      url: async (_ctx, interaction) => `${interactionPath}/${interaction.uid}`,
    },
    findAccount: async (_ctx, sub) => ({
      accountId: sub,
      claims: async () => identityClaimsFor(sub, options.defaultUser),
    }),
    async extraTokenClaims(_ctx, token) {
      if (token.kind !== 'AccessToken' || !token.accountId) {
        return undefined
      }
      return identityClaimsFor(token.accountId, options.defaultUser)
    },
    clientBasedCORS(_ctx, origin, client) {
      if (!origin) {
        return true
      }

      const origins = client.redirectUris
        ?.map((uri) => {
          try {
            return new URL(uri).origin
          } catch {
            return null
          }
        })
        .filter(Boolean) as string[] | undefined
      if (!origins?.length) {
        return true
      }

      return origins.includes(origin)
    },
  }

  if (options.db) {
    const { DrizzleAdapter } = await import('./adapter.js')
    const db = options.db
    configuration.adapter = (name: string) => new DrizzleAdapter(db, name)
  } else if (process.env.STUBIDP_DATABASE_DIALECT) {
    const { DrizzleAdapter } = await import('./adapter.js')
    const { db } = await import('./db/db.js')
    configuration.adapter = (name: string) => new DrizzleAdapter(db, name)
  } else {
    const { MemoryAdapter } = await import('./memory-adapter.js')
    configuration.adapter = (name: string) => new MemoryAdapter(name)
  }

  const provider = new Provider(issuer, configuration)

  provider.on('server_error', (ctx, err) => {
    logger.error(withRequestId({ err, path: ctx.path, method: ctx.method }), 'oidc-provider server error')

    const span = trace.getActiveSpan()
    span?.recordException(err)
    span?.setStatus({ code: SpanStatusCode.ERROR, message: err.message })
  })

  return provider
}
