export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function layout(title: string, body: string, description?: string, url?: string): string {
  const desc =
    description ||
    'Mock OpenID Connect server for developers. Free, open-source testing environment for OAuth 2.0 and OIDC flows.'
  const ogUrl = url || 'https://stubidp.cerberauth.com'
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <script>
    (function () {
      var mql = window.matchMedia('(prefers-color-scheme: dark)')
      var apply = function (matches) {
        document.documentElement.setAttribute('data-theme', matches ? 'dark' : 'light')
      }
      apply(mql.matches)
      mql.addEventListener('change', function (e) {
        apply(e.matches)
      })
    })()
  </script>
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
<body class="min-h-screen flex flex-col antialiased">
  <header class="border-b border-border shrink-0">
    <div class="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
      <a href="/" class="text-xl font-bold tracking-tight text-on-surface hover:text-on-surface hover:no-underline">
        stub<span class="text-primary">IDP</span>
      </a>
      <span class="inline-flex items-center justify-center rounded-full border border-transparent bg-warning text-warning-fg px-2.5 py-1 text-xs font-medium">
        DEV ONLY
      </span>
    </div>
  </header>
  <div class="flex-1">
    ${body}
  </div>
  <footer class="border-t border-border shrink-0">
    <div class="max-w-5xl mx-auto px-6 py-4 text-center text-muted-fg text-xs">
      <a href="https://github.com/cerberauth/stubidp" target="_blank" rel="noopener" class="text-muted-fg hover:text-on-surface-variant hover:no-underline transition-colors">Open Source</a>
      &nbsp;·&nbsp; stubIDP by <a href="https://www.cerberauth.com" target="_blank" class="text-muted-fg hover:text-on-surface-variant hover:no-underline transition-colors">CerberAuth</a>
      &nbsp;·&nbsp; Powered by <a href="https://github.com/panva/node-oidc-provider" target="_blank" rel="noopener" class="text-muted-fg hover:text-on-surface-variant hover:no-underline transition-colors">oidc-provider</a>
      &nbsp;·&nbsp; For development and testing only
    </div>
  </footer>
</body>
</html>`
}
