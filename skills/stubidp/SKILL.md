---
name: stubidp
description: Sets up @cerberauth/stubidp, a mock/stub OpenID Connect (OIDC) provider, whenever a project needs to test login, OAuth/OIDC callbacks, SSO, or auth flows without a real identity provider (Auth0, Okta, Keycloak, Google, etc.). Use this proactively whenever the user wants to mock, fake, or stub out an IdP, write E2E/integration tests that exercise a login redirect, run auth flows in CI without hitting a real provider, or wire generic OAuth support (e.g. better-auth's genericOAuth, NextAuth's oidc provider type, passport-openidconnect) to a throwaway server — even if they never say "stubidp" by name. Covers local dev quick start, headless/automated login for E2E suites (Playwright, Cypress, vitest+supertest), GitHub Actions setup, Docker, dynamic client registration for shared test IdPs, and Cloudflare Workers deployment.
---

# stubIdP: mock OIDC provider setup

stubIdP is a lightweight, spec-compliant OpenID Connect provider (`npx @cerberauth/stubidp`) meant to stand in for a
real IdP during development, E2E tests, and CI. It is **not** for production auth — treat any request to run it in a
production or customer-facing context as a signal to stop and clarify with the user first.

## Decide the setup mode

The right recipe depends on how the caller will drive the login flow. Pick one before writing code:

