import { init, track } from '@plausible-analytics/tracker'

import { PLAUSIBLE_DOMAIN, PLAUSIBLE_ORIGIN } from '../telemetry-settings.js'
import { sanitizeUrl } from './sanitize-url.js'

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

const errorMeta = document.querySelector<HTMLMetaElement>('meta[name="stubidp-error"]')
if (errorMeta) {
  track('Error', { props: { error: errorMeta.content, status: errorMeta.dataset.status ?? '' } })
}
