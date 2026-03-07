import { env } from 'cloudflare:workers'
import { httpServerHandler } from 'cloudflare:node'
import express from 'express'
import { drizzle } from 'drizzle-orm/d1'

import { createProvider } from './provider.js'
import { createInteractionRouter } from './interactions.js'
import { homePage } from './views/index.js'

export interface Env {
  DB: D1Database
  OIDC_CLIENT_ID: string
  OIDC_CLIENT_SECRET: string
  OIDC_REDIRECT_URI: string
  OIDC_ISSUER: string
}

// Cached Express app per isolate (keyed by config hash to survive secret rotation)
let cachedEntry: { key: string; app: ReturnType<typeof express> } | null = null

async function ensureApp(currentEnv: Env): Promise<ReturnType<typeof express>> {
  const key = `${currentEnv.OIDC_CLIENT_ID}:${currentEnv.OIDC_ISSUER}`
  if (cachedEntry?.key === key) {
    return cachedEntry.app
  }

  const db = drizzle(currentEnv.DB)
  const oidc = await createProvider({
    clientId: currentEnv.OIDC_CLIENT_ID,
    clientSecret: currentEnv.OIDC_CLIENT_SECRET,
    redirectUri: currentEnv.OIDC_REDIRECT_URI,
    db,
    issuer: currentEnv.OIDC_ISSUER,
  })

  const app = express()

  app.get('/', (_req, res) => {
    res.type('html').send(homePage(oidc.issuer))
  })

  app.use('/interaction', createInteractionRouter(oidc))

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
