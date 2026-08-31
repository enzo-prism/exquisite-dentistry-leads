import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDownUp,
  CalendarDays,
  ChevronDown,
  Clock3,
  ExternalLink,
  LayoutDashboard,
  Mail,
  Menu,
  MousePointerClick,
  Phone,
  Search,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  UserRound,
  Users,
  X,
} from './icons'
import { Badge, Button, Card, IconButton, Input } from './components/ui'

type Lead = {
  id: number
  name: string
  email: string
  phone: string
  source: string
  notes: string
  received: string
}

const leads: Lead[] = [
  { id: 1, name: 'Avery Bennett', email: 'avery.bennett@example.com', phone: '(617) 555-0142', source: 'Google Ads · Emergency', notes: 'Chipped front tooth and hoping to be seen this week.', received: '2026-08-30T09:42:00-04:00' },
  { id: 2, name: 'Maya Thompson', email: 'maya.thompson@example.com', phone: '(781) 555-0168', source: 'Google Ads · Invisalign', notes: 'Interested in a complimentary Invisalign consultation.', received: '2026-08-30T08:15:00-04:00' },
  { id: 3, name: 'Noah Sullivan', email: 'noah.sullivan@example.com', phone: '(339) 555-0129', source: 'Organic Search', notes: 'New patient looking for a cleaning and full exam.', received: '2026-08-29T16:28:00-04:00' },
  { id: 4, name: 'Sofia Martinez', email: 'sofia.martinez@example.com', phone: '(857) 555-0195', source: 'Meta Ads · Glow-Up', notes: 'Asked about the Lutronic Ultra facial special.', received: '2026-08-29T13:04:00-04:00' },
  { id: 5, name: 'Ethan Walker', email: 'ethan.walker@example.com', phone: '(978) 555-0117', source: 'Direct Website', notes: 'Wants to replace an older crown and discuss options.', received: '2026-08-28T11:37:00-04:00' },
  { id: 6, name: 'Chloe Rivera', email: 'chloe.rivera@example.com', phone: '(781) 555-0181', source: 'Patient Referral', notes: 'Referred by a current patient for cosmetic bonding.', received: '2026-08-27T15:52:00-04:00' },
  { id: 7, name: 'Liam Foster', email: 'liam.foster@example.com', phone: '(617) 555-0136', source: 'Google Ads · Emergency', notes: 'Experiencing tooth pain and requested the first opening.', received: '2026-08-27T09:21:00-04:00' },
  { id: 8, name: 'Amelia Park', email: 'amelia.park@example.com', phone: '(339) 555-0174', source: 'Organic Search', notes: 'Looking for a gentle dentist after moving to Melrose.', received: '2026-08-26T14:46:00-04:00' },
  { id: 9, name: 'Lucas Reed', email: 'lucas.reed@example.com', phone: '(781) 555-0108', source: 'Facebook', notes: 'Question about teeth whitening pricing and timing.', received: '2026-08-25T10:13:00-04:00' },
  { id: 10, name: 'Isla Morgan', email: 'isla.morgan@example.com', phone: '(617) 555-0159', source: 'Google Ads · Invisalign', notes: 'Comparing clear aligner options before an upcoming wedding.', received: '2026-08-24T12:35:00-04:00' },
  { id: 11, name: 'Henry Collins', email: 'henry.collins@example.com', phone: '(978) 555-0186', source: 'Direct Website', notes: 'Needs a routine appointment for two family members.', received: '2026-08-23T08:58:00-04:00' },
  { id: 12, name: 'Grace Kim', email: 'grace.kim@example.com', phone: '(857) 555-0122', source: 'Meta Ads · Glow-Up', notes: 'Interested in facial aesthetics and available packages.', received: '2026-08-22T17:20:00-04:00' },
]

const sourceTone = (source: string) => {
  if (source.startsWith('Google')) return 'green'
  if (source.startsWith('Meta') || source === 'Facebook') return 'gold'
  if (source === 'Patient Referral') return 'bronze'
  return 'neutral'
}

const formatReceived = (value: string) => {
  const date = new Date(value)
  return {
    date: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' }).format(date),
    time: new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }).format(date),
  }
}

