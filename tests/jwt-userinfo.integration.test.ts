import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { Server } from 'node:http'
import type { Express } from 'express'

describe('JWT UserInfo Responses (OIDC Core 5.3.2)', () => {
  let server: Server
  let baseUrl: string
  const clientId = 'userinfo-client'
  const clientSecret = 'userinfo-secret'
  const redirectUri = 'http://localhost:3000/cb'

  async function createServer(options: { enableJwtUserinfo: boolean; userinfoSignedResponseAlg?: 'RS256' }) {
    const { createApp } = await import('../src/server.js')
    const app: Express = await createApp({
      clientId,
      clientSecret,
      redirectUri,
      skipPrompt: true,
      defaultUser: { sub: 'stub-user', email: 'stub@example.com' },
      grantTypes: ['authorization_code'],
      scopes: ['openid', 'email'],
      ...options,
    })

    await new Promise<void>((resolve) => {
      server = app.listen(0, resolve)
    })
    const address = server.address()
    if (typeof address === 'string' || address === null) {
      throw new Error('failed to determine test server address')
    }
    baseUrl = `http://localhost:${address.port}`
  }

  async function getAccessToken(): Promise<string> {
    const cookies = new Map<string, string>()
    const fetchWithCookies = async (url: string) => {
      const cookieHeader = [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ')
      const res = await fetch(url, { redirect: 'manual', headers: cookieHeader ? { cookie: cookieHeader } : {} })
      for (const setCookie of res.headers.getSetCookie?.() ?? []) {
        const [pair] = setCookie.split(';')
        const [name, value] = pair.split('=')
        cookies.set(name, value)
      }
      return res
    }

    const authUrl = new URL(`${baseUrl}/auth`)
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', 'openid email')

    let location: string | null = authUrl.toString()
    let code: string | null = null
    for (let hop = 0; hop < 10 && location; hop++) {
      const res = await fetchWithCookies(location)
      location = res.headers.get('location')
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
        authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({ grant_type: 'authorization_code', code: code!, redirect_uri: redirectUri }),
    })
    expect(tokenRes.status).toBe(200)
    return ((await tokenRes.json()) as { access_token: string }).access_token
  }

  describe('enabled with a signing algorithm', () => {
    beforeAll(() => createServer({ enableJwtUserinfo: true, userinfoSignedResponseAlg: 'RS256' }))
    afterAll(() => server?.close())

    it('returns a signed JWT from /me', async () => {
      const accessToken = await getAccessToken()
      const res = await fetch(`${baseUrl}/me`, { headers: { authorization: `Bearer ${accessToken}` } })

      expect(res.status).toBe(200)
      expect(res.headers.get('content-type')).toContain('application/jwt')

      const body = await res.text()
      const parts = body.split('.')
      expect(parts).toHaveLength(3)
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString()) as Record<string, unknown>
      expect(payload.sub).toBe('stub-user')
      expect(payload.aud).toBe(clientId)
    })
  })

  describe('disabled', () => {
    beforeAll(() => createServer({ enableJwtUserinfo: false }))
    afterAll(() => server?.close())

    it('returns plain JSON from /me', async () => {
      const accessToken = await getAccessToken()
      const res = await fetch(`${baseUrl}/me`, { headers: { authorization: `Bearer ${accessToken}` } })

      expect(res.status).toBe(200)
      expect(res.headers.get('content-type')).toContain('application/json')
      expect(((await res.json()) as { sub: string }).sub).toBe('stub-user')
    })
  })
})
