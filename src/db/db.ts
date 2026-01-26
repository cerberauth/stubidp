import logger from '../logger.js'

type dialect = 'postgres' | 'sqlite'

/**
 * Database instance type - uses a relaxed type due to incompatible
 * method signatures between PostgreSQL and SQLite Drizzle drivers
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DatabaseInstance = any

let db: DatabaseInstance = null

if (process.env.DATABASE_DIALECT) {
  const dialect = process.env.DATABASE_DIALECT as dialect
  logger.info({ dialect }, 'initializing database connection')

  if (dialect === 'postgres') {
    const { drizzle } = await import('drizzle-orm/node-postgres')
    const pg = await import('pg')
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required for PostgreSQL')
    }
    const pool = new pg.default.Pool({ connectionString })
    db = drizzle(pool)
    logger.info('connected to PostgreSQL database')
  } else {
    const { drizzle } = await import('drizzle-orm/better-sqlite3')
    const Database = (await import('better-sqlite3')).default
    const databasePath = process.env.DATABASE_URL
    if (!databasePath) {
      throw new Error('DATABASE_URL environment variable is required for SQLite')
    }
    const client = new Database(databasePath)
    db = drizzle(client)
    logger.info({ path: databasePath }, 'connected to SQLite database')
  }
}

export { db }
