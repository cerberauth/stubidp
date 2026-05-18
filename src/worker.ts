import { env } from 'cloudflare:workers'
import { httpServerHandler } from 'cloudflare:node'
import express, { type Express } from 'express'
import { drizzle } from 'drizzle-orm/d1'

import { createApp } from './server.js'

export interface Env {
  DB: D1Database
  STUBIDP_CLIENT_ID: string
  STUBIDP_CLIENT_SECRET: string
  STUBIDP_REDIRECT_URI: string
  STUBIDP_ISSUER?: string
  STUBIDP_TRUST_PROXY?: string
  STUBIDP_HTTPS_REDIRECT?: string
  STUBIDP_ENABLE_REGISTRATION?: string
  STUBIDP_REGISTRATION_INITIAL_ACCESS_TOKEN?: string
}

// Cached Express app per isolate (keyed by config hash to survive secret rotation)
let cachedEntry: { key: string; app: Express } | null = null

async function ensureApp(currentEnv: Env): Promise<Express> {
  const key = `${currentEnv.STUBIDP_CLIENT_ID}:${currentEnv.STUBIDP_ISSUER}`
  if (cachedEntry?.key === key) {
    return cachedEntry.app
  }

  const db = drizzle(currentEnv.DB)
  const app = await createApp({
    clientId: currentEnv.STUBIDP_CLIENT_ID,
    clientSecret: currentEnv.STUBIDP_CLIENT_SECRET,
    redirectUri: currentEnv.STUBIDP_REDIRECT_URI,
    db,
    issuer: currentEnv.STUBIDP_ISSUER,
    trustProxy: currentEnv.STUBIDP_TRUST_PROXY === 'true',
    httpsRedirect: currentEnv.STUBIDP_HTTPS_REDIRECT === 'true',
    securityHeaders: true,
    enableRegistration: currentEnv.STUBIDP_ENABLE_REGISTRATION === 'true',
    initialAccessToken: currentEnv.STUBIDP_REGISTRATION_INITIAL_ACCESS_TOKEN,
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
