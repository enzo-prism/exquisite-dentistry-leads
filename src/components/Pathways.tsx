import { useMemo, useState } from 'react'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group'
import { NativeSelect, NativeSelectOption } from './ui/native-select'
import { Input } from './ui/input'
import { Field, FieldGroup, FieldLabel } from './ui/field'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from './ui/empty'
import { Skeleton } from './ui/skeleton'
import { filterCherry, filterSignals, sortCherry, sortSignals } from '../filters.js'

export type CherryRow = { id: string; date: string; kind: 'approved' | 'issued'; applicant: string; amount: number | null; planId: string }
export type PathwayReport = {
  windowDays: number
  fetchedAt: string
  analyticsWindow?: { startTime: string; endTime: string } | null
  sources: { cherry: { status: string; detail: string }; analytics: { status: string; detail: string } }
  cherry: { approvedCount: number; approvedAmount: number; approvedAmountMissingCount?: number; issuedCount: number; issuedAmount: number; issuedAmountMissingCount?: number; rows: CherryRow[] }
  analytics: { widgetClicks: number; applyClicks: number; sectionViews: number; widgetReady: number; scheduleClicks: number; phoneClicks: number; trackedSubmits: number; schedulePageViews: number }
}

const usd = (value: number | null) => value == null ? 'Amount unavailable' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: Number.isInteger(value) ? 0 : 2 }).format(value)
const count = (value: number | undefined, ready: boolean) => ready ? String(value ?? 0) : '—'
const when = (value: string) => {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return 'Date unavailable'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Los_Angeles' }).format(date)
}

