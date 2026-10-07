# StubIdP

A mock OpenID Connect server for developers.

Stop waiting for identity providers. Start building.

---

## Why StubIdP?

Building apps with OAuth 2.0 / OpenID Connect authentication can be a frustrating process. StubIdP is a lightweight, fully-compliant OpenID Connect provider that runs locally or in your CI pipeline so you can stay focused on building your application.

## Quick Start

**Single client (local dev):**

```bash
npx @cerberauth/stubidp --redirect-uri http://localhost:8080/callback
```

`--client-id` and `--client-secret` are optional — a human-readable ID (e.g. `brave-falcon-3a9f12`) and a secure secret are generated and printed in the startup table when omitted.

**Central test IdP with dynamic client registration (RFC 7591/7592):**

```bash
npx @cerberauth/stubidp --enable-registration
```

Any service can register its own client via `POST /reg` without restarting the server.

Your OIDC provider is now live at `http://localhost:8484`

## Integration Examples

### better-auth

```bash
npx @cerberauth/stubidp --preset better-auth
```

```ts
import { betterAuth } from 'better-auth'

export const auth = betterAuth({
  socialProviders: {
    genericOAuth: {
      clientId: '<printed client ID>',
      clientSecret: '<printed client secret>',
      discoveryUrl: 'http://localhost:8484/.well-known/openid-configuration',
    },
  },
})
```

### next-auth

```bash
npx @cerberauth/stubidp --preset next-auth
```

Auth.js v5:

```ts
import NextAuth from 'next-auth'

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    {
      type: 'oidc',
      issuer: 'http://localhost:8484',
      clientId: '<printed client ID>',
      clientSecret: '<printed client secret>',
    },
  ],
})
```

## Configuration

### Environment Variables

All CLI flags can be set via environment variables instead:

