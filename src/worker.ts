import { env } from 'cloudflare:workers'
import { httpServerHandler } from 'cloudflare:node'
import express, { type Express } from 'express'
import { drizzle } from 'drizzle-orm/d1'

import { configCacheKey, resolveConfig, type ConfigEnv } from './config.js'
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
  STUBIDP_ENABLE_JWT_USERINFO?: string
  STUBIDP_USERINFO_SIGNED_RESPONSE_ALG?: string
  STUBIDP_INTROSPECTION_SIGNED_RESPONSE_ALG?: string
  STUBIDP_ENABLE_JAR?: string
  STUBIDP_REQUEST_OBJECT_SIGNING_ALG?: string
  STUBIDP_REQUIRE_SIGNED_REQUEST_OBJECT?: string
  STUBIDP_CLIENT_JWKS?: string
  STUBIDP_CLIENT_JWKS_URI?: string
}

// Cached Express app per isolate, rebuilt whenever any STUBIDP_* binding changes
let cachedEntry: { key: string; app: Express } | null = null

async function ensureApp(currentEnv: Env): Promise<Express> {
  const key = configCacheKey(currentEnv as unknown as ConfigEnv)
  if (cachedEntry?.key === key) {
    return cachedEntry.app
  }

  // Worker bindings are not process.env, so they are resolved explicitly
  const app = await createApp({
    ...resolveConfig(currentEnv as unknown as ConfigEnv),
    db: drizzle(currentEnv.DB),
    securityHeaders: true,
    rateLimit: { disabled: true },
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
