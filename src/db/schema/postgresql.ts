import { pgTable, text, integer, index, jsonb } from 'drizzle-orm/pg-core'

export const clients = pgTable('clients', {
  clientId: text('client_id').primaryKey(),
  clientSecret: text('client_secret'),
  redirectUris: jsonb('redirect_uris').$type<string[]>().default([]),
  responseTypes: jsonb('response_types').$type<string[]>().default([]),
  grantTypes: jsonb('grant_types').$type<string[]>().default([]),
  tokenEndpointAuthMethod: text('token_endpoint_auth_method'),
  clientName: text('client_name'),
  logoUri: text('logo_uri'),
  policyUri: text('policy_uri'),
  tosUri: text('tos_uri'),
  initiateLoginUri: text('initiate_login_uri'),
  postLogoutRedirectUris: jsonb('post_logout_redirect_uris').$type<string[]>().default([]),
  idTokenSignedResponseAlg: text('id_token_signed_response_alg'),
  userinfoSignedResponseAlg: text('userinfo_signed_response_alg'),
  payload: jsonb('payload').$type<Record<string, unknown>>(),
})

export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    uid: text('uid'),
    expiresAt: integer('expires_at'),
    payload: jsonb('payload').$type<Record<string, unknown>>(),
  },
  (t) => [index('sessions_uid_idx').on(t.uid), index('sessions_expires_at_idx').on(t.expiresAt)],
)

export const accessTokens = pgTable(
  'access_tokens',
  {
    id: text('id').primaryKey(),
    grantId: text('grant_id'),
    expiresAt: integer('expires_at'),
    payload: jsonb('payload').$type<Record<string, unknown>>(),
  },
  (t) => [index('access_tokens_grant_id_idx').on(t.grantId), index('access_tokens_expires_at_idx').on(t.expiresAt)],
)

export const authorizationCodes = pgTable(
  'authorization_codes',
  {
    id: text('id').primaryKey(),
    grantId: text('grant_id'),
    expiresAt: integer('expires_at'),
    payload: jsonb('payload').$type<Record<string, unknown>>(),
  },
  (t) => [
    index('authorization_codes_grant_id_idx').on(t.grantId),
    index('authorization_codes_expires_at_idx').on(t.expiresAt),
  ],
)

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: text('id').primaryKey(),
    grantId: text('grant_id'),
    expiresAt: integer('expires_at'),
    payload: jsonb('payload').$type<Record<string, unknown>>(),
  },
  (t) => [index('refresh_tokens_grant_id_idx').on(t.grantId), index('refresh_tokens_expires_at_idx').on(t.expiresAt)],
)

export const deviceCodes = pgTable(
  'device_codes',
  {
    id: text('id').primaryKey(),
    grantId: text('grant_id'),
    expiresAt: integer('expires_at'),
    payload: jsonb('payload').$type<Record<string, unknown>>(),
  },
  (t) => [index('device_codes_grant_id_idx').on(t.grantId), index('device_codes_expires_at_idx').on(t.expiresAt)],
)

export const backchannelAuthenticationRequests = pgTable(
  'backchannel_authentication_requests',
  {
    id: text('id').primaryKey(),
    grantId: text('grant_id'),
    expiresAt: integer('expires_at'),
    payload: jsonb('payload').$type<Record<string, unknown>>(),
  },
  (t) => [
    index('backchannel_auth_grant_id_idx').on(t.grantId),
    index('backchannel_auth_expires_at_idx').on(t.expiresAt),
  ],
)

export const grants = pgTable(
  'grants',
  {
    id: text('id').primaryKey(),
    clientId: text('client_id'),
    accountId: text('account_id'),
    scopes: jsonb('scopes').$type<string[]>().default([]),
    expiresAt: integer('expires_at'),
    payload: jsonb('payload').$type<Record<string, unknown>>(),
  },
  (t) => [
    index('grants_client_id_idx').on(t.clientId),
    index('grants_account_id_idx').on(t.accountId),
    index('grants_expires_at_idx').on(t.expiresAt),
  ],
)
