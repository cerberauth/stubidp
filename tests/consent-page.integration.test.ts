import { describe, it, expect, afterEach } from 'vitest'
import type { Server } from 'node:http'
import type { AppOptions } from '../src/server.js'

const redirectUri = 'http://localhost:3000/cb'

describe('consent page', () => {
  let server: Server | undefined

  afterEach(() => {
    server?.close()
    server = undefined
  })

  async function consentHtml(options: Partial<AppOptions>, params: Record<string, string>): Promise<string> {
    const { createApp } = await import('../src/server.js')
    const app = await createApp({ clientId: 'consent-client', clientSecret: 'consent-secret', redirectUri, ...options })
    await new Promise<void>((resolve) => {
      server = app.listen(0, resolve)
    })
    const address = server!.address()
    if (typeof address === 'string' || address === null) {
      throw new Error('failed to determine test server address')
    }
    const baseUrl = `http://localhost:${address.port}`

    const cookies = new Map<string, string>()
    const request = async (url: string, init: RequestInit = {}) => {
      const cookieHeader = [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ')
      const res = await fetch(new URL(url, baseUrl), {
        ...init,
        redirect: 'manual',
        headers: { ...init.headers, ...(cookieHeader ? { cookie: cookieHeader } : {}) },
      })
      for (const setCookie of res.headers.getSetCookie()) {
        const [pair] = setCookie.split(';')
        const [name, value] = pair.split('=')
        cookies.set(name, value)
      }
      return res
    }

    const authUrl = new URL('/auth', baseUrl)
    authUrl.search = new URLSearchParams({
      client_id: 'consent-client',
      response_type: 'code',
      redirect_uri: redirectUri,
      ...params,
    }).toString()

    const loginPrompt = (await request(authUrl.toString())).headers.get('location')!
    const afterLogin = await request(`${loginPrompt}/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username: 'jane', password: 'x' }),
    })
    const resumed = await request(afterLogin.headers.get('location')!)
    const consentPrompt = resumed.headers.get('location')!
    expect(consentPrompt).toContain('/interaction/')

    const res = await request(consentPrompt)
    expect(res.status).toBe(200)
    return res.text()
  }

  it('lists claims requested through the claims parameter', async () => {
    const html = await consentHtml(
      {},
      {
        scope: 'openid',
        claims: JSON.stringify({ id_token: { email: { essential: true } }, userinfo: { given_name: null } }),
      },
    )
    expect(html).toContain('Requested permissions')
    expect(html).toContain('Requested claims')
    expect(html).toContain('>email<')
    expect(html).toContain('>given_name<')
  })

  it('lists scopes requested for a resource server', async () => {
    const html = await consentHtml(
      { accessTokenFormat: 'jwt' },
      { scope: 'openid profile', resource: 'https://api.example.com' },
    )
    expect(html).toContain('Resource access')
    expect(html).toContain('https://api.example.com')
  })

  it('leaves out the claims section when no claims are requested', async () => {
    const html = await consentHtml({}, { scope: 'openid email' })
    expect(html).toContain('>email<')
    expect(html).not.toContain('Requested claims')
    expect(html).not.toContain('Resource access')
  })
})
