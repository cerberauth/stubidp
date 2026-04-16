# stubIdP

A mock OpenID Connect server for developers.

Stop waiting for identity providers. Start building.

---

## Why stubIdP?

Building apps with OAuth 2.0 / OpenID Connect authentication can be a frustrating process. stubIdP is a lightweight, fully-compliant OpenID Connect provider that runs locally or in your CI pipeline so you can stay focused on building your application.

## Quick Start

```bash
npx @cerberauth/stubidp --redirect-uri http://localhost:8080/callback
```

`--client-id` and `--client-secret` are optional — a human-readable ID (e.g. `brave-falcon-3a9f12`) and a secure secret are generated and printed in the startup table when omitted.

Your OIDC provider is now live at `http://localhost:8484`

## Integration Examples

TODO

## Configuration

### Environment Variables

All CLI flags can be set via environment variables instead:

| Variable                       | Default                           | Description                                                                    |
| ------------------------------ | --------------------------------- | ------------------------------------------------------------------------------ |
| `STUBIDP_CLIENT_ID`            | auto-generated                    | OAuth 2.0 client ID (equivalent to `--client-id`)                              |
| `STUBIDP_CLIENT_SECRET`        | auto-generated                    | OAuth 2.0 client secret (equivalent to `--client-secret`)                      |
| `STUBIDP_REDIRECT_URI`         | -                                 | Redirect URI (equivalent to `--redirect-uri`)                                  |
| `STUBIDP_JWKS_FILE`            | -                                 | Path to JWKS JSON file (equivalent to `--jwks-file`)                           |
| `STUBIDP_ISSUER`               | `http://localhost:{STUBIDP_PORT}` | Issuer URL embedded in tokens                                                  |
| `STUBIDP_PORT`                 | `8484`                            | HTTP server port                                                               |
| `STUBIDP_LOG_LEVEL`            | `info`                            | Logging verbosity                                                              |
| `STUBIDP_DATABASE_DIALECT`     | -                                 | Database type: `postgresql` or `sqlite`                                        |
| `STUBIDP_DATABASE_URL`         | -                                 | Connection string or file path                                                 |
| `STUBIDP_RATE_LIMIT_WINDOW_MS` | `900000`                          | Rate limit time window in milliseconds (15 min)                                |
| `STUBIDP_RATE_LIMIT_MAX`       | `100`                             | Max requests per IP per window (equivalent to `--rate-limit-max`)              |
| `STUBIDP_RATE_LIMIT_DISABLED`  | `false`                           | Set to `true` to disable rate limiting (equivalent to `--rate-limit-disabled`) |

## Docker

TODO

## Important Notes

- **For development and testing only** - stubIdP is not hardened for production identity management
- **No user management** - stubIdP handles OAuth/OIDC flows; your app handles user authentication

## Cloudflare Workers

Deploy stubIdP as a globally distributed OIDC server on Cloudflare Workers with D1 persistent storage.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/cerberauth/stubidp)

### Zero-config deployment

- **`STUBIDP_ISSUER`** is derived automatically from the incoming request URL — no placeholder to update.
- **D1 database** is created and migrated automatically when you use the Deploy button or the GitHub Actions workflow.

### One-click deploy (Deploy to Cloudflare button)

Click the button above. Cloudflare will:

1. Fork / clone the repository to your account.
2. Prompt you to create a new D1 database.
3. Deploy the Worker — the issuer URL is detected at runtime.

After deployment you can override the default client credentials (`STUBIDP_CLIENT_ID`, `STUBIDP_CLIENT_SECRET`, `STUBIDP_REDIRECT_URI`) in the Cloudflare dashboard under **Workers & Pages → stubidp → Settings → Variables**.

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

### Local Development

```bash
cp .dev.vars .dev.vars.local  # optional: override vars locally
npm run worker:migrate:local
npm run worker:dev             # runs at http://localhost:8787
```

> **Note:** The Workers deployment mounts OIDC at the root (`/`).
> OIDC discovery: `https://<worker>.workers.dev/.well-known/openid-configuration`

## Contributing

Contributions welcome! Please feel free to submit a Pull Request.

## License

MIT © [CerberAuth](https://www.cerberauth.com/) — see [LICENSE](https://github.com/cerberauth/stubidp/blob/main/LICENSE) for details.
