import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { Server } from 'node:http'
import type { Express } from 'express'

describe('JWT Token Introspection Responses (RFC 9701)', () => {
  let server: Server
  let baseUrl: string
  let clientId: string
  let clientSecret: string

  beforeAll(async () => {
    clientId = 'introspection-client'
    clientSecret = 'introspection-secret'

    const { createApp } = await import('../src/server.js')
    const app: Express = await createApp({
      clientId,
      clientSecret,
      redirectUri: 'http://localhost:3000/cb',
      grantTypes: ['client_credentials'],
      enableJwtIntrospection: true,
      introspectionSignedResponseAlg: 'RS256',
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

  async function getAccessToken(): Promise<string> {
    const tokenRes = await fetch(`${baseUrl}/token`, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({ grant_type: 'client_credentials' }),
    })
    expect(tokenRes.status).toBe(200)
    const tokens = (await tokenRes.json()) as { access_token: string }
    return tokens.access_token
  }

  it('returns a signed JWT when the client accepts application/token-introspection+jwt', async () => {
    const accessToken = await getAccessToken()

    const introspectRes = await fetch(`${baseUrl}/token/introspection`, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        accept: 'application/token-introspection+jwt',
        authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({ token: accessToken }),
    })

    expect(introspectRes.status).toBe(200)
    expect(introspectRes.headers.get('content-type')).toContain('application/token-introspection+jwt')

    const body = await introspectRes.text()
    expect(body.split('.')).toHaveLength(3)
  })

  it('returns plain JSON when the client does not request a JWT response', async () => {
    const accessToken = await getAccessToken()

    const introspectRes = await fetch(`${baseUrl}/token/introspection`, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        accept: 'application/json',
        authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({ token: accessToken }),
    })

    expect(introspectRes.status).toBe(200)
    expect(introspectRes.headers.get('content-type')).toContain('application/json')

    const body = (await introspectRes.json()) as { active: boolean }
    expect(body.active).toBe(true)
  })
})
