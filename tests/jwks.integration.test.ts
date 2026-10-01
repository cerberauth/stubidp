import { describe, it, expect, afterEach, vi } from 'vitest'
import type { Server } from 'node:http'
import { generateKeyPair, exportJWK } from 'jose'

describe('signing key from STUBIDP_JWKS', () => {
  let server: Server | undefined

  afterEach(() => {
    server?.close()
    vi.unstubAllEnvs()
  })

  async function publishedKids(): Promise<string[]> {
    const { createApp } = await import('../src/server.js')
    const app = await createApp({ clientId: 'jwks-client', redirectUri: 'http://localhost:3000/cb' })
    await new Promise<void>((resolve) => {
      server = app.listen(0, resolve)
    })
    const address = server!.address()
    if (typeof address === 'string' || address === null) {
      throw new Error('failed to determine test server address')
    }
    const res = await fetch(`http://localhost:${address.port}/jwks`)
    return ((await res.json()) as { keys: { kid: string }[] }).keys.map((k) => k.kid)
  }

  it('uses the key provided through the environment', async () => {
    const { privateKey } = await generateKeyPair('RS256', { extractable: true })
    const jwk = await exportJWK(privateKey)
    vi.stubEnv('STUBIDP_JWKS', JSON.stringify({ keys: [{ ...jwk, use: 'sig', alg: 'RS256', kid: 'env-key' }] }))

    expect(await publishedKids()).toEqual(['env-key'])
  })

  it('rejects an invalid document', async () => {
    vi.stubEnv('STUBIDP_JWKS', 'not json')

    await expect(publishedKids()).rejects.toThrow(/STUBIDP_JWKS must be a valid JWKS JSON/)
  })
})
