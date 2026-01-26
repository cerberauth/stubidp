import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DrizzleAdapter, AdapterError } from '../src/adapter.js'

// Mock logger
vi.mock('../src/logger.js', () => ({
  default: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    child: vi.fn().mockReturnValue({
      info: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    }),
  },
  createChildLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }),
}))

// Mock schema tables
vi.mock('../src/db/schema.js', () => ({
  sessions: { id: 'id', payload: { uid: 'uid', userCode: 'userCode' }, expiresAt: 'expiresAt' },
  accessTokens: { id: 'id', grantId: 'grantId', payload: {}, expiresAt: 'expiresAt' },
  authorizationCodes: { id: 'id', grantId: 'grantId', payload: {}, expiresAt: 'expiresAt' },
  refreshTokens: { id: 'id', grantId: 'grantId', payload: {}, expiresAt: 'expiresAt' },
  deviceCodes: { id: 'id', grantId: 'grantId', payload: { userCode: 'userCode' }, expiresAt: 'expiresAt' },
  backchannelAuthenticationRequests: { id: 'id', grantId: 'grantId', payload: {}, expiresAt: 'expiresAt' },
  clients: { clientId: 'clientId', payload: {} },
  grants: { id: 'id', grantId: 'grantId', payload: {}, expiresAt: 'expiresAt' },
}))

vi.mock('../src/db/schema.postgres.js', () => ({
  sessions: { id: 'id', payload: { uid: 'uid', userCode: 'userCode' }, expiresAt: 'expiresAt' },
  accessTokens: { id: 'id', grantId: 'grantId', payload: {}, expiresAt: 'expiresAt' },
  authorizationCodes: { id: 'id', grantId: 'grantId', payload: {}, expiresAt: 'expiresAt' },
  refreshTokens: { id: 'id', grantId: 'grantId', payload: {}, expiresAt: 'expiresAt' },
  deviceCodes: { id: 'id', grantId: 'grantId', payload: { userCode: 'userCode' }, expiresAt: 'expiresAt' },
  backchannelAuthenticationRequests: { id: 'id', grantId: 'grantId', payload: {}, expiresAt: 'expiresAt' },
  clients: { clientId: 'clientId', payload: {} },
  grants: { id: 'id', grantId: 'grantId', payload: {}, expiresAt: 'expiresAt' },
}))

vi.mock('../src/db/schema.sqlite.js', () => ({
  sessions: { id: 'id', payload: { uid: 'uid', userCode: 'userCode' }, expiresAt: 'expiresAt' },
  accessTokens: { id: 'id', grantId: 'grantId', payload: {}, expiresAt: 'expiresAt' },
  authorizationCodes: { id: 'id', grantId: 'grantId', payload: {}, expiresAt: 'expiresAt' },
  refreshTokens: { id: 'id', grantId: 'grantId', payload: {}, expiresAt: 'expiresAt' },
  deviceCodes: { id: 'id', grantId: 'grantId', payload: { userCode: 'userCode' }, expiresAt: 'expiresAt' },
  backchannelAuthenticationRequests: { id: 'id', grantId: 'grantId', payload: {}, expiresAt: 'expiresAt' },
  clients: { clientId: 'clientId', payload: {} },
  grants: { id: 'id', grantId: 'grantId', payload: {}, expiresAt: 'expiresAt' },
}))

interface MockRecord {
  id: string
  payload: Record<string, unknown>
  expiresAt?: Date | null
  grantId?: string
}

function createMockDb() {
  const store = new Map<string, MockRecord>()

  const mockSelect = vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockImplementation(() => {
        return Promise.resolve([])
      }),
    }),
  })

  const mockInsert = vi.fn().mockReturnValue({
    values: vi.fn().mockReturnValue({
      onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
    }),
  })

  const mockUpdate = vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  })

  const mockDelete = vi.fn().mockReturnValue({
    where: vi.fn().mockResolvedValue(undefined),
  })

  return {
    store,
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  }
}

