#!/usr/bin/env node

import { writeFile } from 'fs/promises'
import { generateKeyPair, exportJWK } from 'jose'

const args = process.argv.slice(2)

if (args.includes('--help') || args.includes('-h')) {
  console.log(`Usage: stubidp-jwks [--kid <id>] [--out <file>]

Generates an RS256 signing key as a JWKS document (private key included).

  --kid <id>    Key ID (default: stubidp-<timestamp>)
  --out <file>  Write to a file (mode 0600) instead of stdout`)
  process.exit(0)
}

function option(name) {
  const i = args.indexOf(name)
  return i === -1 ? undefined : args[i + 1]
}

const kid = option('--kid') ?? `stubidp-${Date.now()}`
const out = option('--out')

const { privateKey } = await generateKeyPair('RS256', { extractable: true })
const jwk = await exportJWK(privateKey)
const jwks = JSON.stringify({ keys: [{ ...jwk, use: 'sig', alg: 'RS256', kid }] })

if (out) {
  await writeFile(out, `${jwks}\n`, { mode: 0o600 })
  console.error(`JWKS written to ${out}. It contains a private key, do not commit it.`)
} else {
  console.log(jwks)
}
