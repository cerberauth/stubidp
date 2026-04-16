/**
 * Database schema exports
 *
 * This module re-exports the appropriate schema based on the STUBIDP_DATABASE_DIALECT environment variable.
 * - STUBIDP_DATABASE_DIALECT=postgresql (default) -> PostgreSQL schema
 * - STUBIDP_DATABASE_DIALECT=sqlite -> SQLite schema
 *
 * For direct access to specific schemas:
 * - import * as pgSchema from './schema.postgresql.js'
 * - import * as sqliteSchema from './schema.sqlite.js'
 */

const dialect = process.env.STUBIDP_DATABASE_DIALECT || 'postgresql'

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
