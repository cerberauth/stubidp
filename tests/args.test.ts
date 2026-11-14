import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import { countSetOptions } from '../src/usage-analytics.js'

async function loadArgs() {
  vi.resetModules()
  return import('../src/args.js')
}

describe('optionNames', () => {
  beforeEach(() => {
    for (const name of Object.keys(process.env)) {
      if (name.startsWith('STUBIDP_')) vi.stubEnv(name, undefined)
    }
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('lists the options stubidp defines, so the customized count has a denominator', async () => {
    const { optionNames } = await loadArgs()
    expect(optionNames).toEqual(expect.arrayContaining(['client-id', 'preset', 'skip-prompt', 'disable-telemetry']))
    expect(optionNames.length).toBeGreaterThan(30)
  })

  it('counts nothing as set when the test process was given no stubidp options', async () => {
    const { argv, optionNames } = await loadArgs()
    expect(countSetOptions(argv, optionNames)).toBe(0)
  })
})
