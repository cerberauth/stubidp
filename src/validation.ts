import { z } from 'zod'

/**
 * Schema for validating OIDC client configuration
 */
export const ClientPayloadSchema = z.object({
  client_id: z.string().min(1, 'client_id is required'),
  client_secret: z.string().optional(),
  redirect_uris: z.array(z.string().url('Invalid redirect URI')).optional(),
  response_types: z
    .array(
      z.enum(['code', 'token', 'id_token', 'code token', 'code id_token', 'token id_token', 'code token id_token']),
    )
    .optional(),
  grant_types: z
    .array(
      z.enum([
        'authorization_code',
        'implicit',
        'refresh_token',
        'client_credentials',
        'urn:ietf:params:oauth:grant-type:device_code',
        'urn:openid:params:grant-type:ciba',
      ]),
    )
    .optional(),
  token_endpoint_auth_method: z
    .enum(['client_secret_basic', 'client_secret_post', 'client_secret_jwt', 'private_key_jwt', 'none'])
    .optional(),
  client_name: z.string().optional(),
  logo_uri: z.string().url().optional(),
  policy_uri: z.string().url().optional(),
  tos_uri: z.string().url().optional(),
  initiate_login_uri: z.string().url().optional(),
  post_logout_redirect_uris: z.array(z.string().url('Invalid post logout redirect URI')).optional(),
  id_token_signed_response_alg: z.string().optional(),
  userinfo_signed_response_alg: z.string().optional(),
})

/**
 * Schema for validating session payload
 */
export const SessionPayloadSchema = z.object({
  uid: z.string().optional(),
  accountId: z.string().optional(),
  loginTs: z.number().optional(),
  acr: z.string().optional(),
  amr: z.array(z.string()).optional(),
})

/**
 * Schema for validating token payloads (access tokens, refresh tokens, etc.)
 */
export const TokenPayloadSchema = z.object({
  accountId: z.string().optional(),
  clientId: z.string().optional(),
  grantId: z.string().optional(),
  scope: z.string().optional(),
  sid: z.string().optional(),
  iat: z.number().optional(),
  exp: z.number().optional(),
  consumed: z.number().optional(),
})

/**
 * Schema for validating grant payload
 */
export const GrantPayloadSchema = z.object({
  accountId: z.string().optional(),
  clientId: z.string().optional(),
  openid: z
    .object({
      scope: z.string().optional(),
    })
    .optional(),
  resources: z.record(z.string()).optional(),
  rejected: z
    .object({
      scope: z.string().optional(),
    })
    .optional(),
})

/**
 * Schema for validating device code payload
 */
export const DeviceCodePayloadSchema = z.object({
  userCode: z.string().optional(),
  deviceCode: z.string().optional(),
  clientId: z.string().optional(),
  scope: z.string().optional(),
  params: z.record(z.unknown()).optional(),
})

/**
 * Generic payload schema for flexible validation
 */
export const GenericPayloadSchema = z.record(z.unknown())

/**
 * Validation result type
 */
export interface ValidationResult<T> {
  success: boolean
  data?: T
  errors?: z.ZodError
}

/**
 * Validate client payload
 */
export function validateClientPayload(payload: unknown): ValidationResult<z.infer<typeof ClientPayloadSchema>> {
  const result = ClientPayloadSchema.safeParse(payload)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, errors: result.error }
}

/**
 * Validate session payload
 */
export function validateSessionPayload(payload: unknown): ValidationResult<z.infer<typeof SessionPayloadSchema>> {
  const result = SessionPayloadSchema.safeParse(payload)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, errors: result.error }
}

/**
 * Validate token payload
 */
export function validateTokenPayload(payload: unknown): ValidationResult<z.infer<typeof TokenPayloadSchema>> {
  const result = TokenPayloadSchema.safeParse(payload)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, errors: result.error }
}

/**
 * Validate device code payload
 */
export function validateDeviceCodePayload(payload: unknown): ValidationResult<z.infer<typeof DeviceCodePayloadSchema>> {
  const result = DeviceCodePayloadSchema.safeParse(payload)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, errors: result.error }
}

/**
 * Validate grant payload
 */
export function validateGrantPayload(payload: unknown): ValidationResult<z.infer<typeof GrantPayloadSchema>> {
  const result = GrantPayloadSchema.safeParse(payload)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, errors: result.error }
}

export type ClientPayload = z.infer<typeof ClientPayloadSchema>
export type SessionPayload = z.infer<typeof SessionPayloadSchema>
export type TokenPayload = z.infer<typeof TokenPayloadSchema>
export type DeviceCodePayload = z.infer<typeof DeviceCodePayloadSchema>
export type GrantPayload = z.infer<typeof GrantPayloadSchema>
