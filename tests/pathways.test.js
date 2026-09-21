import test from 'node:test'
import assert from 'node:assert/strict'
import { parseCherryNotice, summarizeCherry } from '../server/cherry.js'
import { rollupAnalytics, loadPathways } from '../server/pathways.js'
import handler from '../api/pathways.js'

test('Cherry notices keep approvals and funded plans, and ignore marketing', () => {
  const approved = parseCherryNotice({
    id: 'a',
    date: '2026-09-15T12:00:00.000Z',
    subject: 'Avery has been approved for $10,000 at Exquisite Dentistry',
    body: 'Approved amount is for the practice login.',
  })
  const issued = parseCherryNotice({
    id: 'b',
    date: '2026-08-27T12:00:00.000Z',
    subject: 'LN-100 was successfully issued',
    body: 'Payment Plan ID: LN-100\nName: Avery Example\nPurchase Amount: $4,200.50\nExquisite Dentistry',
  })
  const promo = parseCherryNotice({ id: 'c', date: '2026-09-01', subject: 'Refer a practice and earn a bonus', body: 'Marketing' })
  assert.equal(promo, null)
  assert.deepEqual(approved, { id: 'a', date: '2026-09-15T12:00:00.000Z', kind: 'approved', applicant: 'Avery', amount: 10000, planId: '' })
  assert.equal(issued.kind, 'issued')
  assert.equal(issued.amount, 4200.5)
  assert.equal(issued.planId, 'LN-100')
  const summary = summarizeCherry([approved, issued])
  assert.equal(summary.approvedCount, 1)
  assert.equal(summary.approvedAmount, 10000)
  assert.equal(summary.issuedCount, 1)
  assert.equal(summary.issuedAmount, 4200.5)
  assert.equal(summary.rows[0].id, 'a')
})

test('analytics rollup counts real actions and ignores empty buckets', () => {
  const totals = rollupAnalytics({
    financing: [
      { 'event_data/action': 'widget_clicked', vercel_analytics_event_count_sum: 85 },
      { 'event_data/action': 'cta_clicked', vercel_analytics_event_count_sum: 2 },
      { 'event_data/action': 'widget_ready', vercel_analytics_event_count_sum: 599 },
      { 'event_data/action': null, vercel_analytics_event_count_sum: 2 },
    ],
    scheduling: [
      { 'event_data/destination': '/schedule-consultation', vercel_analytics_event_count_sum: 23 },
      { 'event_data/destination': null, vercel_analytics_event_count_sum: 23 },
    ],
    contactMethods: [{ 'event_data/method': 'phone', vercel_analytics_event_count_sum: 6 }],
    formSubmits: [{ event_name: 'Contact Form Submitted', vercel_analytics_event_count_sum: 9 }],
    scheduleViews: [{ path: '/schedule-consultation', vercel_analytics_pageview_count_sum: 38 }],
  })
  assert.deepEqual(totals, { widgetClicks: 85, applyClicks: 2, sectionViews: 0, widgetReady: 599, scheduleClicks: 23, phoneClicks: 6, trackedSubmits: 9, schedulePageViews: 38 })
})

test('pathway endpoint stays private and synthetic mode does not call providers', async () => {
  const denied = { headers: {}, setHeader(key, value) { this.headers[key] = value }, status(code) { this.code = code; return this }, json(body) { this.body = body; return this } }
  process.env.DASHBOARD_PASSWORD = 'synthetic-long-password'
  process.env.SESSION_SECRET = 'synthetic-local-session-secret-only-123456789'
  await handler({ method: 'GET', headers: {} }, denied)
  assert.equal(denied.code, 401)
  assert.equal(denied.body.cherry, undefined)
  const report = await loadPathways({ env: { PATHWAYS_MODE: 'synthetic' }, fetcher: async () => { throw new Error('provider called') } })
  assert.equal(report.sources.cherry.status, 'synthetic')
  assert.equal(report.cherry.approvedAmount, 10000)
  assert.equal(report.analytics.widgetClicks, 85)
})
