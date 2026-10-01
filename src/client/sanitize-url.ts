// Interaction uids are 21-char nanoids; session/grant ids are similar. Anything
// that long and opaque in a path is an identifier, not a route. Requiring a
// digit, uppercase letter or underscore keeps lowercase route names such as
// "openid-configuration" (20 chars) out, while a random nanoid lacks all three
// only about once in 10^8.
const OPAQUE_SEGMENT = /^(?=.*[0-9A-Z_])[A-Za-z0-9_-]{20,}$/

/**
 * Reduces a URL to origin + route for telemetry: drops the query string and
 * fragment (the end-session page carries an id_token_hint, redirects carry
 * state/codes) and replaces opaque path segments such as the per-flow
 * interaction uid with `:id`, so /interaction/abc… collapses into one page.
 * Returns the input untouched if it isn't a parseable absolute URL.
 */
export function sanitizeUrl(value: string): string
export function sanitizeUrl(value: string | null | undefined): string | null | undefined
export function sanitizeUrl(value: string | null | undefined): string | null | undefined {
  if (!value) return value
  try {
    const url = new URL(value)
    const path = url.pathname
      .split('/')
      .map((segment) => (OPAQUE_SEGMENT.test(segment) ? ':id' : segment))
      .join('/')
    return `${url.origin}${path}`
  } catch {
    return value
  }
}
