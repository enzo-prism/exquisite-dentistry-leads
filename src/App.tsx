import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDownUp,
  CalendarDays,
  ChevronDown,
  Clock3,
  LockKeyhole,
  Mail,
  Moon,
  Phone,
  Search,
  SlidersHorizontal,
  Sun,
  UserRound,
  X,
  Inbox, Info, ArrowUpRight, ChevronRight, Globe2,
} from 'lucide-react'
import { Button, Card, FilterChip, IconButton, Input, ToggleGroup } from './components/ui'
import { Pathways, type PathwayReport } from './components/Pathways'
import { filterLeads, leadWindows, sortLeads } from './filters.js'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter, DialogClose } from './components/ui/dialog'
import { DashboardShell, type DashboardView } from './components/DashboardShell'
import { NativeSelect, NativeSelectOption } from './components/ui/native-select'
import { Alert, AlertDescription } from './components/ui/alert'
import { Field, FieldGroup, FieldLabel } from './components/ui/field'
import { Tooltip, TooltipTrigger, TooltipContent } from './components/ui/tooltip'
import { Badge } from './components/ui/badge'
import { Card as SummaryCard, CardHeader, CardDescription, CardContent } from './components/ui/card'

type Channel = string

type Lead = {
  id: string
  name: string
  email: string
  phone: string
  channel: string
  campaign: string
  notes: string
  received: string | null
  interest?: string
  source?: string
  pageUrl?: string
  referrer?: string
  formType?: string
  personType?: string
  isTest?: boolean
}

const channelAssets: Record<Channel, { light: string; dark?: string; apiLight: string; apiDark?: string }> = {
  Google: { light: '/logos/google.svg', apiLight: 'https://api.svgl.app/svg/google.svg' },
  Instagram: { light: '/logos/instagram.svg', apiLight: 'https://api.svgl.app/svg/instagram-icon.svg' },
  TikTok: { light: '/logos/tiktok-light.svg', dark: '/logos/tiktok-dark.svg', apiLight: 'https://api.svgl.app/svg/tiktok-icon-light.svg', apiDark: 'https://api.svgl.app/svg/tiktok-icon-dark.svg' },
  ChatGPT: { light: '/logos/openai-light.svg', dark: '/logos/openai-dark.svg', apiLight: 'https://api.svgl.app/svg/openai.svg', apiDark: 'https://api.svgl.app/svg/openai_dark.svg' },
}

const formLabels: Record<string, string> = { contact: 'Contact message', insurance_benefits: 'Benefits review', chatgpt_ads_consultation: 'Consultation request' }
const personLabels: Record<string, string> = { new_patient: 'Prospective patient', existing_patient: 'Existing patient', vendor_business: 'Vendor/business' }
const displayLabel = (value: string | undefined, labels: Record<string, string>) => value ? (Object.hasOwn(labels, value) ? labels[value] : value) : 'Not provided'
const formLabel = (value?: string) => displayLabel(value, formLabels)
const personLabel = (value?: string) => displayLabel(value, personLabels)

function SourceLogo({ channel, theme }: { channel: Channel; theme: 'light' | 'dark' }) {
  const asset = Object.hasOwn(channelAssets, channel) ? channelAssets[channel] : undefined
  const localSource = theme === 'dark' && asset?.dark ? asset.dark : asset?.light ?? ''
  const apiSource = theme === 'dark' && asset?.apiDark ? asset.apiDark : asset?.apiLight ?? ''
  const [failed, setFailed] = useState(false)

  useEffect(() => setFailed(false), [localSource])

  return <span className="source-logo-frame" data-svgl-url={apiSource} aria-hidden="true">
    {failed || !localSource ? <Globe2 className="size-4 text-muted-foreground" /> : <img
      className="source-logo"
      src={localSource}
      width="20"
      height="20"
      alt=""
      decoding="async"
      onError={() => setFailed(true)}
    />}
  </span>
}

function SourceBadge({ lead, theme }: { lead: Lead; theme: 'light' | 'dark' }) {
  return <span className="source-wrap">
    <span className="source-badge" data-slot="badge">
      <SourceLogo channel={lead.channel} theme={theme} />
      <span>{lead.channel}</span>
    </span>

  </span>
}

const timestamp = (value: string | null) => value ? new Date(value).getTime() : NaN

const formatReceived = (value: string | null) => {
  const date = new Date(timestamp(value))
  if (!Number.isFinite(date.getTime())) return { date: 'Date unavailable', time: '' }
  return {
    date: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Los_Angeles' }).format(date),
    time: new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles' }).format(date),
  }
}

