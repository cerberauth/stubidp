# stubIdP CLI flags / environment variables

Every flag has an equivalent `STUBIDP_*` environment variable — use whichever fits the context (flags for
one-off local runs, env vars when values come from CI secrets or a `.env` file).

| Flag                                  | Env var                                     | Default                                             | Description                                                                                            |
| ------------------------------------- | ------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `--client-id`                         | `STUBIDP_CLIENT_ID`                         | auto-generated                                      | OAuth 2.0 client ID                                                                                    |
| `--client-secret`                     | `STUBIDP_CLIENT_SECRET`                     | auto-generated                                      | OAuth 2.0 client secret                                                                                |
| `--public-client`                     | `STUBIDP_PUBLIC_CLIENT`                     | `false`                                             | No `client_secret`, `token_endpoint_auth_method=none`. For SPAs/native apps                            |
| `--redirect-uri`                      | `STUBIDP_REDIRECT_URI`                      | —                                                   | Redirect URI for the static client                                                                     |
| `--jwks-file`                         | `STUBIDP_JWKS_FILE`                         | auto-generated key pair                             | Path to a JWKS JSON file                                                                               |
| `--issuer`                            | `STUBIDP_ISSUER`                            | `http://localhost:{PORT}`                           | Issuer URL embedded in tokens (auto-derived on Workers)                                                |
| `--port`                              | `STUBIDP_PORT`                              | `8484`                                              | HTTP server port                                                                                       |
| `--preset`                            | —                                           | —                                                   | `better-auth` or `next-auth` — pre-fills redirect URI/grant types and prints ready-to-paste app config |
| `--skip-prompt`                       | `STUBIDP_SKIP_PROMPT`                       | `false`                                             | Auto-approve every login/consent/logout interaction (headless E2E/CI)                                  |
| `--default-user`                      | `STUBIDP_DEFAULT_USER`                      | —                                                   | JSON object of OIDC claims returned for every authenticated user; `sub` sets the fixed subject         |
| `--post-logout-redirect-uri`          | `STUBIDP_POST_LOGOUT_REDIRECT_URI`          | —                                                   | Allowed post-logout redirect URI                                                                       |
| `--enable-registration`               | `STUBIDP_ENABLE_REGISTRATION`               | `false`                                             | Enable Dynamic Client Registration (RFC 7591/7592)                                                     |
| `--registration-initial-access-token` | `STUBIDP_REGISTRATION_INITIAL_ACCESS_TOKEN` | —                                                   | Bearer token required to call `POST /register`; omit for open registration                             |
| `--scopes`                            | `STUBIDP_SCOPES`                            | `openid,offline_access,email,profile,phone,address` | Comma-separated supported OIDC scopes                                                                  |
| `--claims`                            | `STUBIDP_CLAIMS`                            | auto-derived from scopes                            | JSON object mapping scope names to claim arrays, e.g. `{"openid":["sub"],"email":["email"]}`           |
| `--log-level`                         | `STUBIDP_LOG_LEVEL`                         | `info`                                              | Logging verbosity                                                                                      |
| —                                     | `STUBIDP_DATABASE_DIALECT`                  | —                                                   | `postgresql` or `sqlite` — persist clients/grants instead of in-memory                                 |
| —                                     | `STUBIDP_DATABASE_URL`                      | —                                                   | Connection string or sqlite file path                                                                  |
| `--rate-limit-window-ms`              | `STUBIDP_RATE_LIMIT_WINDOW_MS`              | `900000` (15 min)                                   | Rate limit time window                                                                                 |
| `--rate-limit-max`                    | `STUBIDP_RATE_LIMIT_MAX`                    | `100`                                               | Max requests per IP per window                                                                         |
| `--rate-limit-disabled`               | `STUBIDP_RATE_LIMIT_DISABLED`               | `false`                                             | Disable rate limiting entirely                                                                         |
| `--trust-proxy`                       | `STUBIDP_TRUST_PROXY`                       | `false`                                             | Trust `X-Forwarded-*` headers — enable behind a reverse proxy                                          |
| `--https-redirect`                    | `STUBIDP_HTTPS_REDIRECT`                    | `false`                                             | Redirect HTTP → HTTPS, set CSP `upgrade-insecure-requests`                                             |
| `--security-headers`                  | `STUBIDP_SECURITY_HEADERS`                  | `false`                                             | Enable helmet security headers (CSP, HSTS). For deployed instances, not local dev                      |

## Notes

- `login_hint` is **not** a server flag — it's a query parameter on the `/auth` authorization request itself,
  required when `--skip-prompt` is set and no `--default-user` is configured. See the main SKILL.md's headless
  auth section.
- All flags accept the `STUBIDP_` prefix via `.env` (yargs `.env('STUBIDP')`), so a plain `.env` file with
  `STUBIDP_CLIENT_ID=...` works without any CLI flags at all.
