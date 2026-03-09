# stubIDP

A mock OpenID Connect server for developers.

Stop waiting for identity providers. Start building.

---

## Why stubIDP?

Building apps with OAuth 2.0 / OpenID Connect authentication can be a frustrating process. stubIDP is a lightweight, fully-compliant OpenID Connect provider that runs locally or in your CI pipeline so you can stay focused on building your application.

## Quick Start

```bash
npx @cerberauth/stubidp --redirectUri http://localhost:8080/callback
```

`--clientId` and `--clientSecret` are optional — a human-readable ID (e.g. `brave-falcon-3a9f12`) and a secure secret are generated and printed on startup when omitted.

Your OIDC provider is now live at `http://localhost:3000/oauth2`

## Integration Examples

TODO

## Configuration

### Environment Variables

| Variable           | Default                 | Description                             |
| ------------------ | ----------------------- | --------------------------------------- |
| `DATABASE_DIALECT` | `postgresql`            | Database type: `postgresql` or `sqlite` |
| `DATABASE_URL`     | -                       | Connection string or file path          |
| `PORT`             | `3000`                  | HTTP server port                        |
| `OIDC_ISSUER`      | `http://localhost:3000` | Issuer URL in tokens                    |
| `LOG_LEVEL`        | `info`                  | Logging verbosity                       |

## Docker

TODO

## Important Notes

- **For development and testing only** - stubIDP is not hardened for production identity management
- **No user management** - stubIDP handles OAuth/OIDC flows; your app handles user authentication

## Cloudflare Workers

Deploy stubIDP as a globally distributed OIDC server on Cloudflare Workers with D1 persistent storage.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/cerberauth/stubidp)

### Zero-config deployment

- **`OIDC_ISSUER`** is derived automatically from the incoming request URL — no placeholder to update.
- **D1 database** is created and migrated automatically when you use the Deploy button or the GitHub Actions workflow.

### One-click deploy (Deploy to Cloudflare button)

Click the button above. Cloudflare will:
1. Fork / clone the repository to your account.
2. Prompt you to create a new D1 database.
3. Deploy the Worker — the issuer URL is detected at runtime.

After deployment you can override the default client credentials (`OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `OIDC_REDIRECT_URI`) in the Cloudflare dashboard under **Workers & Pages → stubidp → Settings → Variables**.

### Automatic deploy via GitHub Actions

Add the following secrets to your forked repository (**Settings → Secrets and variables → Actions**):

| Secret / Variable | Type | Description |
| ----------------- | ---- | ----------- |
| `CLOUDFLARE_API_TOKEN` | Secret | API token with *Workers Scripts: Edit* and *D1: Edit* permissions |
| `CLOUDFLARE_ACCOUNT_ID` | Secret | Your Cloudflare account ID |
| `OIDC_ISSUER` | Variable | *(Optional)* Override the issuer URL. When omitted the worker derives it from the request URL (e.g. `https://stubidp.<subdomain>.workers.dev`). |

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

> **Note:** The Workers deployment mounts OIDC at the root (`/`) rather than `/oauth2`.
> OIDC discovery: `https://<worker>.workers.dev/.well-known/openid-configuration`

## Contributing

Contributions welcome! Please feel free to submit a Pull Request.

## License

This repository is licensed under the [MIT License](https://github.com/cerberauth/stubidp/blob/main/LICENSE) @ [CerberAuth](https://www.cerberauth.com/). You are free to use, modify, and distribute the contents of this repository for educational and testing purposes.
