import { describe, it, expect } from 'vitest'

import { flagNames, startUsageAnalytics, stopUsageAnalytics } from '../src/usage-analytics.js'

describe('flagNames', () => {
  it('returns long flag names without their values', () => {
    expect(flagNames(['--preset', 'next-auth', '--client-id=abc', '--skip-prompt'])).toEqual([
      'preset',
      'client-id',
      'skip-prompt',
    ])
  })

  it('ignores positional arguments, short flags and anything after --', () => {
    expect(flagNames(['serve', '-v', '--redirect-uri', 'http://x', '--', '--secret'])).toEqual(['redirect-uri'])
  })

  it('reports a repeated flag once', () => {
    expect(flagNames(['--scopes', 'a', '--scopes', 'b'])).toEqual(['scopes'])
  })
})

describe('usage analytics', () => {
  it('starts and stops without sending anything when telemetry is disabled', async () => {
    startUsageAnalytics('0.0.0-test', true, ['--preset', 'next-auth'])
    await expect(stopUsageAnalytics()).resolves.toBeUndefined()
    // A second stop is a no-op, so signal handlers can't flush twice.
    await expect(stopUsageAnalytics()).resolves.toBeUndefined()
  })
})