function App() {
  const [query, setQuery] = useState('')
  const [source, setSource] = useState('All sources')
  const [sort, setSort] = useState('Newest first')
  const [selected, setSelected] = useState<Lead | null>(null)
  const [mobileNav, setMobileNav] = useState(false)
  const dialogRef = useRef<HTMLElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)

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

  const sources = useMemo(() => ['All sources', ...Array.from(new Set(leads.map((lead) => lead.source)))], [])
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return leads
      .filter((lead) => source === 'All sources' || lead.source === source)
      .filter((lead) => !needle || Object.values(lead).some((value) => String(value).toLowerCase().includes(needle)))
      .sort((a, b) => {
        if (sort === 'Oldest first') return +new Date(a.received) - +new Date(b.received)
        if (sort === 'Name A–Z') return a.name.localeCompare(b.name)
        return +new Date(b.received) - +new Date(a.received)
      })
  }, [query, source, sort])

  const topSource = useMemo(() => {
    const counts = leads.reduce<Record<string, number>>((acc, lead) => {
      const label = lead.source.split(' · ')[0]
      acc[label] = (acc[label] ?? 0) + 1
      return acc
    }, {})
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
  }, [])

  const latestReceived = Math.max(...leads.map((lead) => +new Date(lead.received)))
  const latestDay = new Date(latestReceived).toDateString()
  const recentCount = leads.filter((lead) => latestReceived - +new Date(lead.received) < 7 * 24 * 60 * 60 * 1000).length
  const latestDayCount = leads.filter((lead) => new Date(lead.received).toDateString() === latestDay).length

  const metrics = [
    { label: 'Total leads', value: leads.length, detail: 'Sample records', icon: Users },
    { label: 'Latest 7 days', value: recentCount, detail: 'Relative to sample set', icon: TrendingUp },
    { label: 'Latest sample day', value: latestDayCount, detail: 'Most recent date', icon: Sparkles },
    { label: 'Top source', value: topSource, detail: 'Across samples', icon: MousePointerClick },
  ]

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`} id="mobile-navigation">
        <div className="brand">
          <div className="brand-mark">ED</div>
          <div><strong>Exquisite</strong><span>Dentistry</span></div>
        </div>
        <nav aria-label="Primary navigation">
          <a className="nav-item nav-active" href="#leads"><LayoutDashboard /> Lead dashboard</a>
          <a className="nav-item" href="https://www.exquisitedentistry.com/" target="_blank" rel="noreferrer"><ExternalLink /> Practice website</a>
        </nav>
        <div className="sidebar-note">
          <span className="pulse-dot" />
          <div><strong>Demo workspace</strong><span>Sample data only</span></div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <IconButton label="Open navigation" className="menu-button" aria-controls="mobile-navigation" aria-expanded={mobileNav} onClick={() => setMobileNav((value) => !value)}><Menu /></IconButton>
          <div className="topbar-title"><span>Lead dashboard</span><ChevronDown /></div>
          <div className="profile"><div className="profile-copy"><strong>Practice Admin</strong><span>Exquisite Dentistry</span></div><div className="avatar"><UserRound /></div></div>
        </header>

        <div className="content" id="leads">
          <div className="page-heading">
            <div><div className="eyebrow"><span className="eyebrow-line" /> Growth overview</div><h1>Website leads</h1><p>Every new inquiry, organized in one calm, clear view.</p></div>
            <Badge tone="green"><span className="pulse-dot" /> Sample data</Badge>
          </div>

          <div className="metrics-grid">
            {metrics.map(({ label, value, detail, icon: Icon }) => (
              <Card className="metric-card" key={label}>
                <div className="metric-icon"><Icon /></div>
                <div className="metric-copy"><span>{label}</span><strong className={typeof value === 'string' ? 'metric-text' : ''}>{value}</strong><small>{detail}</small></div>
              </Card>
            ))}
          </div>

          <Card className="leads-card">
            <div className="table-heading">
              <div><h2>All leads</h2><p>{filtered.length} of {leads.length} sample leads</p></div>
              <div className="filters">
                <label className="search-box"><Search /><span className="sr-only">Search leads</span><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search leads…" /></label>
                <label className="select-wrap"><SlidersHorizontal /><span className="sr-only">Filter by source</span><select value={source} onChange={(event) => setSource(event.target.value)}>{sources.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown /></label>
                <label className="select-wrap sort-wrap"><ArrowDownUp /><span className="sr-only">Sort leads</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option>Newest first</option><option>Oldest first</option><option>Name A–Z</option></select><ChevronDown /></label>
              </div>
            </div>

            {filtered.length ? (
              <>
                <div className="table-scroll">
                  <table>
                    <thead><tr><th>Name</th><th>Contact</th><th>Source</th><th>Notes</th><th>Received</th></tr></thead>
                    <tbody>{filtered.map((lead) => {
                      const received = formatReceived(lead.received)
                      return <tr key={lead.id} onClick={() => openLead(lead)}>
                        <td><button className="lead-link" aria-haspopup="dialog" onClick={(event) => { event.stopPropagation(); openLead(lead) }}><span className="name-cell"><span className="initials">{lead.name.split(' ').map((part) => part[0]).join('')}</span><strong>{lead.name}</strong></span></button></td>
                        <td><div className="contact-cell"><span><Mail />{lead.email}</span><span><Phone />{lead.phone}</span></div></td>
                        <td><Badge tone={sourceTone(lead.source)}>{lead.source}</Badge></td>
                        <td><p className="notes-cell">{lead.notes}</p></td>
                        <td><div className="received-cell"><strong>{received.date}</strong><span>{received.time} ET</span></div></td>
                      </tr>
                    })}</tbody>
                  </table>
                </div>
                <div className="mobile-cards">{filtered.map((lead) => {
                  const received = formatReceived(lead.received)
                  return <button className="lead-card" key={lead.id} aria-haspopup="dialog" onClick={() => openLead(lead)}>
                    <span className="lead-card-top"><span className="name-cell"><span className="initials">{lead.name.split(' ').map((part) => part[0]).join('')}</span><strong>{lead.name}</strong></span><Badge tone={sourceTone(lead.source)}>{lead.source}</Badge></span>
                    <span className="lead-card-note">{lead.notes}</span>
                    <span className="lead-card-meta"><span><Mail />{lead.email}</span><span><Clock3 />{received.date}, {received.time}</span></span>
                  </button>
                })}</div>
              </>
            ) : (
              <div className="empty-state"><div className="empty-icon"><Search /></div><h3>No leads match these filters</h3><p>Try a different search or clear your filters.</p><Button onClick={() => { setQuery(''); setSource('All sources') }}>Clear filters</Button></div>
            )}
          </Card>
          <p className="privacy-note">Sample identities and contact details are fictional. No patient data is displayed.</p>
        </div>
      </main>

      {mobileNav && <button className="scrim nav-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
      {selected && <>
        <button className="scrim" aria-label="Close lead details" onClick={closeLead} />
        <aside ref={dialogRef} className="detail-sheet" role="dialog" aria-modal="true" aria-labelledby="lead-detail-title" aria-describedby="lead-detail-notes">
          <div className="sheet-header"><div><span className="sheet-kicker">Lead details</span><h2 id="lead-detail-title">{selected.name}</h2></div><IconButton label="Close lead details" onClick={closeLead}><X /></IconButton></div>
          <Badge tone={sourceTone(selected.source)}>{selected.source}</Badge>
          <div className="detail-list">
            <div><span className="detail-icon"><Mail /></span><div><span>Email</span><a href={`mailto:${selected.email}`}>{selected.email}</a></div></div>
            <div><span className="detail-icon"><Phone /></span><div><span>Phone</span><a href={`tel:${selected.phone}`}>{selected.phone}</a></div></div>
            <div><span className="detail-icon"><CalendarDays /></span><div><span>Received</span><strong>{formatReceived(selected.received).date} at {formatReceived(selected.received).time} ET</strong></div></div>
          </div>
          <div className="notes-panel"><span>Notes</span><p id="lead-detail-notes">{selected.notes}</p></div>
          <p className="sheet-footnote">This is a fictional lead created for the dashboard prototype.</p>
        </aside>
      </>}
    </div>
  )
}

export default App
