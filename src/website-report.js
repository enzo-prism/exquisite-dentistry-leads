// Validate optional website responses before their values reach render methods.
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const text = value => typeof value === 'string'
const number = value => typeof value === 'number' && Number.isFinite(value) && value >= 0
const rate = value => number(value) && value <= 1
const date = value => text(value) && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
const optional = (value, check) => value === undefined || check(value)
const rows = (value, check) => optional(value, items => Array.isArray(items) && items.every(item => object(item) && check(item)))
const window = value => object(value) && date(value.startDate) && date(value.endDate) && value.startDate <= value.endDate && text(value.timeZone) && value.timeZone.length > 0
const searchMetrics = value => object(value) && number(value.clicks) && number(value.impressions) && rate(value.ctr) && number(value.position)
const source = value => object(value) && ['ok', 'unavailable', 'synthetic'].includes(value.status) && text(value.detail) && optional(value.window, window) && optional(value.latestDate, item => item === null || date(item))
export function isWebsiteReport(value) {
  if (!object(value) || !text(value.fetchedAt) || !Number.isFinite(Date.parse(value.fetchedAt)) || !source(value.ga4) || !source(value.gsc)) return false
  const { ga4, gsc } = value
  const gaTotals = totals => object(totals) && ['users', 'sessions', 'pageViews'].every(key => number(totals[key])) && rate(totals.engagementRate)
  if (!optional(ga4.propertyId, text) || !optional(gsc.siteUrl, text) || !optional(ga4.totals, gaTotals) || !optional(gsc.totals, searchMetrics)) return false
  if (ga4.status !== 'unavailable' && (!gaTotals(ga4.totals) || !window(ga4.window))) return false
  if (gsc.status !== 'unavailable' && (!searchMetrics(gsc.totals) || !window(gsc.window))) return false
  return rows(ga4.channels, row => text(row.name) && number(row.sessions)) && rows(ga4.pages, row => text(row.path) && number(row.views)) && rows(ga4.events, row => text(row.name) && number(row.count)) && optional(ga4.quality, quality => object(quality) && ['thresholded', 'sampled', 'otherRow'].every(key => typeof quality[key] === 'boolean')) && rows(gsc.queries, row => text(row.query) && searchMetrics(row)) && rows(gsc.pages, row => text(row.page) && searchMetrics(row))
}
