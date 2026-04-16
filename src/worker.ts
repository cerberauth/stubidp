import { env } from 'cloudflare:workers'
import { httpServerHandler } from 'cloudflare:node'
import express from 'express'
import { drizzle } from 'drizzle-orm/d1'

import { createProvider } from './provider.js'

export interface Env {
  DB: D1Database
  STUBIDP_CLIENT_ID: string
  STUBIDP_CLIENT_SECRET: string
  STUBIDP_REDIRECT_URI: string
  STUBIDP_ISSUER: string
}

// Cached Express app per isolate (keyed by config hash to survive secret rotation)
let cachedEntry: { key: string; app: ReturnType<typeof express> } | null = null

async function ensureApp(currentEnv: Env): Promise<ReturnType<typeof express>> {
  const key = `${currentEnv.STUBIDP_CLIENT_ID}:${currentEnv.STUBIDP_ISSUER}`
  if (cachedEntry?.key === key) {
    return cachedEntry.app
  }

  const db = drizzle(currentEnv.DB)
  const oidc = await createProvider({
    clientId: currentEnv.STUBIDP_CLIENT_ID,
    clientSecret: currentEnv.STUBIDP_CLIENT_SECRET,
    redirectUri: currentEnv.STUBIDP_REDIRECT_URI,
    db,
    issuer: currentEnv.STUBIDP_ISSUER,
  })

  const app = express()
  app.use(oidc.callback())
  cachedEntry = { key, app }
  return app
}

const app = express()

app.use(async (req, res, next) => {
  const currentEnv = env as unknown as Env
  const handler = await ensureApp(currentEnv)
  handler(req, res, next)
})

app.listen(3000)

export default httpServerHandler({ port: 3000 })
