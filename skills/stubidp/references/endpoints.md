# stubIdP OIDC endpoints

Base URL is `http://localhost:8484` for the Node CLI (or wherever `--port`/`STUBIDP_PORT` points it), and
`https://<worker>.workers.dev` for a Cloudflare Workers deployment (OIDC mounted at root there).

## Discovery

```
GET {base}/.well-known/openid-configuration
```

Standard OIDC Provider Metadata document — endpoint URLs, supported scopes, response types, signing algorithms.
Prefer pointing client libraries at this URL over hardcoding individual endpoints below.

## Authorization

```
GET {base}/auth
```

| Parameter       | Required                                                      | Description                                         |
| --------------- | ------------------------------------------------------------- | --------------------------------------------------- |
| `client_id`     | Yes                                                           | Must match the configured client                    |
| `redirect_uri`  | Yes                                                           | Must match the configured redirect URI              |
| `response_type` | Yes                                                           | `code`                                              |
| `scope`         | Yes                                                           | Space-separated scopes, e.g. `openid profile email` |
| `state`         | Recommended                                                   | CSRF protection                                     |
| `nonce`         | Recommended                                                   | Replay protection                                   |
| `login_hint`    | Required when `--skip-prompt` is set with no `--default-user` | Email or E.164 phone number; becomes `sub`          |

## Token

```
POST {base}/token
```

Form-encoded body: `grant_type=authorization_code`, `code`, `redirect_uri`, `client_id`, `client_secret`. Returns
`access_token`, `id_token`, and `refresh_token` when `offline_access` was requested.

## UserInfo

```
GET {base}/me
```

Requires `Authorization: Bearer <access_token>`. Returns claims for the authenticated user.

## JWKS

```
GET {base}/jwks
```

JSON Web Key Set for verifying token signatures — point a library's `jwksUri` here if it doesn't use discovery.

## End session (RP-Initiated Logout)

```
GET {base}/session/end
```

| Parameter                  | Description                                                                  |
| -------------------------- | ---------------------------------------------------------------------------- |
| `id_token_hint`            | Previously issued ID token, identifies the session to end                    |
| `post_logout_redirect_uri` | Must match `--post-logout-redirect-uri` / `STUBIDP_POST_LOGOUT_REDIRECT_URI` |
| `state`                    | Passed back to the client after logout                                       |

With `--skip-prompt`, logout auto-approves without a confirmation page and fires back-channel logout notifications
before destroying the session.

## Dynamic Client Registration (requires `--enable-registration`)

**Register** — `POST {base}/register`. JSON body: `redirect_uris` (required array), `client_name`, `grant_types`
(default `["authorization_code"]`), `response_types` (default `["code"]`). If
`--registration-initial-access-token` is set, requires `Authorization: Bearer <token>`. Response includes
`client_id`, `client_secret`, `registration_client_uri`, `registration_access_token`.

**Read** — `GET {base}/register/{client_id}`, requires `Authorization: Bearer <registration_access_token>`.

**Update** — `PUT {base}/register/{client_id}`, full client object (not a partial patch), same auth.

**Delete** — `DELETE {base}/register/{client_id}`, same auth.

## Health (not part of the OIDC spec, served at root regardless of runtime)

```
GET /healthz   → 200 {"status":"ok"} once the process is up. Use for CI wait-on / liveness probes.
GET /readyz    → 200 or 503 {"status":"ok"|"error","checks":{"oidc":..., "db":...}}. Use when a database is configured.
```

## Headless interaction shortcut

```
GET {base}/interaction/:uid/auto
```

Auto-completes the in-flight login/consent/logout step for one interaction without setting `--skip-prompt`
globally — useful when most tests need the real UI but one test wants headless completion. Grab `:uid` from the
redirect stubIdP issues after the `/auth` request.
