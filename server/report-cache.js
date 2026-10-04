import { createHash } from 'node:crypto'

// Only aggregate website reports live here, never submissions or mailbox records.
// Per-instance coalescing limits provider requests; HTTP responses remain private/no-store.
export function createReportCache(loader, clock = Date.now) {
  let cached = null
  let pending = null
  return async (env = process.env) => {
    const key = createHash('sha256').update(JSON.stringify([env.GOOGLE_ANALYTICS_SERVICE_ACCOUNT_JSON || '', env.PATHWAYS_MODE || '', env.GA4_PROPERTY_ID || '', env.GSC_SITE_URL || ''])).digest('hex')
    if (cached?.key === key && clock() < cached.until) return cached.report
    if (pending?.key === key) return pending.promise
    const promise = loader({ env }).then(report => {
      const healthy = [report.ga4, report.gsc].every(source => source?.status === 'ok' || source?.status === 'synthetic')
      cached = { key, report, until: clock() + (healthy ? 15 * 60_000 : 60_000) }
      return report
    }).finally(() => { if (pending?.promise === promise) pending = null })
    pending = { key, promise }
    return promise
  }
}
