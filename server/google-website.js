import { createSign } from 'node:crypto'

const PROPERTY = '498175984'
const SITE = 'sc-domain:exquisitedentistryla.com'
const ZONE = 'America/Los_Angeles'
const LIMIT = 1024 * 1024
const unavailable = (detail) => ({ status: 'unavailable', detail })

export function calendarDate(now, timeZone = ZONE) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(now))
}
export function shiftDate(date, days) {
  return new Date(Date.parse(`${date}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10)
}
function metric(value) {
  if (typeof value !== 'number' && typeof value !== 'string') throw Error('Invalid report')
  if (typeof value === 'string' && !value.trim()) throw Error('Invalid report')
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) throw Error('Invalid report')
  return n
}
function safeError(error) {
  if (error?.status === 401) return 'Google authentication failed.'
  if (error?.status === 403) return 'Google reporting access is unavailable.'
  if (error?.status === 429) return 'Google reporting is temporarily rate-limited.'
  if (error?.name === 'AbortError' || error?.name === 'TimeoutError') return 'Google reporting timed out.'
  return 'Google reporting is temporarily unavailable.'
}
async function json(fetcher, url, options) {
  const response = await fetcher(url, options)
  if (!response.ok) throw Object.assign(Error('Google request failed'), { status: response.status })
  if (Number(response.headers?.get('content-length')) > LIMIT) throw Error('Oversized report')
  let text = ''
  if (response.body?.getReader) {
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let size = 0
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        size += value.byteLength
        if (size > LIMIT) { await reader.cancel(); throw Error('Oversized report') }
        text += decoder.decode(value, { stream: true })
      }
      text += decoder.decode()
    } finally { reader.releaseLock() }
  } else {
    text = await response.text()
    if (Buffer.byteLength(text) > LIMIT) throw Error('Oversized report')
  }
  return JSON.parse(text)
}
async function token(credentials, fetcher, signal, now) {
  const account = JSON.parse(credentials)
  if (account.type !== 'service_account' || typeof account.client_email !== 'string' || typeof account.private_key !== 'string') throw Error('Invalid credentials')
  const enc = (v) => Buffer.from(JSON.stringify(v)).toString('base64url')
  const issued = Math.floor(now / 1000)
  const input = `${enc({ alg: 'RS256', typ: 'JWT' })}.${enc({ iss: account.client_email, scope: 'https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/webmasters.readonly', aud: 'https://oauth2.googleapis.com/token', iat: issued, exp: issued + 3600 })}`
  const signature = createSign('RSA-SHA256').update(input).sign(account.private_key, 'base64url')
  const result = await json(fetcher, 'https://oauth2.googleapis.com/token', { method: 'POST', signal, headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${input}.${signature}` }).toString() })
  if (typeof result.access_token !== 'string' || !result.access_token) throw Error('Invalid token')
  return result.access_token
}
function gaRows(report, dimensions, metrics) {
  if (!report || !Array.isArray(report.metricHeaders) || report.metricHeaders.map((v) => v.name).join('|') !== metrics.join('|') || (report.dimensionHeaders ?? []).map((v) => v.name).join('|') !== dimensions.join('|')) throw Error('Invalid report headers')
  if (!report.metadata || typeof report.metadata !== 'object') throw Error('Missing report metadata')
  if (report.rows !== undefined && !Array.isArray(report.rows)) throw Error('Invalid report rows')
  if (report.rowCount !== undefined && metric(report.rowCount) > 0 && !(report.rows?.length > 0)) throw Error('Missing report rows')
  return (report.rows ?? []).map((row) => {
    if ((row.dimensionValues ?? []).length !== dimensions.length || !Array.isArray(row.metricValues) || row.metricValues.length !== metrics.length) throw Error('Invalid report row')
    return { dimensions: (row.dimensionValues ?? []).map((v) => { if (typeof v.value !== 'string') throw Error('Invalid dimension'); return v.value }), metrics: row.metricValues.map((v) => metric(v.value)) }
  })
}
async function ga4(post, now) {
  const endDate = shiftDate(calendarDate(now), -1)
  const startDate = shiftDate(endDate, -27)
  const host = { filter: { fieldName: 'hostName', inListFilter: { values: ['exquisitedentistryla.com', 'www.exquisitedentistryla.com'], caseSensitive: false } } }
  const definitions = [
    [[], ['activeUsers', 'sessions', 'screenPageViews', 'engagementRate']],
    [['sessionDefaultChannelGroup'], ['sessions']],
    [['pagePath'], ['screenPageViews']],
    [['eventName'], ['eventCount']],
    [['date'], ['sessions', 'screenPageViews']],
  ]
  const reports = definitions.map(([dimensions, metrics], i) => ({ dateRanges: [{ startDate, endDate }], dimensions: dimensions.map((name) => ({ name })), metrics: metrics.map((name) => ({ name })), dimensionFilter: i === 3 ? { andGroup: { expressions: [host, { filter: { fieldName: 'eventName', inListFilter: { values: ['schedule_click', 'contact_click', 'cta_click'], caseSensitive: true } } }] } } : host, limit: i === 4 ? '28' : '10', ...(i > 0 ? { orderBys: [{ metric: { metricName: metrics[0] }, desc: true }] } : {}) }))
  const result = await post(`https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY}:batchRunReports`, { requests: reports })
  if (!Array.isArray(result.reports) || result.reports.length !== 5) throw Error('Missing reports')
  const rows = result.reports.map((r, i) => gaRows(r, ...definitions[i]))
  if (rows[0].length > 1 || result.reports.some((r) => r.metadata.timeZone !== ZONE)) throw Error('Invalid report scope')
  const values = rows[0][0]?.metrics ?? [0, 0, 0, 0]
  if (values[3] > 1) throw Error('Invalid engagement rate')
  const dates = rows[4].filter((r) => r.metrics.some((n) => n > 0)).map((r) => {
    const raw = r.dimensions[0]
    if (!/^\d{8}$/.test(raw)) throw Error('Invalid date')
    const date = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6)}`
    if (date < startDate || date > endDate || shiftDate(date, 0) !== date) throw Error('Invalid date')
    return date
  }).sort()
  return { status: 'ok', detail: 'Measured website activity; recent data may still be processing.', propertyId: PROPERTY, window: { startDate, endDate, timeZone: ZONE }, latestDate: dates.at(-1) ?? null, totals: { users: values[0], sessions: values[1], pageViews: values[2], engagementRate: values[3] }, channels: rows[1].map((r) => ({ name: r.dimensions[0], sessions: r.metrics[0] })), pages: rows[2].map((r) => ({ path: r.dimensions[0], views: r.metrics[0] })), events: rows[3].map((r) => { if (!['schedule_click', 'contact_click', 'cta_click'].includes(r.dimensions[0])) throw Error('Invalid event'); return { name: r.dimensions[0], count: r.metrics[0] } }), quality: { thresholded: result.reports.some((r) => r.metadata.subjectToThresholding === true), sampled: result.reports.some((r) => (r.metadata.samplingMetadatas?.length ?? 0) > 0), otherRow: result.reports.some((r) => r.metadata.dataLossFromOtherRow === true) } }
}
function searchRows(result, keyCount) {
  if (!result || typeof result !== 'object' || !['byProperty', 'byPage'].includes(result.responseAggregationType)) throw Error('Invalid search report')
  if (result.rows !== undefined && !Array.isArray(result.rows)) throw Error('Invalid search rows')
  return (result.rows ?? []).map((r) => {
    if ((r.keys ?? []).length !== keyCount || (r.keys ?? []).some((k) => typeof k !== 'string')) throw Error('Invalid search dimensions')
    const parsed = { keys: r.keys ?? [], clicks: metric(r.clicks), impressions: metric(r.impressions), ctr: metric(r.ctr), position: metric(r.position) }
    if (parsed.ctr > 1 || parsed.clicks > parsed.impressions) throw Error('Invalid search metric')
    return parsed
  })
}
async function gsc(post, now) {
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/searchAnalytics/query`
  const yesterday = shiftDate(calendarDate(now), -1)
  const recentStart = shiftDate(yesterday, -34)
  const recent = searchRows(await post(url, { startDate: recentStart, endDate: yesterday, dimensions: ['date'], dataState: 'final', type: 'web', rowLimit: 35, aggregationType: 'byProperty' }), 1)
  const dates = recent.filter((r) => r.impressions > 0 || r.clicks > 0).map((r) => {
    const d = r.keys[0]
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || d < recentStart || d > yesterday || shiftDate(d, 0) !== d) throw Error('Invalid search date')
    return d
  }).sort()
  const endDate = dates.at(-1)
  if (!endDate) return { ...unavailable('No finalized search activity was returned in the recent reporting period.'), siteUrl: SITE, latestDate: null }
  const startDate = shiftDate(endDate, -27)
  const base = { startDate, endDate, dataState: 'final', type: 'web' }
  const [totalRows, queries, pages] = await Promise.all([
    post(url, { ...base, aggregationType: 'byProperty', rowLimit: 1 }).then((r) => searchRows(r, 0)),
    post(url, { ...base, dimensions: ['query'], aggregationType: 'byProperty', rowLimit: 10 }).then((r) => searchRows(r, 1)),
    post(url, { ...base, dimensions: ['page'], aggregationType: 'byPage', rowLimit: 10 }).then((r) => searchRows(r, 1)),
  ])
  if (totalRows.length !== 1) throw Error('Missing search totals')
  const { keys: _, ...totals } = totalRows[0]
  return { status: 'ok', detail: 'Finalized Google web-search data. Query tables omit anonymized queries and may not sum to totals.', siteUrl: SITE, window: { startDate, endDate, timeZone: ZONE }, latestDate: endDate, totals, queries: queries.map(({ keys, ...r }) => ({ query: keys[0], ...r })), pages: pages.map(({ keys, ...r }) => ({ page: keys[0], ...r })) }
}
export async function loadWebsite({ env = process.env, fetcher = fetch, now = Date.now() } = {}) {
  const base = { fetchedAt: new Date(now).toISOString() }
  if (!env.GOOGLE_ANALYTICS_SERVICE_ACCOUNT_JSON) return { ...base, ga4: unavailable('Google reporting is not configured.'), gsc: unavailable('Google reporting is not configured.') }
  const signal = AbortSignal.timeout(18000)
  let accessToken
  try { accessToken = await token(env.GOOGLE_ANALYTICS_SERVICE_ACCOUNT_JSON, fetcher, signal, now) } catch (error) { return { ...base, ga4: unavailable(safeError(error)), gsc: unavailable(safeError(error)) } }
  const post = (url, body) => json(fetcher, url, { method: 'POST', signal, headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const [analytics, search] = await Promise.all([ga4(post, now).catch((e) => unavailable(safeError(e))), gsc(post, now).catch((e) => unavailable(safeError(e)))])
  return { ...base, ga4: analytics, gsc: search }
}
