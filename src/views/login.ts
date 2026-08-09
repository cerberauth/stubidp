import { layout, escapeHtml } from './layout.js'

export function loginPage(opts: { uid: string; clientId: string }): string {
  const { uid, clientId } = opts
  return layout(
    'Sign in',
    `
    <div class="flex items-center justify-center min-h-[80vh] px-4 py-10">
      <div class="w-full max-w-md">
        <div class="mb-5 flex gap-3 items-start bg-warning-fixed border border-warning/25 rounded-xl px-5 py-4">
          <span class="text-warning-fixed-fg text-base shrink-0 mt-0.5">⚠</span>
          <p class="text-warning-fixed-fg/80 text-sm leading-relaxed">
            <strong class="text-warning-fixed-fg">Stub IDP:</strong> Any username will be accepted. This is not a real authentication system.
          </p>
        </div>

        <div class="bg-card text-card-fg rounded-xl border border-border p-8 shadow-sm">
          <div class="text-center mb-8">
            <h1 class="text-2xl font-bold mb-1.5">Sign in</h1>
            <p class="text-muted-fg text-sm">
              to continue to <span class="text-on-surface font-medium">${escapeHtml(clientId)}</span>
            </p>
          </div>

          <form action="/interaction/${escapeHtml(uid)}/login" method="POST" class="space-y-4">
            <div>
              <label for="username" class="block text-sm font-medium text-on-surface-variant mb-1.5">
                Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                placeholder="e.g. alice"
                required
                autofocus
                autocomplete="off"
                class="w-full border border-border bg-surface-container-low text-on-surface placeholder:text-muted-fg rounded-lg px-4 py-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring transition"
              />
              <p class="text-muted-fg text-xs mt-1.5">Any value is accepted — this is a stub</p>
            </div>

            <div>
              <label for="password" class="block text-sm font-medium text-on-surface-variant mb-1.5">
                Password <span class="text-muted-fg font-normal text-xs">(not checked)</span>
              </label>
              <input
                type="password"
                id="password"
                name="password"
                placeholder="Any value"
                autocomplete="off"
                class="w-full border border-border bg-surface-container-low text-on-surface placeholder:text-muted-fg rounded-lg px-4 py-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring transition"
              />
            </div>

            <button
              type="submit"
              class="w-full bg-primary text-primary-fg font-semibold hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 py-3 rounded-lg transition-all text-sm mt-2"
            >
              Sign in
            </button>
          </form>

          <div class="mt-6 pt-5 border-t border-border text-center">
            <form action="/interaction/${escapeHtml(uid)}/abort" method="POST">
              <button type="submit" class="text-sm text-muted-fg hover:text-on-surface-variant transition-colors">
                Cancel and go back
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  `,
  )
}
