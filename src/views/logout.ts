import { layout, escapeHtml } from './layout.js'

export function logoutPage(opts: { clientId?: string; form: string }): string {
  const { clientId, form } = opts
  return layout(
    'Sign out',
    `
    <div class="flex items-center justify-center min-h-[80vh] px-4 py-10">
      <div class="w-full max-w-md">
        <div class="bg-card text-card-fg rounded-xl border border-border p-8 shadow-sm">
          <div class="text-center mb-8">
            <h1 class="text-2xl font-bold mb-1.5">Sign out</h1>
            ${clientId ? `<p class="text-muted-fg text-sm">from <span class="text-on-surface font-medium">${escapeHtml(clientId)}</span></p>` : ''}
          </div>

          ${form}

          <div class="space-y-3">
            <button
              type="submit"
              form="op.logoutForm"
              name="logout"
              value="yes"
              class="w-full bg-primary text-primary-fg font-semibold hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 py-3 rounded-lg transition-all text-sm"
            >
              Yes, sign me out
            </button>
            <button
              type="submit"
              form="op.logoutForm"
              class="w-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant font-medium py-3 rounded-lg transition-colors text-sm"
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
        <div class="bg-card text-card-fg rounded-xl border border-border p-8 shadow-sm">
          <p class="text-5xl mb-6 text-success">✓</p>
          <h1 class="text-2xl font-bold mb-2">Signed out</h1>
          <p class="text-muted-fg text-sm">
            ${clientId ? `You have been signed out of <span class="text-on-surface font-medium">${escapeHtml(clientId)}</span>.` : 'You have been signed out.'}
          </p>
        </div>
      </div>
    </div>
  `,
  )
}
