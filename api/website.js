import { authenticated, config, reply } from '../server/auth.js'
import { loadWebsite } from '../server/google-website.js'
import { createReportCache } from '../server/report-cache.js'
import { syntheticWebsite } from '../server/website-fixture.js'

const loadCached = createReportCache(loadWebsite)
export default async function handler(req, res) {
  if (req.method !== 'GET') return reply(res, 405, { error: 'Method not allowed.' })
  const cfg = config()
  if (!cfg) return reply(res, 503, { error: 'Dashboard authentication is not configured.' })
  if (!authenticated(req, cfg)) return reply(res, 401, { error: 'Sign in to view website data.' })
  try {
    const report = process.env.PATHWAYS_MODE === 'synthetic' && process.env.NODE_ENV === 'development'
      ? syntheticWebsite() : await loadCached()
    return reply(res, 200, report)
  } catch { return reply(res, 502, { error: 'Website data could not be refreshed.' }) }
}