function AccessGate({ theme, onToggleTheme, onUnlock }: { theme: 'light' | 'dark'; onToggleTheme: () => void; onUnlock: () => Promise<void> }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => inputRef.current?.focus(), [])

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/login', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }), cache: 'no-store', signal: AbortSignal.timeout(20_000) })
      setPassword('')
      if (!response.ok) throw new Error(response.status === 401 ? 'That password is not correct.' : response.status === 429 ? 'Too many attempts. Try again later.' : 'Sign-in is unavailable. Try again shortly.')
      await onUnlock()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to sign in. Please retry.')
      window.requestAnimationFrame(() => inputRef.current?.focus())
    } finally { setPassword(''); setBusy(false) }
  }

  return <main className="access-shell">
    <IconButton className="access-theme" label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} aria-pressed={theme === 'dark'} onClick={onToggleTheme}>
      {theme === 'light' ? <Moon /> : <Sun />}
    </IconButton>
    <section className="access-panel" aria-labelledby="access-title">
      <div className="access-brand">
        <img src="/brand/exquisite-wordmark.png" alt="Exquisite Dentistry" />
        <span>Lead dashboard</span>
      </div>
      <div className="access-mark" aria-hidden="true"><img src="/brand/exquisite-icon.png" alt="" /></div>
      <div className="access-copy">

        <h1 id="access-title">Welcome back.</h1>
        <p>Your practice, at a glance.</p>
      </div>
      <form className="access-form" onSubmit={submit}>
        <label htmlFor="access-password">Password</label>
        <div className="access-input-wrap"><LockKeyhole /><Input className="h-11 pl-9" ref={inputRef} id="access-password" type="password" value={password} onChange={(event) => { setPassword(event.target.value); if (error) setError('') }} autoComplete="current-password" aria-invalid={Boolean(error)} aria-describedby={error ? 'access-error' : undefined} placeholder="Enter password" /></div>
        {error && <p className="access-error" id="access-error" role="alert">{error}</p>}
        <Button type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Open dashboard'}</Button>
      </form>
      <p className="access-footnote">Authorized practice staff only</p>
    </section>
  </main>
}

