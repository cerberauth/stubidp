import { describe, it, expect } from 'vitest'

import { argv, optionNames } from '../src/args.js'
import { countSetOptions } from '../src/usage-analytics.js'

describe('optionNames', () => {
  it('lists the options stubidp defines, so the customized count has a denominator', () => {
    expect(optionNames).toEqual(expect.arrayContaining(['client-id', 'preset', 'skip-prompt', 'disable-telemetry']))
    expect(optionNames.length).toBeGreaterThan(30)
  })

  it('counts nothing as set when the test process was given no stubidp options', () => {
    expect(countSetOptions(argv, optionNames)).toBe(0)
  })
})
