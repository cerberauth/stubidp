import { layout, escapeHtml } from './layout.js'

export function consentPage(opts: { uid: string; clientId: string; scopes: string[] }): string {
  const { uid, clientId, scopes } = opts

  const scopeItems = scopes
    .map(
      (scope) => `
    <li class="flex items-center gap-2.5 text-sm text-gray-300 py-1">
      <svg class="text-green-400 shrink-0 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      <code class="text-purple-300 text-xs bg-gray-800 px-1.5 py-0.5 rounded">${escapeHtml(scope)}</code>
    </li>`,
    )
    .join('')

  return layout(
    'Authorize',
    `
    <div class="flex items-center justify-center min-h-[80vh] px-4 py-10">
      <div class="w-full max-w-md">
        <div class="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          <div class="text-center mb-8">
            <div class="w-14 h-14 bg-purple-500/15 border border-purple-500/30 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-5">
              🔑
            </div>
            <h1 class="text-2xl font-bold mb-2">Authorize access</h1>
            <p class="text-gray-400 text-sm">
              <span class="font-semibold text-white">${escapeHtml(clientId)}</span>
              is requesting access to your account
            </p>
          </div>

          ${
            scopes.length > 0
              ? `
          <div class="bg-gray-800/50 border border-gray-700/50 rounded-xl px-5 py-4 mb-6">
            <p class="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">Requested permissions</p>
            <ul class="space-y-0.5">
              ${scopeItems}
            </ul>
          </div>
          `
              : ''
          }

          <div class="space-y-3">
            <form action="/interaction/${escapeHtml(uid)}/confirm" method="POST">
              <button
                type="submit"
                class="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3 rounded-lg transition-colors text-sm"
              >
                Allow access
              </button>
            </form>
            <form action="/interaction/${escapeHtml(uid)}/abort" method="POST">
              <button
                type="submit"
                class="w-full border border-gray-700 hover:border-gray-600 bg-gray-800/50 hover:bg-gray-800 text-gray-300 hover:text-white font-semibold py-3 rounded-lg transition-colors text-sm"
              >
                Deny
              </button>
            </form>
          </div>

          <p class="text-center text-xs text-gray-700 mt-6">
            Powered by stubIDP · Development use only
          </p>
        </div>
      </div>
    </div>
  `,
  )
}
