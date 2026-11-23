import { layout, escapeHtml, type PageOptions } from './layout.js'

export interface ErrorPageOptions extends PageOptions {
  status: number
  /** OAuth-style error code, e.g. `invalid_request`. Also what the telemetry event reports. */
  error: string
  /** Human-readable description. Only passed for errors that are safe to expose (4xx). */
  description?: string
  /** Correlates the page with the server log line. */
  requestId?: string
}

/** Friendlier explanation for the errors users actually hit by reloading, going back or waiting too long. */
function hintFor(description: string | undefined): string | undefined {
  // oidc-provider's SessionNotFound: "interaction session not found", "... id cookie not found", "... mismatch"
  if (description?.startsWith('interaction session')) {
    return 'This sign-in session has expired or was already completed. Go back to the application and start signing in again.'
  }
  return undefined
}

export function errorPage(opts: ErrorPageOptions): string {
  const { status, error, description, requestId, telemetry } = opts
  const title = status >= 500 ? 'Something went wrong' : 'Request failed'
  const message =
    status >= 500
      ? 'The server hit an unexpected error. Try again, and check the server logs if it keeps happening.'
      : (hintFor(description) ?? description ?? 'The request could not be processed.')

  return layout(
    title,
    `
    <div class="flex items-center justify-center min-h-[80vh] px-4 py-10">
      <div class="w-full max-w-md text-center">
        <div class="bg-card text-card-fg rounded-xl border border-border p-8 shadow-sm">
          <p class="text-5xl mb-6 text-warning">⚠</p>
          <h1 class="text-2xl font-bold mb-2">${escapeHtml(title)}</h1>
          <p class="text-muted-fg text-sm leading-relaxed">${escapeHtml(message)}</p>
          <p class="mt-6 text-muted-fg text-xs">
            <span class="font-mono">${escapeHtml(error)}</span> · HTTP ${status}${
              requestId ? `<br />Request ID: <span class="font-mono">${escapeHtml(requestId)}</span>` : ''
            }
          </p>
        </div>
      </div>
    </div>
  `,
    `<meta name="robots" content="noindex, nofollow" />
  <meta name="stubidp-error" content="${escapeHtml(error)}" data-status="${status}" />`,
    { telemetry },
  )
}
