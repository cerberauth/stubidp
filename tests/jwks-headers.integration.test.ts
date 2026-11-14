import { describe, it, expect, afterEach } from 'vitest'
import type { Server } from 'node:http'

import { createApp } from '../src/server.js'

describe('JWKS endpoint', () => {
  let server: Server | undefined

  afterEach(() => {
    server?.close()
  })

  async function start(): Promise<string> {
    const app = await createApp({
      clientId: 'jwks-headers-client',
      redirectUri: 'http://localhost:3000/cb',
      rateLimit: { max: 1 },
    })
    await new Promise<void>((resolve) => {
      server = app.listen(0, resolve)
    })
    const address = server!.address()
    if (typeof address === 'string' || address === null) {
      throw new Error('failed to determine test server address')
    }
    return `http://localhost:${address.port}`
  }

  it('is cacheable', async () => {
    const baseUrl = await start()

    const res = await fetch(`${baseUrl}/jwks`)

    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('public, max-age=3600, stale-while-revalidate=900')
  })

  it('is not rate limited', async () => {
    const baseUrl = await start()

    for (let i = 0; i < 3; i++) {
      const res = await fetch(`${baseUrl}/jwks`)
      expect(res.status).toBe(200)
      expect(res.headers.get('ratelimit')).toBeNull()
    }
  })
})
