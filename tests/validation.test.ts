import { describe, it, expect } from 'vitest'
import {
  validateClientPayload,
  validateSessionPayload,
  validateTokenPayload,
  validateDeviceCodePayload,
  validateGrantPayload,
  ClientPayloadSchema,
} from '../src/validation.js'

describe('ClientPayloadSchema', () => {
  it('should validate a minimal client payload', () => {
    const payload = {
      client_id: 'test-client',
    }

    const result = validateClientPayload(payload)

    expect(result.success).toBe(true)
    expect(result.data?.client_id).toBe('test-client')
    expect(result.data?.redirect_uris).toBeUndefined()
    expect(result.data?.response_types).toBeUndefined()
    expect(result.data?.grant_types).toBeUndefined()
    expect(result.data?.token_endpoint_auth_method).toBeUndefined()
  })

  it('should validate a full client payload', () => {
    const payload = {
      client_id: 'test-client',
      client_secret: 'secret',
      redirect_uris: ['http://localhost:8080/callback'],
      response_types: ['code', 'token'],
      grant_types: ['authorization_code', 'refresh_token'],
      token_endpoint_auth_method: 'client_secret_post',
      client_name: 'Test Client',
      logo_uri: 'https://example.com/logo.png',
      policy_uri: 'https://example.com/policy',
      tos_uri: 'https://example.com/tos',
    }

    const result = validateClientPayload(payload)

    expect(result.success).toBe(true)
    expect(result.data).toMatchObject(payload)
  })

  it('should reject payload without client_id', () => {
    const payload = {
      client_secret: 'secret',
    }

    const result = validateClientPayload(payload)

    expect(result.success).toBe(false)
    expect(result.errors).toBeDefined()
  })

  it('should reject payload with empty client_id', () => {
    const payload = {
      client_id: '',
    }

    const result = validateClientPayload(payload)

    expect(result.success).toBe(false)
    expect(result.errors?.issues[0].message).toBe('client_id is required')
  })

  it('should reject invalid redirect_uri', () => {
    const payload = {
      client_id: 'test-client',
      redirect_uris: ['not-a-valid-url'],
    }

    const result = validateClientPayload(payload)

    expect(result.success).toBe(false)
    expect(result.errors?.issues[0].message).toBe('Invalid redirect URI')
  })

  it('should reject invalid response_type', () => {
    const payload = {
      client_id: 'test-client',
      response_types: ['invalid'],
    }

    const result = validateClientPayload(payload)

    expect(result.success).toBe(false)
  })

  it('should reject invalid grant_type', () => {
    const payload = {
      client_id: 'test-client',
      grant_types: ['invalid_grant'],
    }

    const result = validateClientPayload(payload)

    expect(result.success).toBe(false)
  })

  it('should reject invalid token_endpoint_auth_method', () => {
    const payload = {
      client_id: 'test-client',
      token_endpoint_auth_method: 'invalid',
    }

    const result = validateClientPayload(payload)

    expect(result.success).toBe(false)
  })

  it('should accept valid URIs for logo_uri, policy_uri, tos_uri', () => {
    const payload = {
      client_id: 'test-client',
      logo_uri: 'https://example.com/logo.png',
      policy_uri: 'https://example.com/policy',
      tos_uri: 'https://example.com/tos',
    }

    const result = validateClientPayload(payload)

    expect(result.success).toBe(true)
  })

  it('should reject invalid URIs for logo_uri', () => {
    const payload = {
      client_id: 'test-client',
      logo_uri: 'not-a-url',
    }

    const result = validateClientPayload(payload)

    expect(result.success).toBe(false)
  })
})

describe('SessionPayloadSchema', () => {
  it('should validate a session payload', () => {
    const payload = {
      uid: 'user-123',
      accountId: 'account-456',
      loginTs: Date.now(),
      acr: '0',
      amr: ['pwd'],
    }

    const result = validateSessionPayload(payload)

    expect(result.success).toBe(true)
    expect(result.data).toMatchObject(payload)
  })

  it('should validate an empty session payload', () => {
    const result = validateSessionPayload({})

    expect(result.success).toBe(true)
  })
})

describe('TokenPayloadSchema', () => {
  it('should validate a token payload', () => {
    const payload = {
      accountId: 'account-123',
      clientId: 'client-456',
      grantId: 'grant-789',
      scope: 'openid profile email',
      sid: 'session-abc',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    }

    const result = validateTokenPayload(payload)

    expect(result.success).toBe(true)
    expect(result.data).toMatchObject(payload)
  })

  it('should validate a consumed token', () => {
    const payload = {
      accountId: 'account-123',
      consumed: Math.floor(Date.now() / 1000),
    }

    const result = validateTokenPayload(payload)

    expect(result.success).toBe(true)
    expect(result.data?.consumed).toBeDefined()
  })
})

describe('DeviceCodePayloadSchema', () => {
  it('should validate a device code payload', () => {
    const payload = {
      userCode: 'ABCD-1234',
      deviceCode: 'device-code-xyz',
      clientId: 'client-123',
      scope: 'openid profile',
      params: {
        client_id: 'client-123',
      },
    }

    const result = validateDeviceCodePayload(payload)

    expect(result.success).toBe(true)
    expect(result.data).toMatchObject(payload)
  })
})

describe('GrantPayloadSchema', () => {
  it('should validate a grant payload', () => {
    const payload = {
      accountId: 'account-123',
      clientId: 'client-456',
      openid: {
        scope: 'openid profile email',
      },
      resources: {
        'https://api.example.com': 'read write',
      },
    }

    const result = validateGrantPayload(payload)

    expect(result.success).toBe(true)
    expect(result.data).toMatchObject(payload)
  })

  it('should validate a grant with rejected scopes', () => {
    const payload = {
      accountId: 'account-123',
      rejected: {
        scope: 'admin',
      },
    }

    const result = validateGrantPayload(payload)

    expect(result.success).toBe(true)
    expect(result.data?.rejected?.scope).toBe('admin')
  })
})

describe('Schema type inference', () => {
  it('should have correct type for ClientPayloadSchema', () => {
    const result = ClientPayloadSchema.safeParse({
      client_id: 'test',
      redirect_uris: ['http://localhost/callback'],
    })

    if (result.success) {
      // TypeScript should infer these types correctly
      const clientId: string = result.data.client_id
      const redirectUris: string[] | undefined = result.data.redirect_uris

      expect(clientId).toBe('test')
      expect(redirectUris).toEqual(['http://localhost/callback'])
    }
  })
})
