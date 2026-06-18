import { layout, escapeHtml } from './layout.js'

export function logoutPage(opts: { clientId?: string; form: string }): string {
  const { clientId, form } = opts
  return layout(
    'Sign out',
    `
    <div class="flex items-center justify-center min-h-[80vh] px-4 py-10">
      <div class="w-full max-w-md">
        <div class="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          <div class="text-center mb-8">
            <h1 class="text-2xl font-bold mb-1.5">Sign out</h1>
            ${clientId ? `<p class="text-gray-400 text-sm">from <span class="text-white font-medium">${escapeHtml(clientId)}</span></p>` : ''}
          </div>

          ${form}

          <div class="space-y-3">
            <button
              type="submit"
              form="op.logoutForm"
              name="logout"
              value="yes"
              class="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3 rounded-lg transition-colors text-sm"
            >
              Yes, sign me out
            </button>
            <button
              type="submit"
              form="op.logoutForm"
              class="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-3 rounded-lg transition-colors text-sm"
            >
              No, stay signed in
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  )
}

export function logoutSuccessPage(opts: { clientId?: string } = {}): string {
  const { clientId } = opts
  return layout(
    'Signed out',
    `
    <div class="flex items-center justify-center min-h-[80vh] px-4 py-10">
      <div class="w-full max-w-md text-center">
        <div class="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          <p class="text-5xl mb-6">✓</p>
          <h1 class="text-2xl font-bold mb-2">Signed out</h1>
          <p class="text-gray-400 text-sm">
            ${clientId ? `You have been signed out of <span class="text-white font-medium">${escapeHtml(clientId)}</span>.` : 'You have been signed out.'}
          </p>
        </div>
      </div>
    </div>
  `,
  )
}
