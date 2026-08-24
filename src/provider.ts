import { generateKeyPair, exportJWK } from 'jose'
import { isEmail, isPhone } from './hint.js'
import { logoutPage, logoutSuccessPage } from './views/index.js'
import { Provider, Configuration } from 'oidc-provider'
import type { DatabaseInstance } from './db/db.js'

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

  let jwks = options.jwks
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
      rpInitiatedLogout: {
        enabled: true,
        async logoutSource(ctx, form) {
          const clientId = ctx.oidc.client?.clientId
          if (options.skipPrompt) {
            const { session, provider } = ctx.oidc
            if (!session) {
              ctx.body = logoutPage({ clientId, form })
              return
            }

            // back-channel: notify any RP that registered a backchannelLogoutUri
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

            // front-channel: destroy session + redirect (no JS, no HTML)
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
          ctx.body = logoutPage({ clientId, form })
        },
        async postLogoutSuccessSource(ctx) {
          const clientId = ctx.oidc.client?.clientId
          ctx.body = logoutSuccessPage({ clientId })
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
              // no explicit `resource` param needed: every request is treated as
              // targeting this single stub resource so access tokens are always JWTs
              defaultResource: () => issuer,
              // oidc-provider otherwise skips attaching the resource at token exchange
              // when the `openid` scope is present (favoring the UserInfo endpoint)
              useGrantedResource: () => true,
              getResourceServerInfo: async () => ({
                scope: resolvedScopes.join(' '),
                accessTokenFormat: 'jwt' as const,
                jwt: {
                  sign: { alg: 'RS256' },
                },
              }),
            },
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

  return new Provider(issuer, configuration)
}
