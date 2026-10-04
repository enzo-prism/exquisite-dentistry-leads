import test from 'node:test'
import assert from 'node:assert/strict'
import { fetchVercelPathwayCounts } from '../server/vercel-analytics.js'

const env = { VERCEL_ANALYTICS_TOKEN: 'test', VERCEL_ANALYTICS_TEAM_ID: 'team', VERCEL_ANALYTICS_PROJECT_ID: 'project' }
const run = payload => fetchVercelPathwayCounts({ env, fetcher: async () => ({ ok: true, json: async () => payload }) })

test('missing or malformed analytics summaries cannot masquerade as zero counts', async () => {
  for (const payload of [null, {}, { error: { code: 'FAILED' }, summary: [] }, { summary: {} }, { summary: [null] }, { summary: [{ 'event_data/action': 'widget_clicked' }] }, { summary: [{ 'event_data/action': 'widget_clicked', vercel_analytics_event_count_sum: -1 }] }]) {
    await assert.rejects(run(payload), /invalid response/)
  }
})

test('valid empty analytics summaries return zero-row collections', async () => {
  const result = await run({ summary: [] })
  assert.deepEqual(result, { financing: [], scheduling: [], contactMethods: [], formSubmits: [], scheduleViews: [], window: null })
})

test('query keeps provider counts, UTC coverage and a shared bounded deadline', async () => {
  const requests = []
  const window = { startTime: '2026-07-06T00:00:00.000Z', endTime: '2026-10-05T00:00:00.000Z' }
  const result = await fetchVercelPathwayCounts({ env, now: Date.parse('2026-10-04T20:00:00Z'), fetcher: async (_url, init) => {
    const body = JSON.parse(init.body)
    requests.push({ body, signal: init.signal })
    const column = body.metric.includes('pageview') ? 'vercel_analytics_pageview_count_sum' : 'vercel_analytics_event_count_sum'
    return { ok: true, json: async () => ({ summary: [{ [body.groupBy[0]]: null, [column]: 3 }], query: window }) }
  } })
  assert.equal(requests.length, 5)
  assert.ok(requests.every(r => r.signal === requests[0].signal && r.body.limit === 250))
  assert.equal(requests[0].body.startTime, '2026-07-06T20:00:00.000Z')
  assert.equal(result.financing[0].vercel_analytics_event_count_sum, 3)
  assert.deepEqual(result.window, window)
})

test('access failures give actionable safe errors without reflecting provider payloads', async () => {
  for (const [status, expected] of [[401, /access was denied/], [403, /access was denied/], [429, /rate limited/], [500, /HTTP 500/]]) {
    await assert.rejects(fetchVercelPathwayCounts({ env, fetcher: async () => ({ ok: false, status }) }), expected)
  }
})

test('group saturation fails instead of reporting potentially truncated counts', async () => {
  await assert.rejects(fetchVercelPathwayCounts({ env, fetcher: async (_url, init) => {
    const body = JSON.parse(init.body)
    const column = body.metric.includes('pageview') ? 'vercel_analytics_pageview_count_sum' : 'vercel_analytics_event_count_sum'
    return { ok: true, json: async () => ({ summary: Array.from({ length: 250 }, (_, n) => ({ [body.groupBy[0]]: String(n), [column]: 1 })) }) }
  } }), /group limit/)
})
