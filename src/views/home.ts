import { layout, escapeHtml } from './layout.js'

export function homePage(issuer: string): string {
  const discoveryUrl = `${issuer}/.well-known/openid-configuration`

  const endpoints: Array<{ name: string; url: string; link?: boolean }> = [
    { name: 'Discovery', url: `${issuer}/.well-known/openid-configuration`, link: true },
    { name: 'Authorization', url: `${issuer}/auth` },
    { name: 'Token', url: `${issuer}/token` },
    { name: 'Userinfo', url: `${issuer}/me` },
    { name: 'JWKS', url: `${issuer}/jwks` },
    { name: 'End Session', url: `${issuer}/session/end` },
  ]

  const endpointRows = endpoints
    .map(
      ({ name, url, link }) => `
    <tr class="border-b border-gray-800/60 last:border-0 hover:bg-gray-800/30 transition-colors">
      <td class="px-6 py-3.5 text-gray-300 text-sm whitespace-nowrap">${escapeHtml(name)}</td>
      <td class="px-6 py-3.5">
        ${
          link
            ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener" class="font-mono text-xs text-purple-400 hover:text-purple-300 transition-colors break-all">${escapeHtml(url)}</a>`
            : `<span class="font-mono text-xs text-gray-500 break-all">${escapeHtml(url)}</span>`
        }
      </td>
    </tr>`,
    )
    .join('')

  return layout(
    'Mock OpenID Connect Server',
    `
    <!-- Hero -->
    <section class="max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
      <div class="inline-flex items-center gap-2 bg-purple-500/10 text-purple-300 text-xs px-3 py-1.5 rounded-full border border-purple-500/20 mb-8 font-medium uppercase tracking-wider">
        OpenID Connect &amp; OAuth 2.0
      </div>
      <h1 class="text-5xl sm:text-6xl font-bold mb-6 tracking-tight leading-[1.1]">
        Mock <span class="text-purple-400">identity provider</span><br/>for developers
      </h1>
      <p class="text-lg text-gray-400 mb-10 max-w-xl mx-auto leading-relaxed">
        Stop waiting for identity providers. Start building.<br/>Zero config. Instant OIDC for local dev and CI/CD.
      </p>
      <div class="flex items-center justify-center gap-3 flex-wrap">
        <a href="https://nacho.cerberauth.com/client/create"
           target="_blank" rel="noopener"
           class="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold px-6 py-3 rounded-lg transition-colors text-sm">
          Create a client →
        </a>
        <a href="${escapeHtml(discoveryUrl)}"
           target="_blank" rel="noopener"
           class="inline-flex items-center gap-2 border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white px-6 py-3 rounded-lg transition-colors text-sm">
          OIDC Discovery
        </a>
      </div>
    </section>

    <!-- Create Client CTA -->
    <section class="max-w-4xl mx-auto px-6 pb-16">
      <div class="relative overflow-hidden bg-gradient-to-br from-purple-900/40 via-purple-900/20 to-gray-900/40 border border-purple-700/40 rounded-2xl p-8 sm:p-12 text-center">
        <h2 class="text-2xl sm:text-3xl font-bold mb-3">Register a new client</h2>
        <p class="text-gray-300 mb-8 max-w-lg mx-auto text-sm leading-relaxed">
          Use <strong class="text-white">nacho</strong> by CerberAuth to create and manage your OIDC clients.
          Get your <code class="bg-gray-800/80 border border-gray-700 px-1.5 py-0.5 rounded text-xs text-purple-300">client_id</code> and
          <code class="bg-gray-800/80 border border-gray-700 px-1.5 py-0.5 rounded text-xs text-purple-300">client_secret</code> in seconds.
        </p>
        <a href="https://nacho.cerberauth.com/client/create"
           target="_blank" rel="noopener"
           class="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors">
          Create a client at nacho.cerberauth.com →
        </a>
      </div>
    </section>

    <!-- Quick Start -->
    <section class="max-w-4xl mx-auto px-6 pb-16">
      <h2 class="text-2xl font-bold mb-5">Quick Start</h2>
      <div class="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div class="flex items-center gap-1.5 px-5 py-3 border-b border-gray-800 bg-gray-900/80">
          <span class="w-3 h-3 rounded-full bg-red-500/50"></span>
          <span class="w-3 h-3 rounded-full bg-yellow-500/50"></span>
          <span class="w-3 h-3 rounded-full bg-green-500/50"></span>
          <span class="ml-3 text-gray-500 text-xs font-mono">terminal</span>
        </div>
        <pre class="px-6 py-5 text-sm text-green-400 overflow-x-auto leading-7"><code>npx @cerberauth/stubidp \\
  --clientId my-app \\
  --clientSecret my-secret \\
  --redirectUri http://localhost:8080/callback</code></pre>
      </div>
      <p class="text-gray-500 text-sm mt-3">
        Your OIDC provider will be live at
        <a href="${escapeHtml(issuer)}" class="text-purple-400 hover:text-purple-300 transition-colors font-mono text-xs">${escapeHtml(issuer)}</a>
      </p>
    </section>

    <!-- OIDC Endpoints -->
    <section class="max-w-4xl mx-auto px-6 pb-16">
      <h2 class="text-2xl font-bold mb-5">OIDC Endpoints</h2>
      <div class="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-800 bg-gray-900/60">
              <th class="text-left px-6 py-3 text-gray-500 text-xs font-semibold uppercase tracking-wider w-36">Endpoint</th>
              <th class="text-left px-6 py-3 text-gray-500 text-xs font-semibold uppercase tracking-wider">URL</th>
            </tr>
          </thead>
          <tbody>
            ${endpointRows}
          </tbody>
        </table>
      </div>
    </section>

    <!-- Features -->
    <section class="max-w-4xl mx-auto px-6 pb-16">
      <h2 class="text-2xl font-bold mb-5">Why stubIDP?</h2>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors">
          <div class="text-3xl mb-4">⚡</div>
          <h3 class="font-semibold mb-2">Zero Config</h3>
          <p class="text-gray-400 text-sm leading-relaxed">One command to start. No accounts, no registration required.</p>
        </div>
        <div class="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors">
          <div class="text-3xl mb-4">✅</div>
          <h3 class="font-semibold mb-2">Fully Compliant</h3>
          <p class="text-gray-400 text-sm leading-relaxed">Built on <code class="text-xs bg-gray-800 px-1 py-0.5 rounded">oidc-provider</code>, a certified OpenID Connect implementation.</p>
        </div>
        <div class="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors">
          <div class="text-3xl mb-4">🌩</div>
          <h3 class="font-semibold mb-2">Deploy Anywhere</h3>
          <p class="text-gray-400 text-sm leading-relaxed">Local, Docker, or Cloudflare Workers. One-click deployment.</p>
        </div>
      </div>
    </section>

    <!-- Warning -->
    <section class="max-w-4xl mx-auto px-6 pb-16">
      <div class="flex gap-4 items-start bg-yellow-500/5 border border-yellow-500/20 rounded-xl px-6 py-5">
        <span class="text-yellow-500 text-lg shrink-0">⚠</span>
        <div>
          <p class="font-medium text-yellow-300 text-sm">Development use only</p>
          <p class="text-yellow-200/50 text-sm mt-0.5">stubIDP is not suitable for production. Do not use it to protect real user data or credentials.</p>
        </div>
      </div>
    </section>
  `,
  )
}
