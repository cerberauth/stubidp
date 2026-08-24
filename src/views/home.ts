import { layout, escapeHtml } from './layout.js'

export function homePage(issuer: string): string {
  const discoveryUrl = `${issuer}/.well-known/openid-configuration`

  const endpoints: Array<{ name: string; url: string; link?: boolean }> = [
    { name: 'Discovery', url: `${issuer}/.well-known/openid-configuration`, link: true },
    { name: 'Authorization', url: `${issuer}/auth` },
    { name: 'Token', url: `${issuer}/token` },
    { name: 'Device Authorization', url: `${issuer}/device/auth` },
    { name: 'Token Revocation', url: `${issuer}/token/revocation` },
    { name: 'Token Introspection', url: `${issuer}/token/introspection` },
    { name: 'Userinfo', url: `${issuer}/me` },
    { name: 'JWKS', url: `${issuer}/jwks` },
    { name: 'End Session', url: `${issuer}/session/end` },
  ]

  const endpointRows = endpoints
    .map(
      ({ name, url, link }) => `
    <tr class="border-b border-border last:border-0 hover:bg-accent/50 transition-colors">
      <td class="px-6 py-3.5 text-on-surface-variant text-sm whitespace-nowrap">${escapeHtml(name)}</td>
      <td class="px-6 py-3.5">
        ${
          link
            ? `<a href="${escapeHtml(url)}" target="_blank" class="font-mono text-xs text-primary hover:text-primary/80 transition-colors break-all">${escapeHtml(url)}</a>`
            : `<span class="font-mono text-xs text-muted-fg break-all">${escapeHtml(url)}</span>`
        }
      </td>
    </tr>`,
    )
    .join('')

  const description =
    'Mock OpenID Connect server for developers. Free, open-source testing environment for OAuth 2.0 and OIDC flows.'

  return layout(
    'Mock OpenID Connect Server',
    `
    <section class="max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
      <div class="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs px-3 py-1.5 rounded-full border border-primary/20 mb-8 font-medium uppercase tracking-wider">
        OpenID Connect &amp; OAuth 2.0
      </div>
      <h1 class="text-5xl sm:text-6xl font-bold mb-6 tracking-tight leading-[1.1]">
        Mock <span class="text-primary">identity provider</span><br/>for developers
      </h1>
      <p class="text-lg text-muted-fg mb-10 max-w-xl mx-auto leading-relaxed">
        Stop waiting for identity providers. Start building.<br/>Zero config. Instant OIDC for local dev and CI/CD.
      </p>
      <div class="flex items-center justify-center gap-3 flex-wrap">
        <a href="https://nacho.cerberauth.com/clients/create"
           target="_blank"
           class="inline-flex items-center gap-2 bg-primary text-primary-fg font-semibold hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 px-6 py-3 rounded-lg transition-all text-sm">
          Create a client →
        </a>
        <a href="${escapeHtml(discoveryUrl)}"
           target="_blank"
           class="inline-flex items-center gap-2 border border-border bg-surface hover:bg-accent text-on-surface-variant hover:text-accent-fg px-6 py-3 rounded-lg transition-colors text-sm">
          OIDC Discovery
        </a>
      </div>
    </section>

    <section class="max-w-4xl mx-auto px-6 pb-16">
      <div class="relative overflow-hidden bg-gradient-to-br from-primary/20 via-primary/10 to-surface-container-low border border-primary/30 rounded-2xl p-8 sm:p-12 text-center">
        <h2 class="text-2xl sm:text-3xl font-bold mb-3">Register a new client</h2>
        <p class="text-on-surface-variant mb-8 max-w-lg mx-auto text-sm leading-relaxed">
          Use <strong class="text-on-surface">nacho</strong> by CerberAuth to create and manage your OIDC clients.
          Get your <code class="bg-muted border border-border px-1.5 py-0.5 rounded text-xs text-primary">client_id</code> and
          <code class="bg-muted border border-border px-1.5 py-0.5 rounded text-xs text-primary">client_secret</code> in seconds.
        </p>
        <a href="https://nacho.cerberauth.com/clients/create"
           target="_blank"
           class="inline-flex items-center gap-2 bg-primary text-primary-fg font-semibold hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 px-8 py-3.5 rounded-xl transition-all">
          Create a client at nacho.cerberauth.com →
        </a>
      </div>
    </section>

    <section class="max-w-4xl mx-auto px-6 pb-16">
      <h2 class="text-2xl font-bold mb-5">Quick Start</h2>
      <div class="bg-card text-card-fg border border-border rounded-xl overflow-hidden">
        <div class="flex items-center gap-1.5 px-5 py-3 border-b border-border bg-surface-container">
          <span class="w-3 h-3 rounded-full bg-destructive/50"></span>
          <span class="w-3 h-3 rounded-full bg-warning/50"></span>
          <span class="w-3 h-3 rounded-full bg-success/50"></span>
          <span class="ml-3 text-muted-fg text-xs font-mono">terminal</span>
        </div>
        <pre class="px-6 py-5 text-sm text-success overflow-x-auto leading-7"><code>npx @cerberauth/stubidp \\
  --clientId my-app \\
  --clientSecret my-secret \\
  --redirectUri http://localhost:8080/callback</code></pre>
      </div>
      <p class="text-muted-fg text-sm mt-3">
        Your OIDC provider will be live at
        <a href="${escapeHtml(issuer)}" class="text-primary hover:text-primary/80 transition-colors font-mono text-xs">${escapeHtml(issuer)}</a>
      </p>
    </section>

    <section class="max-w-4xl mx-auto px-6 pb-16">
      <h2 class="text-2xl font-bold mb-5">OIDC Endpoints</h2>
      <div class="bg-card text-card-fg border border-border rounded-xl overflow-hidden">
        <table class="w-full">
          <thead>
            <tr class="border-b border-border bg-surface-container">
              <th class="text-left px-6 py-3 text-muted-fg text-xs font-semibold uppercase tracking-wider w-36">Endpoint</th>
              <th class="text-left px-6 py-3 text-muted-fg text-xs font-semibold uppercase tracking-wider">URL</th>
            </tr>
          </thead>
          <tbody>
            ${endpointRows}
          </tbody>
        </table>
      </div>
    </section>

    <section class="max-w-4xl mx-auto px-6 pb-16">
      <h2 class="text-2xl font-bold mb-5">Why stubIDP?</h2>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-card text-card-fg border border-border rounded-xl p-6 hover:border-outline-variant transition-colors">
          <div class="text-3xl mb-4">⚡</div>
          <h3 class="font-semibold mb-2">Zero Config</h3>
          <p class="text-muted-fg text-sm leading-relaxed">One command to start. No accounts, no registration required.</p>
        </div>
        <div class="bg-card text-card-fg border border-border rounded-xl p-6 hover:border-outline-variant transition-colors">
          <div class="text-3xl mb-4">✅</div>
          <h3 class="font-semibold mb-2">Fully Compliant</h3>
          <p class="text-muted-fg text-sm leading-relaxed">Built on <code class="text-xs bg-muted px-1 py-0.5 rounded">oidc-provider</code>, a certified OpenID Connect implementation.</p>
        </div>
        <div class="bg-card text-card-fg border border-border rounded-xl p-6 hover:border-outline-variant transition-colors">
          <div class="text-3xl mb-4">🌩</div>
          <h3 class="font-semibold mb-2">Deploy Anywhere</h3>
          <p class="text-muted-fg text-sm leading-relaxed">Local, Docker, or Cloudflare Workers. One-click deployment.</p>
        </div>
      </div>
    </section>

    <section class="max-w-4xl mx-auto px-6 pb-16">
      <div class="flex gap-4 items-start bg-warning-fixed border border-warning/20 rounded-xl px-6 py-5">
        <span class="text-warning-fixed-fg text-lg shrink-0">⚠</span>
        <div>
          <p class="font-medium text-warning-fixed-fg text-sm">Development use only</p>
          <p class="text-warning-fixed-fg/70 text-sm mt-0.5">stubIDP is not suitable for production. Do not use it to protect real user data or credentials.</p>
        </div>
      </div>
    </section>
  `,
    description,
    issuer,
  )
}
