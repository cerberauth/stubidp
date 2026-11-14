import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { Server } from 'node:http'
import type { Express } from 'express'

describe('skip-prompt without a default user', () => {
  let server: Server
  let baseUrl: string
  const redirectUri = 'http://localhost:3000/cb'

  beforeAll(async () => {
    const { createApp } = await import('../src/server.js')
    const app: Express = await createApp({
      clientId: 'skip-client',
      clientSecret: 'skip-secret',
      redirectUri,
      skipPrompt: true,
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

  async function authorize(extra: Record<string, string> = {}): Promise<URL> {
    const cookies = new Map<string, string>()
    const url = new URL(`${baseUrl}/auth`)
    url.search = new URLSearchParams({
      client_id: 'skip-client',
      response_type: 'code',
      scope: 'openid',
      redirect_uri: redirectUri,
      state: 'xyz',
      ...extra,
    }).toString()

    let location: string | null = url.toString()
    for (let hop = 0; hop < 10 && location; hop++) {
      const cookieHeader = [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ')
      const res = await fetch(location, {
        redirect: 'manual',
        headers: cookieHeader ? { cookie: cookieHeader } : {},
      })
      for (const setCookie of res.headers.getSetCookie()) {
        const [pair] = setCookie.split(';')
        const [name, value] = pair.split('=')
        cookies.set(name, value)
      }
      expect([302, 303]).toContain(res.status)
      location = res.headers.get('location')
      if (location?.startsWith(redirectUri)) {
        return new URL(location)
      }
      if (location && !location.startsWith('http')) {
        location = new URL(location, baseUrl).toString()
      }
    }
    throw new Error('authorization flow did not redirect back to the client')
  }

  it('redirects with login_required when no login_hint is sent', async () => {
    const callback = await authorize()
    expect(callback.searchParams.get('error')).toBe('login_required')
    expect(callback.searchParams.get('error_description')).toMatch(/login_hint is required/)
    expect(callback.searchParams.get('state')).toBe('xyz')
  })

  it('redirects with invalid_request when login_hint is malformed', async () => {
    const callback = await authorize({ login_hint: 'not-a-user' })
    expect(callback.searchParams.get('error')).toBe('invalid_request')
    expect(callback.searchParams.get('error_description')).toMatch(/valid email address/)
  })

  it('logs in with a valid login_hint', async () => {
    const callback = await authorize({ login_hint: 'jane@example.com' })
    expect(callback.searchParams.get('code')).toBeTruthy()
  })
})
