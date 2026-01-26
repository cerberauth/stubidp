import { eq } from 'drizzle-orm'

import * as schema from './db/schema.js'
import type { DatabaseInstance } from './db/db.js'
import { createChildLogger } from './logger.js'

/**
 * Custom error class for adapter-related errors
 */
export class AdapterError extends Error {
  public readonly model: string
  public readonly operation: string
  public readonly cause?: unknown

  constructor(message: string, options: { model: string; operation: string; cause?: unknown }) {
    super(message)
    this.name = 'AdapterError'
    this.model = options.model
    this.operation = options.operation
    this.cause = options.cause
  }
}

/**
 * Supported model names for the OIDC provider adapter
 */
export type ModelName =
  | 'Session'
  | 'AccessToken'
  | 'AuthorizationCode'
  | 'RefreshToken'
  | 'DeviceCode'
  | 'BackchannelAuthenticationRequest'
  | 'Client'
  | 'Grant'

/**
 * Payload type for adapter operations
 */
export type AdapterPayload = Record<string, unknown>

/**
 * Client payload from oidc-provider
 */
export interface ClientPayload {
  client_id: string
  client_secret?: string
  redirect_uris?: string[]
  response_types?: string[]
  grant_types?: string[]
  token_endpoint_auth_method?: string
  client_name?: string
  logo_uri?: string
  policy_uri?: string
  tos_uri?: string
  initiate_login_uri?: string
  post_logout_redirect_uris?: string[]
  id_token_signed_response_alg?: string
  userinfo_signed_response_alg?: string
  [key: string]: unknown
}

/**
 * Database record with standard fields
 */
interface DatabaseRecord {
  id: string
  payload: AdapterPayload
  expiresAt?: Date | number | null
  grantId?: string
}

const models: Record<ModelName, (typeof schema)[keyof typeof schema]> = {
  Session: schema.sessions,
  AccessToken: schema.accessTokens,
  AuthorizationCode: schema.authorizationCodes,
  RefreshToken: schema.refreshTokens,
  DeviceCode: schema.deviceCodes,
  BackchannelAuthenticationRequest: schema.backchannelAuthenticationRequests,
  Client: schema.clients,
  Grant: schema.grants,
}

/**
 * Type guard to check if a string is a valid model name
 */
function isValidModel(model: string): model is ModelName {
  return model in models
}

/**
 * Drizzle ORM adapter for oidc-provider
 * Implements the adapter interface required by oidc-provider for persistence
 */
export class DrizzleAdapter {
  private db: DatabaseInstance
  private model: ModelName
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private table: any
  private log

  constructor(db: DatabaseInstance, model: string) {
    if (!isValidModel(model)) {
      throw new AdapterError(`Unknown model: ${model}`, {
        model,
        operation: 'constructor',
      })
    }

    this.db = db
    this.model = model
    this.table = models[model]
    this.log = createChildLogger({ component: 'adapter', model })
  }

  async upsert(id: string, payload: AdapterPayload, expiresIn: number): Promise<void> {
    if (!id) {
      throw new AdapterError('ID is required for upsert operation', {
        model: this.model,
        operation: 'upsert',
      })
    }

    this.log.debug({ id, expiresIn }, 'upserting record')

    try {
      const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null

      if (this.model === 'Client') {
        const clientPayload = payload as ClientPayload
        const {
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uris: redirectUris,
          response_types: responseTypes,
          grant_types: grantTypes,
          token_endpoint_auth_method: tokenEndpointAuthMethod,
          client_name: clientName,
          logo_uri: logoUri,
          policy_uri: policyUri,
          tos_uri: tosUri,
          initiate_login_uri: initiateLoginUri,
          post_logout_redirect_uris: postLogoutRedirectUris,
          id_token_signed_response_alg: idTokenSignedResponseAlg,
          userinfo_signed_response_alg: userinfoSignedResponseAlg,
          ...rest
        } = clientPayload

        const values = {
          clientId,
          clientSecret,
          redirectUris,
          responseTypes,
          grantTypes,
          tokenEndpointAuthMethod,
          clientName,
          logoUri,
          policyUri,
          tosUri,
          initiateLoginUri,
          postLogoutRedirectUris,
          idTokenSignedResponseAlg,
          userinfoSignedResponseAlg,
          payload: rest,
        }

        await this.db.insert(this.table).values(values).onConflictDoUpdate({
          target: this.table.clientId,
          set: values,
        })
      } else {
        await this.db.insert(this.table).values({ id, payload, expiresAt }).onConflictDoUpdate({
          target: this.table.id,
          set: { payload, expiresAt },
        })
      }
    } catch (error) {
      if (error instanceof AdapterError) {
        throw error
      }
      this.log.error({ err: error, id }, 'failed to upsert record')
      throw new AdapterError(`Failed to upsert ${this.model} with id: ${id}`, {
        model: this.model,
        operation: 'upsert',
        cause: error,
      })
    }
  }

