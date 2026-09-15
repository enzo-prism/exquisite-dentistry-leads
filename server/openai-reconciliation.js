import { randomUUID } from 'node:crypto'
import { fetchSubmissions, FORM_ID } from './formspree.js'
import { prepareProviderSubmission } from './openai-conversion-validation.js'

export function validationConfig(env) {
  if (env.OPENAI_CONVERSIONS_MODE !== 'validate_only'
    || !env.OPENAI_CONVERSIONS_API_KEY || env.OPENAI_ADS_PIXEL_ID !== 'V7dxjf8kBAWERq3f9VG2wM'
    || !env.CRON_SECRET || env.CRON_SECRET.length < 32) return null
  return { apiKey: env.OPENAI_CONVERSIONS_API_KEY, pixelId: env.OPENAI_ADS_PIXEL_ID, cronSecret: env.CRON_SECRET }
}

export function reconciliationConfig(env) {
  const cfg = validationConfig(env)
  return cfg && env.FORMSPREE_READ_KEY ? { ...cfg, formspreeKey: env.FORMSPREE_READ_KEY } : null
}

/** Credential/schema probe only. No attribution identifiers or patient data; never ingested. */
export async function probeConversionValidation(cfg, { fetcher = fetch, now = Date.now() } = {}) {
  const response = await fetcher(`https://bzr.openai.com/v1/events?pid=${encodeURIComponent(cfg.pixelId)}`, {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000),
    headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      validate_only: true,
      integration_source: 'exquisite_dentistry',
      events: [{
        id: `validation_probe_${randomUUID()}`, type: 'lead_created', timestamp_ms: now,
        source_url: 'https://exquisitedentistryla.com/contact/', action_source: 'web',
        opt_out: true, data: { type: 'customer_action' },
      }],
    }),
  })
  if (!response.ok) throw new Error('openai_validation_failed')
  if (response.body?.cancel) await response.body.cancel()
  return { mode: 'validate_only', probe: true, validationRequestsAccepted: 1, conversionsSent: 0 }
}

/** No live mode: repeat scans cannot create or duplicate campaign conversions. */
export async function reconcileConversions(cfg, { fetcher = fetch, now = Date.now() } = {}) {
  const { submissions } = await fetchSubmissions(cfg.formspreeKey, fetcher)
  const eligible = new Map()
  const reasons = {}
  for (const submission of submissions) {
    const result = prepareProviderSubmission({ form: FORM_ID, submission }, FORM_ID, now)
    if (!result.accepted) {
      reasons[result.reason] = (reasons[result.reason] || 0) + 1
      continue
    }
    const previous = eligible.get(result.event.id)
    if (previous && JSON.stringify(previous) !== JSON.stringify(result.event)) throw new Error('conflicting_event_id')
    eligible.set(result.event.id, result.event)
  }
  const events = [...eligible.values()]
  // Never expose raw upstream response bodies, tokens, patient data, oppref or event IDs.
  for (let offset = 0; offset < events.length; offset += 1000) {
    const response = await fetcher(`https://bzr.openai.com/v1/events?pid=${encodeURIComponent(cfg.pixelId)}`, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ validate_only: true, integration_source: 'exquisite_dentistry', events: events.slice(offset, offset + 1000) }),
    })
    if (!response.ok) throw new Error('openai_validation_failed')
    // HTTP acceptance is reported only as validation; never as ingestion or attribution.
    if (response.body?.cancel) await response.body.cancel()
  }
  return { mode: 'validate_only', scanned: submissions.length, eligible: events.length, validationRequestsAccepted: events.length ? Math.ceil(events.length / 1000) : 0, rejected: reasons, conversionsSent: 0 }
}