| Variable                                    | Default                           | Description                                                                                                          |
| ------------------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `STUBIDP_CLIENT_ID`                         | auto-generated                    | OAuth 2.0 client ID (equivalent to `--client-id`)                                                                    |
| `STUBIDP_CLIENT_SECRET`                     | auto-generated                    | OAuth 2.0 client secret (equivalent to `--client-secret`)                                                            |
| `STUBIDP_PUBLIC_CLIENT`                     | `false`                           | Configure as public client (no `client_secret`, `token_endpoint_auth_method=none`). For SPAs and native apps         |
| `STUBIDP_REDIRECT_URI`                      | -                                 | Redirect URI (equivalent to `--redirect-uri`)                                                                        |
| `STUBIDP_JWKS_FILE`                         | -                                 | Path to JWKS JSON file (equivalent to `--jwks-file`). Generate one with `stubidp-jwks`                               |
| `STUBIDP_JWKS`                              | -                                 | Inline JWKS JSON (private keys), an alternative to `--jwks-file`. Generate with `stubidp-jwks`                       |
| `STUBIDP_ISSUER`                            | `http://localhost:{STUBIDP_PORT}` | Issuer URL embedded in tokens                                                                                        |
| `STUBIDP_PORT`                              | `8484`                            | HTTP server port                                                                                                     |
| `STUBIDP_LOG_LEVEL`                         | `info`                            | Logging verbosity                                                                                                    |
| `STUBIDP_DATABASE_DIALECT`                  | -                                 | Database type: `postgresql` or `sqlite`                                                                              |
| `STUBIDP_DATABASE_URL`                      | -                                 | Connection string or file path                                                                                       |
| `STUBIDP_SKIP_PROMPT`                       | `false`                           | Set to `true` to skip login/consent UI and auto-approve every interaction                                            |
| `STUBIDP_DEFAULT_USER`                      | —                                 | JSON object of OIDC claims returned for every authenticated user                                                     |
| `STUBIDP_RATE_LIMIT_WINDOW_MS`              | `900000`                          | Rate limit time window in milliseconds (15 min)                                                                      |
| `STUBIDP_RATE_LIMIT_MAX`                    | `100`                             | Max requests per IP per window (equivalent to `--rate-limit-max`)                                                    |
| `STUBIDP_RATE_LIMIT_DISABLED`               | `false`                           | Set to `true` to disable rate limiting (equivalent to `--rate-limit-disabled`)                                       |
| `STUBIDP_ENABLE_REGISTRATION`               | `false`                           | Enable dynamic client registration RFC 7591/7592 (`POST /reg`, `GET/PUT/DELETE /reg/:id`)                            |
| `STUBIDP_REGISTRATION_INITIAL_ACCESS_TOKEN` | —                                 | Bearer token required to call `POST /reg` (open registration when omitted)                                           |
| `STUBIDP_TRUST_PROXY`                       | `false`                           | Trust reverse proxy headers (`X-Forwarded-*`). Enable when running behind a proxy                                    |
| `STUBIDP_HTTPS_REDIRECT`                    | `false`                           | Redirect HTTP requests to HTTPS and set CSP `upgrade-insecure-requests`                                              |
| `STUBIDP_SECURITY_HEADERS`                  | `false`                           | Enable security headers (CSP, HSTS, etc.) via helmet. Enable when deployed, not for local dev                        |
| `STUBIDP_POST_LOGOUT_REDIRECT_URI`          | —                                 | Allowed post-logout redirect URI returned to the RP after logout (equivalent to `--post-logout-redirect-uri`)        |
| `STUBIDP_ACCESS_TOKEN_FORMAT`               | `opaque`                          | Access token format: `opaque` or `jwt`. JWT access tokens carry identity claims (`sub`, `email`, etc.)               |
| `STUBIDP_ACCESS_TOKEN_TTL`                  | `3600`                            | Access token lifetime in seconds (also applies to client credentials tokens). Useful to test expiry/refresh handling |
| `STUBIDP_ID_TOKEN_TTL`                      | `3600`                            | ID token lifetime in seconds. Useful to test expiry/refresh handling                                                 |
| `STUBIDP_REFRESH_TOKEN_TTL`                 | `1209600`                         | Refresh token lifetime in seconds (14 days). Useful to test expiry/refresh handling                                  |
| `STUBIDP_SESSION_TTL`                       | `1209600`                         | Login session lifetime in seconds (14 days). Useful to test expiry/refresh handling                                  |
| `STUBIDP_ID_TOKEN_INCLUDES_USERINFO_CLAIMS` | `false`                           | Include email/profile/etc. claims directly in the ID token instead of requiring a `/me` call                         |
| `STUBIDP_INTERACTION_PATH`                  | `/interaction`                    | Base path for the login/consent UI (equivalent to `--interaction-path`)                                              |
| `STUBIDP_DISABLE_TELEMETRY`                 | `false`                           | Set to `true` to disable the telemetry script (equivalent to `--disable-telemetry`)                                  |
| `STUBIDP_ENABLE_CIMD`                       | `false`                           | Enable OAuth Client ID Metadata Document support (draft-02)                                                          |
| `STUBIDP_CIMD_TRUSTED_ORIGINS`              | `https://cimd.cerberauth.com/t/`  | Comma-separated trusted origins (prefix if ending in `/`, else exact match) for `client_id` metadata documents       |
| `STUBIDP_ENABLE_JWT_INTROSPECTION`          | `false`                           | Enable JWT Response for OAuth Token Introspection (RFC 9701)                                                         |
| `STUBIDP_INTROSPECTION_SIGNED_RESPONSE_ALG` | -                                 | Signing algorithm (e.g. `RS256`) for JWT introspection responses on the static client                                |
| `STUBIDP_ENABLE_JWT_USERINFO`               | `false`                           | Enable JWT UserInfo responses (OIDC Core 5.3.2)                                                                      |
| `STUBIDP_USERINFO_SIGNED_RESPONSE_ALG`      | -                                 | Signing algorithm (e.g. `RS256`) for JWT UserInfo responses on the static client                                     |
| `STUBIDP_ENABLE_JAR`                        | `false`                           | Enable JWT-Secured Authorization Request (JAR, RFC 9101)                                                             |
| `STUBIDP_REQUEST_OBJECT_SIGNING_ALG`        | -                                 | Signing algorithm (e.g. `RS256`, `HS256`) for Request Objects on the static client                                   |
| `STUBIDP_REQUIRE_SIGNED_REQUEST_OBJECT`     | `false`                           | Require authorization requests to use signed Request Objects                                                         |
| `STUBIDP_CLIENT_JWKS`                       | -                                 | Inline JWKS JSON document for the static client public keys                                                          |
| `STUBIDP_CLIENT_JWKS_FILE`                  | -                                 | Path to a JWKS JSON file for the static client public keys                                                           |
| `STUBIDP_CLIENT_JWKS_URI`                   | -                                 | URL pointing to the JWKS document for the static client public keys                                                  |

