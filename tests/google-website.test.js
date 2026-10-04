import test from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync } from 'node:crypto'
import { calendarDate, shiftDate, loadWebsite } from '../server/google-website.js'
const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const env = { GOOGLE_ANALYTICS_SERVICE_ACCOUNT_JSON: JSON.stringify({ type: 'service_account', client_email: 'test@example.invalid', private_key: privateKey.export({ format: 'pem', type: 'pkcs8' }) }) }
const now = Date.parse('2026-10-04T20:00:00Z')
const searchRow = (keys, clicks = 10) => ({ keys, clicks, impressions: 100, ctr: clicks / 100, position: 2.5 })
function mock({ failGa, failSearch, mutateGa, mutateSearch } = {}) {
  const calls = []
  const fetcher = async (url, options) => {
    if (url.includes('oauth2')) return Response.json({ access_token: 'secret-token' })
    const body = JSON.parse(options.body)
    calls.push({ url, body, options })
    if (url.includes('analyticsdata')) {
      if (failGa) return new Response('secret-provider-body', { status: failGa })
      const reports = body.requests.map((r, i) => ({ metadata: { timeZone: 'America/Los_Angeles' }, dimensionHeaders: r.dimensions, metricHeaders: r.metrics, rows: [{ dimensionValues: r.dimensions.map(() => ({ value: ['unused', 'Organic Search', '/', 'schedule_click', '20261002'][i] })), metricValues: (i === 0 ? ['80', '90', '100', '0.7'] : i === 4 ? ['2', '3'] : ['4']).map((value) => ({ value })) }] }))
      mutateGa?.(reports)
      return Response.json({ reports })
    }
    if (failSearch) return new Response('secret-provider-body', { status: failSearch })
    let result = { responseAggregationType: body.aggregationType, rows: [searchRow(body.dimensions?.[0] === 'date' ? ['2026-10-01'] : body.dimensions?.[0] === 'query' ? ['dentist'] : body.dimensions?.[0] === 'page' ? ['https://exquisitedentistryla.com/'] : [], body.dimensions ? 10 : 50)] }
    mutateSearch?.(result, body)
    return Response.json(result)
  }
  return { fetcher, calls }
}
test('calendar dates handle Pacific midnight and DST without shortening calendar windows', () => {
  assert.equal(calendarDate(Date.parse('2026-03-08T07:59:00Z')), '2026-03-07')
  assert.equal(calendarDate(Date.parse('2026-03-08T08:01:00Z')), '2026-03-08')
  assert.equal(shiftDate('2026-03-09', -1), '2026-03-08')
  assert.equal(shiftDate('2026-11-02', -27), '2026-10-06')
})
test('unconfigured returns unavailable without fetch or fabricated totals', async () => {
  const result = await loadWebsite({ env: {}, now, fetcher: () => { throw Error('unexpected') } })
  assert.equal(result.ga4.status, 'unavailable')
  assert.equal(result.gsc.totals, undefined)
})
test('reports preserve authoritative totals and scoped complete-day windows', async () => {
  const { fetcher, calls } = mock()
  const r = await loadWebsite({ env, fetcher, now })
  assert.equal(r.ga4.status, 'ok')
  assert.equal(r.gsc.status, 'ok')
  assert.equal(r.ga4.totals.users, 80)
  assert.equal(calls.find((c) => c.url.includes('analyticsdata')).body.requests[0].metrics[0].name, 'activeUsers')
  assert.equal(r.ga4.channels[0].sessions, 4)
  assert.equal(r.gsc.totals.clicks, 50)
  assert.equal(r.gsc.queries[0].clicks, 10)
  assert.equal(r.ga4.latestDate, '2026-10-02')
  assert.deepEqual(r.ga4.window, { startDate: '2026-09-06', endDate: '2026-10-03', timeZone: 'America/Los_Angeles' })
  assert.equal(r.gsc.window.endDate, '2026-10-01')
  assert.equal(r.gsc.window.startDate, '2026-09-04')
  const batch = calls.find((c) => c.url.includes('analyticsdata')).body.requests
  for (const report of batch) {
    const filters = report.dimensionFilter.andGroup?.expressions ?? [report.dimensionFilter]
    assert.deepEqual(filters[0].filter.inListFilter.values, ['exquisitedentistryla.com', 'www.exquisitedentistryla.com'])
  }
  assert.deepEqual(batch[3].dimensionFilter.andGroup.expressions[1].filter.inListFilter.values, ['schedule_click', 'contact_click', 'cta_click'])
  const search = calls.filter((c) => c.url.includes('webmasters'))
  assert.equal(search.length, 4)
  assert.ok(search.every((c) => c.body.dataState === 'final' && c.url.includes(encodeURIComponent('sc-domain:exquisitedentistryla.com'))))
  assert.equal(search[0].body.dimensions[0], 'date')
  assert.equal(search[2].body.rowLimit, 10)
})
test('source failures are isolated and provider body never leaks', async () => {
  for (const status of [401, 403, 429, 500]) {
    const { fetcher } = mock({ failGa: status })
    const r = await loadWebsite({ env, fetcher, now })
    assert.equal(r.ga4.status, 'unavailable')
    assert.equal(r.gsc.status, 'ok')
    assert.ok(!JSON.stringify(r).includes('secret'))
  }
  const { fetcher } = mock({ failSearch: 403 })
  const r = await loadWebsite({ env, fetcher, now })
  assert.equal(r.ga4.status, 'ok')
  assert.equal(r.gsc.status, 'unavailable')
})
test('invalid GA metrics or headers cannot masquerade as zero', async () => {
  for (const mutateGa of [
    (r) => { r[0].metricHeaders = [] },
    (r) => { r[0].rows[0].metricValues[0].value = '-1' },
    (r) => { r[0].rows[0].metricValues[0].value = 'Infinity' },
    (r) => { delete r[0].metadata },
    (r) => { delete r[0].rows; r[0].rowCount = 1 },
  ]) {
    const r = await loadWebsite({ env, now, ...mock({ mutateGa }) })
    assert.equal(r.ga4.status, 'unavailable')
    assert.equal(r.ga4.totals, undefined)
    assert.equal(r.gsc.status, 'ok')
  }
})
test('valid empty GA report is zero; empty finalized search has no fabricated freshness', async () => {
  const r = await loadWebsite({ env, now, ...mock({ mutateGa: (reports) => reports.forEach((r) => { delete r.rows }), mutateSearch: (r) => { delete r.rows } }) })
  assert.equal(r.ga4.totals.users, 0)
  assert.equal(r.ga4.latestDate, null)
  assert.equal(r.gsc.latestDate, null)
  assert.equal(r.gsc.totals, undefined)
})
test('invalid search metrics fail only search', async () => {
  const r = await loadWebsite({ env, now, ...mock({ mutateSearch: (r) => { r.rows[0].clicks = -1 } }) })
  assert.equal(r.ga4.status, 'ok')
  assert.equal(r.gsc.status, 'unavailable')
})
test('authentication failures do not leak credential content', async () => {
  const r = await loadWebsite({ env: { GOOGLE_ANALYTICS_SERVICE_ACCOUNT_JSON: 'private-secret-invalid-json' }, now, fetcher: () => { throw Error('unexpected fetch') } })
  assert.equal(r.ga4.status, 'unavailable')
  assert.equal(r.gsc.status, 'unavailable')
  assert.ok(!JSON.stringify(r).includes('private-secret'))
})
test('oversized response is rejected without leaking payload', async () => {
  const { fetcher } = mock()
  const r = await loadWebsite({ env, now, fetcher: (url, options) => url.includes('analyticsdata') ? Promise.resolve(new Response('x'.repeat(1024 * 1024 + 1))) : fetcher(url, options) })
  assert.equal(r.ga4.status, 'unavailable')
  assert.equal(r.gsc.status, 'ok')
})
test('quality caveats aggregate across all GA reports', async () => {
  const r = await loadWebsite({ env, now, ...mock({ mutateGa: (reports) => {
    reports[1].metadata.subjectToThresholding = true
    reports[2].metadata.dataLossFromOtherRow = true
    reports[3].metadata.samplingMetadatas = [{ samplesReadCount: '1', samplingSpaceSize: '10' }]
  } }) })
  assert.deepEqual(r.ga4.quality, { thresholded: true, sampled: true, otherRow: true })
})
