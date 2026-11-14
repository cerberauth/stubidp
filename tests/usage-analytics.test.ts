import { describe, it, expect } from 'vitest'

import { countSetOptions, flagNames, startUsageAnalytics, stopUsageAnalytics } from '../src/usage-analytics.js'

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

describe('countSetOptions', () => {
  const names = ['preset', 'client-id', 'skip-prompt', 'help', 'version']

  it('counts the options that were set and ignores the ones that were not', () => {
    expect(countSetOptions({ _: [], preset: 'next-auth', 'client-id': 'abc' }, names)).toBe(2)
  })

  it('counts an option set to false or an empty string, since the user set it', () => {
    expect(countSetOptions({ 'skip-prompt': false, preset: '' }, names)).toBe(2)
  })

  it('is zero when nothing was set', () => {
    expect(countSetOptions({ _: [], $0: 'stubidp' }, names)).toBe(0)
  })

  it('does not count yargs aliases, positional arguments or built-in flags', () => {
    expect(countSetOptions({ _: ['x'], clientId: 'abc', help: true, version: true }, names)).toBe(0)
  })
})

describe('usage analytics', () => {
  it('starts and stops without sending anything when telemetry is disabled', async () => {
    startUsageAnalytics('0.0.0-test', true, ['--preset', 'next-auth'])
    await expect(stopUsageAnalytics()).resolves.toBeUndefined()
    // A second stop is a no-op, so signal handlers can't flush twice.
    await expect(stopUsageAnalytics()).resolves.toBeUndefined()
  })

  it('does not run the customized-count callback when telemetry is disabled', async () => {
    let called = false
    startUsageAnalytics('0.0.0-test', true, [], () => {
      called = true
      return 3
    })
    await stopUsageAnalytics()
    expect(called).toBe(false)
  })
})
