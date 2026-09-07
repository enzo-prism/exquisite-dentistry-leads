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
} from './icons'
import { Button, Card, IconButton, Input } from './components/ui'

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
    {failed || !localSource ? <span className="source-logo-fallback">{channel === 'ChatGPT' ? 'AI' : channel.slice(0, 1)}</span> : <img
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
    <span className="campaign">{lead.campaign}</span>
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
        <span className="section-label">Private dashboard</span>
        <h1 id="access-title">Welcome back.</h1>
        <p>Enter the shared password to view Formspree submissions.</p>
      </div>
      <form className="access-form" onSubmit={submit}>
        <label htmlFor="access-password">Password</label>
        <div className="access-input-wrap"><LockKeyhole /><Input ref={inputRef} id="access-password" type="password" value={password} onChange={(event) => { setPassword(event.target.value); if (error) setError('') }} autoComplete="current-password" aria-invalid={Boolean(error)} aria-describedby={error ? 'access-error' : undefined} placeholder="Enter password" /></div>
        {error && <p className="access-error" id="access-error" role="alert">{error}</p>}
        <Button type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Open dashboard'}</Button>
      </form>
      <p className="access-footnote">Authorized practice staff only</p>
    </section>
  </main>
}

function App() {
  const [query, setQuery] = useState('')
  const [source, setSource] = useState('All sources')
  const [testFilter, setTestFilter] = useState('All submissions')
  const [personFilter, setPersonFilter] = useState('')
  const [sort, setSort] = useState('Newest first')
  const [selected, setSelected] = useState<Lead | null>(null)
  const [hasAccess, setHasAccess] = useState(false)
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fetchedAt, setFetchedAt] = useState('')
  const [loaded, setLoaded] = useState(false)
  const requestVersion = useRef(0)
  const explicitlyLocked = useRef(false)
  const clearPrivateData = useCallback(() => {
    requestVersion.current += 1
    setLeads([])
    setSelected(null)
    setQuery('')
    setSource('All sources')
    setTestFilter('All submissions')
    setPersonFilter('')
    setFetchedAt('')
    setLoaded(false)
    setHasAccess(false)
    setLoading(false)
  }, [])
  const refresh = useCallback(async () => {
    const version = ++requestVersion.current
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/leads', { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(20_000) })
      if (version !== requestVersion.current) return
      if (response.status === 401) { clearPrivateData(); return }
      if (!response.ok) throw new Error('Submissions could not be refreshed. Please retry.')
      const data = await response.json()
      if (version !== requestVersion.current) return
      if (!Array.isArray(data.leads)) throw new Error('Unexpected data response. Please retry.')
      setLeads(data.leads)
      setFetchedAt(data.meta?.fetchedAt || '')
      setLoaded(true)
      setHasAccess(true)
      setSelected(null)
    } catch {
      if (version === requestVersion.current) {
        setError('Submissions are unavailable. Check the connection and retry.')
        setLeads([])
        setSelected(null)
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
  const dialogRef = useRef<HTMLElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.style.colorScheme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0d100f' : '#f4f4f0')
    try { localStorage.setItem('exquisite-theme', theme) } catch { /* Keep the in-memory preference. */ }
  }, [theme])

  const openLead = (lead: Lead) => {
    returnFocusRef.current = document.activeElement as HTMLElement | null
    setSelected(lead)
  }

  const closeLead = () => {
    setSelected(null)
    window.requestAnimationFrame(() => returnFocusRef.current?.focus())
  }

  useEffect(() => {
    if (!selected || !dialogRef.current) return
    const dialog = dialogRef.current
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'))
    focusable()[0]?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeLead()
      if (event.key !== 'Tab') return
      const items = focusable()
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [selected])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return leads
      .filter((lead) => source === 'All sources' || lead.channel === source)
      .filter((lead) => testFilter === 'All submissions' || (testFilter === 'Marked tests only' ? lead.isTest === true : lead.isTest !== true))
      .filter((lead) => !personFilter || (lead.personType || 'Not provided') === personFilter)
      .filter((lead) => !needle || Object.values(lead).some((value) => String(value).toLowerCase().includes(needle)))
      .sort((a, b) => {
        if (sort === 'Oldest first') return (timestamp(a.received) || 0) - (timestamp(b.received) || 0)
        if (sort === 'Name A–Z') return a.name.localeCompare(b.name)
        return (timestamp(b.received) || 0) - (timestamp(a.received) || 0)
      })
  }, [leads, query, source, sort, testFilter, personFilter])

  const now = Date.now()
  const recentCount = leads.filter((lead) => { const age = now - timestamp(lead.received); return age >= 0 && age < 7 * 24 * 60 * 60 * 1000 }).length
  const sourceCounts = leads.reduce((counts, lead) => counts.set(lead.channel, (counts.get(lead.channel) ?? 0) + 1), new Map<string, number>())
  const channels = [...sourceCounts.keys()].sort()
  const personTypes = [...new Set(leads.map((lead) => lead.personType || 'Not provided'))].sort()
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
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#leads" aria-label="Exquisite Dentistry leads">
          <img className="brand-wordmark" src="/brand/exquisite-wordmark.png" alt="" aria-hidden="true" />
          <img className="brand-icon-mobile" src="/brand/exquisite-icon.png" alt="" aria-hidden="true" />
          <span className="brand-divider" aria-hidden="true" />
          <span className="brand-product">Leads</span>
        </a>
        <div className="top-actions">
          <IconButton className="topbar-theme" label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} aria-pressed={theme === 'dark'} onClick={toggleTheme}>
            {theme === 'light' ? <Moon /> : <Sun />}
          </IconButton>
          <IconButton className="topbar-lock" label="Lock dashboard" onClick={lock}><LockKeyhole /></IconButton>
          <div className="profile"><div className="profile-copy"><strong>Practice Admin</strong><span>Formspree inbox</span></div><div className="avatar"><UserRound /></div></div>
        </div>
      </header>

      <main className="content" id="leads">
        <section className="page-heading">
          <div className="heading-copy"><span className="section-label">Lead dashboard</span><h1>Website leads</h1><p>Real Formspree inbox submissions. Qualification and booking outcomes are unverified.</p></div>
          <div className="brand-emblem" aria-hidden="true"><span className="emblem-index">01</span><img src="/brand/exquisite-icon.png" alt="" /></div>
        </section>

        <section className="summary" aria-label="Lead summary">
          <div><strong>{loaded ? leads.length : '—'}</strong><span>Inbox submissions</span></div>
          <div><strong>{loaded ? recentCount : '—'}</strong><span>Past 7 days</span></div>
          <div><strong>{loaded ? markedTestCount : '—'}</strong><span>Marked tests</span></div>
          <div><strong>{loaded ? topSource : '—'}</strong><span>Top source</span></div>
          <div className="sample-status"><span className="status-dot" />{loading ? 'Refreshing…' : loaded ? 'Formspree inbox' : 'Unavailable'}</div>
        </section>

        <div className="data-status" aria-live="polite"><span>{fetchedAt && loaded ? `Updated ${formatReceived(fetchedAt).date}, ${formatReceived(fetchedAt).time} PT` : 'No verified data loaded'}</span><Button disabled={loading} onClick={() => void refresh()}>Refresh</Button></div>
        {error && <p className="data-error" role="alert">{error}</p>}
        <section className="source-overview" aria-label="Lead source attribution">
          <div className="source-overview-title"><span>Attribution</span><strong>Lead sources</strong></div>
          <div className="source-overview-list">
            {channels.map((channel) => <button
              className="source-filter"
              data-active={source === channel}
              key={channel}
              type="button"
              aria-pressed={source === channel}
              onClick={() => setSource((value) => value === channel ? 'All sources' : channel)}
            >
              <SourceLogo channel={channel} theme={theme} />
              <span><strong>{channel}</strong><small>{sourceCounts.get(channel)} submissions</small></span>
            </button>)}
          </div>
        </section>

        <Card className="leads-card">
          <div className="table-heading">
            <div><h2>Inbox submissions</h2><p>{loaded ? `${filtered.length} shown` : 'Unavailable'}</p></div>
            <div className="filters">
              <label className="search-box"><Search /><span className="sr-only">Search leads</span><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search leads" /></label>
              <label className="select-wrap"><SlidersHorizontal /><span className="sr-only">Filter by source</span><select value={source} onChange={(event) => setSource(event.target.value)}><option>All sources</option>{channels.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown /></label>
              <label className="select-wrap"><span className="sr-only">Filter marked tests</span><select value={testFilter} onChange={(event) => setTestFilter(event.target.value)}><option>All submissions</option><option>Exclude marked tests</option><option>Marked tests only</option></select><ChevronDown /></label>
              <label className="select-wrap"><span className="sr-only">Filter by person type</span><select value={personFilter} onChange={(event) => setPersonFilter(event.target.value)}><option value="">All person types</option>{personTypes.map((item) => <option key={item} value={item}>{personLabel(item)}</option>)}</select><ChevronDown /></label>
              <label className="select-wrap sort-wrap"><ArrowDownUp /><span className="sr-only">Sort leads</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option>Newest first</option><option>Oldest first</option><option>Name A–Z</option></select><ChevronDown /></label>
            </div>
          </div>

          {filtered.length ? <>
            <div className="table-scroll">
              <table>
                <thead><tr><th>Submission</th><th>Contact</th><th>Source</th><th>Notes</th><th>Received</th></tr></thead>
                <tbody>{filtered.map((lead) => {
                  const received = formatReceived(lead.received)
                  return <tr key={lead.id}>
                    <td><button className="lead-link" aria-haspopup="dialog" onClick={() => openLead(lead)}><span>{lead.name || 'Name not provided'}</span><small>{lead.isTest ? 'Test submission · ' : ''}{lead.personType ? personLabel(lead.personType) : lead.formType ? formLabel(lead.formType) : 'View details'}</small></button></td>
                    <td><div className="contact-cell"><span><Mail />{lead.email || 'Email not provided'}</span><span><Phone />{lead.phone || 'Phone not provided'}</span></div></td>
                    <td><SourceBadge lead={lead} theme={theme} /></td>
                    <td><p className="notes-cell">{lead.notes || 'No message provided'}</p></td>
                    <td><div className="received-cell"><strong>{received.date}</strong><span>{received.time} PT</span></div></td>
                  </tr>
                })}</tbody>
              </table>
            </div>
            <div className="mobile-cards">{filtered.map((lead) => {
              const received = formatReceived(lead.received)
              return <button className="lead-card" key={lead.id} aria-haspopup="dialog" onClick={() => openLead(lead)}>
                <span className="lead-card-top"><strong>{lead.name || 'Name not provided'}</strong><SourceBadge lead={lead} theme={theme} /></span>
                <span className="lead-card-note">{lead.notes || 'No message provided'}</span>
                <span className="lead-card-meta"><span><Mail />{lead.email || 'Email not provided'}</span><span><Phone />{lead.phone || 'Phone not provided'}</span><span><Clock3 />{received.date}, {received.time} PT</span></span>
              </button>
            })}</div>
          </> : <div className="empty-state"><div className="empty-icon"><Search /></div><h3>{!loaded ? 'Submissions unavailable' : leads.length ? 'No matching submissions' : 'No inbox submissions'}</h3><p>{!loaded ? 'Refresh to load verified data.' : leads.length ? 'Try another search or source.' : 'The Formspree inbox is empty.'}</p><Button onClick={() => { setQuery(''); setSource('All sources'); setTestFilter('All submissions'); setPersonFilter('') }}>Clear filters</Button></div>}
        </Card>
        <p className="privacy-note">Inbox records are raw submissions, not verified patients or qualified leads. Spam and Simplifeye bookings are excluded. Times shown in Pacific time.</p>
      </main>

      {selected && <>
        <button className="scrim" aria-label="Close lead details" onClick={closeLead} />
        <aside ref={dialogRef} className="detail-sheet" role="dialog" aria-modal="true" aria-labelledby="lead-detail-title" aria-describedby="lead-detail-notes">
          <div className="sheet-header"><div><span className="sheet-kicker">Lead details</span><h2 id="lead-detail-title">{selected.name || 'Name not provided'}</h2></div><IconButton label="Close lead details" onClick={closeLead}><X /></IconButton></div>
          <SourceBadge lead={selected} theme={theme} />
          <div className="detail-list">
            <div><span className="detail-icon"><Mail /></span><div><span>Email</span><strong>{selected.email || 'Not provided'}</strong></div></div>
            <div><span className="detail-icon"><Phone /></span><div><span>Phone</span><strong>{selected.phone || 'Not provided'}</strong></div></div>
            <div><span className="detail-icon"><CalendarDays /></span><div><span>Received</span><strong>{formatReceived(selected.received).date} at {formatReceived(selected.received).time} PT</strong></div></div>
          </div>
          <div className="submission-context"><p>Interested in: {selected.interest || 'Not provided'}</p><p>Form: {formLabel(selected.formType)}</p><p>Person type: {personLabel(selected.personType)}</p><p>{selected.isTest ? 'Flagged as a test submission' : 'No test flag provided'}</p><p>Reported source: {selected.source || 'Not provided'}</p><p>Page: {selected.pageUrl || 'Not provided'}</p><p>Referrer: {selected.referrer || 'Not provided'}</p></div>
          <div className="notes-panel"><span>Notes</span><p id="lead-detail-notes">{selected.notes}</p></div>
          <p className="sheet-footnote">Qualification and follow-up status have not been verified.</p>
        </aside>
      </>}
    </div>
  )
}

export default App