  async find(id: string): Promise<AdapterPayload | undefined> {
    if (!id) {
      return undefined
    }

    this.log.debug({ id }, 'finding record')

    try {
      const result = (await this.db.select().from(this.table).where(eq(this.table.id, id))) as DatabaseRecord[]

      if (!result || result.length === 0) {
        return undefined
      }

      const record = result[0]

      if (record.expiresAt && new Date(record.expiresAt) < new Date()) {
        await this.destroy(id).catch(() => {
          // Ignore cleanup errors
        })
        return undefined
      }

      return record.payload
    } catch (error) {
      this.log.error({ err: error, id }, 'failed to find record')
      throw new AdapterError(`Failed to find ${this.model} with id: ${id}`, {
        model: this.model,
        operation: 'find',
        cause: error,
      })
    }
  }

  async findByUserCode(userCode: string): Promise<AdapterPayload | undefined> {
    if (!userCode) {
      return undefined
    }

    this.log.debug({ userCode }, 'finding record by userCode')

    try {
      const result = (await this.db
        .select()
        .from(this.table)
        .where(eq(this.table.payload.userCode, userCode))) as DatabaseRecord[]

      if (!result || result.length === 0) {
        return undefined
      }

      const record = result[0]

      if (record.expiresAt && new Date(record.expiresAt) < new Date()) {
        await this.destroy(record.id).catch(() => {
          // Ignore cleanup errors
        })
        return undefined
      }

      return record.payload
    } catch (error) {
      this.log.error({ err: error, userCode }, 'failed to find record by userCode')
      throw new AdapterError(`Failed to find ${this.model} by userCode`, {
        model: this.model,
        operation: 'findByUserCode',
        cause: error,
      })
    }
  }

  async findByUid(uid: string): Promise<AdapterPayload | undefined> {
    if (!uid) {
      return undefined
    }

    this.log.debug({ uid }, 'finding record by uid')

    try {
      const result = (await this.db
        .select()
        .from(this.table)
        .where(eq(this.table.payload.uid, uid))) as DatabaseRecord[]

      if (!result || result.length === 0) {
        return undefined
      }

      const record = result[0]

      if (record.expiresAt && new Date(record.expiresAt) < new Date()) {
        await this.destroy(record.id).catch(() => {
          // Ignore cleanup errors
        })
        return undefined
      }

      return record.payload
    } catch (error) {
      this.log.error({ err: error, uid }, 'failed to find record by uid')
      throw new AdapterError(`Failed to find ${this.model} by uid`, {
        model: this.model,
        operation: 'findByUid',
        cause: error,
      })
    }
  }

  async destroy(id: string): Promise<void> {
    if (!id) {
      return
    }

    this.log.debug({ id }, 'destroying record')

    try {
      await this.db.delete(this.table).where(eq(this.table.id, id))
    } catch (error) {
      this.log.error({ err: error, id }, 'failed to destroy record')
      throw new AdapterError(`Failed to destroy ${this.model} with id: ${id}`, {
        model: this.model,
        operation: 'destroy',
        cause: error,
      })
    }
  }

  async consume(id: string): Promise<void> {
    if (!id) {
      throw new AdapterError('ID is required for consume operation', {
        model: this.model,
        operation: 'consume',
      })
    }

    this.log.debug({ id }, 'consuming record')

    try {
      const result = (await this.db.select().from(this.table).where(eq(this.table.id, id))) as DatabaseRecord[]

      if (!result || result.length === 0) {
        throw new AdapterError(`${this.model} with id ${id} not found`, {
          model: this.model,
          operation: 'consume',
        })
      }

      const payload = { ...result[0].payload, consumed: Math.floor(Date.now() / 1000) }

      await this.db.update(this.table).set({ payload }).where(eq(this.table.id, id))
    } catch (error) {
      if (error instanceof AdapterError) {
        throw error
      }
      this.log.error({ err: error, id }, 'failed to consume record')
      throw new AdapterError(`Failed to consume ${this.model} with id: ${id}`, {
        model: this.model,
        operation: 'consume',
        cause: error,
      })
    }
  }

  async revokeByGrantId(grantId: string): Promise<void> {
    if (!grantId) {
      return
    }

    this.log.debug({ grantId }, 'revoking records by grantId')

    try {
      await this.db.delete(this.table).where(eq(this.table.grantId, grantId))
    } catch (error) {
      this.log.error({ err: error, grantId }, 'failed to revoke records by grantId')
      throw new AdapterError(`Failed to revoke ${this.model} by grantId: ${grantId}`, {
        model: this.model,
        operation: 'revokeByGrantId',
        cause: error,
      })
    }
  }
}
