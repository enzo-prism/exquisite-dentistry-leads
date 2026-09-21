import { parseCherryNotice, summarizeCherry } from './cherry.js'
import { fetchCherryNotices } from './gmail-cherry.js'
import { fetchVercelPathwayCounts } from './vercel-analytics.js'

export const PATHWAY_WINDOW_DAYS = 90

const countOf = (rows, key, value) => rows
  .filter((row) => row[key] === value)
  .reduce((total, row) => total + Number(row.vercel_analytics_event_count_sum || row.vercel_analytics_pageview_count_sum || 0), 0)

export function rollupAnalytics({ financing = [], scheduling = [], contactMethods = [], formSubmits = [], scheduleViews = [] }) {
  const widgetClicks = countOf(financing, 'event_data/action', 'widget_clicked')
  const applyClicks = countOf(financing, 'event_data/action', 'cta_clicked')
  const sectionViews = countOf(financing, 'event_data/action', 'section_viewed')
  const widgetReady = countOf(financing, 'event_data/action', 'widget_ready')
  const scheduleClicks = countOf(scheduling, 'event_data/destination', '/schedule-consultation')
  const phoneClicks = countOf(contactMethods, 'event_data/method', 'phone')
  const trackedSubmits = formSubmits.reduce((total, row) => total + Number(row.vercel_analytics_event_count_sum || 0), 0)
  const schedulePageViews = scheduleViews.reduce((total, row) => total + Number(row.vercel_analytics_pageview_count_sum || 0), 0)
  return { widgetClicks, applyClicks, sectionViews, widgetReady, scheduleClicks, phoneClicks, trackedSubmits, schedulePageViews }
}

export function syntheticPathways(now = new Date().toISOString()) {
  return {
    windowDays: PATHWAY_WINDOW_DAYS,
    fetchedAt: now,
    sources: {
      cherry: { status: 'synthetic', detail: 'Synthetic Cherry notices. No mailbox was read.' },
      analytics: { status: 'synthetic', detail: 'Synthetic website events. No analytics account was read.' },
    },
    cherry: summarizeCherry([
      { id: 'synthetic-approved', date: now, kind: 'approved', applicant: 'Synthetic Applicant', amount: 10000, planId: '' },
      { id: 'synthetic-issued', date: now, kind: 'issued', applicant: 'Synthetic Applicant', amount: 4200, planId: 'SYNTH-1' },
    ]),
    analytics: { widgetClicks: 85, applyClicks: 2, sectionViews: 94, widgetReady: 599, scheduleClicks: 23, phoneClicks: 6, trackedSubmits: 9, schedulePageViews: 38 },
  }
}

export async function loadPathways({ env = process.env, fetcher = fetch, now = Date.now() } = {}) {
  if (env.PATHWAYS_MODE === 'synthetic') return syntheticPathways(new Date(now).toISOString())
  const report = {
    windowDays: PATHWAY_WINDOW_DAYS,
    fetchedAt: new Date(now).toISOString(),
    sources: {
      cherry: { status: 'unavailable', detail: 'Cherry mailbox is not configured.' },
      analytics: { status: 'unavailable', detail: 'Website analytics are not configured.' },
    },
    cherry: summarizeCherry([]),
    analytics: rollupAnalytics({}),
  }
  try {
    const notices = (await fetchCherryNotices({ env, fetcher, now })).map(parseCherryNotice).filter(Boolean)
    report.cherry = summarizeCherry(notices)
    report.sources.cherry = { status: 'ok', detail: 'Approval and funded-plan notices from withcherry.com.' }
  } catch (error) {
    report.sources.cherry = { status: 'unavailable', detail: error instanceof Error ? error.message : 'Cherry mailbox could not be read.' }
  }
  try {
    report.analytics = rollupAnalytics(await fetchVercelPathwayCounts({ env, fetcher, now }))
    report.sources.analytics = { status: 'ok', detail: 'Vercel Web Analytics on exquisitedentistryla.com, after analytics consent.' }
  } catch (error) {
    report.sources.analytics = { status: 'unavailable', detail: error instanceof Error ? error.message : 'Website analytics could not be read.' }
  }
  return report
}
