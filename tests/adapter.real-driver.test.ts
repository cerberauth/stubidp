import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'

/**
 * Exercises DrizzleAdapter against a *real* SQLite driver instead of a
 * mocked schema/db. tests/adapter.test.ts mocks the schema tables as plain
 * objects (e.g. faking `sessions.payload.uid`), which let bugs like
 * "findByUid queries a column that doesn't exist on the real table" and
 * "a Date object can't be bound to an integer column" pass silently.
 * These tests catch exactly that class of bug.
 */
describe('DrizzleAdapter (real SQLite driver)', () => {
  let db: ReturnType<typeof drizzle>
  let DrizzleAdapter: typeof import('../src/adapter.js').DrizzleAdapter

  beforeEach(async () => {
    process.env.STUBIDP_DATABASE_DIALECT = 'sqlite'
    const sqlite = new Database(':memory:')
    db = drizzle(sqlite)
    migrate(db, { migrationsFolder: './migrations/sqlite' })
    ;({ DrizzleAdapter } = await import('../src/adapter.js'))
  })

  it('round-trips a Session and finds it by its dedicated uid column', async () => {
    const adapter = new DrizzleAdapter(db, 'Session')
    await adapter.upsert('sess-1', { uid: 'interaction-uid-1', accountId: 'acc-1' }, 3600)

    expect(await adapter.find('sess-1')).toEqual({ uid: 'interaction-uid-1', accountId: 'acc-1' })
    expect(await adapter.findByUid('interaction-uid-1')).toEqual({ uid: 'interaction-uid-1', accountId: 'acc-1' })
  })

  it('round-trips a DeviceCode and finds it by its dedicated userCode column', async () => {
    const adapter = new DrizzleAdapter(db, 'DeviceCode')
    await adapter.upsert('device-1', { userCode: 'ABCD-1234', grantId: 'grant-1' }, 600)

    expect(await adapter.findByUserCode('ABCD-1234')).toEqual({ userCode: 'ABCD-1234', grantId: 'grant-1' })
  })

  it('revokes every token sharing a grantId', async () => {
    const accessTokens = new DrizzleAdapter(db, 'AccessToken')
    const refreshTokens = new DrizzleAdapter(db, 'RefreshToken')
    await accessTokens.upsert('at-1', { grantId: 'grant-1' }, 3600)
    await refreshTokens.upsert('rt-1', { grantId: 'grant-1' }, 3600)

    // oidc-provider calls revokeByGrantId separately on each grant-bearing
    // model's own adapter instance when a grant is revoked
    await accessTokens.revokeByGrantId('grant-1')
    await refreshTokens.revokeByGrantId('grant-1')

    expect(await accessTokens.find('at-1')).toBeUndefined()
    expect(await refreshTokens.find('rt-1')).toBeUndefined()
  })

  it('round-trips a Client by clientId and reassembles its metadata', async () => {
    const adapter = new DrizzleAdapter(db, 'Client')
    await adapter.upsert(
      'client-1',
      {
        client_id: 'client-1',
        client_secret: 'shh',
        redirect_uris: ['https://example.com/cb'],
        response_types: ['code'],
        grant_types: ['authorization_code'],
        token_endpoint_auth_method: 'client_secret_basic',
      },
      0,
    )

    const found = await adapter.find('client-1')
    expect(found).toMatchObject({
      client_id: 'client-1',
      client_secret: 'shh',
      redirect_uris: ['https://example.com/cb'],
      token_endpoint_auth_method: 'client_secret_basic',
    })

    await adapter.destroy('client-1')
    expect(await adapter.find('client-1')).toBeUndefined()
  })

  it('expires a record once its TTL has passed', async () => {
    const adapter = new DrizzleAdapter(db, 'AccessToken')
    await adapter.upsert('at-expired', { grantId: 'grant-2' }, -1)

    expect(await adapter.find('at-expired')).toBeUndefined()
  })
})
