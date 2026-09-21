import { useMemo, useState } from 'react'
import { Badge, Card, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, ToggleGroup } from './ui'
import { filterCherry, filterSignals, sortCherry, sortSignals } from '../filters.js'

export type CherryRow = { id: string; date: string; kind: 'approved' | 'issued'; applicant: string; amount: number | null; planId: string }
export type PathwayReport = {
  windowDays: number
  fetchedAt: string
  sources: { cherry: { status: string; detail: string }; analytics: { status: string; detail: string } }
  cherry: { approvedCount: number; approvedAmount: number; issuedCount: number; issuedAmount: number; rows: CherryRow[] }
  analytics: { widgetClicks: number; applyClicks: number; sectionViews: number; widgetReady: number; scheduleClicks: number; phoneClicks: number; trackedSubmits: number; schedulePageViews: number }
}

const usd = (value: number | null) => value == null ? 'Amount unavailable' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: Number.isInteger(value) ? 0 : 2 }).format(value)
const count = (value: number | undefined, ready: boolean) => ready ? String(value ?? 0) : '—'
const when = (value: string) => {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return 'Date unavailable'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Los_Angeles' }).format(date)
}

export function Pathways({ report, formCount, loading }: { report: PathwayReport | null; formCount: number | null; loading: boolean }) {
  const [cherryStatus, setCherryStatus] = useState('all')
  const [cherryQuery, setCherryQuery] = useState('')
  const [cherrySort, setCherrySort] = useState('newest')
  const [signalSource, setSignalSource] = useState('all')
  const [signalSort, setSignalSort] = useState('count-desc')
  const analyticsReady = report?.sources.analytics.status === 'ok' || report?.sources.analytics.status === 'synthetic'
  const cherryReady = report?.sources.cherry.status === 'ok' || report?.sources.cherry.status === 'synthetic'
  const analytics = report?.analytics
  const cherryClicks = (analytics?.widgetClicks || 0) + (analytics?.applyClicks || 0)
  const cards = [
    ['Form inbox', formCount == null ? '—' : String(formCount), 'Formspree submissions in this window'],
    ['Cherry clicks', count(cherryClicks, analyticsReady), `${analytics?.widgetClicks ?? 0} widget · ${analytics?.applyClicks ?? 0} apply buttons`],
    ['Cherry approved', cherryReady ? `${report?.cherry.approvedCount} · ${usd(report?.cherry.approvedAmount ?? 0)}` : '—', 'Credit approved, not money received'],
    ['Cherry funded', cherryReady ? `${report?.cherry.issuedCount} · ${usd(report?.cherry.issuedAmount ?? 0)}` : '—', 'Financed purchase amount'],
    ['Schedule clicks', count(analytics?.scheduleClicks, analyticsReady), `${analytics?.schedulePageViews ?? 0} scheduler page views`],
    ['Phone clicks', count(analytics?.phoneClicks, analyticsReady), 'Click to call, not a connected call'],
  ]
  const signals = [
    ['Contact form', formCount, 'Stored Formspree inbox rows dated inside this window.', 'Formspree'],
    ['Tracked form submits', analytics?.trackedSubmits, 'Vercel event Contact Form Submitted. This follows analytics consent, so it can be lower than the inbox.', 'Vercel Analytics'],
    ['Cherry widget', analytics?.widgetClicks, 'Someone opened the floating Cherry estimator. widget_ready events are excluded.', 'Vercel Analytics'],
    ['Cherry apply button', analytics?.applyClicks, 'Someone used an on-site Cherry button. The application itself happens on pay.withcherry.com.', 'Vercel Analytics'],
    ['Online scheduling', analytics?.scheduleClicks, 'Clicks into /schedule-consultation. A finished Simplifeye booking is not visible here.', 'Vercel Analytics'],
    ['Scheduler page', analytics?.schedulePageViews, 'Page views whose path contains schedule, including people who arrived directly.', 'Vercel Analytics'],
    ['Phone', analytics?.phoneClicks, 'tel: clicks. Email and text clicks are omitted when the count is zero.', 'Vercel Analytics'],
  ].map(([label, value, detail, source]) => ({ label: String(label), count: typeof value === 'number' ? value : null, detail: String(detail), source: String(source) }))
  const cherryRows = useMemo(() => sortCherry(filterCherry(report?.cherry.rows || [], { status: cherryStatus, query: cherryQuery }), cherrySort), [report, cherryStatus, cherryQuery, cherrySort])
  const signalRows = useMemo(() => sortSignals(filterSignals(signals, signalSource), signalSort), [signals, signalSource, signalSort])
  return <section className="pathways" aria-label="Website pathways">
    <div className="source-overview-title"><span>Last {report?.windowDays ?? 90} days</span><strong>How people reach the practice</strong></div>
    <div className="pathway-grid">
      {cards.map(([label, value, detail]) => <Card key={label} className="pathway-stat"><span>{label}</span><strong>{value}</strong><small>{detail}</small></Card>)}
    </div>
    <Card className="leads-card pathway-card">
      <div className="table-heading"><div><h2>Cherry financing</h2><p>{cherryReady ? `${cherryRows.length} of ${report?.cherry.rows.length} notices` : report?.sources.cherry.detail}</p></div>
        <div className="filters">
          <label className="search-box"><span className="sr-only">Search Cherry notices</span><input className="input" value={cherryQuery} onChange={(event) => setCherryQuery(event.target.value)} placeholder="Search applicant or plan" /></label>
          <ToggleGroup label="Cherry status" value={cherryStatus} options={[{ id: 'all', label: 'All' }, { id: 'approved', label: 'Approved' }, { id: 'issued', label: 'Funded' }]} onChange={setCherryStatus} />
          <label className="select-wrap sort-wrap"><span className="sr-only">Sort Cherry notices</span><select value={cherrySort} onChange={(event) => setCherrySort(event.target.value)}><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="amount-desc">Amount high</option><option value="amount-asc">Amount low</option><option value="name">Name</option></select></label>
          <Badge>{cherryReady ? report?.sources.cherry.status === 'synthetic' ? 'Synthetic' : 'Mailbox' : 'Unavailable'}</Badge>
        </div>
      </div>
      {cherryReady && cherryRows.length ? <Table className="pathway-table">
        <TableHeader><TableRow>
          <TableHead><button type="button" className="sort-header" onClick={() => setCherrySort((value) => value === 'newest' ? 'oldest' : 'newest')}>Date</button></TableHead>
          <TableHead>Status</TableHead>
          <TableHead><button type="button" className="sort-header" onClick={() => setCherrySort('name')}>Applicant</button></TableHead>
          <TableHead><button type="button" className="sort-header" onClick={() => setCherrySort((value) => value === 'amount-desc' ? 'amount-asc' : 'amount-desc')}>Amount</button></TableHead>
          <TableHead>Plan</TableHead>
        </TableRow></TableHeader>
        <TableBody>{cherryRows.map((row) => <TableRow key={row.id}>
          <TableCell>{when(row.date)}</TableCell>
          <TableCell>{row.kind === 'approved' ? 'Approved' : 'Funded'}</TableCell>
          <TableCell>{row.applicant || 'Name not in notice'}</TableCell>
          <TableCell>{usd(row.amount)}</TableCell>
          <TableCell>{row.planId || '—'}</TableCell>
        </TableRow>)}</TableBody>
      </Table> : <p className="pathway-empty">{cherryReady ? (report?.cherry.rows.length ? 'No notices match these filters.' : 'No Cherry approval or funded-plan notices in this window.') : 'Cherry notices appear here when the mailbox connection is configured.'}</p>}
      <p className="pathway-footnote">Approved dollars are a financing limit. Funded dollars are the Cherry purchase amount. Neither figure is collected production, and unfinished applications are not emailed.</p>
    </Card>
    <Card className="leads-card pathway-card">
      <div className="table-heading"><div><h2>Website signals</h2><p>{analyticsReady ? report?.sources.analytics.detail : report?.sources.analytics.detail || 'Loading website signals…'}</p></div>
        <div className="filters">
          <ToggleGroup label="Signal source" value={signalSource} options={[{ id: 'all', label: 'All sources' }, { id: 'Formspree', label: 'Formspree' }, { id: 'Vercel Analytics', label: 'Vercel' }]} onChange={setSignalSource} />
          <label className="select-wrap sort-wrap"><span className="sr-only">Sort website signals</span><select value={signalSort} onChange={(event) => setSignalSort(event.target.value)}><option value="count-desc">Highest count</option><option value="count-asc">Lowest count</option><option value="name">Name</option></select></label>
          <Badge>{analyticsReady ? report?.sources.analytics.status === 'synthetic' ? 'Synthetic' : 'Vercel' : 'Unavailable'}</Badge>
        </div>
      </div>
      <Table className="pathway-table">
        <TableHeader><TableRow>
          <TableHead><button type="button" className="sort-header" onClick={() => setSignalSort('name')}>Pathway</button></TableHead>
          <TableHead><button type="button" className="sort-header" onClick={() => setSignalSort((value) => value === 'count-desc' ? 'count-asc' : 'count-desc')}>Count</button></TableHead>
          <TableHead>What it measures</TableHead><TableHead>Source</TableHead>
        </TableRow></TableHeader>
        <TableBody>{signalRows.map((row) => <TableRow key={row.label}>
          <TableCell>{row.label}</TableCell>
          <TableCell>{row.label === 'Contact form' ? (formCount == null ? '—' : String(formCount)) : count(row.count ?? undefined, analyticsReady)}</TableCell>
          <TableCell>{row.detail}</TableCell>
          <TableCell>{row.source}</TableCell>
        </TableRow>)}</TableBody>
      </Table>
      <p className="pathway-footnote">Widget-ready events ({analytics?.widgetReady ?? '—'}) mean the Cherry script loaded. They are not applications. GA4 generate_lead is not used here because older contact page views were counted as leads.</p>
    </Card>
  </section>
}
