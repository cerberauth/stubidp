/**
 * RFC 5322-compliant email regex sourced from Zod's regex collection.
 * @see https://github.com/colinhacks/zod/blob/main/packages/zod/src/v4/core/regexes.ts
 */
export const rfc5322Email =
  /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/

// https://blog.stevenlevithan.com/archives/validate-phone-number#r4-3 (regex sans spaces)
// E.164: leading digit must be 1-9; total digits (excluding '+') between 7-15
export const e164: RegExp = /^\+[1-9]\d{6,14}$/

export function isEmail(value: string): boolean {
  return rfc5322Email.test(value)
}

export function isPhone(value: string): boolean {
  return e164.test(value)
}