describe('AdapterError', () => {
  it('should create error with correct properties', () => {
    const error = new AdapterError('Test error', {
      model: 'Session',
      operation: 'find',
      cause: new Error('Original error'),
    })

    expect(error.message).toBe('Test error')
    expect(error.name).toBe('AdapterError')
    expect(error.model).toBe('Session')
    expect(error.operation).toBe('find')
    expect(error.cause).toBeInstanceOf(Error)
  })

  it('should create error without cause', () => {
    const error = new AdapterError('Test error', {
      model: 'Session',
      operation: 'find',
    })

    expect(error.cause).toBeUndefined()
  })
})

describe('DrizzleAdapter', () => {
  let mockDb: ReturnType<typeof createMockDb>

  beforeEach(() => {
    mockDb = createMockDb()
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('should create adapter for valid model', () => {
      const adapter = new DrizzleAdapter(mockDb, 'Session')
      expect(adapter).toBeInstanceOf(DrizzleAdapter)
    })

    it('should throw AdapterError for unknown model', () => {
      expect(() => new DrizzleAdapter(mockDb, 'UnknownModel')).toThrow(AdapterError)
      expect(() => new DrizzleAdapter(mockDb, 'UnknownModel')).toThrow('Unknown model: UnknownModel')
    })
  })

  describe('upsert', () => {
    it('should throw error when id is missing', async () => {
      const adapter = new DrizzleAdapter(mockDb, 'Session')

      await expect(adapter.upsert('', { data: 'test' }, 3600)).rejects.toThrow(AdapterError)
      await expect(adapter.upsert('', { data: 'test' }, 3600)).rejects.toThrow('ID is required for upsert operation')
    })

    it('should call insert with correct values for non-Client model', async () => {
      const adapter = new DrizzleAdapter(mockDb, 'Session')

      await adapter.upsert('test-id', { data: 'test' }, 3600)

      expect(mockDb.insert).toHaveBeenCalled()
    })

    it('should handle Client model with special field mapping', async () => {
      const adapter = new DrizzleAdapter(mockDb, 'Client')

      await adapter.upsert(
        'client-id',
        {
          client_id: 'client-id',
          client_secret: 'secret',
          redirect_uris: ['http://localhost/callback'],
          response_types: ['code'],
          grant_types: ['authorization_code'],
        },
        0,
      )

      expect(mockDb.insert).toHaveBeenCalled()
    })

    it('should wrap database errors in AdapterError', async () => {
      const dbError = new Error('Database connection failed')
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockRejectedValue(dbError),
        }),
      })

      const adapter = new DrizzleAdapter(mockDb, 'Session')

      await expect(adapter.upsert('test-id', { data: 'test' }, 3600)).rejects.toThrow(AdapterError)
      await expect(adapter.upsert('test-id', { data: 'test' }, 3600)).rejects.toThrow(
        'Failed to upsert Session with id: test-id',
      )
    })
  })

  describe('find', () => {
    it('should return undefined for empty id', async () => {
      const adapter = new DrizzleAdapter(mockDb, 'Session')

      const result = await adapter.find('')

      expect(result).toBeUndefined()
      expect(mockDb.select).not.toHaveBeenCalled()
    })

    it('should return undefined when record not found', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      })

      const adapter = new DrizzleAdapter(mockDb, 'Session')

      const result = await adapter.find('non-existent-id')

      expect(result).toBeUndefined()
    })

    it('should return payload when record found', async () => {
      const payload = { data: 'test', uid: '123' }
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 'test-id', payload, expiresAt: null }]),
        }),
      })

      const adapter = new DrizzleAdapter(mockDb, 'Session')

      const result = await adapter.find('test-id')

      expect(result).toEqual(payload)
    })

    it('should return undefined and destroy expired record', async () => {
      const expiredDate = new Date(Date.now() - 1000)
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 'test-id', payload: { data: 'test' }, expiresAt: expiredDate }]),
        }),
      })

      const adapter = new DrizzleAdapter(mockDb, 'Session')

      const result = await adapter.find('test-id')

      expect(result).toBeUndefined()
      expect(mockDb.delete).toHaveBeenCalled()
    })

    it('should wrap database errors in AdapterError', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error('Database error')),
        }),
      })

      const adapter = new DrizzleAdapter(mockDb, 'Session')

      await expect(adapter.find('test-id')).rejects.toThrow(AdapterError)
    })
  })

  describe('findByUserCode', () => {
    it('should return undefined for empty userCode', async () => {
      const adapter = new DrizzleAdapter(mockDb, 'DeviceCode')

      const result = await adapter.findByUserCode('')

      expect(result).toBeUndefined()
    })

    it('should return payload when record found', async () => {
      const payload = { userCode: 'ABC123', data: 'test' }
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 'test-id', payload, expiresAt: null }]),
        }),
      })

      const adapter = new DrizzleAdapter(mockDb, 'DeviceCode')

      const result = await adapter.findByUserCode('ABC123')

      expect(result).toEqual(payload)
    })
  })

  describe('findByUid', () => {
    it('should return undefined for empty uid', async () => {
      const adapter = new DrizzleAdapter(mockDb, 'Session')

      const result = await adapter.findByUid('')

      expect(result).toBeUndefined()
    })

    it('should return payload when record found', async () => {
      const payload = { uid: 'user-123', data: 'test' }
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 'test-id', payload, expiresAt: null }]),
        }),
      })

      const adapter = new DrizzleAdapter(mockDb, 'Session')

      const result = await adapter.findByUid('user-123')

      expect(result).toEqual(payload)
    })
  })

  describe('destroy', () => {
    it('should not call delete for empty id', async () => {
      const adapter = new DrizzleAdapter(mockDb, 'Session')

      await adapter.destroy('')

      expect(mockDb.delete).not.toHaveBeenCalled()
    })

    it('should call delete for valid id', async () => {
      const adapter = new DrizzleAdapter(mockDb, 'Session')

      await adapter.destroy('test-id')

      expect(mockDb.delete).toHaveBeenCalled()
    })

    it('should wrap database errors in AdapterError', async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockRejectedValue(new Error('Database error')),
      })

      const adapter = new DrizzleAdapter(mockDb, 'Session')

      await expect(adapter.destroy('test-id')).rejects.toThrow(AdapterError)
    })
  })

  describe('consume', () => {
    it('should throw error when id is missing', async () => {
      const adapter = new DrizzleAdapter(mockDb, 'AuthorizationCode')

      await expect(adapter.consume('')).rejects.toThrow(AdapterError)
      await expect(adapter.consume('')).rejects.toThrow('ID is required for consume operation')
    })

    it('should throw error when record not found', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      })

      const adapter = new DrizzleAdapter(mockDb, 'AuthorizationCode')

      await expect(adapter.consume('non-existent')).rejects.toThrow(AdapterError)
      await expect(adapter.consume('non-existent')).rejects.toThrow('AuthorizationCode with id non-existent not found')
    })

    it('should update payload with consumed timestamp', async () => {
      const payload = { data: 'test' }
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 'test-id', payload }]),
        }),
      })

      const adapter = new DrizzleAdapter(mockDb, 'AuthorizationCode')

      await adapter.consume('test-id')

      expect(mockDb.update).toHaveBeenCalled()
    })
  })

  describe('revokeByGrantId', () => {
    it('should not call delete for empty grantId', async () => {
      const adapter = new DrizzleAdapter(mockDb, 'AccessToken')

      await adapter.revokeByGrantId('')

      expect(mockDb.delete).not.toHaveBeenCalled()
    })

    it('should call delete for valid grantId', async () => {
      const adapter = new DrizzleAdapter(mockDb, 'AccessToken')

      await adapter.revokeByGrantId('grant-123')

      expect(mockDb.delete).toHaveBeenCalled()
    })

    it('should wrap database errors in AdapterError', async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockRejectedValue(new Error('Database error')),
      })

      const adapter = new DrizzleAdapter(mockDb, 'AccessToken')

      await expect(adapter.revokeByGrantId('grant-123')).rejects.toThrow(AdapterError)
    })
  })

  describe('model coverage', () => {
    const models = [
      'Session',
      'AccessToken',
      'AuthorizationCode',
      'RefreshToken',
      'DeviceCode',
      'BackchannelAuthenticationRequest',
      'Client',
      'Grant',
    ]

    it.each(models)('should create adapter for %s model', (model) => {
      const adapter = new DrizzleAdapter(mockDb, model)
      expect(adapter).toBeInstanceOf(DrizzleAdapter)
    })
  })
})