### Telemetry

The HTML pages (home, login, consent, sign-out) load a cookie-free [Plausible](https://plausible.io) script reporting page views and a few button clicks to `a.cerberauth.com`. It never sends usernames, client IDs, scopes or tokens, and does nothing on `localhost`. Disable it with `--disable-telemetry`, `STUBIDP_DISABLE_TELEMETRY=true` or `DO_NOT_TRACK=1`. See [Telemetry](docs/configuration.mdx#telemetry) for details.

## Dynamic Client Registration

StubIdP supports [RFC 7591](https://www.rfc-editor.org/rfc/rfc7591) (Dynamic Client Registration) and [RFC 7592](https://www.rfc-editor.org/rfc/rfc7592) (Client Registration Management), making it suitable as a shared OIDC server for teams or multi-service test environments.

### Enable DCR

```bash
# Open registration — any caller can register a client
npx @cerberauth/stubidp --enable-registration

# Protected registration — callers must supply a bearer token
npx @cerberauth/stubidp --enable-registration --registration-initial-access-token mysecret
```

### Register a client

```bash
curl -X POST http://localhost:8484/reg \
  -H 'Content-Type: application/json' \
  -d '{
    "client_name": "my-service",
    "redirect_uris": ["http://localhost:3000/callback"],
    "grant_types": ["authorization_code", "refresh_token"],
    "response_types": ["code"]
  }'
```

The response includes `client_id`, `client_secret`, and a `registration_access_token` used for subsequent management calls.

### Manage a registered client

```bash
# Read
curl http://localhost:8484/reg/<client_id> \
  -H 'Authorization: Bearer <registration_access_token>'

# Update
curl -X PUT http://localhost:8484/reg/<client_id> \
  -H 'Authorization: Bearer <registration_access_token>' \
  -H 'Content-Type: application/json' \
  -d '{ "redirect_uris": ["http://localhost:3001/callback"], ... }'

# Delete
curl -X DELETE http://localhost:8484/reg/<client_id> \
  -H 'Authorization: Bearer <registration_access_token>'
```

## Client ID Metadata Documents (CIMD)

StubIdP supports the [OAuth Client ID Metadata Document](https://www.ietf.org/archive/id/draft-ietf-oauth-client-id-metadata-document-02.html)
draft — instead of pre-registering a client, the `client_id` sent in the authorization/token requests is itself an
HTTPS URL that resolves to a JSON document describing the client (`redirect_uris`, `client_name`, etc.), fetched by
StubIdP at request time.

### Enable CIMD

```bash
npx @cerberauth/stubidp --enable-cimd --redirect-uri http://localhost:3000/callback
```

By default only metadata documents served under `https://cimd.cerberauth.com/t/*` are accepted, so a request using
a `client_id` outside that prefix is rejected. Use [nacho](https://nacho.cerberauth.com) to publish a CIMD document
at that path.

### Allow other document sources

Pass `--cimd-trusted-origins` (or `STUBIDP_CIMD_TRUSTED_ORIGINS`) with a comma-separated list of trusted origins to
accept `client_id` documents from elsewhere (e.g. your own metadata host). Each entry can be:

- a URL prefix, ending in `/`, matching any `client_id` under it (e.g. `https://example.com/oauth-clients/`)
- an exact `client_id` URL, matching only that one document (e.g. `https://example.com/clients/acme.json`)

```bash
npx @cerberauth/stubidp \
  --enable-cimd \
  --cimd-trusted-origins https://cimd.cerberauth.com/t/,https://example.com/oauth-clients/,https://example.com/clients/acme.json \
  --redirect-uri http://localhost:3000/callback
```

## JWT Token Introspection Responses

StubIdP supports [RFC 9701](https://www.rfc-editor.org/rfc/rfc9701) — instead of a plain JSON body, the
`/token/introspection` endpoint returns a signed JWT (`application/token-introspection+jwt`) for clients configured
with `introspection_signed_response_alg`.

### Enable JWT introspection

For the static client, pass `--introspection-signed-response-alg` along with `--enable-jwt-introspection`:

```bash
npx @cerberauth/stubidp \
  --enable-jwt-introspection \
  --introspection-signed-response-alg RS256 \
  --redirect-uri http://localhost:3000/callback
```

Dynamically registered clients (see [Dynamic Client Registration](#dynamic-client-registration)) can instead set
`introspection_signed_response_alg` themselves as part of their registration metadata.

Call the introspection endpoint with `Accept: application/token-introspection+jwt` to receive the signed response;
requests with `Accept: application/json` keep getting the plain JSON body.

## JWT UserInfo Responses

StubIdP supports [OIDC Core 5.3.2](https://openid.net/specs/openid-connect-core-1_0.html#UserInfoResponse) signed
UserInfo responses — instead of a plain JSON body, `/me` returns a signed JWT (`application/jwt`) for clients
configured with `userinfo_signed_response_alg`.

### Enable JWT UserInfo

For the static client, pass `--userinfo-signed-response-alg` along with `--enable-jwt-userinfo`:

```bash
npx @cerberauth/stubidp \
  --enable-jwt-userinfo \
  --userinfo-signed-response-alg RS256 \
  --redirect-uri http://localhost:3000/callback
```

Dynamically registered clients can instead set `userinfo_signed_response_alg` themselves as part of their registration
metadata. Clients without it keep getting the plain JSON body.

## JWT-Secured Authorization Requests (JAR)

StubIdP supports [RFC 9101](https://www.rfc-editor.org/rfc/rfc9101) (JWT-Secured Authorization Request, JAR) — authorization request parameters can be passed as a signed JWT in the `request` parameter on `/auth`.

### Enable JAR

Pass `--enable-jar` to enable JAR support:

```bash
npx @cerberauth/stubidp \
  --enable-jar \
  --redirect-uri http://localhost:3000/callback
```

### Static client with symmetric signing (HS256)

When using HMAC-SHA algorithms such as `HS256`, StubIdP verifies the Request Object using the client secret:

```bash
npx @cerberauth/stubidp \
  --enable-jar \
  --client-secret mysecret \
  --redirect-uri http://localhost:3000/callback
```

### Static client with asymmetric signing (RS256)

When using asymmetric signing (e.g. `RS256`), provide the client's public keys via `--client-jwks` or `--client-jwks-file`:

```bash
npx @cerberauth/stubidp \
  --enable-jar \
  --request-object-signing-alg RS256 \
  --client-jwks-file ./client-jwks.json \
  --redirect-uri http://localhost:3000/callback
```

### Require signed request objects

To require that all authorization requests must be sent as signed Request Objects (rejecting plain query parameters):

```bash
npx @cerberauth/stubidp \
  --enable-jar \
  --require-signed-request-object \
  --redirect-uri http://localhost:3000/callback
```

Dynamically registered clients (see [Dynamic Client Registration](#dynamic-client-registration)) can also configure `request_object_signing_alg`, `require_signed_request_object`, and `jwks` via `/reg`.

## E2E Testing and Automation

StubIdP supports fully headless authentication for use in E2E test suites, CI pipelines, and other automation scenarios.

### Skip login, consent, and logout UI

Pass `--skip-prompt` (or set `STUBIDP_SKIP_PROMPT=true`) to make StubIdP auto-approve every login, consent, and logout interaction. The OIDC redirect chain completes transparently — your test runner receives the authorization code or post-logout redirect without any browser interaction.

```bash
STUBIDP_SKIP_PROMPT=true stubidp --redirect-uri http://localhost:3000/callback
```

To also redirect back to your app after logout, pass `--post-logout-redirect-uri` (or set `STUBIDP_POST_LOGOUT_REDIRECT_URI`):

```bash
STUBIDP_SKIP_PROMPT=true \
STUBIDP_POST_LOGOUT_REDIRECT_URI=http://localhost:3000 \
stubidp --redirect-uri http://localhost:3000/callback
```

### Configure stub user claims

Use `--default-user` (or `STUBIDP_DEFAULT_USER`) to specify the OIDC claims returned in every ID token and UserInfo response. The `sub` field also sets the subject identifier used during auto-login.

```bash
STUBIDP_DEFAULT_USER='{"sub":"alice","name":"Alice Example","email":"alice@example.com","email_verified":true}' \
STUBIDP_SKIP_PROMPT=true \
stubidp --redirect-uri http://localhost:3000/callback
```

### Use `login_hint` as subject

When `--skip-prompt` is set but no `--default-user` is configured, StubIdP requires a `login_hint` parameter in the authorization request. The value must be a valid email address or E.164 phone number — it becomes the subject (`sub`) and also auto-populates the matching claim (`email` or `phone_number`).

```bash
# Client sends: ?login_hint=alice@example.com
STUBIDP_SKIP_PROMPT=true \
stubidp --redirect-uri http://localhost:3000/callback
# → sub: "alice@example.com", email: "alice@example.com"
```

This lets E2E tests drive different user identities per-request without restarting StubIdP or changing server configuration.

### JWT access tokens

By default access tokens are opaque; identity claims are only available via `GET /me`. Pass `--access-token-format jwt` (or `STUBIDP_ACCESS_TOKEN_FORMAT=jwt`) to instead issue access tokens as signed JWTs carrying `sub` and the configured identity claims (`email`, `profile`, etc.) directly, so resource servers can validate them locally.

```bash
STUBIDP_ACCESS_TOKEN_FORMAT=jwt stubidp --redirect-uri http://localhost:3000/callback
```

### Token and session lifetimes

StubIdP is a dev stub, so lifetimes default to long-ish values and exist mainly so you can exercise expiry handling. Set `--access-token-ttl`, `--id-token-ttl`, `--refresh-token-ttl` or `--session-ttl` (env: `STUBIDP_ACCESS_TOKEN_TTL`, `STUBIDP_ID_TOKEN_TTL`, `STUBIDP_REFRESH_TOKEN_TTL`, `STUBIDP_SESSION_TTL`) to a number of seconds. For example, short-lived access tokens to test silent refresh:

```bash
STUBIDP_ACCESS_TOKEN_TTL=30 stubidp --redirect-uri http://localhost:3000/callback
```

### Identity claims in the ID token

By default (spec-compliant), the ID token only carries `sub` — claims like `email` and `profile` are only returned via `GET /me`. Pass `--id-token-includes-userinfo-claims` (or `STUBIDP_ID_TOKEN_INCLUDES_USERINFO_CLAIMS=true`) to have StubIdP put those claims directly in the ID token as well, for clients that don't call UserInfo.

```bash
STUBIDP_ID_TOKEN_INCLUDES_USERINFO_CLAIMS=true \
STUBIDP_DEFAULT_USER='{"sub":"alice","email":"alice@example.com","email_verified":true}' \
stubidp --redirect-uri http://localhost:3000/callback
```

### Headless endpoint (selective use)

If you need UI available by default but headless completion in specific tests, navigate to `GET /interaction/:uid/auto` instead of `/interaction/:uid` to auto-complete the current step without any flags. This path moves with `--interaction-path` / `STUBIDP_INTERACTION_PATH` if set.

## Docker

Official images are published on every release:

```bash
docker run -p 8484:8484 cerberauth/stubidp:latest --redirect-uri http://localhost:3000/callback
```

Also available at `ghcr.io/cerberauth/stubidp`. Pin a version tag (`:v1`, `:v1.2`, ...) instead of `:latest` for
reproducible CI runs.

```yaml
services:
  stubidp:
    image: cerberauth/stubidp:latest
    ports:
      - '8484:8484'
    environment:
      STUBIDP_SKIP_PROMPT: 'true'
```

## Important Notes

- **For development and testing only** - StubIdP is not hardened for production identity management
- **No user management** - StubIdP handles OAuth/OIDC flows; your app handles user authentication

## Cloudflare Workers

Deploy StubIdP as a globally distributed OIDC server on Cloudflare Workers with D1 persistent storage.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/cerberauth/stubidp)

### Zero-config deployment

- **`STUBIDP_ISSUER`** is derived automatically from the incoming request URL — no placeholder to update.
- **D1 database** is created and migrated automatically when you use the Deploy button or the GitHub Actions workflow.

### One-click deploy (Deploy to Cloudflare button)

Click the button above. Cloudflare will:

1. Fork / clone the repository to your account.
2. Prompt you to create a new D1 database.
3. Deploy the Worker — the issuer URL is detected at runtime.

After deployment you can override the default client credentials (`STUBIDP_CLIENT_ID`, `STUBIDP_CLIENT_SECRET`, `STUBIDP_REDIRECT_URI`, `STUBIDP_POST_LOGOUT_REDIRECT_URI`) in the Cloudflare dashboard under **Workers & Pages → stubidp → Settings → Variables**.

### Automatic deploy via GitHub Actions

Add the following secrets to your forked repository (**Settings → Secrets and variables → Actions**):

| Secret / Variable       | Type     | Description                                                                                                                                     |
| ----------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | Secret   | API token with _Workers Scripts: Edit_ and _D1: Edit_ permissions                                                                               |
| `CLOUDFLARE_ACCOUNT_ID` | Secret   | Your Cloudflare account ID                                                                                                                      |
| `STUBIDP_ISSUER`        | Variable | _(Optional)_ Override the issuer URL. When omitted the worker derives it from the request URL (e.g. `https://stubidp.<subdomain>.workers.dev`). |

Every push to `main` (or a manual trigger) will:

1. Create the `stubidp-db` D1 database if it does not exist yet.
2. Apply any pending migrations.
3. Deploy the Worker.

### Manual setup (CLI)

```bash
# 1. Create the D1 database and note the returned database_id
npx wrangler d1 create stubidp-db

# 2. Patch wrangler.json with the real database_id, then apply migrations
npx wrangler d1 migrations apply stubidp-db --remote

# 3. Deploy (issuer is detected from the worker URL automatically)
npm run worker:deploy
```

### Persistent signing key

Without a configured key (`STUBIDP_JWKS`, or `--jwks-file` on the CLI) StubIdP generates a random signing key per isolate, and the Worker gets a new one whenever an isolate restarts, so tokens issued before a restart or redeploy stop validating (`/session/end` fails with `could not validate id_token_hint`). Generate a key once and store it as a secret:

```bash
npm run jwks:generate -- --out jwks.json
npx wrangler secret put STUBIDP_JWKS < jwks.json
```

The file contains a private key, do not commit it. For the Node CLI, run `stubidp-jwks --out jwks.json` and pass `--jwks-file jwks.json`.

### Local Development

```bash
cp .dev.vars .dev.vars.local  # optional: override vars locally
npm run worker:migrate:local
npm run worker:dev             # runs at http://localhost:8787
```

> **Note:** The Workers deployment mounts OIDC at the root (`/`).
> OIDC discovery: `https://<worker>.workers.dev/.well-known/openid-configuration`

## Agent Skills

This repo ships two Agent Skills under [`skills/`](skills/) — portable `SKILL.md` packages that teach a coding agent
how to set up and drive StubIdP without re-deriving CLI flags, env vars, or endpoint shapes from scratch. The format
is open and not tied to any one tool — Claude Code, Cursor, OpenCode, Codex, and other agents that support
`SKILL.md` packages can all use them.

| Skill                                               | Triggers on                                                                                                                                                  |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`local-oidc-provider`](skills/local-oidc-provider) | First-time setup — no real IdP credentials yet, IAM-blocked, offline dev, wiring an app's OIDC client for the first time                                     |
| [`stubidp`](skills/stubidp)                         | Everything past first setup — headless/automated E2E login (Playwright, Cypress), GitHub Actions/CI, Docker, dynamic client registration, Cloudflare Workers |

### Install

The easiest way, for any agent, is `npx skills` — it detects which agent you're using and installs into the right directory automatically:

```sh
npx skills add cerberauth/stubidp --skill local-oidc-provider
npx skills add cerberauth/stubidp --skill stubidp
```

**Manual install, Claude Code:** auto-discovers skills from `.claude/skills/` (project) or `~/.claude/skills/`
(personal) — a plain top-level `skills/` directory isn't picked up on its own.

Inside a `stubidp` checkout:

```sh
ln -s ../skills .claude/skills
```

In any other project, to use these skills everywhere:

```sh
cp -r skills/local-oidc-provider skills/stubidp ~/.claude/skills/
```

**Manual install, other agents** — consult your tool's docs for where it looks for `SKILL.md` packages; the files
here follow the same open format, no StubIdP-specific conventions.

Then ask your agent things like "I need a local OIDC provider for testing" or "set up StubIdP in my GitHub Actions
workflow" — the matching skill triggers automatically. Each `SKILL.md` includes a decision table for which recipe to
use; `stubidp/references/cli-flags.md` and `stubidp/references/endpoints.md` cover the full CLI flag and OIDC
endpoint reference.

## Contributing

Contributions welcome! Please feel free to submit a Pull Request.

## License

This repository is licensed under the MIT License @ [CerberAuth](https://www.cerberauth.com/).
