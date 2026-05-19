export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function layout(title: string, body: string, description?: string, url?: string): string {
  const desc = description || 'Mock OpenID Connect server for developers. Free, open-source testing environment for OAuth 2.0 and OIDC flows.'
  const ogUrl = url || 'https://stubidp.cerberauth.com'
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="${escapeHtml(desc)}" />
  <meta name="keywords" content="OpenID Connect, OAuth 2.0, OIDC, identity provider, mock, testing, development" />
  <meta property="og:title" content="${escapeHtml(title)} — stubIDP" />
  <meta property="og:description" content="${escapeHtml(desc)}" />
  <meta property="og:url" content="${escapeHtml(ogUrl)}" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)} — stubIDP" />
  <meta name="twitter:description" content="${escapeHtml(desc)}" />
  <link rel="canonical" href="${escapeHtml(ogUrl)}" />
  <title>${escapeHtml(title)} — stubIDP</title>
  <link rel="stylesheet" href="/output.css" />
</head>
<body class="bg-gray-950 text-white min-h-screen flex flex-col antialiased">
  <header class="border-b border-gray-800 shrink-0">
    <div class="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
      <a href="/" class="text-xl font-bold tracking-tight">
        stub<span class="text-purple-400">IDP</span>
      </a>
      <span class="text-xs bg-yellow-500/20 text-yellow-300 px-2.5 py-1 rounded-full border border-yellow-500/30 font-medium">
        DEV ONLY
      </span>
    </div>
  </header>
  <div class="flex-1">
    ${body}
  </div>
  <footer class="border-t border-gray-800 shrink-0">
    <div class="max-w-5xl mx-auto px-6 py-4 text-center text-gray-600 text-xs">
      <a href="https://github.com/cerberauth/stubidp" target="_blank" rel="noopener" class="hover:text-gray-400 transition-colors">Open Source</a>
      &nbsp;·&nbsp; stubIDP by <a href="https://www.cerberauth.com" target="_blank" class="hover:text-gray-400 transition-colors">CerberAuth</a>
      &nbsp;·&nbsp; Powered by <a href="https://github.com/panva/node-oidc-provider" target="_blank" rel="noopener" class="hover:text-gray-400 transition-colors">oidc-provider</a>
      &nbsp;·&nbsp; For development and testing only
    </div>
  </footer>
</body>
</html>`
}
