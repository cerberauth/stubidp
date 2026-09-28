import { describe, it, expect, afterEach } from 'vitest'
import type { Server } from 'node:http'

describe('token lifetimes', () => {
  let server: Server | undefined

  afterEach(() => {
    server?.close()
  })

  async function expiresIn(accessTokenTtl?: number): Promise<number> {
    const { createApp } = await import('../src/server.js')
    const app = await createApp({
      clientId: 'ttl-client',
      clientSecret: 'ttl-secret',
      redirectUri: 'http://localhost:3000/cb',
      grantTypes: ['client_credentials'],
      accessTokenTtl,
    })
    await new Promise<void>((resolve) => {
      server = app.listen(0, resolve)
    })
    const address = server!.address()
    if (typeof address === 'string' || address === null) {
      throw new Error('failed to determine test server address')
    }
    const res = await fetch(`http://localhost:${address.port}/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: 'ttl-client',
        client_secret: 'ttl-secret',
      }),
    })
    return (await res.json()).expires_in
  }

  it('applies a configured access token ttl', async () => {
    expect(await expiresIn(30)).toBe(30)
  })

  it('defaults access token ttl to one hour', async () => {
    expect(await expiresIn()).toBe(3600)
  })

  it('rejects invalid values', async () => {
    await expect(expiresIn(-1)).rejects.toThrow(/positive integer/)
  })
})
