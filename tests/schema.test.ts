import { describe, it, expect } from 'vitest'

describe('PostgreSQL Schema', () => {
  it('should export all required tables', async () => {
    const schema = await import('../src/db/schema/postgresql.js')

    expect(schema.clients).toBeDefined()
    expect(schema.sessions).toBeDefined()
    expect(schema.accessTokens).toBeDefined()
    expect(schema.authorizationCodes).toBeDefined()
    expect(schema.refreshTokens).toBeDefined()
    expect(schema.deviceCodes).toBeDefined()
    expect(schema.backchannelAuthenticationRequests).toBeDefined()
    expect(schema.grants).toBeDefined()
  })
})

describe('SQLite Schema', () => {
  it('should export all required tables', async () => {
    const schema = await import('../src/db/schema/sqlite.js')

    expect(schema.clients).toBeDefined()
    expect(schema.sessions).toBeDefined()
    expect(schema.accessTokens).toBeDefined()
    expect(schema.authorizationCodes).toBeDefined()
    expect(schema.refreshTokens).toBeDefined()
    expect(schema.deviceCodes).toBeDefined()
    expect(schema.backchannelAuthenticationRequests).toBeDefined()
    expect(schema.grants).toBeDefined()
  })
})

describe('Schema Consistency', () => {
  it('should have identical exported table names between postgres and sqlite', async () => {
    const pgSchema = await import('../src/db/schema/postgresql.js')
    const sqliteSchema = await import('../src/db/schema/sqlite.js')

    // Both should export the same table names
    const pgTables = Object.keys(pgSchema).sort()
    const sqliteTables = Object.keys(sqliteSchema).sort()

    expect(pgTables).toEqual(sqliteTables)
  })
})
