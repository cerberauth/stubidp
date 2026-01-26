/**
 * Database schema exports
 *
 * This module re-exports the appropriate schema based on the DATABASE_DIALECT environment variable.
 * - DATABASE_DIALECT=postgresql (default) -> PostgreSQL schema
 * - DATABASE_DIALECT=sqlite -> SQLite schema
 *
 * For direct access to specific schemas:
 * - import * as pgSchema from './schema.postgresql.js'
 * - import * as sqliteSchema from './schema.sqlite.js'
 */

const dialect = process.env.DATABASE_DIALECT || 'postgresql'

// Dynamic re-export based on database type
// Using conditional export to load only the required schema
export const {
  clients,
  sessions,
  accessTokens,
  authorizationCodes,
  refreshTokens,
  deviceCodes,
  backchannelAuthenticationRequests,
  grants,
} = dialect === 'sqlite' ? await import('./schema/sqlite.js') : await import('./schema/postgresql.js')
