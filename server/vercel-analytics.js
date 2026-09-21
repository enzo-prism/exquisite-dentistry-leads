const WINDOW_DAYS = 90
const metricColumn = { 'vercel.analytics_event.count': 'vercel_analytics_event_count_sum', 'vercel.analytics_pageview.count': 'vercel_analytics_pageview_count_sum' }

async function queryMetric({ token, teamId, projectId, metric, groupBy, filter, startTime, endTime, fetcher }) {
  const response = await fetcher(`https://api.vercel.com/v2/observability/query?teamId=${encodeURIComponent(teamId)}`, {
    method: 'POST',
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
      limit: 25,
      orderBy: metricColumn[metric],
      orderDirection: 'desc',
    }),
  })
  if (!response.ok) throw new Error('Website analytics could not be read.')
  const payload = await response.json()
  return payload.summary || []
}

export async function fetchVercelPathwayCounts({ env = process.env, fetcher = fetch, now = Date.now() } = {}) {
  const token = env.VERCEL_ANALYTICS_TOKEN
  const teamId = env.VERCEL_ANALYTICS_TEAM_ID
  const projectId = env.VERCEL_ANALYTICS_PROJECT_ID
  if (!token || !teamId || !projectId) throw new Error('Website analytics are not configured.')
  const endTime = new Date(now).toISOString()
  const startTime = new Date(now - WINDOW_DAYS * 86400000).toISOString()
  const shared = { token, teamId, projectId, startTime, endTime, fetcher }
  const [financing, scheduling, contactMethods, formSubmits, scheduleViews] = await Promise.all([
    queryMetric({ ...shared, metric: 'vercel.analytics_event.count', groupBy: ['event_data/action'], filter: "event_name eq 'Financing Engagement'" }),
    queryMetric({ ...shared, metric: 'vercel.analytics_event.count', groupBy: ['event_data/destination'], filter: "event_name eq 'Consultation Intent'" }),
    queryMetric({ ...shared, metric: 'vercel.analytics_event.count', groupBy: ['event_data/method'], filter: "event_name eq 'Contact Method Clicked'" }),
    queryMetric({ ...shared, metric: 'vercel.analytics_event.count', groupBy: ['event_name'], filter: "event_name eq 'Contact Form Submitted'" }),
    queryMetric({ ...shared, metric: 'vercel.analytics_pageview.count', groupBy: ['request_path'], filter: "contains(request_path,'schedule')" }),
  ])
  return { financing, scheduling, contactMethods, formSubmits, scheduleViews }
}
