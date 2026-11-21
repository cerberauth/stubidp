import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { decodeJwt } from 'jose'

const BACKCHANNEL_LOGOUT_EVENT = 'http://schemas.openid.net/event/backchannel-logout'
const redirectUri = 'http://localhost:3000/cb'

function listen(server: Server): Promise<string> {
  return new Promise((resolve) => {
    server.listen(0, () => resolve(`http://localhost:${(server.address() as AddressInfo).port}`))
  })
}

describe('OIDC Back-Channel Logout', () => {
  let receiver: Server
  let receiverUrl: string
  let logoutTokens: string[] = []
  let server: Server | undefined

  beforeAll(async () => {
    receiver = createServer((req, res) => {
      let body = ''
      req.on('data', (chunk) => (body += chunk))
      req.on('end', () => {
        logoutTokens.push(new URLSearchParams(body).get('logout_token') ?? '')
        res.writeHead(200).end()
      })
    })
    receiverUrl = `${await listen(receiver)}/backchannel`
  })

  afterAll(() => {
    receiver?.close()
  })

  afterEach(() => {
    server?.close()
    server = undefined
    logoutTokens = []
  })

  async function start(skipPrompt: boolean, enableRegistration = false) {
    const { createApp } = await import('../src/server.js')
    const app = await createApp({
      clientId: 'bcl-client',
      clientSecret: 'bcl-secret',
      redirectUri,
      backchannelLogoutUri: receiverUrl,
      skipPrompt,
      enableRegistration,
      defaultUser: { sub: 'jane' },
    })
    server = app.listen(0)
    const baseUrl = await new Promise<string>((resolve) =>
      server!.on('listening', () => resolve(`http://localhost:${(server!.address() as AddressInfo).port}`)),
    )

    const cookies = new Map<string, string>()
    const request = async (url: string, init: RequestInit = {}) => {
      const cookieHeader = [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ')
      const res = await fetch(new URL(url, baseUrl), {
        ...init,
        redirect: 'manual',
        headers: { ...init.headers, ...(cookieHeader ? { cookie: cookieHeader } : {}) },
      })
      for (const setCookie of res.headers.getSetCookie()) {
        const [pair] = setCookie.split(';')
        const [name, value] = pair.split('=')
        cookies.set(name, value)
      }
      return res
    }

    return { baseUrl, request }
  }

  /** Signs in through /auth and returns the sid of the new session, read from the ID token. */
  async function signIn(
    request: Awaited<ReturnType<typeof start>>['request'],
    skipPrompt: boolean,
    client = { id: 'bcl-client', secret: 'bcl-secret' },
  ) {
    const authUrl = `/auth?${new URLSearchParams({
      client_id: client.id,
      response_type: 'code',
      scope: 'openid',
      redirect_uri: redirectUri,
    })}`

    let location: string | null = authUrl
    for (let hop = 0; hop < 10 && location && !location.startsWith(redirectUri); hop++) {
      const res: Response = await request(location)
      location = res.headers.get('location')
      if (!skipPrompt && location?.includes('/interaction/')) {
        const page = await request(location)
        const action = /action="([^"]+\/(?:login|confirm))"/.exec(await page.text())![1]
        const submitted = await request(action, {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ username: 'jane', password: 'x' }),
        })
        location = submitted.headers.get('location')
      }
    }

    const code = new URL(location!).searchParams.get('code')!
    const tokenRes = await request('/token', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        authorization: `Basic ${Buffer.from(`${client.id}:${client.secret}`).toString('base64')}`,
      },
      body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri }),
    })
    const { id_token } = (await tokenRes.json()) as { id_token: string }
    return decodeJwt(id_token).sid as string
  }

  function expectLogoutTokenFor(sid: string) {
    expect(logoutTokens).toHaveLength(1)
    const claims = decodeJwt(logoutTokens[0])
    expect(claims).toMatchObject({ sub: 'jane', aud: 'bcl-client', sid })
    expect(claims.events).toEqual({ [BACKCHANNEL_LOGOUT_EVENT]: {} })
  }

  it('advertises back-channel logout in discovery', async () => {
    const { request } = await start(false)
    const metadata = (await (await request('/.well-known/openid-configuration')).json()) as Record<string, unknown>
    expect(metadata.backchannel_logout_supported).toBe(true)
    expect(metadata.backchannel_logout_session_supported).toBe(true)
  })

  it('notifies the client when the user confirms logout', async () => {
    const { request } = await start(false)
    const sid = await signIn(request, false)

    const page = await (await request('/session/end')).text()
    const xsrf = /name="xsrf" value="([^"]+)"/.exec(page)![1]
    const res = await request('/session/end/confirm', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ xsrf, logout: 'yes' }),
    })
    expect([302, 303]).toContain(res.status)

    expectLogoutTokenFor(sid)
  })

  it('notifies the client on skip-prompt logout', async () => {
    const { request } = await start(true)
    const sid = await signIn(request, true)

    const res = await request('/session/end')
    expect([302, 303]).toContain(res.status)

    expectLogoutTokenFor(sid)
  })

  it('keeps SSRF protection for dynamically registered clients', async () => {
    const { request } = await start(true, true)
    const registered = (await (
      await request('/reg', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ redirect_uris: [redirectUri], backchannel_logout_uri: `${receiverUrl}/dcr` }),
      })
    ).json()) as { client_id: string; client_secret: string }
    await signIn(request, true, { id: registered.client_id, secret: registered.client_secret })

    await request('/session/end')

    expect(logoutTokens).toEqual([])
  })
})
