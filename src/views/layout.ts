import { TELEMETRY_SCRIPT_PATH } from '../telemetry-settings.js'

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export interface PageOptions {
  /** Include the Plausible tracker; see src/telemetry-settings.ts. */
  telemetry?: boolean
}

/**
 * Class names that make Plausible's tracker record a custom event when the
 * element is clicked (or, on a <form>, submitted). Inert when the tracker
 * isn't loaded. https://plausible.io/docs/custom-event-goals
 */
export function trackEvent(name: string, props: Record<string, string> = {}): string {
  const encode = (value: string) => value.replace(/ /g, '+')
  return [
    `plausible-event-name=${encode(name)}`,
    ...Object.entries(props).map(([key, value]) => `plausible-event-${key}=${encode(value)}`),
  ].join(' ')
}

export function layout(title: string, body: string, head = '', { telemetry = false }: PageOptions = {}): string {
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
  <title>${escapeHtml(title)} — StubIdP</title>
  ${head || '<meta name="robots" content="noindex, nofollow" />'}
  <link rel="stylesheet" href="/output.css" />${telemetry ? `\n  <script type="module" src="${TELEMETRY_SCRIPT_PATH}"></script>` : ''}
</head>
<body class="min-h-screen flex flex-col antialiased">
  <div class="flex-1">
    ${body}
  </div>
  <footer class="border-t border-border shrink-0">
    <div class="max-w-5xl mx-auto px-6 py-4 text-center text-muted-fg text-xs">
      <a href="https://github.com/cerberauth/stubidp" target="_blank" rel="noopener" class="text-muted-fg hover:text-on-surface-variant hover:no-underline transition-colors">Open Source</a>
      &nbsp;·&nbsp; StubIdP by <a href="https://www.cerberauth.com" target="_blank" class="text-muted-fg hover:text-on-surface-variant hover:no-underline transition-colors">CerberAuth</a>
      &nbsp;·&nbsp; Powered by <a href="https://github.com/panva/node-oidc-provider" target="_blank" rel="noopener" class="text-muted-fg hover:text-on-surface-variant hover:no-underline transition-colors">oidc-provider</a>
      &nbsp;·&nbsp; For development and testing only
    </div>
  </footer>
</body>
</html>`
}
