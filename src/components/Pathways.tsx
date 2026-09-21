import { Badge, Card, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui'

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
  const ready = Boolean(report) && !loading
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
  ]
  return <section className="pathways" aria-label="Website pathways">
    <div className="source-overview-title"><span>Last {report?.windowDays ?? 90} days</span><strong>How people reach the practice</strong></div>
    <div className="pathway-grid">
      {cards.map(([label, value, detail]) => <Card key={label} className="pathway-stat"><span>{label}</span><strong>{value}</strong><small>{detail}</small></Card>)}
    </div>
    <Card className="leads-card pathway-card">
      <div className="table-heading"><div><h2>Cherry financing</h2><p>{cherryReady ? `${report?.cherry.rows.length} notices` : report?.sources.cherry.detail}</p></div><Badge>{cherryReady ? report?.sources.cherry.status === 'synthetic' ? 'Synthetic' : 'Mailbox' : 'Unavailable'}</Badge></div>
      {cherryReady && report?.cherry.rows.length ? <Table className="pathway-table">
        <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>Applicant</TableHead><TableHead>Amount</TableHead><TableHead>Plan</TableHead></TableRow></TableHeader>
        <TableBody>{report.cherry.rows.map((row) => <TableRow key={row.id}>
          <TableCell>{when(row.date)}</TableCell>
          <TableCell>{row.kind === 'approved' ? 'Approved' : 'Funded'}</TableCell>
          <TableCell>{row.applicant || 'Name not in notice'}</TableCell>
          <TableCell>{usd(row.amount)}</TableCell>
          <TableCell>{row.planId || '—'}</TableCell>
        </TableRow>)}</TableBody>
      </Table> : <p className="pathway-empty">{cherryReady ? 'No Cherry approval or funded-plan notices in this window.' : 'Cherry notices appear here when the mailbox connection is configured.'}</p>}
      <p className="pathway-footnote">Approved dollars are a financing limit. Funded dollars are the Cherry purchase amount. Neither figure is collected production, and unfinished applications are not emailed.</p>
    </Card>
    <Card className="leads-card pathway-card">
      <div className="table-heading"><div><h2>Website signals</h2><p>{analyticsReady ? report?.sources.analytics.detail : report?.sources.analytics.detail || 'Loading website signals…'}</p></div><Badge>{analyticsReady ? report?.sources.analytics.status === 'synthetic' ? 'Synthetic' : 'Vercel' : 'Unavailable'}</Badge></div>
      <Table className="pathway-table">
        <TableHeader><TableRow><TableHead>Pathway</TableHead><TableHead>Count</TableHead><TableHead>What it measures</TableHead><TableHead>Source</TableHead></TableRow></TableHeader>
        <TableBody>{signals.map(([label, value, detail, source]) => <TableRow key={String(label)}>
          <TableCell>{label}</TableCell>
          <TableCell>{label === 'Contact form' ? (formCount == null ? '—' : String(formCount)) : count(typeof value === 'number' ? value : undefined, analyticsReady)}</TableCell>
          <TableCell>{detail}</TableCell>
          <TableCell>{source}</TableCell>
        </TableRow>)}</TableBody>
      </Table>
      <p className="pathway-footnote">Widget-ready events ({analytics?.widgetReady ?? '—'}) mean the Cherry script loaded. They are not applications. GA4 generate_lead is not used here because older contact page views were counted as leads.</p>
    </Card>
  </section>
}
