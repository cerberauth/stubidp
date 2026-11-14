import { describe, it, expect, afterEach } from 'vitest'
import type { Server } from 'node:http'
import { generateKeyPair, exportJWK, jwtVerify, createLocalJWKSet, decodeProtectedHeader } from 'jose'

import { createApp } from '../src/server.js'

describe('JWT access token signing algorithm', () => {
  let server: Server | undefined

  afterEach(() => {
    server?.close()
  })

  async function issueAccessToken(jwk: Record<string, unknown>): Promise<{ token: string; baseUrl: string }> {
    const app = await createApp({
      clientId: 'jwt-alg-client',
      clientSecret: 'jwt-alg-secret',
      redirectUri: 'http://localhost:3000/cb',
      grantTypes: ['client_credentials'],
      accessTokenFormat: 'jwt',
      jwks: { keys: [jwk] },
    })
    await new Promise<void>((resolve) => {
      server = app.listen(0, resolve)
    })
    const address = server!.address()
    if (typeof address === 'string' || address === null) {
      throw new Error('failed to determine test server address')
    }
    const baseUrl = `http://localhost:${address.port}`

    const res = await fetch(`${baseUrl}/token`, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        authorization: `Basic ${Buffer.from('jwt-alg-client:jwt-alg-secret').toString('base64')}`,
      },
      body: new URLSearchParams({ grant_type: 'client_credentials' }),
    })
    expect(res.status).toBe(200)
    return { token: ((await res.json()) as { access_token: string }).access_token, baseUrl }
  }

  it('signs with ES256 when the JWKS only has a P-256 key', async () => {
    const { privateKey } = await generateKeyPair('ES256', { extractable: true })
    const jwk = { ...(await exportJWK(privateKey)), use: 'sig', kid: 'ec-key' }

    const { token, baseUrl } = await issueAccessToken(jwk)

    expect(decodeProtectedHeader(token)).toMatchObject({ alg: 'ES256', kid: 'ec-key' })
    const keys = await (await fetch(`${baseUrl}/jwks`)).json()
    await expect(jwtVerify(token, createLocalJWKSet(keys))).resolves.toBeDefined()
  })

  it('signs with Ed25519 when the JWKS only has an Ed25519 key', async () => {
    const { privateKey } = await generateKeyPair('EdDSA', { crv: 'Ed25519', extractable: true })
    const jwk = { ...(await exportJWK(privateKey)), use: 'sig', kid: 'okp-key' }

    const { token } = await issueAccessToken(jwk)

    expect(decodeProtectedHeader(token)).toMatchObject({ alg: 'Ed25519', kid: 'okp-key' })
  })
})
