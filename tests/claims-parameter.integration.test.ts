import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { Server } from 'node:http'
import type { Express } from 'express'

describe('OIDC claims request parameter (OIDC Core 5.5)', () => {
  let server: Server
  let baseUrl: string
  const redirectUri = 'http://localhost:3000/cb'

  beforeAll(async () => {
    const { createApp } = await import('../src/server.js')
    const app: Express = await createApp({
      clientId: 'claims-client',
      clientSecret: 'claims-secret',
      redirectUri,
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
  })

  it('advertises claims_parameter_supported in discovery', async () => {
    const res = await fetch(`${baseUrl}/.well-known/openid-configuration`)
    const metadata = (await res.json()) as { claims_parameter_supported: boolean }
    expect(metadata.claims_parameter_supported).toBe(true)
  })

  it('accepts an authorization request carrying a claims parameter', async () => {
    const url = new URL(`${baseUrl}/auth`)
    url.search = new URLSearchParams({
      client_id: 'claims-client',
      response_type: 'code',
      scope: 'openid',
      redirect_uri: redirectUri,
      state: 'xyz',
      claims: JSON.stringify({ id_token: { email: { essential: true } }, userinfo: { name: null } }),
    }).toString()

    const res = await fetch(url, { redirect: 'manual' })
    expect(res.status).toBe(303)
    expect(res.headers.get('location')).toContain('/interaction/')
  })
})
