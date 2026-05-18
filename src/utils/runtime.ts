export function isBun(): boolean {
  if (typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers') {
    return false
  }
  return typeof process !== 'undefined' && !!process.versions?.bun
}
