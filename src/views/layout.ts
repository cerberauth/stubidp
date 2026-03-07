export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)} — stubIDP</title>
  <script src="https://cdn.tailwindcss.com"></script>
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
      stubIDP by <a href="https://www.cerberauth.com" target="_blank" rel="noopener" class="hover:text-gray-400 transition-colors">CerberAuth</a>
      &nbsp;·&nbsp; For development and testing only
    </div>
  </footer>
</body>
</html>`
}
