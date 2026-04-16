# Next.js + better-auth + stubidp

This example shows how to use [better-auth](https://www.better-auth.com) with [stubidp](https://github.com/cerberauth/stubidp) as an OIDC provider in a Next.js application.

## Stack

- **[Next.js 15](https://nextjs.org)** — React framework (App Router)
- **[better-auth](https://www.better-auth.com)** — Authentication library
- **[stubidp](https://github.com/cerberauth/stubidp)** — Mock OIDC provider for development

## Getting started

### 1. Start stubidp

In a terminal, start the stub identity provider. It will run on port 3000 by default.

```bash
npx @cerberauth/stubidp \
  --clientId web-app \
  --clientSecret web-app-secret \
  --redirectUri http://localhost:3001/api/auth/callback/stubidp
```

### 2. Configure the Next.js app

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

Generate a secret for `BETTER_AUTH_SECRET`:

```bash
openssl rand -hex 32
```

The default values in `.env.example` match the stubidp command above, so you only need to set `BETTER_AUTH_SECRET`.

### 3. Install dependencies

```bash
npm install
```

### 4. Initialize the database

better-auth needs a local SQLite database to store sessions and users.

```bash
npm run db:generate
npm run db:migrate
```

### 5. Start the Next.js app

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) and click **Sign in with stubidp**.

## How it works

### Auth configuration (`src/lib/auth.ts`)

better-auth is configured with the `genericOAuth` plugin, pointing to the stubidp OIDC discovery endpoint:

```ts
genericOAuth({
  config: [
    {
      providerId: 'stubidp',
      clientId: process.env.STUBIDP_CLIENT_ID!,
      clientSecret: process.env.STUBIDP_CLIENT_SECRET!,
      discoveryUrl: `${process.env.STUBIDP_ISSUER}/.well-known/openid-configuration`,
      scopes: ['openid', 'profile', 'email'],
    },
  ],
})
```

better-auth uses the OIDC discovery endpoint to automatically resolve the authorization, token, and userinfo endpoints.

### API route (`src/app/api/auth/[...all]/route.ts`)

All auth requests are handled by a single catch-all route using `toNextJsHandler`:

```ts
export const { GET, POST } = toNextJsHandler(auth)
```

### Client (`src/lib/auth-client.ts`)

The auth client is created with `createAuthClient` and `genericOAuthClient` plugin for use in React components:

```ts
const authClient = createAuthClient({
  plugins: [genericOAuthClient()],
})
```

### Sign in

Trigger the OIDC flow from any client component:

```ts
await authClient.signIn.oauth2({
  providerId: 'stubidp',
  callbackURL: '/',
})
```

### Session

Read the current session with the `useSession` hook:

```ts
const { data: session } = authClient.useSession()
```

### Middleware (`src/middleware.ts`)

Route protection is implemented in `src/middleware.ts`. Add routes to the `protectedRoutes` array to require authentication.

## Project structure

```
src/
├── app/
│   ├── api/
│   │   └── auth/
│   │       └── [...all]/
│   │           └── route.ts    # better-auth handler
│   ├── layout.tsx
│   ├── page.tsx                # Home page with login/logout UI
│   └── globals.css
├── lib/
│   ├── auth.ts                 # better-auth server config
│   └── auth-client.ts          # better-auth client config
└── middleware.ts               # Route protection
```