export function Pathways({ report, formCount, loading, view = 'overview' }: { report: PathwayReport | null; formCount: number | null; loading: boolean; view?: 'overview' | 'financing' | 'activity' }) {
  const [cherryStatus, setCherryStatus] = useState('all')
  const [cherryQuery, setCherryQuery] = useState('')
  const [cherrySort, setCherrySort] = useState('newest')
  const [signalSource, setSignalSource] = useState('all')
  const [signalSort, setSignalSort] = useState('count-desc')
  const analyticsReady = report?.sources.analytics.status === 'ok' || report?.sources.analytics.status === 'synthetic'
  const cherryReady = report?.sources.cherry.status === 'ok' || report?.sources.cherry.status === 'synthetic'
  const analytics = report?.analytics
  const approvedMissing = report?.cherry.approvedAmountMissingCount ?? 0
  const issuedMissing = report?.cherry.issuedAmountMissingCount ?? 0
  const unavailable = loading ? 'Checking website pathways…' : 'Website pathways could not be refreshed. Please retry.'
  const checkedDate = report?.fetchedAt ? new Date(report.fetchedAt) : null
  const checkedAt = checkedDate && Number.isFinite(checkedDate.getTime()) ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles', timeZoneName: 'short' }).format(checkedDate) : null
  const windowStart = Date.parse(report?.analyticsWindow?.startTime || '')
  const windowEnd = Date.parse(report?.analyticsWindow?.endTime || '')
  const utcDate = (value: number) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(value)
  const analyticsWindow = analyticsReady && Number.isFinite(windowStart) && Number.isFinite(windowEnd) && windowEnd > windowStart
    ? `Website analytics use UTC calendar days, ${utcDate(windowStart)} through ${utcDate(windowEnd - 1)}, with the current day incomplete. Inbox and financing use the rolling ${report?.windowDays ?? 90}-day window.` : null
  const cherryClicks = (analytics?.widgetClicks || 0) + (analytics?.applyClicks || 0)
  const cards = [
    ['Form inbox', formCount == null ? '—' : String(formCount), 'Formspree submissions in this window'],
    ['Cherry clicks', count(cherryClicks, analyticsReady), `${count(analytics?.widgetClicks, analyticsReady)} widget · ${count(analytics?.applyClicks, analyticsReady)} apply buttons`],
    ['Cherry approved', cherryReady ? `${report?.cherry.approvedCount} · ${usd(report?.cherry.approvedAmount ?? 0)}` : '—', approvedMissing > 0 ? 'Known subtotal of approved credit' : 'Credit approved, not money received'],
    ['Cherry funded', cherryReady ? `${report?.cherry.issuedCount} · ${usd(report?.cherry.issuedAmount ?? 0)}` : '—', issuedMissing > 0 ? 'Known subtotal of financed purchases' : 'Financed purchase amount'],
    ['Schedule clicks', count(analytics?.scheduleClicks, analyticsReady), `${count(analytics?.schedulePageViews, analyticsReady)} scheduler page views`],
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
  const metric = (label: string, value: string, detail: string) => <Card key={label} size="sm">
    <CardHeader><CardDescription>{label}</CardDescription></CardHeader>
    <CardContent>{loading && !report && label !== 'Form inbox' ? <Skeleton className="h-9 w-28" /> : <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>}</CardContent>
    <CardFooter><p className="text-xs leading-relaxed text-muted-foreground">{detail}</p></CardFooter>
  </Card>
  const status = (ready: boolean, source?: { status: string }) => source?.status === 'synthetic' ? 'Synthetic' : ready ? 'Connected' : loading ? 'Checking' : 'Unavailable'
  return <section className="flex min-w-0 flex-col gap-5" aria-label={view === 'financing' ? 'Cherry financing' : view === 'activity' ? 'Website activity' : 'Website pathways'}>
    {!report && !loading && <Alert variant="destructive"><AlertTitle>Pathways unavailable</AlertTitle><AlertDescription>Website pathways could not be refreshed. Use Refresh to try again.</AlertDescription></Alert>}
    {view === 'overview' && <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{cards.map(([label, value, detail]) => metric(label, value, detail))}</div>
      <Card>
        <CardHeader><CardTitle>Source health</CardTitle><CardDescription>Each source measures a different step in a patient’s journey.</CardDescription></CardHeader>
        <CardContent className="grid gap-5 lg:grid-cols-3">
          {[{ name: 'Formspree inbox', state: formCount == null ? loading ? 'Checking' : 'Unavailable' : 'Available', detail: formCount == null ? 'Inbox count could not be loaded.' : `${formCount} stored submissions, including any tests. These are inquiries, not confirmed appointments.` },
            { name: 'Cherry mailbox', state: status(cherryReady, report?.sources.cherry), detail: cherryReady ? `${report?.cherry.rows.length ?? 0} approval and funded-plan notices. Applications without a notice are not visible.` : report?.sources.cherry.detail || unavailable },
            { name: 'Website analytics', state: status(analyticsReady, report?.sources.analytics), detail: analyticsReady ? 'Consent-based clicks and events. A click does not confirm a call, application, or booking.' : report?.sources.analytics.detail || unavailable }].map(source => <div key={source.name} className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium">{source.name}</p><Badge variant="outline">{source.state}</Badge></div>
              <p className="text-xs leading-relaxed text-muted-foreground">{source.detail}</p>
            </div>)}
        </CardContent>
      </Card>
    </>}
    {view === 'financing' && <>
      <div className="grid gap-4 sm:grid-cols-2">
        {metric('Approved credit', cherryReady ? usd(report?.cherry.approvedAmount ?? 0) : '—', `${count(report?.cherry.approvedCount, cherryReady)} approval notices · ${approvedMissing ? 'known subtotal; some amounts unavailable' : 'available credit, not money received'}`)}
        {metric('Funded purchases', cherryReady ? usd(report?.cherry.issuedAmount ?? 0) : '—', `${count(report?.cherry.issuedCount, cherryReady)} funded-plan notices · ${issuedMissing ? 'known subtotal; some amounts unavailable' : 'financed purchase amount'}`)}
      </div>
      <Card>
        <CardHeader><CardTitle>Financing notices</CardTitle><CardDescription>{cherryReady ? `${cherryRows.length} of ${report?.cherry.rows.length} notices in the last ${report?.windowDays ?? 90} days` : report?.sources.cherry.detail || unavailable}</CardDescription></CardHeader>
        <CardContent className="flex flex-col gap-5">
          <FieldGroup className="flex flex-col gap-3 xl:flex-row xl:items-end">
            <Field className="xl:max-w-xs"><FieldLabel htmlFor="cherry-search">Search notices</FieldLabel><Input id="cherry-search" value={cherryQuery} onChange={event => setCherryQuery(event.target.value)} placeholder="Applicant or plan" /></Field>
            <Field className="w-auto"><FieldLabel>Status</FieldLabel><ToggleGroup aria-label="Cherry status" variant="outline" value={[cherryStatus]} onValueChange={values => { if (values[0]) setCherryStatus(values[0]) }}>
              <ToggleGroupItem value="all">All</ToggleGroupItem><ToggleGroupItem value="approved">Approved</ToggleGroupItem><ToggleGroupItem value="issued">Funded</ToggleGroupItem>
            </ToggleGroup></Field>
            <Field className="w-auto"><FieldLabel htmlFor="cherry-sort">Sort by</FieldLabel><NativeSelect id="cherry-sort" value={cherrySort} onChange={event => setCherrySort(event.target.value)}><NativeSelectOption value="newest">Newest</NativeSelectOption><NativeSelectOption value="oldest">Oldest</NativeSelectOption><NativeSelectOption value="amount-desc">Amount high</NativeSelectOption><NativeSelectOption value="amount-asc">Amount low</NativeSelectOption><NativeSelectOption value="name">Name</NativeSelectOption></NativeSelect></Field>
          </FieldGroup>
          {loading && !report ? <Skeleton className="h-44 w-full" /> : cherryReady && cherryRows.length ? <Table>
            <TableHeader><TableRow>
              <TableHead><Button variant="ghost" size="sm" onClick={() => setCherrySort(value => value === 'newest' ? 'oldest' : 'newest')}>Date</Button></TableHead><TableHead>Status</TableHead>
              <TableHead><Button variant="ghost" size="sm" onClick={() => setCherrySort('name')}>Applicant</Button></TableHead>
              <TableHead className="text-right"><Button variant="ghost" size="sm" onClick={() => setCherrySort(value => value === 'amount-desc' ? 'amount-asc' : 'amount-desc')}>Amount</Button></TableHead><TableHead>Plan</TableHead>
            </TableRow></TableHeader>
            <TableBody>{cherryRows.map(row => <TableRow key={row.id}><TableCell>{when(row.date)}</TableCell><TableCell><Badge variant={row.kind === 'issued' ? 'secondary' : 'outline'}>{row.kind === 'approved' ? 'Approved' : 'Funded'}</Badge></TableCell><TableCell>{row.applicant || 'Name not in notice'}</TableCell><TableCell className="text-right tabular-nums">{usd(row.amount)}</TableCell><TableCell>{row.planId || '—'}</TableCell></TableRow>)}</TableBody>
          </Table> : <Empty><EmptyHeader><EmptyTitle>{cherryReady ? 'No financing notices' : 'Financing unavailable'}</EmptyTitle><EmptyDescription>{cherryReady ? report?.cherry.rows.length ? 'No notices match these filters. Try another name or status.' : 'No Cherry approval or funded-plan notices in this window.' : 'Cherry notices appear here when the mailbox connection is available.'}</EmptyDescription></EmptyHeader></Empty>}
        </CardContent>
        <CardFooter><p className="text-xs leading-relaxed text-muted-foreground">Approved dollars are a financing limit. Funded dollars are the Cherry purchase amount. Neither figure is collected production, and unfinished applications are not emailed.{cherryReady && (approvedMissing > 0 || issuedMissing > 0) ? ` Amounts are known subtotals: ${approvedMissing} approval notices and ${issuedMissing} funded-plan notices have unavailable amounts.` : ''}</p></CardFooter>
      </Card>
    </>}
    {view === 'activity' && <>
      <div className="grid gap-4 sm:grid-cols-3">{[cards[1], cards[4], cards[5]].map(([label, value, detail]) => metric(label, value, detail))}</div>
      {!analyticsReady && report && <Alert><AlertTitle>Website analytics unavailable</AlertTitle><AlertDescription>{report.sources.analytics.detail}</AlertDescription></Alert>}
      <Card>
        <CardHeader><CardTitle>Website signals</CardTitle><CardDescription>{report?.sources.analytics.detail || unavailable}</CardDescription></CardHeader>
        <CardContent className="flex flex-col gap-5">
          <FieldGroup className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Field className="w-auto"><FieldLabel>Source</FieldLabel><ToggleGroup aria-label="Signal source" variant="outline" value={[signalSource]} onValueChange={values => { if (values[0]) setSignalSource(values[0]) }}><ToggleGroupItem value="all">All sources</ToggleGroupItem><ToggleGroupItem value="Formspree">Formspree</ToggleGroupItem><ToggleGroupItem value="Vercel Analytics">Vercel</ToggleGroupItem></ToggleGroup></Field>
            <Field className="w-auto"><FieldLabel htmlFor="signal-sort">Sort by</FieldLabel><NativeSelect id="signal-sort" value={signalSort} onChange={event => setSignalSort(event.target.value)}><NativeSelectOption value="count-desc">Highest count</NativeSelectOption><NativeSelectOption value="count-asc">Lowest count</NativeSelectOption><NativeSelectOption value="name">Name</NativeSelectOption></NativeSelect></Field>
          </FieldGroup>
          <Table><TableHeader><TableRow><TableHead><Button variant="ghost" size="sm" onClick={() => setSignalSort('name')}>Pathway</Button></TableHead><TableHead><Button variant="ghost" size="sm" onClick={() => setSignalSort(value => value === 'count-desc' ? 'count-asc' : 'count-desc')}>Count</Button></TableHead><TableHead>What it measures</TableHead><TableHead>Source</TableHead></TableRow></TableHeader>
            <TableBody>{signalRows.map(row => <TableRow key={row.label}><TableCell>{row.label}</TableCell><TableCell className="tabular-nums">{row.label === 'Contact form' ? formCount == null ? '—' : String(formCount) : count(row.count ?? undefined, analyticsReady)}</TableCell><TableCell className="min-w-64 whitespace-normal leading-relaxed">{row.detail}</TableCell><TableCell>{row.source}</TableCell></TableRow>)}</TableBody>
          </Table>
        </CardContent>
        <CardFooter><p className="text-xs leading-relaxed text-muted-foreground">Widget-ready events ({count(analytics?.widgetReady, analyticsReady)}) mean the Cherry script loaded. They are not applications. GA4 generate_lead is not used here because older contact page views were counted as leads.</p></CardFooter>
      </Card>
    </>}
    <div className="flex flex-col gap-1 text-xs leading-relaxed text-muted-foreground">
      <p aria-live="polite">{checkedAt ? `Pathways checked ${checkedAt}.` : report ? 'Pathways check time unavailable.' : unavailable} Last {report?.windowDays ?? 90} days.</p>
      {analyticsWindow && view !== 'financing' && <p>{analyticsWindow}</p>}
    </div>
  </section>
}
