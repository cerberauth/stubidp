function layout(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — stubIdP</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-950 text-white min-h-screen flex items-center justify-center p-4">
  <div class="w-full max-w-md">
    <div class="text-center mb-8">
      <h1 class="text-2xl font-bold text-white">stubIdP</h1>
      <p class="text-gray-400 text-sm mt-1">Mock OpenID Connect Server</p>
    </div>
    <div class="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3 mb-6 text-sm text-yellow-300">
      <strong>Development only</strong> — This is a stub identity provider. Any credentials are accepted.
    </div>
    ${content}
  </div>
</body>
</html>`
}

export function loginPage(uid: string): string {
  const content = `
    <div class="bg-gray-900 rounded-xl p-8 shadow-xl border border-gray-800">
      <h2 class="text-xl font-semibold mb-6 text-center">Sign in</h2>
      <form method="POST" action="/interaction/${uid}/login" class="space-y-4">
        <div>
          <label for="login" class="block text-sm font-medium text-gray-300 mb-1">Username</label>
          <input
            id="login"
            name="login"
            type="text"
            required
            placeholder="any value"
            class="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label for="password" class="block text-sm font-medium text-gray-300 mb-1">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            placeholder="any value"
            class="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          type="submit"
          class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors mt-2"
        >
          Sign in
        </button>
      </form>
    </div>`
  return layout('Sign in', content)
}

export function consentPage(uid: string, clientId: string, missingScopes: string[]): string {
  const scopeList =
    missingScopes.length > 0
      ? `<ul class="mt-2 space-y-1">
          ${missingScopes.map((s) => `<li class="flex items-center gap-2 text-sm text-gray-300"><span class="text-green-400">✓</span>${s}</li>`).join('')}
        </ul>`
      : '<p class="text-sm text-gray-400 mt-1">No additional scopes requested.</p>'

  const content = `
    <div class="bg-gray-900 rounded-xl p-8 shadow-xl border border-gray-800">
      <h2 class="text-xl font-semibold mb-2 text-center">Authorize Access</h2>
      <p class="text-gray-400 text-sm text-center mb-6">
        <span class="font-mono text-blue-400">${clientId}</span> is requesting access
      </p>
      <div class="bg-gray-800 rounded-lg p-4 mb-6">
        <p class="text-sm font-medium text-gray-300">Requested permissions:</p>
        ${scopeList}
      </div>
      <div class="flex gap-3">
        <form method="POST" action="/interaction/${uid}/abort" class="flex-1">
          <button
            type="submit"
            class="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-2.5 rounded-lg transition-colors"
          >
            Deny
          </button>
        </form>
        <form method="POST" action="/interaction/${uid}/confirm" class="flex-1">
          <button
            type="submit"
            class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors"
          >
            Allow
          </button>
        </form>
      </div>
    </div>`
  return layout('Authorize', content)
}
