import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'

export const clients = sqliteTable('clients', {
  clientId: text('client_id').primaryKey(),
  clientSecret: text('client_secret'),
  redirectUris: text('redirect_uris', { mode: 'json' }).$type<string[]>().default([]),
  responseTypes: text('response_types', { mode: 'json' }).$type<string[]>().default([]),
  grantTypes: text('grant_types', { mode: 'json' }).$type<string[]>().default([]),
  tokenEndpointAuthMethod: text('token_endpoint_auth_method'),
  clientName: text('client_name'),
  logoUri: text('logo_uri'),
  policyUri: text('policy_uri'),
  tosUri: text('tos_uri'),
  initiateLoginUri: text('initiate_login_uri'),
  postLogoutRedirectUris: text('post_logout_redirect_uris', { mode: 'json' }).$type<string[]>().default([]),
  idTokenSignedResponseAlg: text('id_token_signed_response_alg'),
  userinfoSignedResponseAlg: text('userinfo_signed_response_alg'),
  payload: text('payload', { mode: 'json' }).$type<Record<string, unknown>>(),
})

export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    uid: text('uid'),
    expiresAt: integer('expires_at'),
    payload: text('payload', { mode: 'json' }).$type<Record<string, unknown>>(),
  },
  (t) => [index('sessions_uid_idx').on(t.uid), index('sessions_expires_at_idx').on(t.expiresAt)],
)

export const accessTokens = sqliteTable(
  'access_tokens',
  {
    id: text('id').primaryKey(),
    grantId: text('grant_id'),
    expiresAt: integer('expires_at'),
    payload: text('payload', { mode: 'json' }).$type<Record<string, unknown>>(),
  },
  (t) => [index('access_tokens_grant_id_idx').on(t.grantId), index('access_tokens_expires_at_idx').on(t.expiresAt)],
)

export const authorizationCodes = sqliteTable(
  'authorization_codes',
  {
    id: text('id').primaryKey(),
    grantId: text('grant_id'),
    expiresAt: integer('expires_at'),
    payload: text('payload', { mode: 'json' }).$type<Record<string, unknown>>(),
  },
  (t) => [
    index('authorization_codes_grant_id_idx').on(t.grantId),
    index('authorization_codes_expires_at_idx').on(t.expiresAt),
  ],
)

export const refreshTokens = sqliteTable(
  'refresh_tokens',
  {
    id: text('id').primaryKey(),
    grantId: text('grant_id'),
    expiresAt: integer('expires_at'),
    payload: text('payload', { mode: 'json' }).$type<Record<string, unknown>>(),
  },
  (t) => [index('refresh_tokens_grant_id_idx').on(t.grantId), index('refresh_tokens_expires_at_idx').on(t.expiresAt)],
)

export const deviceCodes = sqliteTable(
  'device_codes',
  {
    id: text('id').primaryKey(),
    grantId: text('grant_id'),
    expiresAt: integer('expires_at'),
    payload: text('payload', { mode: 'json' }).$type<Record<string, unknown>>(),
  },
  (t) => [index('device_codes_grant_id_idx').on(t.grantId), index('device_codes_expires_at_idx').on(t.expiresAt)],
)

export const backchannelAuthenticationRequests = sqliteTable(
  'backchannel_authentication_requests',
  {
    id: text('id').primaryKey(),
    grantId: text('grant_id'),
    expiresAt: integer('expires_at'),
    payload: text('payload', { mode: 'json' }).$type<Record<string, unknown>>(),
  },
  (t) => [
    index('backchannel_auth_grant_id_idx').on(t.grantId),
    index('backchannel_auth_expires_at_idx').on(t.expiresAt),
  ],
)

export const grants = sqliteTable(
  'grants',
  {
    id: text('id').primaryKey(),
    clientId: text('client_id'),
    accountId: text('account_id'),
    scopes: text('scopes', { mode: 'json' }).$type<string[]>().default([]),
    expiresAt: integer('expires_at'),
    payload: text('payload', { mode: 'json' }).$type<Record<string, unknown>>(),
  },
  (t) => [
    index('grants_client_id_idx').on(t.clientId),
    index('grants_account_id_idx').on(t.accountId),
    index('grants_expires_at_idx').on(t.expiresAt),
  ],
)
