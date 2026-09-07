import { createHash } from 'node:crypto'

export const FORM_ID = 'xkgknpkl'
const text = value => typeof value === 'string' ? value : typeof value === 'number' ? String(value) : ''
const first = (...values) => values.map(text).find(value => value.trim()) || ''
function utc(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(value)) return null
  const date = new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`)
  return Number.isFinite(date.getTime()) ? date.toISOString() : null
}
function stable(value) {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]))
  return value
}
export function normalize(row) {
  const source = first(row.utm_source, row.source, row.lead_source) || 'Unknown'
  const known = { google: 'Google', instagram: 'Instagram', tiktok: 'TikTok', chatgpt: 'ChatGPT', 'chatgpt.com': 'ChatGPT' }
  const sourceKey = source.trim().toLowerCase()
  return {
    id: first(row._id, row.id) || createHash('sha256').update(JSON.stringify(stable(row))).digest('hex'),
    name: first(row.name, row.full_name, row.fullName, row['Full Name'], [first(row.first_name, row.firstName), first(row.last_name, row.lastName)].filter(Boolean).join(' ')),
    email: first(row.email, row._replyto, row.Email),
    phone: first(row.phone, row.phone_number, row.tel, row.Phone),
    notes: [...new Set([row.message, row.notes, row.Message].map(text).filter(value => value.trim()))].join('\n\n'),
    received: utc(first(row._date, row.created_at, row.createdAt)),
    channel: Object.hasOwn(known, sourceKey) ? known[sourceKey] : source,
    source,
    campaign: first(row.utm_campaign, row.campaign),
    formType: first(row.form_key, row.form_type, row.formType, row.form_name, row.formName, row._subject),
    personType: first(row.whichBestDescribesYou, row.person_type, row.personType, row.patient_type, row.patientType),
    isTest: row._codex_test === true || row._codex_test === 'true' || row._codex_test === '1' || row.isTest === true || row.is_test === true,
    interest: first(row.consultation_interest, row.interest),
    referrer: first(row.referrer, row.referring_page, row.http_referer),
    pageUrl: first(row.page_url, row.pageUrl, row.page_path, row.url),
  }
}

export async function fetchLeads(key, fetcher = fetch) {
  if (!key) throw new Error('integration_unconfigured')
  const leads = []
  const seen = new Set()
  const pageSize = 100
  // Refuse a partial result beyond 10,000 records or on pagination drift.
  for (let offset = 0; offset < 10000; offset += pageSize) {
    const response = await fetcher(`https://formspree.io/api/0/forms/${FORM_ID}/submissions?limit=${pageSize}&offset=${offset}&order=asc&spam=false`, {
      method: 'GET', headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) throw new Error('upstream_unavailable')
    if (Number(response.headers?.get('content-length')) > 5 * 1024 * 1024) throw new Error('upstream_invalid')
    // Bound upstream memory use even when Content-Length is missing or inaccurate.
    let payload
    if (response.body?.getReader) {
      const reader = response.body.getReader()
      const chunks = []
      let bytes = 0
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          bytes += value.byteLength
          if (bytes > 5 * 1024 * 1024) { await reader.cancel(); throw new Error('upstream_invalid') }
          chunks.push(Buffer.from(value))
        }
        payload = JSON.parse(Buffer.concat(chunks).toString('utf8'))
      } finally { reader.releaseLock() }
    } else { payload = await response.json() }
    if (!Array.isArray(payload.submissions)) throw new Error('upstream_invalid')
    for (const row of payload.submissions) {
      if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error('upstream_invalid')
      if (row.spam === true || row._spam === true) continue
      const lead = normalize(row)
      if (seen.has(lead.id)) throw new Error('pagination_changed')
      seen.add(lead.id)
      leads.push(lead)
    }
    if (payload.submissions.length < pageSize) return { leads, meta: { provider: 'Formspree', formId: FORM_ID, fetchedAt: new Date().toISOString(), total: leads.length, spamExcluded: true, complete: true } }
  }
  throw new Error('pagination_limit')
}
