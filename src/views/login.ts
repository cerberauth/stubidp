import { layout, escapeHtml } from './layout.js'

export function loginPage(opts: { uid: string; clientId: string }): string {
  const { uid, clientId } = opts
  return layout(
    'Sign in',
    `
    <div class="flex items-center justify-center min-h-[80vh] px-4 py-10">
      <div class="w-full max-w-md">
        <div class="mb-5 flex gap-3 items-start bg-yellow-500/10 border border-yellow-500/25 rounded-xl px-5 py-4">
          <span class="text-yellow-400 text-base shrink-0 mt-0.5">⚠</span>
          <p class="text-yellow-200/80 text-sm leading-relaxed">
            <strong class="text-yellow-200">Stub IDP:</strong> Any username will be accepted. This is not a real authentication system.
          </p>
        </div>

        <div class="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          <div class="text-center mb-8">
            <h1 class="text-2xl font-bold mb-1.5">Sign in</h1>
            <p class="text-gray-400 text-sm">
              to continue to <span class="text-white font-medium">${escapeHtml(clientId)}</span>
            </p>
          </div>

          <form action="/interaction/${escapeHtml(uid)}/login" method="POST" class="space-y-4">
            <div>
              <label for="username" class="block text-sm font-medium text-gray-300 mb-1.5">
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
                class="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
              />
              <p class="text-gray-600 text-xs mt-1.5">Any value is accepted — this is a stub</p>
            </div>

            <div>
              <label for="password" class="block text-sm font-medium text-gray-300 mb-1.5">
                Password <span class="text-gray-600 font-normal text-xs">(not checked)</span>
              </label>
              <input
                type="password"
                id="password"
                name="password"
                placeholder="Any value"
                autocomplete="off"
                class="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
              />
            </div>

            <button
              type="submit"
              class="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3 rounded-lg transition-colors text-sm mt-2"
            >
              Sign in
            </button>
          </form>

          <div class="mt-6 pt-5 border-t border-gray-800 text-center">
            <form action="/interaction/${escapeHtml(uid)}/abort" method="POST">
              <button type="submit" class="text-sm text-gray-600 hover:text-gray-400 transition-colors">
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
