import { describe, it, expect, afterEach } from 'vitest'
import type { Server } from 'node:http'

import { PLAUSIBLE_ORIGIN, TELEMETRY_SCRIPT_PATH, isTelemetryEnabled } from '../src/telemetry-settings.js'
import { sanitizeUrl } from '../src/client/sanitize-url.js'
import { loginPage, consentPage, homePage, logoutPage } from '../src/views/index.js'
import { trackEvent } from '../src/views/layout.js'

const scriptTag = `<script type="module" src="${TELEMETRY_SCRIPT_PATH}"></script>`

describe('isTelemetryEnabled', () => {
  it('is on by default', () => {
    expect(isTelemetryEnabled(undefined, {})).toBe(true)
    expect(isTelemetryEnabled(false, {})).toBe(true)
  })

  it('is off when the option is set', () => {
    expect(isTelemetryEnabled(true, {})).toBe(false)
  })

  it.each(['STUBIDP_DISABLE_TELEMETRY', 'DO_NOT_TRACK'])('is off when %s is truthy', (name) => {
    expect(isTelemetryEnabled(undefined, { [name]: '1' })).toBe(false)
    expect(isTelemetryEnabled(undefined, { [name]: 'true' })).toBe(false)
    expect(isTelemetryEnabled(undefined, { [name]: 'TRUE' })).toBe(false)
  })

  it.each(['0', 'false', ''])('ignores %j', (value) => {
    expect(isTelemetryEnabled(undefined, { DO_NOT_TRACK: value, STUBIDP_DISABLE_TELEMETRY: value })).toBe(true)
  })

  it('cannot be re-enabled by an explicit false when DO_NOT_TRACK is set', () => {
    expect(isTelemetryEnabled(false, { DO_NOT_TRACK: '1' })).toBe(false)
  })
})

describe('sanitizeUrl', () => {
  it('drops query string and fragment', () => {
    expect(sanitizeUrl('https://stubidp.cerberauth.com/session/end?id_token_hint=eyJ.x.y&state=abc#frag')).toBe(
      'https://stubidp.cerberauth.com/session/end',
    )
  })

  it('collapses interaction uids, whatever the base path', () => {
    const uid = 'V1StGXR8_Z5jdHi6B-myT'
    expect(sanitizeUrl(`https://idp.test/interaction/${uid}`)).toBe('https://idp.test/interaction/:id')
    expect(sanitizeUrl(`https://idp.test/custom/login/${uid}/abort`)).toBe('https://idp.test/custom/login/:id/abort')
  })

  it('keeps ordinary routes', () => {
    expect(sanitizeUrl('https://idp.test/')).toBe('https://idp.test/')
    expect(sanitizeUrl('https://idp.test/session/end/confirm')).toBe('https://idp.test/session/end/confirm')
    expect(sanitizeUrl('https://idp.test/.well-known/openid-configuration')).toBe(
      'https://idp.test/.well-known/openid-configuration',
    )
  })

  it('passes through empty and unparseable values', () => {
    expect(sanitizeUrl(null)).toBeNull()
    expect(sanitizeUrl(undefined)).toBeUndefined()
    expect(sanitizeUrl('not a url')).toBe('not a url')
  })
})

describe('trackEvent', () => {
  it('encodes spaces for Plausible class-based events', () => {
    expect(trackEvent('Create Client', { location: 'hero' })).toBe(
      'plausible-event-name=Create+Client plausible-event-location=hero',
    )
  })
})

describe('pages', () => {
  const pages: Array<[string, (telemetry: boolean) => string]> = [
    ['home', (telemetry) => homePage('http://idp.test', { telemetry })],
    ['login', (telemetry) => loginPage({ uid: 'u', clientId: 'c', telemetry })],
    ['consent', (telemetry) => consentPage({ uid: 'u', clientId: 'c', scopes: ['openid'], telemetry })],
    ['logout', (telemetry) => logoutPage({ form: '<form id="op.logoutForm"></form>', telemetry })],
  ]

  it.each(pages)('%s page loads the tracker only when telemetry is on', (_name, render) => {
    expect(render(true)).toContain(scriptTag)
    expect(render(false)).not.toContain(scriptTag)
  })

  it('does not load the tracker unless asked to', () => {
    expect(homePage('http://idp.test')).not.toContain(scriptTag)
  })

  it('tags the interactions worth tracking', () => {
    expect(homePage('http://idp.test')).toContain('plausible-event-name=Create+Client')
    expect(loginPage({ uid: 'u', clientId: 'c' })).toContain('plausible-event-name=Login+Submit')
    expect(consentPage({ uid: 'u', clientId: 'c', scopes: [] })).toContain('plausible-event-name=Consent+Allow')
    expect(consentPage({ uid: 'u', clientId: 'c', scopes: [] })).toContain('plausible-event-name=Consent+Deny')
    expect(logoutPage({ form: '' })).toContain('plausible-event-name=Logout+Confirm')
  })
})

describe('telemetry in a running app', () => {
  let server: Server | undefined

  afterEach(() => {
    server?.close()
    delete process.env.DO_NOT_TRACK
  })

  async function get(
    path: string,
    options: { disableTelemetry?: boolean; securityHeaders?: boolean } = {},
  ): Promise<Response> {
    const { createApp } = await import('../src/server.js')
    const app = await createApp({
      clientId: 'telemetry-client',
      clientSecret: 'telemetry-secret',
      redirectUri: 'http://localhost:3000/cb',
      ...options,
    })
    await new Promise<void>((resolve) => {
      server = app.listen(0, resolve)
    })
    const address = server!.address()
    if (typeof address === 'string' || address === null) {
      throw new Error('failed to determine test server address')
    }
    return fetch(`http://localhost:${address.port}${path}`)
  }

  it('serves the tracker on the home page by default', async () => {
    expect(await (await get('/')).text()).toContain(scriptTag)
  })

  it('omits the tracker when disabled', async () => {
    expect(await (await get('/', { disableTelemetry: true })).text()).not.toContain(scriptTag)
  })

  it('omits the tracker when DO_NOT_TRACK is set', async () => {
    process.env.DO_NOT_TRACK = '1'
    expect(await (await get('/')).text()).not.toContain(scriptTag)
  })

  it('lets the CSP reach the telemetry origin only while enabled', async () => {
    const on = (await get('/', { securityHeaders: true })).headers.get('content-security-policy')
    expect(on).toContain(`connect-src 'self' ${PLAUSIBLE_ORIGIN}`)
    server?.close()

    const off = (await get('/', { securityHeaders: true, disableTelemetry: true })).headers.get(
      'content-security-policy',
    )
    expect(off).not.toContain(PLAUSIBLE_ORIGIN)
  })
})
