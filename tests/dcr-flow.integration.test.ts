import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { Server } from 'node:http'
import type { Express } from 'express'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'

/**
 * End-to-end regression test for the full dynamic client registration flow
 * against a *real* SQLite adapter (no mocked schema/driver).
 *
 * This exists because unit tests that mock the schema/driver (see
 * adapter.test.ts) can't catch bugs that only surface with a real driver:
 * a model missing from the adapter's registry, a column mismatch (e.g.
 * `clients.clientId` vs `id`), or a value the driver can't bind (e.g. a
 * `Date` object bound to an `integer` column). Exercising the real HTTP
 * flow end-to-end is the only reliable way to catch those.
 */
describe('DCR end-to-end flow (real SQLite adapter)', () => {
  let server: Server
  let baseUrl: string

  beforeAll(async () => {
    process.env.STUBIDP_DATABASE_DIALECT = 'sqlite'

    const sqlite = new Database(':memory:')
    const db = drizzle(sqlite)
    migrate(db, { migrationsFolder: './migrations/sqlite' })

    const { createApp } = await import('../src/server.js')
    const app: Express = await createApp({
      db,
      enableRegistration: true,
      skipPrompt: true,
      defaultUser: { sub: 'stub-user' },
    })

    await new Promise<void>((resolve) => {
      server = app.listen(0, resolve)
    })
    const address = server.address()
    if (typeof address === 'string' || address === null) {
      throw new Error('failed to determine test server address')
    }
    baseUrl = `http://localhost:${address.port}`
  })

  afterAll(() => {
    server?.close()
    delete process.env.STUBIDP_DATABASE_DIALECT
  })

  it('registers a client, completes login/consent, and exchanges a code for tokens', async () => {
    const redirectUri = 'http://localhost:3000/cb'
    const cookies = new Map<string, string>()

    const fetchWithCookies = async (url: string, init: RequestInit = {}) => {
      const cookieHeader = [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ')
      const res = await fetch(url, {
        ...init,
        headers: { ...init.headers, ...(cookieHeader ? { cookie: cookieHeader } : {}) },
      })
      for (const setCookie of res.headers.getSetCookie?.() ?? []) {
        const [pair] = setCookie.split(';')
        const [name, value] = pair.split('=')
        cookies.set(name, value)
      }
      return res
    }

    const registerRes = await fetch(`${baseUrl}/reg`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ redirect_uris: [redirectUri] }),
    })
    expect(registerRes.status).toBe(201)
    const client = (await registerRes.json()) as {
      client_id: string
      client_secret?: string
      registration_access_token: string
      registration_client_uri: string
    }
    expect(client.client_id).toBeTruthy()
    expect(client.registration_access_token).toBeTruthy()

    // registration management (uses the RegistrationAccessToken model)
    const readRegRes = await fetch(client.registration_client_uri, {
      headers: { authorization: `Bearer ${client.registration_access_token}` },
    })
    expect(readRegRes.status).toBe(200)

    // authorization request -> triggers Interaction persistence and, with
    // skipPrompt, auto-completes login + consent via redirects
    const authUrl = new URL(`${baseUrl}/auth`)
    authUrl.searchParams.set('client_id', client.client_id)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', 'openid')

    let location: string | null = authUrl.toString()
    let code: string | null = null
    for (let hop = 0; hop < 10 && location; hop++) {
      const res = await fetchWithCookies(location, { redirect: 'manual' })
      location = res.headers.get('location')
      expect([200, 302, 303]).toContain(res.status)

      if (location?.startsWith(redirectUri)) {
        code = new URL(location).searchParams.get('code')
        break
      }
      if (location && !location.startsWith('http')) {
        location = new URL(location, baseUrl).toString()
      }
    }

    expect(code).toBeTruthy()

    const tokenRes = await fetch(`${baseUrl}/token`, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        authorization: `Basic ${Buffer.from(`${client.client_id}:${client.client_secret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code!,
        redirect_uri: redirectUri,
      }),
    })
    expect(tokenRes.status).toBe(200)
    const tokens = (await tokenRes.json()) as { access_token?: string; id_token?: string }
    expect(tokens.access_token).toBeTruthy()
    expect(tokens.id_token).toBeTruthy()
  })
})
