// Explicit loopback synthetic mode only; no provider data is stored in this fixture.
export function syntheticWebsite(now = Date.now()) {
  const day = offset => new Date(now - offset * 86400000).toISOString().slice(0, 10)
  return {
    fetchedAt: new Date(now).toISOString(),
    ga4: { status: 'synthetic', detail: 'Synthetic GA4 data. No Google property was read.', propertyId: '498175984', window: { startDate: day(28), endDate: day(1), timeZone: 'America/Los_Angeles' }, latestDate: day(1), totals: { users: 248, sessions: 326, pageViews: 714, engagementRate: 0.64 }, channels: [{ name: 'Organic Search', sessions: 182 }, { name: 'Direct', sessions: 94 }, { name: 'Referral', sessions: 50 }], pages: [{ path: '/', views: 286 }, { path: '/veneers', views: 124 }], events: [{ name: 'schedule_click', count: 18 }, { name: 'contact_click', count: 9 }, { name: 'cta_click', count: 12 }], quality: { thresholded: false, sampled: false, otherRow: false } },
    gsc: { status: 'synthetic', detail: 'Synthetic Search Console data. No search property was read.', siteUrl: 'sc-domain:exquisitedentistryla.com', window: { startDate: day(30), endDate: day(3), timeZone: 'America/Los_Angeles' }, latestDate: day(3), totals: { clicks: 186, impressions: 12400, ctr: 0.015, position: 12.4 }, queries: [{ query: 'sample dental search', clicks: 42, impressions: 1800, ctr: 42/1800, position: 8.3 }], pages: [{ page: 'https://exquisitedentistryla.com/', clicks: 90, impressions: 4800, ctr: 90/4800, position: 9.2 }] },
  }
}
