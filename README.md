# stubIDP

A mock OpenID Connect server for developers.

Stop waiting for identity providers. Start building.

---

## Why stubIDP?

Building apps with OAuth 2.0 / OpenID Connect authentication can be a slow and frustrating process. stubIDP is a lightweight, fully-compliant OpenID Connect provider that runs locally or in your CI pipeline so you can stay focused on building your application.

## Features

- **Full OIDC 1.0 Compliance** - Powered by the battle-tested [oidc-provider](https://github.com/panva/node-oidc-provider) library
- **Instant Setup** - Up and running in under 2 minutes
- **Flexible Storage** - PostgreSQL for production-like environments, SQLite for quick local testing
- **CI/CD Ready** - Docker support and deterministic behavior for reliable automated testing
- **Type-Safe** - Built with TypeScript, Drizzle ORM, and Zod validation
- **Developer Experience** - Structured logging, pre-configured example clients, and sensible defaults

## Quick Start

```bash
npx stubidp
```

Your OIDC provider is now live at `http://localhost:3000/oidc`

## Pre-Configured Test Clients

Run `npm run db:seed` to create these ready-to-use clients:

| Client ID         | Use Case                     | Auth Method           | Secret           |
| ----------------- | ---------------------------- | --------------------- | ---------------- |
| `web-app`         | Traditional web applications | `client_secret_basic` | `web-app-secret` |
| `spa-app`         | Single Page Applications     | `none` (PKCE)         | -                |
| `mobile-app`      | Native mobile apps           | `none` (PKCE)         | -                |
| `backend-service` | Machine-to-machine           | `client_secret_basic` | `backend-secret` |
| `cicd-test`       | CI/CD pipeline testing       | `client_secret_post`  | `cicd-secret`    |
| `dev-client`      | Development (all features)   | `client_secret_basic` | `dev-secret`     |

## OIDC Endpoints

All endpoints are served under `/oidc`:

| Endpoint      | Path                                | Description                        |
| ------------- | ----------------------------------- | ---------------------------------- |
| Discovery     | `/.well-known/openid-configuration` | OIDC discovery document            |
| Authorization | `/auth`                             | Start OAuth 2.0 flows              |
| Token         | `/token`                            | Exchange codes for tokens          |
| UserInfo      | `/me`                               | Get user information               |
| JWKS          | `/jwks`                             | Public keys for token verification |
| Introspection | `/token/introspection`              | Validate tokens                    |
| Revocation    | `/token/revocation`                 | Revoke tokens                      |

## Integration Examples

### Next.js (NextAuth.js)

```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth'

export const authOptions = {
  providers: [
    {
      id: 'stubidp',
      name: 'stubIDP',
      type: 'oidc',
      issuer: 'http://localhost:3000/oidc',
      clientId: 'web-app',
      clientSecret: 'web-app-secret',
    },
  ],
}

export default NextAuth(authOptions)
```

### Express.js (Passport)

```typescript
import passport from 'passport'
import { Strategy as OIDCStrategy } from 'passport-openidconnect'

passport.use(
  new OIDCStrategy(
    {
      issuer: 'http://localhost:3000/oidc',
      authorizationURL: 'http://localhost:3000/oidc/auth',
      tokenURL: 'http://localhost:3000/oidc/token',
      userInfoURL: 'http://localhost:3000/oidc/me',
      clientID: 'web-app',
      clientSecret: 'web-app-secret',
      callbackURL: 'http://localhost:8080/callback',
    },
    (issuer, profile, done) => done(null, profile),
  ),
)
```

### Raw Authorization Code Flow

```bash
# 1. Open in browser - redirects to login, then back with code
open "http://localhost:3000/oidc/auth?client_id=web-app&redirect_uri=http://localhost:8080/callback&response_type=code&scope=openid%20profile%20email&state=xyz"

# 2. Exchange code for tokens
curl -X POST http://localhost:3000/oidc/token \
  -u "web-app:web-app-secret" \
  -d "grant_type=authorization_code" \
  -d "code=AUTHORIZATION_CODE" \
  -d "redirect_uri=http://localhost:8080/callback"
```

## Configuration

### Environment Variables

| Variable           | Default                 | Description                             |
| ------------------ | ----------------------- | --------------------------------------- |
| `DATABASE_DIALECT` | `postgresql`            | Database type: `postgresql` or `sqlite` |
| `DATABASE_URL`     | -                       | Connection string or file path          |
| `PORT`             | `3000`                  | HTTP server port                        |
| `OIDC_ISSUER`      | `http://localhost:3000` | Issuer URL in tokens                    |
| `LOG_LEVEL`        | `info`                  | Logging verbosity                       |

### Custom Clients

Register clients directly in the database:

```sql
INSERT INTO clients (
  client_id, client_secret, redirect_uris,
  response_types, grant_types, token_endpoint_auth_method
) VALUES (
  'my-app',
  'my-secret',
  '["http://localhost:8080/callback"]',
  '["code"]',
  '["authorization_code", "refresh_token"]',
  'client_secret_basic'
);
```

## Docker

```dockerfile
FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
ENV DATABASE_DIALECT=postgres
EXPOSE 3000
CMD ["node", "dist/bin/run.js"]
```

```yaml
# docker-compose.yml
services:
  stubidp:
    build: .
    ports:
      - '3000:3000'
    environment:
      DATABASE_DIALECT: postgres
      DATABASE_URL: postgresql://stubidp:stubidp@db:5432/stubidp
    depends_on:
      - db
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: stubidp
      POSTGRES_PASSWORD: stubidp
      POSTGRES_DB: stubidp
```

## Development

```bash
npm start             # Start development server
npm test              # Run test suite
npm run test:watch    # Tests in watch mode
npm run test:coverage # Coverage report
npm run lint          # ESLint
npm run format        # Prettier
npm run build         # Compile TypeScript
npm run db:generate   # Generate migrations
npm run db:migrate    # Apply migrations
npm run db:seed       # Seed example clients
```

### Project Structure

```
stubidp/
├── src/
│   ├── db/
│   │   ├── schema.ts           # Auto-selects based on DATABASE_DIALECT
│   │   ├── schema.postgres.ts  # PostgreSQL with jsonb
│   │   └── schema.sqlite.ts    # SQLite with json mode
│   ├── adapter.ts              # Drizzle adapter for oidc-provider
│   ├── logger.ts               # Pino structured logging
│   ├── provider.ts             # OIDC provider setup
│   └── validation.ts           # Zod schemas
├── bin/run.ts                  # CLI entry point
├── examples/clients.ts         # Example configurations
├── scripts/seed.ts             # Database seeding
├── tests/                      # Vitest test suite
└── index.ts                    # Express app
```

## Important Notes

- **For development and testing only** - stubIDP is not hardened for production identity management
- **SQLite limitations** - The `better-sqlite3` driver requires native binaries; won't work on serverless platforms
- **No user management** - stubIDP handles OAuth/OIDC flows; your app handles user authentication

## Contributing

Contributions welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](LICENSE) for details.

---

**Built with:**
[oidc-provider](https://github.com/panva/node-oidc-provider) |
[Drizzle ORM](https://orm.drizzle.team) |
[Express](https://expressjs.com) |
[Pino](https://getpino.io) |
[Zod](https://zod.dev)

**Made by [CerberAuth](https://github.com/cerberauth)**
