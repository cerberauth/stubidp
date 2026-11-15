import { layout, escapeHtml, trackEvent, type PageOptions } from './layout.js'

export interface ConsentPageOptions extends PageOptions {
  uid: string
  clientId: string
  /** OIDC scopes the client is asking for that have not been granted yet. */
  scopes: string[]
  /** Individual claims requested through the `claims` parameter. */
  claims?: string[]
  /** Scopes requested per resource server, keyed by resource indicator. */
  resourceScopes?: Record<string, string[]>
  basePath?: string
}

function itemList(values: string[]): string {
  return values
    .map(
      (value) => `
    <li class="flex items-center gap-2.5 text-sm text-on-surface-variant py-1">
      <svg class="text-success shrink-0 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      <code class="text-primary text-xs bg-muted px-1.5 py-0.5 rounded">${escapeHtml(value)}</code>
    </li>`,
    )
    .join('')
}

function section(title: string, values: string[], subtitle?: string): string {
  if (values.length === 0) return ''
  return `
          <div class="bg-surface-container-low border border-border rounded-xl px-5 py-4 mb-6">
            <p class="text-xs text-muted-fg font-semibold uppercase tracking-wider mb-3">${escapeHtml(title)}</p>
            ${subtitle ? `<p class="text-xs text-muted-fg mb-2 break-all"><code>${escapeHtml(subtitle)}</code></p>` : ''}
            <ul class="space-y-0.5">
              ${itemList(values)}
            </ul>
          </div>`
}

export function consentPage(opts: ConsentPageOptions): string {
  const { uid, clientId, scopes, claims = [], resourceScopes = {}, basePath = '/interaction', telemetry } = opts

  const sections = [
    section('Requested permissions', scopes),
    section('Requested claims', claims),
    ...Object.entries(resourceScopes).map(([resource, values]) => section('Resource access', values, resource)),
  ].join('')

  return layout(
    'Authorize',
    `
    <div class="flex items-center justify-center min-h-[80vh] px-4 py-10">
      <div class="w-full max-w-md">
        <div class="bg-card text-card-fg rounded-xl border border-border p-8 shadow-sm">
          <div class="text-center mb-8">
            <div class="w-14 h-14 bg-primary/15 border border-primary/30 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-5">
              🔑
            </div>
            <h1 class="text-2xl font-bold mb-2">Authorize access</h1>
            <p class="text-muted-fg text-sm">
              <span class="font-semibold text-on-surface">${escapeHtml(clientId)}</span>
              is requesting access to your account
            </p>
          </div>

          ${sections}

          <div class="space-y-3">
            <form action="${escapeHtml(basePath)}/${escapeHtml(uid)}/confirm" method="POST" class="${trackEvent('Consent Allow')}">
              <button
                type="submit"
                class="w-full bg-primary text-primary-fg font-semibold hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 py-3 rounded-lg transition-all text-sm"
              >
                Allow access
              </button>
            </form>
            <form action="${escapeHtml(basePath)}/${escapeHtml(uid)}/abort" method="POST" class="${trackEvent('Consent Deny')}">
              <button
                type="submit"
                class="w-full border border-border bg-surface hover:bg-accent hover:text-accent-fg text-on-surface-variant font-semibold py-3 rounded-lg transition-colors text-sm"
              >
                Deny
              </button>
            </form>
          </div>

          <p class="text-center text-xs text-muted-fg mt-6">
            Powered by StubIdP · Development use only
          </p>
        </div>
      </div>
    </div>
  `,
    '',
    { telemetry },
  )
}
