import { prepareFormspreeConversion } from './openai-conversion-validation.js'
export function webhookConfig(env) {
  if (!['validate_only', 'live'].includes(env.OPENAI_WEBHOOK_MODE)
    || !env.FORMSPREE_WEBHOOK_SIGNING_SECRET || !env.OPENAI_CONVERSIONS_API_KEY
    || env.OPENAI_ADS_PIXEL_ID !== 'V7dxjf8kBAWERq3f9VG2wM') return null
  return { mode: env.OPENAI_WEBHOOK_MODE, signingSecret: env.FORMSPREE_WEBHOOK_SIGNING_SECRET,
    apiKey: env.OPENAI_CONVERSIONS_API_KEY, pixelId: env.OPENAI_ADS_PIXEL_ID }
}
export async function deliverWebhook(cfg, rawBody, signature, { fetcher = fetch, now = Date.now() } = {}) {
  const result = prepareFormspreeConversion({ rawBody, signature, signingSecret: cfg.signingSecret, expectedFormId: 'xkgknpkl', nowMs: now })
  if (!result.accepted) {
    if (result.reason === 'signature') return { status: 401, body: { error: 'Invalid signature.' } }
    if (['payload', 'form', 'configuration'].includes(result.reason)) return { status: 400, body: { error: 'Invalid receipt.' } }
    return { status: 200, body: { accepted: false, excluded: true } }
  }
  try {
    const response = await fetcher(`https://bzr.openai.com/v1/events?pid=${encodeURIComponent(cfg.pixelId)}`, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10000),
      headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ validate_only: cfg.mode !== 'live', integration_source: 'exquisite_dentistry', events: [result.event] }),
    })
    if (!response.ok) return { status: 503, body: { error: 'Conversion delivery not acknowledged; retry required.' } }
    if (response.body?.cancel) await response.body.cancel()
    return { status: 200, body: { accepted: true, mode: cfg.mode } }
  } catch { return { status: 503, body: { error: 'Conversion delivery not acknowledged; retry required.' } } }
}