function App() {
  const [query, setQuery] = useState('')
  const [source, setSource] = useState('all')
  const [windowFilter, setWindowFilter] = useState('all')
  const [formFilter, setFormFilter] = useState('')
  const [contactFilter, setContactFilter] = useState('any')
  const [testFilter, setTestFilter] = useState('all')
  const [personFilter, setPersonFilter] = useState('')
  const [sort, setSort] = useState('newest')
  const [selected, setSelected] = useState<Lead | null>(null)
  const [hasAccess, setHasAccess] = useState(false)
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fetchedAt, setFetchedAt] = useState('')
  const [view, setView] = useState<DashboardView>('overview')
  const [moreFilters, setMoreFilters] = useState(false)
  const [pathways, setPathways] = useState<PathwayReport | null>(null)
  const [loaded, setLoaded] = useState(false)
  const requestVersion = useRef(0)
  const explicitlyLocked = useRef(false)
  const clearPrivateData = useCallback(() => {
    requestVersion.current += 1
    setLeads([])
    setSelected(null)
    setQuery('')
    setSource('all')
    setWindowFilter('all')
    setFormFilter('')
    setContactFilter('any')
    setTestFilter('all')
    setPersonFilter('')
    setSort('newest')
    setFetchedAt('')
    setPathways(null)
    setView('overview')
    setMoreFilters(false)
    setLoaded(false)
    setHasAccess(false)
    setLoading(false)
  }, [])
  const refresh = useCallback(async () => {
    const version = ++requestVersion.current
    setLoading(true)
    setError('')
    try {
      const [leadResult, pathwayResult] = await Promise.allSettled([
        fetch('/api/leads', { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(20_000) }),
        fetch('/api/pathways', { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(20_000) }),
      ])
      if (version !== requestVersion.current) return
      const response = leadResult.status === 'fulfilled' ? leadResult.value : null
      const pathwayResponse = pathwayResult.status === 'fulfilled' ? pathwayResult.value : null
      if (response?.status === 401 || pathwayResponse?.status === 401) { clearPrivateData(); return }
      if (!response) throw new Error('Submissions could not be refreshed. Please retry.')
      if (!response.ok) throw new Error('Submissions could not be refreshed. Please retry.')
      const data = await response.json()
      // Pathway providers are optional: an outage must not discard a healthy inbox.
      let pathwayData = pathwayResponse?.ok ? await pathwayResponse.json().catch(() => null) : null
      if (pathwayData && (!Number.isFinite(pathwayData.windowDays) || pathwayData.windowDays <= 0 ||
        !['cherry', 'analytics'].every(key => typeof pathwayData.sources?.[key]?.status === 'string' && typeof pathwayData.sources?.[key]?.detail === 'string') ||
        !Array.isArray(pathwayData.cherry?.rows) || !pathwayData.analytics ||
        !pathwayData.cherry.rows.every((row: Record<string, unknown> | null) => row && ['id', 'date', 'kind', 'applicant', 'planId'].every(key => typeof row[key] === 'string') && (row.amount === null || typeof row.amount === 'number')))) {
        pathwayData = null
      }
      if (version !== requestVersion.current) return
      if (!Array.isArray(data.leads)) throw new Error('Unexpected data response. Please retry.')
      setPathways(pathwayData)
      setLeads(data.leads)
      setFetchedAt(data.meta?.fetchedAt || '')
      setLoaded(true)
      setHasAccess(true)
      setSelected(current => current ? data.leads.find((lead: Lead) => lead.id === current.id) ?? null : null)
    } catch {
      if (version === requestVersion.current) {
        setError('Submissions are unavailable. Check the connection and retry.')
        setLeads([])
        setSelected(null)
        setPathways(null)
        setLoaded(false)
      }
    } finally { if (version === requestVersion.current) setLoading(false) }
  }, [clearPrivateData])
  useEffect(() => {
    void refresh()
    const onVisible = () => { if (document.visibilityState === 'visible' && !explicitlyLocked.current) void refresh() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    const interval = window.setInterval(onVisible, 60_000)
    return () => { requestVersion.current += 1; document.removeEventListener('visibilitychange', onVisible); window.removeEventListener('focus', onVisible); window.clearInterval(interval) }
  }, [refresh])
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('exquisite-theme')
      if (saved === 'light' || saved === 'dark') return saved
    } catch { /* Theme preference is optional. */ }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  const returnFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.style.colorScheme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0d100f' : '#f4f4f0')
    try { localStorage.setItem('exquisite-theme', theme) } catch { /* Keep the in-memory preference. */ }
  }, [theme])

  const openLead = (lead: Lead, trigger?: HTMLElement | null) => {
    returnFocusRef.current = trigger ?? document.activeElement as HTMLElement | null
    setSelected(lead)
  }

  const closeLead = () => {
    setSelected(null)

  }

  const now = Date.now()
  const filters = useMemo(() => ({ window: windowFilter, source, form: formFilter, person: personFilter, tests: testFilter, contact: contactFilter, query }), [windowFilter, source, formFilter, personFilter, testFilter, contactFilter, query])
  const filtered = useMemo(() => sortLeads(filterLeads(leads, filters, now), sort), [leads, filters, now, sort])
  const resetFilters = () => { setQuery(''); setSource('all'); setWindowFilter('all'); setFormFilter(''); setContactFilter('any'); setTestFilter('all'); setPersonFilter('') }
  const recentCount = leads.filter((lead) => { const age = now - timestamp(lead.received); return age >= 0 && age < 7 * 24 * 60 * 60 * 1000 }).length
  const sourceCounts = leads.reduce((counts, lead) => counts.set(lead.channel, (counts.get(lead.channel) ?? 0) + 1), new Map<string, number>())
  const channels = [...sourceCounts.keys()].sort()
  const personTypes = [...new Set(leads.map((lead) => lead.personType || 'Not provided'))].sort()
  const formTypes = [...new Set(leads.map((lead) => lead.formType || 'Not provided'))].sort()
  const filtersActive = Boolean(query || source !== 'all' || windowFilter !== 'all' || formFilter || contactFilter !== 'any' || testFilter !== 'all' || personFilter)
  const markedTestCount = leads.filter((lead) => lead.isTest === true).length
  const topSource = [...sourceCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'None'
  const toggleTheme = () => setTheme((value) => value === 'light' ? 'dark' : 'light')
  const lock = async () => {
    explicitlyLocked.current = true
    clearPrivateData()
    setLoading(false)
    try {
      const response = await fetch('/api/logout', { method: 'POST', credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(20_000) })
      if (!response.ok) setError('Sign-out could not be confirmed. Close this browser window to protect your session.')
    } catch { setError('Sign-out could not be confirmed. Close this browser window to protect your session.') }
  }

  if (!hasAccess && loading) return <main className="access-shell"><p role="status">Checking secure session…</p></main>
  if (!hasAccess) return <><AccessGate theme={theme} onToggleTheme={toggleTheme} onUnlock={async () => { explicitlyLocked.current = false; await refresh() }} />{error && <div className="session-error" role="alert">{error}<Button onClick={() => void refresh()}>Retry connection</Button></div>}</>

  return (
    <>
      <DashboardShell view={view} onViewChange={(next) => { closeLead(); setView(next) }} theme={theme} onToggleTheme={toggleTheme} onLock={() => void lock()} loading={loading} onRefresh={() => void refresh()} fetchedAt={fetchedAt} loaded={loaded} submissionCount={leads.length}>
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        {view === 'overview' && <section className="overview-inbox" aria-label="Inbox summary">
          <div className="overview-inbox-title"><span className="metric-symbol"><Inbox aria-hidden="true" /></span><span>Inbox</span>
            <Dialog><DialogTrigger render={<Button variant="ghost" size="icon" aria-label="About inbox metrics" />}><Info /></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Inbox metrics</DialogTitle><DialogDescription>Direct from the Formspree inbox.</DialogDescription></DialogHeader><p>All submissions includes marked tests. The 7-day count uses a rolling window. Tests are identified only by explicit submission flags.</p><p>These are inquiries, not verified patients or booked appointments.</p></DialogContent></Dialog>
          </div>
          <div className="overview-inbox-metrics">
            <div><span>All submissions</span><strong>{loaded ? leads.length : '—'}</strong></div>
            <div><span>Past 7 days</span><strong>{loaded ? recentCount : '—'}</strong></div>
            <div><span>Marked tests</span><strong>{loaded ? markedTestCount : '—'}</strong></div>
          </div>
          <Button variant="ghost" onClick={() => setView('inbox')} aria-label="Open lead inbox"><ArrowUpRight data-icon="inline-end" /></Button>
        </section>}
        <div hidden={view === 'inbox'}>
          <Pathways view={view === 'inbox' ? 'overview' : view} report={pathways} loading={loading && !pathways} formCount={loaded ? leads.filter((lead) => { const age = now - timestamp(lead.received); return age >= 0 && age < (pathways?.windowDays ?? 90) * 86400000 }).length : null} />
        </div>
        <div hidden={view !== 'inbox'}>
        <Card className="leads-card airy-inbox">
          <div className="inbox-toolbar">
            <label className="search-box"><Search /><span className="sr-only">Search name, contact, or notes</span><Input className="h-11 pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search inquiries…" /></label>
            <div className="inbox-toolbar-actions">
              <NativeSelect aria-label="Received window" value={windowFilter} onChange={event => setWindowFilter(event.target.value)}>{leadWindows.map(item => <NativeSelectOption key={item.id} value={item.id}>{item.label}</NativeSelectOption>)}</NativeSelect>
              <Dialog open={moreFilters} onOpenChange={setMoreFilters}>
                <DialogTrigger render={<Button variant="outline" className="h-11" />}><SlidersHorizontal data-icon="inline-start" />Filters{filtersActive && <span className="filter-dot" aria-label="Filters active" />}</DialogTrigger>
                <DialogContent className="max-h-[85svh] overflow-y-auto p-6 sm:max-w-lg">
                  <DialogHeader><DialogTitle>Filter inquiries</DialogTitle><DialogDescription>Choose what appears in your inbox.</DialogDescription></DialogHeader>
                  <FieldGroup>
                    <Field><FieldLabel htmlFor="inbox-source">Source</FieldLabel><NativeSelect id="inbox-source" value={source} onChange={event => setSource(event.target.value)}><NativeSelectOption value="all">All sources</NativeSelectOption>{channels.map(item => <NativeSelectOption key={item} value={item}>{item} ({sourceCounts.get(item)})</NativeSelectOption>)}</NativeSelect></Field>
                    <Field><FieldLabel htmlFor="inbox-form">Form</FieldLabel><NativeSelect id="inbox-form" value={formFilter} onChange={event => setFormFilter(event.target.value)}><NativeSelectOption value="">All forms</NativeSelectOption>{formTypes.map(item => <NativeSelectOption key={item} value={item}>{formLabel(item)}</NativeSelectOption>)}</NativeSelect></Field>
                    <Field><FieldLabel htmlFor="inbox-person">Person type</FieldLabel><NativeSelect id="inbox-person" value={personFilter} onChange={event => setPersonFilter(event.target.value)}><NativeSelectOption value="">All person types</NativeSelectOption>{personTypes.map(item => <NativeSelectOption key={item} value={item}>{personLabel(item)}</NativeSelectOption>)}</NativeSelect></Field>
                    <Field><FieldLabel htmlFor="inbox-contact">Contact details</FieldLabel><NativeSelect id="inbox-contact" value={contactFilter} onChange={event => setContactFilter(event.target.value)}><NativeSelectOption value="any">Any contact</NativeSelectOption><NativeSelectOption value="phone">Has phone</NativeSelectOption><NativeSelectOption value="email">Has email</NativeSelectOption><NativeSelectOption value="missing">Missing contact</NativeSelectOption></NativeSelect></Field>
                    <Field><FieldLabel htmlFor="inbox-tests">Test submissions</FieldLabel><NativeSelect id="inbox-tests" value={testFilter} onChange={event => setTestFilter(event.target.value)}><NativeSelectOption value="all">Include tests</NativeSelectOption><NativeSelectOption value="exclude">Hide tests</NativeSelectOption><NativeSelectOption value="only">Tests only</NativeSelectOption></NativeSelect></Field>
                    <Field><FieldLabel htmlFor="inbox-sort">Sort</FieldLabel><NativeSelect id="inbox-sort" value={sort} onChange={event => setSort(event.target.value)}><NativeSelectOption value="newest">Newest first</NativeSelectOption><NativeSelectOption value="oldest">Oldest first</NativeSelectOption><NativeSelectOption value="name-asc">Name A–Z</NativeSelectOption><NativeSelectOption value="name-desc">Name Z–A</NativeSelectOption><NativeSelectOption value="form">Form</NativeSelectOption></NativeSelect></Field>
                  </FieldGroup>
                  <div className="flex items-center justify-between gap-4"><Button variant="ghost" onClick={resetFilters}>Reset</Button><DialogClose render={<Button />}>Show {filtered.length} {filtered.length === 1 ? 'inquiry' : 'inquiries'}</DialogClose></div>
                </DialogContent>
              </Dialog>
              <Dialog><DialogTrigger render={<Button variant="ghost" size="icon" aria-label="About the inbox" />}><Info /></DialogTrigger><DialogContent><DialogHeader><DialogTitle>About the inbox</DialogTitle><DialogDescription>Raw submissions from Formspree.</DialogDescription></DialogHeader><p>Records are not verified patients or qualified leads. Spam and Simplifeye bookings are excluded. All received times use Pacific time.</p><p>Open an inquiry to see complete contact information, notes, submitted context, and test flags.</p></DialogContent></Dialog>
            </div>
          </div>
          <div className="inbox-count" role="status">{loaded ? `${filtered.length} ${filtered.length === 1 ? 'inquiry' : 'inquiries'}${filtersActive ? ` of ${leads.length}` : ''}` : 'Unavailable'}</div>
          {filtersActive && <div className="filter-chips" role="group" aria-label="Active filters">
            {windowFilter !== 'all' && <FilterChip label={leadWindows.find((item) => item.id === windowFilter)?.label || windowFilter} onRemove={() => setWindowFilter('all')} />}
            {source !== 'all' && <FilterChip label={source} onRemove={() => setSource('all')} />}
            {formFilter && <FilterChip label={formLabel(formFilter)} onRemove={() => setFormFilter('')} />}
            {personFilter && <FilterChip label={personLabel(personFilter)} onRemove={() => setPersonFilter('')} />}
            {contactFilter !== 'any' && <FilterChip label={contactFilter === 'phone' ? 'Has phone' : contactFilter === 'email' ? 'Has email' : 'Missing contact'} onRemove={() => setContactFilter('any')} />}
            {testFilter !== 'all' && <FilterChip label={testFilter === 'exclude' ? 'Hide tests' : 'Tests only'} onRemove={() => setTestFilter('all')} />}
            {query && <FilterChip label={`“${query}”`} onRemove={() => setQuery('')} />}
            <Button className="filter-reset" onClick={resetFilters}>Clear filters</Button>
          </div>}

          {filtered.length ? <>
            <div className="table-scroll">
              <table>
                <thead><tr>
                  <th aria-sort={sort === 'name-asc' ? 'ascending' : sort === 'name-desc' ? 'descending' : 'none'}><button type="button" className="sort-header" onClick={() => setSort((value) => value === 'name-asc' ? 'name-desc' : 'name-asc')}>Submission</button></th>
                  <th>Source</th>
                  <th aria-sort={sort === 'oldest' ? 'ascending' : sort === 'newest' ? 'descending' : 'none'}><button type="button" className="sort-header" onClick={() => setSort((value) => value === 'newest' ? 'oldest' : 'newest')}>Received</button></th><th><span className="sr-only">Details</span></th>
                </tr></thead>
                <tbody>{filtered.map((lead) => {
                  const received = formatReceived(lead.received)
                  return <tr key={lead.id} className="submission-row" onClick={(event) => {
                    if (!window.getSelection()?.toString()) openLead(lead, event.currentTarget.querySelector('button'))
                  }}>
                    <td><button className="lead-link airy-lead-link" aria-haspopup="dialog" onClick={(event) => { event.stopPropagation(); openLead(lead, event.currentTarget) }}><span className="lead-avatar" aria-hidden="true"><UserRound /></span><span>{lead.name || 'Name not provided'}{lead.isTest && <Badge variant="secondary">Test</Badge>}</span></button></td>
                    <td><SourceBadge lead={lead} theme={theme} /></td>
                    <td><div className="received-cell"><strong>{received.date}</strong></div></td>
                    <td><ChevronRight className="row-chevron" aria-hidden="true" /></td>
                  </tr>
                })}</tbody>
              </table>
            </div>
            <div className="mobile-cards">{filtered.map((lead) => {
              const received = formatReceived(lead.received)
              return <button className="lead-card" key={lead.id} aria-haspopup="dialog" onClick={(event) => openLead(lead, event.currentTarget)}>
                <span className="lead-card-top"><span className="lead-avatar" aria-hidden="true"><UserRound /></span><strong>{lead.name || 'Name not provided'}</strong><ChevronRight aria-hidden="true" /></span>
                <span className="lead-card-bottom"><SourceBadge lead={lead} theme={theme} /><span>{received.date}</span>{lead.isTest && <Badge variant="secondary">Test</Badge>}</span>
              </button>
            })}</div>
          </> : <div className="empty-state"><div className="empty-icon"><Search /></div><h3>{!loaded ? 'Submissions unavailable' : leads.length ? 'No matching submissions' : 'No inbox submissions'}</h3><p>{!loaded ? 'Refresh to load verified data.' : leads.length ? 'Clear a filter or try another search.' : 'The Formspree inbox is empty.'}</p>{filtersActive && <Button onClick={resetFilters}>Clear filters</Button>}</div>}
        </Card>

        </div>
      </DashboardShell>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) closeLead() }}>
        {selected && <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl" finalFocus={() => returnFocusRef.current}>
          <DialogHeader><DialogTitle>{selected.name || 'Name not provided'}</DialogTitle><DialogDescription>Full submission details · Pacific time</DialogDescription></DialogHeader>
          <SourceBadge lead={selected} theme={theme} />
          <div className="detail-list">
            <div><span className="detail-icon"><Mail /></span><div><span>Email</span><strong>{selected.email || 'Not provided'}</strong></div></div>
            <div><span className="detail-icon"><Phone /></span><div><span>Phone</span><strong>{selected.phone || 'Not provided'}</strong></div></div>
            <div><span className="detail-icon"><CalendarDays /></span><div><span>Received</span><strong>{formatReceived(selected.received).date} at {formatReceived(selected.received).time} PT</strong></div></div>
          </div>
          <section className="notes-panel" aria-labelledby="notes-heading"><h3 id="notes-heading">Full notes</h3><p>{selected.notes || 'No message or notes were provided with this submission.'}</p></section>
          <div className="submission-context"><p>Interested in: {selected.interest || 'Not provided'}</p><p>Form: {formLabel(selected.formType)}</p><p>Person type: {personLabel(selected.personType)}</p><p>{selected.isTest ? 'Flagged as a test submission' : 'No test flag provided'}</p><p>Campaign: {selected.campaign || 'Not provided'}</p><p>Reported source: {selected.source || 'Not provided'}</p><p>Page: {selected.pageUrl || 'Not provided'}</p><p>Referrer: {selected.referrer || 'Not provided'}</p></div>
          <p className="sheet-footnote">Qualification and follow-up status have not been verified.</p>
        </DialogContent>}
      </Dialog>
    </>
  )
}

export default App
