import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { Server } from 'node:http'
import type { Express } from 'express'
import { SignJWT, generateKeyPair, exportJWK } from 'jose'

describe('JWT-Secured Authorization Request (JAR, RFC 9101)', () => {
  const clientId = 'jar-client'
  const clientSecret = 'jar-client-secret-12345678901234567890!'
  const redirectUri = 'http://localhost:3000/cb'
  const issuer = 'http://localhost:8484'

  async function createServer(options: {
    enableJar?: boolean
    requireSignedRequestObject?: boolean
    requestObjectSigningAlg?: 'RS256' | 'HS256'
    clientJwks?: { keys: Array<Record<string, unknown>> }
    enableRegistration?: boolean
  }) {
    const { createApp } = await import('../src/server.js')
    const app: Express = await createApp({
      // Bind each test server to an ephemeral port. The OIDC issuer is a
      // separate configured identifier and need not be the listener address.
      issuer,
      clientId,
      clientSecret,
      redirectUri,
      skipPrompt: true,
      defaultUser: { sub: 'stub-user', email: 'stub@example.com' },
      grantTypes: ['authorization_code'],
      scopes: ['openid', 'email', 'profile'],
      ...options,
    })

    const server = app.listen(0)
    await new Promise<void>((resolve, reject) => {
      server.once('listening', resolve)
      server.once('error', reject)
    })
    const address = server.address()
    if (typeof address === 'string' || address === null) {
      throw new Error('failed to determine test server address')
    }
    const { port } = address
    const baseUrl = `http://localhost:${port}`
    return { server, baseUrl }
  }

  describe('Discovery metadata', () => {
    it('advertises request_parameter_supported and signing algs when JAR is enabled', async () => {
      const { server, baseUrl } = await createServer({ enableJar: true })
      try {
        const res = await fetch(`${baseUrl}/.well-known/openid-configuration`)
        const metadata = (await res.json()) as {
          request_parameter_supported?: boolean
          request_object_signing_alg_values_supported?: string[]
          require_signed_request_object?: boolean
        }
        expect(metadata.request_parameter_supported).toBe(true)
        expect(metadata.request_object_signing_alg_values_supported).toContain('HS256')
        expect(metadata.request_object_signing_alg_values_supported).toContain('RS256')
        expect(metadata.require_signed_request_object).toBeUndefined()
      } finally {
        server.close()
      }
    })

    it('advertises require_signed_request_object when configured', async () => {
      const { server, baseUrl } = await createServer({
        enableJar: true,
        requireSignedRequestObject: true,
      })
      try {
        const res = await fetch(`${baseUrl}/.well-known/openid-configuration`)
        const metadata = (await res.json()) as {
          request_parameter_supported?: boolean
          require_signed_request_object?: boolean
        }
        expect(metadata.request_parameter_supported).toBe(true)
        expect(metadata.require_signed_request_object).toBe(true)
      } finally {
        server.close()
      }
    })

    it('does not advertise request_parameter_supported when JAR is disabled', async () => {
      const { server, baseUrl } = await createServer({ enableJar: false })
      try {
        const res = await fetch(`${baseUrl}/.well-known/openid-configuration`)
        const metadata = (await res.json()) as {
          request_parameter_supported?: boolean
          request_object_signing_alg_values_supported?: string[]
        }
        expect(metadata.request_parameter_supported).toBeUndefined()
        expect(metadata.request_object_signing_alg_values_supported).toBeUndefined()
      } finally {
        server.close()
      }
    })
  })

  describe('Authorization requests with JAR', () => {
    let server: Server
    let baseUrl: string
    let clientRsaPrivate: CryptoKey
    let clientRsaPublicJwk: Record<string, unknown>

    const followRedirects = async (initialUrl: string) => {
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

      let location: string | null = initialUrl
      let finalLocation: string | null = null
      for (let hop = 0; hop < 10 && location; hop++) {
        const res = await fetchWithCookies(location)
        location = res.headers.get('location')
        if (location) {
          finalLocation = location
          if (location.startsWith(redirectUri)) break
          if (!location.startsWith('http')) {
            location = new URL(location, baseUrl).toString()
          }
        }
      }
      return finalLocation
    }

    beforeAll(async () => {
      const { publicKey, privateKey } = await generateKeyPair('RS256', { extractable: true })
      clientRsaPrivate = privateKey
      const exported = await exportJWK(publicKey)
      clientRsaPublicJwk = { ...exported, kid: 'client-key-1', use: 'sig', alg: 'RS256' }

      const created = await createServer({
        enableJar: true,
        clientJwks: { keys: [clientRsaPublicJwk] },
      })
      server = created.server
      baseUrl = created.baseUrl
    })

    afterAll(() => {
      server?.close()
    })

    it('rejects authorization requests carrying request when JAR is disabled', async () => {
      const { server: disabledServer, baseUrl: disabledBaseUrl } = await createServer({ enableJar: false })
      try {
        const secretKey = new TextEncoder().encode(clientSecret)
        const jwt = await new SignJWT({
          iss: clientId,
          aud: issuer,
          client_id: clientId,
          response_type: 'code',
          redirect_uri: redirectUri,
          scope: 'openid',
        })
          .setProtectedHeader({ alg: 'HS256' })
          .sign(secretKey)

        const res = await fetch(
          `${disabledBaseUrl}/auth?client_id=${clientId}&response_type=code&request=${encodeURIComponent(jwt)}`,
          { redirect: 'manual' },
        )
        expect(res.status).toBe(303)
        const location = res.headers.get('location')
        expect(location).toContain('error=request_not_supported')
      } finally {
        disabledServer.close()
      }
    })

    it('processes a symmetric HS256 Request Object and exchanges code for tokens', async () => {
      const secretKey = new TextEncoder().encode(clientSecret)
      const state = 'hs256-state-xyz'
      const requestJwt = await new SignJWT({
        iss: clientId,
        aud: issuer,
        client_id: clientId,
        response_type: 'code',
        redirect_uri: redirectUri,
        scope: 'openid email',
        state,
      })
        .setProtectedHeader({ alg: 'HS256' })
        .sign(secretKey)

      const finalLocation = await followRedirects(
        `${baseUrl}/auth?client_id=${clientId}&response_type=code&request=${encodeURIComponent(requestJwt)}`,
      )
      expect(finalLocation).toBeTruthy()
      expect(finalLocation).toContain(redirectUri)

      const callbackUrl = new URL(finalLocation!)
      expect(callbackUrl.searchParams.get('state')).toBe(state)
      const code = callbackUrl.searchParams.get('code')
      expect(code).toBeTruthy()

      // Exchange code for token
      const tokenRes = await fetch(`${baseUrl}/token`, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code!,
          redirect_uri: redirectUri,
        }),
      })
      expect(tokenRes.status).toBe(200)
      const tokens = (await tokenRes.json()) as { access_token: string; id_token: string }
      expect(tokens.access_token).toBeTruthy()
      expect(tokens.id_token).toBeTruthy()
    })

    it('processes an asymmetric RS256 Request Object verified via clientJwks', async () => {
      const state = 'rs256-state-abc'
      const requestJwt = await new SignJWT({
        iss: clientId,
        aud: issuer,
        client_id: clientId,
        response_type: 'code',
        redirect_uri: redirectUri,
        scope: 'openid profile',
        state,
      })
        .setProtectedHeader({ alg: 'RS256', kid: 'client-key-1' })
        .sign(clientRsaPrivate)

      const finalLocation = await followRedirects(
        `${baseUrl}/auth?client_id=${clientId}&response_type=code&request=${encodeURIComponent(requestJwt)}`,
      )
      expect(finalLocation).toBeTruthy()
      expect(finalLocation).toContain(redirectUri)

      const callbackUrl = new URL(finalLocation!)
      expect(callbackUrl.searchParams.get('state')).toBe(state)
      const code = callbackUrl.searchParams.get('code')
      expect(code).toBeTruthy()
    })

    it('rejects a Request Object with an invalid signature', async () => {
      const badKey = new TextEncoder().encode('wrong-secret-that-does-not-match!')
      const requestJwt = await new SignJWT({
        iss: clientId,
        aud: issuer,
        client_id: clientId,
        response_type: 'code',
        redirect_uri: redirectUri,
        scope: 'openid',
        state: 'bad-sig',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .sign(badKey)

      const res = await fetch(
        `${baseUrl}/auth?client_id=${clientId}&response_type=code&request=${encodeURIComponent(requestJwt)}`,
        { redirect: 'manual' },
      )
      expect(res.status).toBe(303)
      const location = res.headers.get('location')
      expect(location).toContain('error=invalid_request_object')
    })

    it('rejects a Request Object when iss does not match client_id', async () => {
      const secretKey = new TextEncoder().encode(clientSecret)
      const requestJwt = await new SignJWT({
        iss: 'wrong-issuer-id',
        aud: issuer,
        client_id: clientId,
        response_type: 'code',
        redirect_uri: redirectUri,
        scope: 'openid',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .sign(secretKey)

      const res = await fetch(
        `${baseUrl}/auth?client_id=${clientId}&response_type=code&request=${encodeURIComponent(requestJwt)}`,
        { redirect: 'manual' },
      )
      expect(res.status).toBe(303)
      const location = res.headers.get('location')
      expect(location).toContain('error=invalid_request_object')
    })

    it('rejects a Request Object when aud does not match provider issuer', async () => {
      const secretKey = new TextEncoder().encode(clientSecret)
      const requestJwt = await new SignJWT({
        iss: clientId,
        aud: 'https://different-idp.example.com',
        client_id: clientId,
        response_type: 'code',
        redirect_uri: redirectUri,
        scope: 'openid',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .sign(secretKey)

      const res = await fetch(
        `${baseUrl}/auth?client_id=${clientId}&response_type=code&request=${encodeURIComponent(requestJwt)}`,
        { redirect: 'manual' },
      )
      expect(res.status).toBe(303)
      const location = res.headers.get('location')
      expect(location).toContain('error=invalid_request_object')
    })
  })

  describe('require_signed_request_object enforcement', () => {
    it('rejects unsigned requests when requireSignedRequestObject is true', async () => {
      const { server, baseUrl } = await createServer({
        enableJar: true,
        requireSignedRequestObject: true,
      })
      try {
        const unsignedUrl = `${baseUrl}/auth?client_id=${clientId}&response_type=code&scope=openid&redirect_uri=${encodeURIComponent(redirectUri)}`
        const res = await fetch(unsignedUrl, { redirect: 'manual' })
        expect(res.status).toBe(303)
        const location = res.headers.get('location')
        expect(location).toContain('error=invalid_request')
        expect(location).toContain('Request+Object+must+be+used+by+this+client')
      } finally {
        server.close()
      }
    })
  })

  describe('request_object_signing_alg enforcement', () => {
    it('rejects algorithms that do not match the preregistered requestObjectSigningAlg', async () => {
      const { publicKey } = await generateKeyPair('RS256', { extractable: true })
      const exported = await exportJWK(publicKey)
      const jwk = { ...exported, kid: 'client-key-1', use: 'sig', alg: 'RS256' }

      const { server, baseUrl } = await createServer({
        enableJar: true,
        requestObjectSigningAlg: 'RS256',
        clientJwks: { keys: [jwk] },
      })
      try {
        // Sign with HS256 instead of preregistered RS256
        const secretKey = new TextEncoder().encode(clientSecret)
        const requestJwt = await new SignJWT({
          iss: clientId,
          aud: issuer,
          client_id: clientId,
          response_type: 'code',
          redirect_uri: redirectUri,
          scope: 'openid',
        })
          .setProtectedHeader({ alg: 'HS256' })
          .sign(secretKey)

        const res = await fetch(
          `${baseUrl}/auth?client_id=${clientId}&response_type=code&request=${encodeURIComponent(requestJwt)}`,
          { redirect: 'manual' },
        )
        expect(res.status).toBe(303)
        const location = res.headers.get('location')
        expect(location).toContain('error=invalid_request_object')
        expect(location).toContain('the+preregistered+alg+must+be+used')
      } finally {
        server.close()
      }
    })
  })

  describe('Dynamic Client Registration with JAR', () => {
    it('allows registering a client with request_object_signing_alg and jwks', async () => {
      const { server, baseUrl } = await createServer({
        enableJar: true,
        enableRegistration: true,
      })
      try {
        const { publicKey, privateKey } = await generateKeyPair('RS256', { extractable: true })
        const exported = await exportJWK(publicKey)
        const clientJwk = { ...exported, kid: 'dcr-key-1', use: 'sig', alg: 'RS256' }

        const regRes = await fetch(`${baseUrl}/reg`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            client_name: 'jar-dcr-client',
            redirect_uris: ['http://localhost:4000/cb'],
            grant_types: ['authorization_code'],
            response_types: ['code'],
            request_object_signing_alg: 'RS256',
            require_signed_request_object: true,
            jwks: { keys: [clientJwk] },
          }),
        })
        expect(regRes.status).toBe(201)
        const regBody = (await regRes.json()) as {
          client_id: string
          request_object_signing_alg: string
          require_signed_request_object: boolean
        }
        expect(regBody.request_object_signing_alg).toBe('RS256')
        expect(regBody.require_signed_request_object).toBe(true)

        // Sending unsigned request should be rejected for this DCR client
        const unsignedRes = await fetch(
          `${baseUrl}/auth?client_id=${regBody.client_id}&response_type=code&scope=openid&redirect_uri=${encodeURIComponent('http://localhost:4000/cb')}`,
          { redirect: 'manual' },
        )
        expect(unsignedRes.status).toBe(303)
        expect(unsignedRes.headers.get('location')).toContain('error=invalid_request')

        // Sending RS256 signed request object should succeed
        const requestJwt = await new SignJWT({
          iss: regBody.client_id,
          aud: issuer,
          client_id: regBody.client_id,
          response_type: 'code',
          redirect_uri: 'http://localhost:4000/cb',
          scope: 'openid',
          state: 'dcr-jar-state',
        })
          .setProtectedHeader({ alg: 'RS256', kid: 'dcr-key-1' })
          .sign(privateKey)

        const jarRes = await fetch(
          `${baseUrl}/auth?client_id=${regBody.client_id}&response_type=code&request=${encodeURIComponent(requestJwt)}`,
          { redirect: 'manual' },
        )
        expect(jarRes.status).toBe(303)
        // With skipPrompt, it redirects directly or through interaction to callback
        const location = jarRes.headers.get('location')
        expect(location).toBeTruthy()
        expect(location).not.toContain('error=')
      } finally {
        server.close()
      }
    })
  })
})
