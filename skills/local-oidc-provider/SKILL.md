---
name: local-oidc-provider
description: Sets up a real, spec-compliant OpenID Connect / OAuth 2.0 provider running on localhost so a developer can build or test a login/SSO feature without depending on a real identity provider (Auth0, Okta, Keycloak, Azure AD, Google) or the team that owns it. Use this proactively whenever someone needs to develop against OIDC/OAuth locally, is blocked waiting on IAM/security to provision real client credentials, has no network access to the real IdP, wants to avoid burning real-provider rate limits or sandbox accounts during dev, or is doing first-time setup of login for a new app (first client_id/client_secret/redirect_uri/issuer configuration) — even if they never mention "stubidp", "mock IdP", or any specific product by name. Covers getting a local provider running for the first time and wiring an app's OIDC client to it. For E2E test automation, CI pipelines, multi-service dynamic client registration, Docker, or persistent shared deployments, see the `stubidp` skill instead.
---

# Local OIDC/OAuth provider: first run and first configuration

Any app that logs a user in via OAuth 2.0 / OpenID Connect needs _something_ on the other end of the redirect —
issuing authorization codes, tokens, and exposing discovery/JWKS endpoints. Building or testing that login flow
should not require a real Auth0/Okta/Keycloak tenant, credentials from a team that hasn't provisioned them yet, or
network access at all. Run a real OIDC provider on localhost instead: `@cerberauth/stubidp`, a lightweight,
spec-compliant implementation meant exactly for this.

It is **not** for production auth — treat any request to run it in a production or customer-facing context as a
signal to stop and clarify with the user first.

## Recognize the need

These all point here, even without the word "OIDC" or "stubidp" appearing:

- "I need to test my login page but don't have real Okta/Auth0 credentials yet"
- "IAM team hasn't set up our client in the identity provider yet, but I want to keep building"
- "I want to develop this offline / without hitting a real provider"
- "What do I point my OAuth client at for local dev?"
- Any first-time wiring of `better-auth`, `next-auth`/Auth.js, `openid-client`, `passport-openidconnect`, Spring
  Security `oidc`, or similar, where the target is a placeholder/dev provider rather than the real one

## First run

```bash
npx @cerberauth/stubidp --redirect-uri http://localhost:8080/callback
```

No install step, no account, no network call out. This starts a provider at `http://localhost:8484` with standard
OIDC discovery at `/.well-known/openid-configuration`. If `--client-id`/`--client-secret` are omitted, a
human-readable ID (e.g. `brave-falcon-3a9f12`) and a secret are generated and printed in the startup table — copy
those into the app being developed.

`npx` is the fastest zero-install path, not the only one — if the workflow already involves a global install, a
prebuilt binary, or a container, use whichever fits: `npm install -g @cerberauth/stubidp` then run `stubidp` directly,
a Homebrew/Scoop/winget/apt package, or the official `cerberauth/stubidp` / `ghcr.io/cerberauth/stubidp` Docker
image. Same flags and env vars either way.

Building a public/SPA client (no client secret, PKCE)? Add `--public-client` and configure the app's OIDC library
the same way (`token_endpoint_auth_method=none`).

## First configuration

The two things that matter most on a first setup, in order:

1. **Match the redirect URI exactly** to what the app's OAuth client will send — including port and path. This is
   the single most common first-run failure: the app requests a code with one `redirect_uri` and the provider was
   started expecting another.
2. **Match the issuer exactly** to what the app is configured to trust. The default issuer is
   `http://localhost:8484` (or `http://localhost:{STUBIDP_PORT}` if the port was changed). If the app runs inside
   Docker and reaches the provider via a service name (e.g. `http://stubidp:8484`) while a human reaches it via
   `localhost`, the issuer the app is configured with and the URL it's actually reachable at can silently diverge —
   set `STUBIDP_ISSUER` explicitly in that case rather than relying on the default.

Every CLI flag has a matching `STUBIDP_*` environment variable (and both can live in a plain `.env` file — no
flags needed at all). Prefer flags for a quick one-off run, env vars/`.env` when the app's own config already reads
from the environment. Only pin `--client-id`/`--client-secret` to specific values if the app's config expects them
(e.g. matching an existing `.env.example`) — otherwise let them auto-generate and read the printed/`STUBIDP_CLIENT_*`
values back into the app.

## Wire the app for the first time

Point the app's OIDC client at the discovery URL (`{issuer}/.well-known/openid-configuration`) — any
OIDC-compliant library configures itself from there without hand-listing individual endpoints.

Two libraries get a shortcut that pre-fills redirect URI and grant types and prints ready-to-paste config:

```bash
npx @cerberauth/stubidp --preset better-auth   # better-auth genericOAuth plugin
npx @cerberauth/stubidp --preset next-auth     # NextAuth / Auth.js v5 "oidc" provider type
```

Any other library (`openid-client`, `passport-openidconnect`, an Auth0/Okta SDK repointed at a custom issuer, Spring
Security `oidc`, etc.) — configure it exactly as for a real provider: issuer/discovery URL, client ID, client secret
(or none, if `--public-client`), redirect URI. There's no special-casing needed; the provider implements the
standard endpoints.

Logging in during manual testing (not automated) works through a normal browser-based login/consent screen — no
extra flags needed for that. Automated/headless login (Playwright, Cypress, CI) is a different setup; see below.

## Common first-setup mistakes

- **Redirect URI or issuer mismatch** (see above) — by far the most common cause of a first login attempt failing.
- **Port already in use** — another process already bound to `8484`; pass `--port` (or `STUBIDP_PORT`) to change it,
  and update the issuer/discovery URL the app expects to match.
- **Client secret expected but using `--public-client`** — a public client never receives a `client_secret`; if the
  app's config still expects one, drop `--public-client` or update the app to treat it as a public/PKCE client.
- **Nothing persists across restarts** — by default the provider keeps clients/grants in memory only, so a restart
  forgets any dynamically registered client. Fine for a single static client set via flags/env; if the workflow
  needs state to survive restarts, that's a `STUBIDP_DATABASE_URL` setup — see the `stubidp` skill.

## Beyond first setup

Once the provider is running and the app's first login works, further scenarios — automated/headless login for E2E
suites, CI pipeline setup (GitHub Actions and others), dynamic client registration for multiple services sharing one
provider, Docker/docker-compose, or a persistent shared Cloudflare Workers deployment — are covered by the `stubidp`
skill. Reach for that once the question moves from "get me logged in for the first time" to "automate/scale this."