| Signal in the request                                                      | Mode                            | Recipe                                                                               |
| -------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------ |
| "test my login page", Playwright/Cypress/vitest test, CI job               | **Headless automation**         | [Headless / E2E auth](#headless--e2e-auth-the-common-case)                           |
| better-auth, NextAuth/Auth.js, or another OIDC client library needs wiring | **App integration**             | [Wiring an app to stubIdP](#wiring-an-app-to-stubidp)                                |
| "shared test IdP", multiple services, "any team can register a client"     | **Dynamic Client Registration** | [Multi-service / shared IdP](#multi-service--shared-idp-dynamic-client-registration) |
| GitHub Actions / CI pipeline                                               | **CI**                          | [CI setup](#ci-setup-github-actions)                                                 |
| "run it in Docker", docker-compose stack                                   | **Docker**                      | [Docker](#docker)                                                                    |
| Deploying a persistent shared instance                                     | **Cloudflare Workers**          | [Cloudflare Workers](#cloudflare-workers-persistent-shared-instance)                 |

Most requests are the first two combined: wire the app to stubIdP, then drive the login headlessly in a test. Read
both sections.

## Headless / E2E auth (the common case)

A real IdP needs a human to click "log in". stubIdP can skip that entirely — this is the whole point of using a stub
instead of the real provider in a test suite.

Pass `--skip-prompt` (or `STUBIDP_SKIP_PROMPT=true`). Every login, consent, and logout interaction auto-approves;
the authorization redirect completes without any browser interaction, and a Playwright/Cypress test driving your
app's "Log in" button will land straight back on the callback URL with a session established.

With `--skip-prompt` set, stubIdP needs to know **who** the stub user is. Two ways to supply that, and picking the
right one matters:

- **Fixed identity for every login** — set `--default-user` (or `STUBIDP_DEFAULT_USER`) to a JSON object of claims.
  Use this when the tests always authenticate as the same user (`sub` sets the subject):

  ```bash
  STUBIDP_SKIP_PROMPT=true \
  STUBIDP_DEFAULT_USER='{"sub":"alice","name":"Alice Example","email":"alice@example.com","email_verified":true}' \
  npx @cerberauth/stubidp --redirect-uri http://localhost:3000/callback
  ```

- **Per-test identity via `login_hint`** — when no `--default-user` is set, stubIdP _requires_ the authorization
  request to include a `login_hint` query param (a valid email or E.164 phone number). It becomes `sub`, and also
  auto-populates the matching claim. Use this when different tests need different, isolated identities without
  restarting the server:

  ```bash
  STUBIDP_SKIP_PROMPT=true npx @cerberauth/stubidp --redirect-uri http://localhost:3000/callback
  # each test appends its own: ?login_hint=test-user-42@example.com
  ```

  If your OIDC client library doesn't expose a way to pass `login_hint` through the authorization request, set
  `--default-user` instead — don't fight the library for it.

If you need the UI available by default (e.g. one test intentionally exercises the real login form) but want other
tests to complete headlessly, don't set `--skip-prompt` globally. Instead have those specific tests navigate the
in-flight interaction to `GET /interaction/:uid/auto` (grab `:uid` from the redirect stubIdP issues to your app)
instead of the normal `/interaction/:uid` page.

Before your tests run, wait for the server to be ready rather than sleeping a fixed duration:

```bash
npx @cerberauth/stubidp --redirect-uri http://localhost:3000/callback &
npx wait-on http://localhost:8484/healthz
```

## Wiring an app to stubIdP

stubIdP exposes standard OIDC discovery at `{issuer}/.well-known/openid-configuration` (default issuer
`http://localhost:8484`). Any OIDC-compliant client library can point at it. Two flags shape how the client library
should be configured — check for these before generating client-side config:

- `--public-client` (`STUBIDP_PUBLIC_CLIENT=true`): no `client_secret` is issued,
  `token_endpoint_auth_method=none`. Use for SPA/native-app-style integrations, and configure the client library the
  same way (PKCE, no secret).
- `--preset better-auth` / `--preset next-auth`: pre-fills the redirect URI and grant types for that library and
  prints ready-to-paste config with the generated credentials. Prefer the preset over hand-rolling flags when the
  target app uses one of these two libraries.

**better-auth** (generic OAuth plugin):

```bash
npx @cerberauth/stubidp --preset better-auth
```

```ts
import { betterAuth } from 'better-auth'
import { genericOAuth } from 'better-auth/plugins'

export const auth = betterAuth({
  plugins: [
    genericOAuth({
      config: [
        {
          providerId: 'stubidp',
          clientId: process.env.STUBIDP_CLIENT_ID,
          clientSecret: process.env.STUBIDP_CLIENT_SECRET,
          discoveryUrl: `${process.env.STUBIDP_ISSUER}/.well-known/openid-configuration`,
          scopes: ['openid', 'profile', 'email'],
          pkce: true,
        },
      ],
    }),
  ],
})
```

**NextAuth / Auth.js v5** (generic `oidc` provider type):

```bash
npx @cerberauth/stubidp --preset next-auth
```

```ts
import NextAuth from 'next-auth'

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    {
      id: 'stubidp',
      name: 'StubIdP',
      type: 'oidc',
      issuer: process.env.AUTH_STUBIDP_ISSUER,
      clientId: process.env.AUTH_STUBIDP_ID,
      clientSecret: process.env.AUTH_STUBIDP_SECRET,
    },
  ],
})
```

**Any other library** (passport-openidconnect, Auth0 SDK pointed at a custom issuer, openid-client, Spring Security
`oidc`, etc.): configure it exactly as you would for a real provider — issuer/discovery URL, client ID, client
secret (or none if `--public-client`), redirect URI — since stubIdP implements the standard endpoints. There's no
special-casing needed beyond pointing the issuer at stubIdP's URL. See `references/endpoints.md` for the exact
endpoint set if a library needs them configured manually instead of via discovery.

Client ID/secret only need to be passed explicitly if the app's config expects specific values (e.g. matching an
existing `.env.example`, or CI secrets). Otherwise let stubIdP auto-generate and read them from its printed startup
table or `STUBIDP_CLIENT_ID`/`STUBIDP_CLIENT_SECRET` env vars.

## Multi-service / shared IdP (Dynamic Client Registration)

When multiple services or test suites need their own client without a shared static config file, start stubIdP with
registration enabled (implements RFC 7591 + RFC 7592) instead of pre-configuring `--client-id`/`--redirect-uri`:

```bash
# Open registration
npx @cerberauth/stubidp --enable-registration

# Protected — require a bearer token to register
npx @cerberauth/stubidp --enable-registration --registration-initial-access-token mysecret
```

Each service registers itself at startup and gets back its own `client_id`, `client_secret`, and a
`registration_access_token` for later read/update/delete:

```bash
curl -X POST http://localhost:8484/register \
  -H 'Content-Type: application/json' \
  -d '{
    "client_name": "my-service",
    "redirect_uris": ["http://localhost:3000/callback"],
    "grant_types": ["authorization_code", "refresh_token"],
    "response_types": ["code"]
  }'
```

`--enable-registration` can be combined with a static `--redirect-uri` to have both a fixed client and open DCR at
once. Full request/response shapes for the register/read/update/delete endpoints are in
`references/endpoints.md`.

## CI setup (GitHub Actions)

On GitHub Actions specifically, prefer the official `cerberauth/stubidp-action` over shelling out to `npx` — it
starts stubIdP, waits for it to be ready internally (no separate `wait-on` step needed), and exposes the issuer/
credentials as step outputs so you don't have to pin and repeat them across steps:

```yaml
- name: Start stubIdP
  id: stubidp
  uses: cerberauth/stubidp-action@v1
  with:
    client-id: web-app
    client-secret: web-app-secret
    redirect-uri: http://localhost:8080/callback
    skip-prompt: 'true'

- name: Run integration tests
  run: npm test
  env:
    STUBIDP_ISSUER: ${{ steps.stubidp.outputs.issuer }}
    STUBIDP_CLIENT_ID: ${{ steps.stubidp.outputs.client-id }}
    STUBIDP_CLIENT_SECRET: ${{ steps.stubidp.outputs.client-secret }}
```

Still pin `client-id`/`client-secret` as inputs when the test/backend config expects specific stable values; omit
them to let the action auto-generate and read the values back from its outputs instead.

For any other CI system (GitLab CI, CircleCI, Buildkite, or a GitHub Actions job that can't use a third-party
action), fall back to running stubIdP directly as a background process and waiting on its health endpoint:

```yaml
- name: Start stubIdP
  run: |
    npx @cerberauth/stubidp \
      --client-id web-app \
      --client-secret web-app-secret \
      --redirect-uri http://localhost:8080/callback \
      --skip-prompt &
    npx wait-on http://localhost:8484/healthz

- name: Run integration tests
  run: npm test
  env:
    STUBIDP_ISSUER: http://localhost:8484
    STUBIDP_CLIENT_ID: web-app
    STUBIDP_CLIENT_SECRET: web-app-secret
```

Use `/readyz` instead of `/healthz` if the run also depends on a configured database (`STUBIDP_DATABASE_URL`) —
`/readyz` checks DB connectivity, `/healthz` only checks the process is up.

## Docker

Official images are published on every release — prefer these over a `node:lts` + `npx` container, since they're
smaller and don't re-fetch the package on every start:

```yaml
services:
  stubidp:
    image: cerberauth/stubidp:latest # or ghcr.io/cerberauth/stubidp:latest
    ports:
      - '8484:8484'
    environment:
      STUBIDP_SKIP_PROMPT: 'true'
```

Pin a version tag (`cerberauth/stubidp:v1`, `:v1.2`, etc.) instead of `:latest` for reproducible CI runs. Only build
from the repo's own `Dockerfile` if the project vendors stubIdP source directly rather than pulling a published
image.

## Cloudflare Workers (persistent shared instance)

For a durable, always-on stub IdP shared across a team (rather than a per-run local/CI process), deploy stubIdP to
Cloudflare Workers with D1 storage — one click via the Deploy-to-Cloudflare button in the stubIdP README, or
manually:

```bash
npx wrangler d1 create stubidp-db
# patch wrangler.json with the returned database_id
npx wrangler d1 migrations apply stubidp-db --remote
npm run worker:deploy
```

The issuer URL is derived automatically from the deployed worker's own URL — no `STUBIDP_ISSUER` placeholder to
patch. This mode mounts OIDC at the root path (not the CLI's default sub-paths), so discovery is at
`https://<worker>.workers.dev/.well-known/openid-configuration`.

## Gotchas

- **`--skip-prompt` with no `--default-user` and no `login_hint`** → the authorization request fails. This is the
  most common setup mistake; always pick one of the two identity strategies above.
- **`login_hint` must be an email or E.164 phone number**, not an arbitrary username — stubIdP validates the format
  before accepting it as `sub`.
- **Token/ID-token audience checks fail** if the app's configured issuer doesn't exactly match `STUBIDP_ISSUER` /
  the URL stubIdP is actually reachable at (including port). This bites people most often when the app runs in
  Docker and reaches stubIdP via a service name while a human reaches it via `localhost`.
- **stubIdP is dev/test-only** — no real user management, not hardened for production. If a request implies
  production traffic, flag that explicitly rather than proceeding.

## Reference

For the full CLI flag / environment variable table and the complete OIDC endpoint reference (request/response
shapes for `/auth`, `/token`, `/me`, `/jwks`, `/session/end`, DCR endpoints, health checks), see:

- `references/cli-flags.md`
- `references/endpoints.md`
