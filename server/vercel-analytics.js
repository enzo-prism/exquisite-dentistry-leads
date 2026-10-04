const WINDOW_DAYS = 90
const GROUP_LIMIT = 250
const metricColumn = { 'vercel.analytics_event.count': 'vercel_analytics_event_count_sum', 'vercel.analytics_pageview.count': 'vercel_analytics_pageview_count_sum' }

async function queryMetric({ token, teamId, projectId, metric, groupBy, filter, startTime, endTime, fetcher, signal }) {
  const response = await fetcher(`https://api.vercel.com/v2/observability/query?teamId=${encodeURIComponent(teamId)}`, {
    method: 'POST',
    signal,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scope: { type: 'project', ownerId: teamId, projectIds: [projectId] },
      metric,
      aggregation: 'sum',
      startTime,
      endTime,
      granularity: { days: 1 },
      groupBy,
      filter,
      limit: GROUP_LIMIT,
      orderBy: metricColumn[metric],
      orderDirection: 'desc',
    }),
  })
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new Error('Website analytics access was denied. Check the configured token and project access.')
    if (response.status === 429) throw new Error('Website analytics are temporarily rate limited. Try refreshing again later.')
    throw new Error(`Website analytics could not be read (HTTP ${response.status}).`)
  }
  const payload = await response.json()
  const rows = payload?.summary
  const column = metricColumn[metric]
  if (payload?.error || !Array.isArray(rows) || rows.some(row => !row || typeof row !== 'object' ||
    typeof row[column] !== 'number' || !Number.isFinite(row[column]) || row[column] < 0 ||
    groupBy.some(key => !Object.hasOwn(row, key)))) {
    throw new Error('Website analytics returned an invalid response. Counts are unavailable.')
  }
  // This API truncates groups rather than returning pagination. Do not report a
  // possibly partial aggregate as a complete count when the query hits its cap.
  if (rows.length >= GROUP_LIMIT) throw new Error('Website analytics reached its group limit. Counts may be incomplete.')
  return { rows, window: payload.query?.startTime && payload.query?.endTime
    ? { startTime: payload.query.startTime, endTime: payload.query.endTime } : null }
}

export async function fetchVercelPathwayCounts({ env = process.env, fetcher = fetch, now = Date.now() } = {}) {
  const token = env.VERCEL_ANALYTICS_TOKEN
  const teamId = env.VERCEL_ANALYTICS_TEAM_ID
  const projectId = env.VERCEL_ANALYTICS_PROJECT_ID
  if (!token || !teamId || !projectId) throw new Error('Website analytics are not configured.')
  const endTime = new Date(now).toISOString()
  const startTime = new Date(now - WINDOW_DAYS * 86400000).toISOString()
  const shared = { token, teamId, projectId, startTime, endTime, fetcher, signal: AbortSignal.timeout(15000) }
  const [financing, scheduling, contactMethods, formSubmits, scheduleViews] = await Promise.all([
    queryMetric({ ...shared, metric: 'vercel.analytics_event.count', groupBy: ['event_data/action'], filter: "event_name eq 'Financing Engagement'" }),
    queryMetric({ ...shared, metric: 'vercel.analytics_event.count', groupBy: ['event_data/destination'], filter: "event_name eq 'Consultation Intent'" }),
    queryMetric({ ...shared, metric: 'vercel.analytics_event.count', groupBy: ['event_data/method'], filter: "event_name eq 'Contact Method Clicked'" }),
    queryMetric({ ...shared, metric: 'vercel.analytics_event.count', groupBy: ['event_name'], filter: "event_name eq 'Contact Form Submitted'" }),
    queryMetric({ ...shared, metric: 'vercel.analytics_pageview.count', groupBy: ['request_path'], filter: "contains(request_path,'schedule')" }),
  ])
  return {
    financing: financing.rows, scheduling: scheduling.rows, contactMethods: contactMethods.rows,
    formSubmits: formSubmits.rows, scheduleViews: scheduleViews.rows,
    // Vercel rounds a daily query outward to UTC day boundaries.
    window: financing.window,
  }
}
