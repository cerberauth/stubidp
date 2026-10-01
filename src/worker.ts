import { env } from 'cloudflare:workers'
import { httpServerHandler } from 'cloudflare:node'
import express, { type Express } from 'express'
import { drizzle } from 'drizzle-orm/d1'
import type { SigningAlgorithmWithNone } from 'oidc-provider'

import { createApp } from './server.js'

export interface Env {
  DB: D1Database
  STUBIDP_CLIENT_ID: string
  STUBIDP_CLIENT_SECRET: string
  STUBIDP_REDIRECT_URI: string
  STUBIDP_POST_LOGOUT_REDIRECT_URI?: string
  STUBIDP_ISSUER?: string
  STUBIDP_JWKS?: string
  STUBIDP_HTTPS_REDIRECT?: string
  STUBIDP_ENABLE_REGISTRATION?: string
  STUBIDP_REGISTRATION_INITIAL_ACCESS_TOKEN?: string
  STUBIDP_SKIP_PROMPT?: string
  STUBIDP_SCOPES?: string
  STUBIDP_CLAIMS?: string
  STUBIDP_ACCESS_TOKEN_FORMAT?: string
  STUBIDP_ID_TOKEN_INCLUDES_USERINFO_CLAIMS?: string
  STUBIDP_ACCESS_TOKEN_TTL?: string
  STUBIDP_ID_TOKEN_TTL?: string
  STUBIDP_REFRESH_TOKEN_TTL?: string
  STUBIDP_SESSION_TTL?: string
  STUBIDP_DISABLE_TELEMETRY?: string
  STUBIDP_INTERACTION_PATH?: string
  STUBIDP_ENABLE_CIMD?: string
  STUBIDP_CIMD_TRUSTED_ORIGINS?: string
  STUBIDP_ENABLE_JWT_INTROSPECTION?: string
  STUBIDP_INTROSPECTION_SIGNED_RESPONSE_ALG?: string
}

const toSeconds = (value?: string) => (value ? Number(value) : undefined)

// Cached Express app per isolate (keyed by config hash to survive secret rotation)
let cachedEntry: { key: string; app: Express } | null = null

async function ensureApp(currentEnv: Env): Promise<Express> {
  const key = `${currentEnv.STUBIDP_CLIENT_ID}:${currentEnv.STUBIDP_POST_LOGOUT_REDIRECT_URI}:${currentEnv.STUBIDP_ISSUER}:${currentEnv.STUBIDP_JWKS}:${currentEnv.STUBIDP_ACCESS_TOKEN_FORMAT}:${currentEnv.STUBIDP_ID_TOKEN_INCLUDES_USERINFO_CLAIMS}:${currentEnv.STUBIDP_INTERACTION_PATH}:${currentEnv.STUBIDP_ENABLE_CIMD}:${currentEnv.STUBIDP_CIMD_TRUSTED_ORIGINS}:${currentEnv.STUBIDP_ENABLE_JWT_INTROSPECTION}:${currentEnv.STUBIDP_INTROSPECTION_SIGNED_RESPONSE_ALG}:${currentEnv.STUBIDP_ACCESS_TOKEN_TTL}:${currentEnv.STUBIDP_ID_TOKEN_TTL}:${currentEnv.STUBIDP_REFRESH_TOKEN_TTL}:${currentEnv.STUBIDP_SESSION_TTL}:${currentEnv.STUBIDP_DISABLE_TELEMETRY}`
  if (cachedEntry?.key === key) {
    return cachedEntry.app
  }

  const db = drizzle(currentEnv.DB)
  const app = await createApp({
    clientId: currentEnv.STUBIDP_CLIENT_ID,
    clientSecret: currentEnv.STUBIDP_CLIENT_SECRET,
    redirectUri: currentEnv.STUBIDP_REDIRECT_URI,
    postLogoutRedirectUri: currentEnv.STUBIDP_POST_LOGOUT_REDIRECT_URI,
    db,
    issuer: currentEnv.STUBIDP_ISSUER,
    jwks: currentEnv.STUBIDP_JWKS ? JSON.parse(currentEnv.STUBIDP_JWKS) : undefined, // Worker bindings are not process.env
    httpsRedirect: currentEnv.STUBIDP_HTTPS_REDIRECT === 'true',
    securityHeaders: true,
    enableRegistration: currentEnv.STUBIDP_ENABLE_REGISTRATION === 'true',
    initialAccessToken: currentEnv.STUBIDP_REGISTRATION_INITIAL_ACCESS_TOKEN,
    skipPrompt: currentEnv.STUBIDP_SKIP_PROMPT === 'true',
    scopes: currentEnv.STUBIDP_SCOPES ? currentEnv.STUBIDP_SCOPES.split(',').map((s) => s.trim()) : undefined,
    claims: currentEnv.STUBIDP_CLAIMS ? JSON.parse(currentEnv.STUBIDP_CLAIMS) : undefined,
    accessTokenFormat: currentEnv.STUBIDP_ACCESS_TOKEN_FORMAT as 'opaque' | 'jwt' | undefined,
    idTokenIncludesUserInfoClaims: currentEnv.STUBIDP_ID_TOKEN_INCLUDES_USERINFO_CLAIMS === 'true',
    accessTokenTtl: toSeconds(currentEnv.STUBIDP_ACCESS_TOKEN_TTL),
    idTokenTtl: toSeconds(currentEnv.STUBIDP_ID_TOKEN_TTL),
    refreshTokenTtl: toSeconds(currentEnv.STUBIDP_REFRESH_TOKEN_TTL),
    sessionTtl: toSeconds(currentEnv.STUBIDP_SESSION_TTL),
    disableTelemetry: currentEnv.STUBIDP_DISABLE_TELEMETRY === 'true',
    interactionPath: currentEnv.STUBIDP_INTERACTION_PATH,
    enableCimd: currentEnv.STUBIDP_ENABLE_CIMD === 'true',
    cimdTrustedOrigins: currentEnv.STUBIDP_CIMD_TRUSTED_ORIGINS
      ? currentEnv.STUBIDP_CIMD_TRUSTED_ORIGINS.split(',').map((s) => s.trim())
      : undefined,
    enableJwtIntrospection: currentEnv.STUBIDP_ENABLE_JWT_INTROSPECTION === 'true',
    introspectionSignedResponseAlg: currentEnv.STUBIDP_INTROSPECTION_SIGNED_RESPONSE_ALG as
      SigningAlgorithmWithNone | undefined,
  })

  cachedEntry = { key, app }
  return app
}

const app = express()

app.use(async (req, res, next) => {
  try {
    const currentEnv = env as unknown as Env
    const handler = await ensureApp(currentEnv)
    handler(req, res, next)
  } catch (err) {
    next(err)
  }
})

const port = 8484
app.listen(port)

export default httpServerHandler({ port })
