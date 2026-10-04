import test from 'node:test'
import assert from 'node:assert/strict'
import { createReportCache } from '../server/report-cache.js'

test('aggregate cache coalesces requests, expires, and keys credential changes', async () => {
  let now = 0, calls = 0
  const load = createReportCache(async () => { calls++; return { ga4: { status: 'ok' }, gsc: { status: 'ok' }, fetchedAt: String(now) } }, () => now)
  await Promise.all([load({}), load({}), load({})]); assert.equal(calls, 1)
  now = 899999; await load({}); assert.equal(calls, 1)
  now = 900000; await load({}); assert.equal(calls, 2)
  await load({ GOOGLE_ANALYTICS_SERVICE_ACCOUNT_JSON: 'changed' }); assert.equal(calls, 3)
})
test('source failures retry after one minute and rejected loads never poison cache', async () => {
  let now = 0, calls = 0
  const load = createReportCache(async () => { calls++; if (calls === 1) throw Error('transient'); return { ga4: { status: 'unavailable' }, gsc: { status: 'ok' } } }, () => now)
  await assert.rejects(load({})); await load({}); assert.equal(calls, 2)
  now = 59999; await load({}); assert.equal(calls, 2)
  now = 60000; await load({}); assert.equal(calls, 3)
})
