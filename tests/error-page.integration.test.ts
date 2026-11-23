import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { Server } from 'node:http'

describe('interaction errors', () => {
  let server: Server
  let baseUrl: string

  beforeAll(async () => {
    const { createApp } = await import('../src/server.js')
    const app = await createApp({
      clientId: 'err-client',
      clientSecret: 'err-secret',
      redirectUri: 'http://localhost:3000/cb',
    })
    await new Promise<void>((resolve) => {
      server = app.listen(0, resolve)
    })
    const address = server.address()
    if (typeof address === 'string' || address === null) throw new Error('no address')
    baseUrl = `http://localhost:${address.port}`
  })

  afterAll(() => {
    server?.close()
  })

  it('renders an HTML page for browsers when the interaction session is missing', async () => {
    const res = await fetch(`${baseUrl}/interaction/unknown-uid`, { headers: { accept: 'text/html' } })
    expect(res.status).toBe(400)
    expect(res.headers.get('content-type')).toContain('text/html')
    const body = await res.text()
    expect(body).toContain('Request failed')
    expect(body).toContain('expired or was already completed')
    expect(body).toContain('name="stubidp-error" content="invalid_request"')
    expect(body).toContain(res.headers.get('x-request-id')!)
  })

  it('keeps returning JSON for API clients', async () => {
    const res = await fetch(`${baseUrl}/interaction/unknown-uid`, { headers: { accept: 'application/json' } })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'invalid_request' })
  })

  it('omits the tracker when telemetry is disabled', async () => {
    const { createApp } = await import('../src/server.js')
    const app = await createApp({
      clientId: 'c',
      clientSecret: 's',
      redirectUri: 'http://localhost:3000/cb',
      disableTelemetry: true,
    })
    const s = await new Promise<Server>((resolve) => {
      const srv = app.listen(0, () => resolve(srv))
    })
    try {
      const { port } = s.address() as { port: number }
      const body = await (
        await fetch(`http://localhost:${port}/interaction/x`, { headers: { accept: 'text/html' } })
      ).text()
      expect(body).not.toContain('/telemetry.js')
    } finally {
      s.close()
    }
  })
})
