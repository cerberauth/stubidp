import { describe, it, expect, afterEach } from 'vitest'
import type { Server } from 'node:http'

import { createApp } from '../src/server.js'

describe('--https-redirect', () => {
  let server: Server | undefined

  afterEach(() => {
    server?.close()
  })

  it('keeps the query string when redirecting to https', async () => {
    const app = await createApp({
      clientId: 'redirect-client',
      redirectUri: 'http://localhost:3000/cb',
      httpsRedirect: true,
    })
    await new Promise<void>((resolve) => {
      server = app.listen(0, resolve)
    })
    const address = server!.address()
    if (typeof address === 'string' || address === null) {
      throw new Error('failed to determine test server address')
    }

    const res = await fetch(`http://localhost:${address.port}/auth?client_id=redirect-client&scope=openid`, {
      redirect: 'manual',
    })

    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe(
      `https://localhost:${address.port}/auth?client_id=redirect-client&scope=openid`,
    )
  })
})
