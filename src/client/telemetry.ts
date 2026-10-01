import { init } from '@plausible-analytics/tracker'

import { PLAUSIBLE_DOMAIN, PLAUSIBLE_ORIGIN } from '../telemetry-settings.js'
import { sanitizeUrl } from './sanitize-url.js'

// Pageviews are captured automatically. Interaction events are declared in the
// page markup with Plausible's class convention (`plausible-event-name=Login+Submit`),
// so there is no per-element code here and nothing user-typed (username,
// client_id, scopes) is ever sent.
init({
  domain: PLAUSIBLE_DOMAIN,
  endpoint: `${PLAUSIBLE_ORIGIN}/api/event`,
  outboundLinks: true,
  logging: false,
  transformRequest(payload) {
    payload.u = sanitizeUrl(payload.u)
    payload.r = sanitizeUrl(payload.r)
    return payload
  },
})
