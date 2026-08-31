import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDownUp,
  CalendarDays,
  ChevronDown,
  Clock3,
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

type Channel = 'Google' | 'Instagram' | 'TikTok' | 'ChatGPT'
type Lead = {
  id: number
  name: string
  email: string
  phone: string
  channel: Channel
  campaign: string
  notes: string
  received: string
}

const leads: Lead[] = [
  { id: 1, name: 'Avery Bennett', email: 'avery.bennett@example.com', phone: '(617) 555-0142', channel: 'Google', campaign: 'Emergency Dentistry', notes: 'Chipped front tooth and hoping to be seen this week.', received: '2026-08-30T09:42:00-04:00' },
  { id: 2, name: 'Maya Thompson', email: 'maya.thompson@example.com', phone: '(781) 555-0168', channel: 'Instagram', campaign: 'Invisalign Consult', notes: 'Interested in a complimentary Invisalign consultation.', received: '2026-08-30T08:15:00-04:00' },
  { id: 3, name: 'Noah Sullivan', email: 'noah.sullivan@example.com', phone: '(339) 555-0129', channel: 'ChatGPT', campaign: 'Practice discovery', notes: 'New patient looking for a cleaning and full exam.', received: '2026-08-29T16:28:00-04:00' },
  { id: 4, name: 'Sofia Martinez', email: 'sofia.martinez@example.com', phone: '(857) 555-0195', channel: 'TikTok', campaign: 'Ultra Glow-Up', notes: 'Asked about the Lutronic Ultra facial special.', received: '2026-08-29T13:04:00-04:00' },
  { id: 5, name: 'Ethan Walker', email: 'ethan.walker@example.com', phone: '(978) 555-0117', channel: 'Google', campaign: 'Cosmetic Dentistry', notes: 'Wants to replace an older crown and discuss options.', received: '2026-08-28T11:37:00-04:00' },
  { id: 6, name: 'Chloe Rivera', email: 'chloe.rivera@example.com', phone: '(781) 555-0181', channel: 'Instagram', campaign: 'Smile Design', notes: 'Interested in cosmetic bonding after seeing a patient result.', received: '2026-08-27T15:52:00-04:00' },
  { id: 7, name: 'Liam Foster', email: 'liam.foster@example.com', phone: '(617) 555-0136', channel: 'Google', campaign: 'Emergency Dentistry', notes: 'Experiencing tooth pain and requested the first opening.', received: '2026-08-27T09:21:00-04:00' },
  { id: 8, name: 'Amelia Park', email: 'amelia.park@example.com', phone: '(339) 555-0174', channel: 'ChatGPT', campaign: 'Local recommendation', notes: 'Looking for a gentle dentist after moving to Melrose.', received: '2026-08-26T14:46:00-04:00' },
  { id: 9, name: 'Lucas Reed', email: 'lucas.reed@example.com', phone: '(781) 555-0108', channel: 'TikTok', campaign: 'Whitening', notes: 'Question about teeth whitening pricing and timing.', received: '2026-08-25T10:13:00-04:00' },
  { id: 10, name: 'Isla Morgan', email: 'isla.morgan@example.com', phone: '(617) 555-0159', channel: 'Google', campaign: 'Invisalign Consult', notes: 'Comparing clear aligner options before an upcoming wedding.', received: '2026-08-24T12:35:00-04:00' },
  { id: 11, name: 'Henry Collins', email: 'henry.collins@example.com', phone: '(978) 555-0186', channel: 'Instagram', campaign: 'New Patient', notes: 'Needs a routine appointment for two family members.', received: '2026-08-23T08:58:00-04:00' },
  { id: 12, name: 'Grace Kim', email: 'grace.kim@example.com', phone: '(857) 555-0122', channel: 'TikTok', campaign: 'Ultra Glow-Up', notes: 'Interested in facial aesthetics and available packages.', received: '2026-08-22T17:20:00-04:00' },
]

const channelAssets: Record<Channel, { light: string; dark?: string; apiLight: string; apiDark?: string }> = {
  Google: { light: '/logos/google.svg', apiLight: 'https://api.svgl.app/svg/google.svg' },
  Instagram: { light: '/logos/instagram.svg', apiLight: 'https://api.svgl.app/svg/instagram-icon.svg' },
  TikTok: { light: '/logos/tiktok-light.svg', dark: '/logos/tiktok-dark.svg', apiLight: 'https://api.svgl.app/svg/tiktok-icon-light.svg', apiDark: 'https://api.svgl.app/svg/tiktok-icon-dark.svg' },
  ChatGPT: { light: '/logos/openai-light.svg', dark: '/logos/openai-dark.svg', apiLight: 'https://api.svgl.app/svg/openai.svg', apiDark: 'https://api.svgl.app/svg/openai_dark.svg' },
}

function SourceLogo({ channel, theme }: { channel: Channel; theme: 'light' | 'dark' }) {
  const asset = channelAssets[channel]
  const localSource = theme === 'dark' && asset.dark ? asset.dark : asset.light
  const apiSource = theme === 'dark' && asset.apiDark ? asset.apiDark : asset.apiLight
  const [failed, setFailed] = useState(false)

  useEffect(() => setFailed(false), [localSource])

  return <span className="source-logo-frame" data-svgl-url={apiSource} aria-hidden="true">
    {failed ? <span className="source-logo-fallback">{channel === 'ChatGPT' ? 'AI' : channel.slice(0, 1)}</span> : <img
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
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('exquisite-theme')
    if (saved === 'light' || saved === 'dark') return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  const dialogRef = useRef<HTMLElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.style.colorScheme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0d100f' : '#f4f4f0')
    localStorage.setItem('exquisite-theme', theme)
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
      .filter((lead) => !needle || Object.values(lead).some((value) => String(value).toLowerCase().includes(needle)))
      .sort((a, b) => {
        if (sort === 'Oldest first') return +new Date(a.received) - +new Date(b.received)
        if (sort === 'Name A–Z') return a.name.localeCompare(b.name)
        return +new Date(b.received) - +new Date(a.received)
      })
  }, [query, source, sort])

  const latestReceived = Math.max(...leads.map((lead) => +new Date(lead.received)))
  const recentCount = leads.filter((lead) => latestReceived - +new Date(lead.received) < 7 * 24 * 60 * 60 * 1000).length
  const topSource = Object.entries(leads.reduce<Record<string, number>>((counts, lead) => ({ ...counts, [lead.channel]: (counts[lead.channel] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1])[0][0]
  const sourceCounts = leads.reduce<Record<Channel, number>>((counts, lead) => ({ ...counts, [lead.channel]: counts[lead.channel] + 1 }), { Google: 0, Instagram: 0, TikTok: 0, ChatGPT: 0 })

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
          <IconButton className="topbar-theme" label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} aria-pressed={theme === 'dark'} onClick={() => setTheme((value) => value === 'light' ? 'dark' : 'light')}>
            {theme === 'light' ? <Moon /> : <Sun />}
          </IconButton>
          <div className="profile"><div className="profile-copy"><strong>Practice Admin</strong><span>Demo workspace</span></div><div className="avatar"><UserRound /></div></div>
        </div>
      </header>

      <main className="content" id="leads">
        <section className="page-heading">
          <div className="heading-copy"><span className="section-label">Lead dashboard</span><h1>Website leads</h1><p>Incoming inquiries, without the noise.</p></div>
          <div className="brand-emblem" aria-hidden="true"><span className="emblem-index">01</span><img src="/brand/exquisite-icon.png" alt="" /></div>
        </section>

        <section className="summary" aria-label="Lead summary">
          <div><strong>{leads.length}</strong><span>Total leads</span></div>
          <div><strong>{recentCount}</strong><span>Latest 7 days</span></div>
          <div><strong>{topSource}</strong><span>Top source</span></div>
          <div className="sample-status"><span className="status-dot" /> Sample data</div>
        </section>

        <section className="source-overview" aria-label="Lead source attribution">
          <div className="source-overview-title"><span>Attribution</span><strong>Lead sources</strong></div>
          <div className="source-overview-list">
            {(Object.keys(channelAssets) as Channel[]).map((channel) => <button
              className="source-filter"
              data-active={source === channel}
              key={channel}
              type="button"
              aria-pressed={source === channel}
              onClick={() => setSource((value) => value === channel ? 'All sources' : channel)}
            >
              <SourceLogo channel={channel} theme={theme} />
              <span><strong>{channel}</strong><small>{sourceCounts[channel]} leads</small></span>
            </button>)}
          </div>
        </section>

        <Card className="leads-card">
          <div className="table-heading">
            <div><h2>All leads</h2><p>{filtered.length} shown</p></div>
            <div className="filters">
              <label className="search-box"><Search /><span className="sr-only">Search leads</span><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search leads" /></label>
              <label className="select-wrap"><SlidersHorizontal /><span className="sr-only">Filter by source</span><select value={source} onChange={(event) => setSource(event.target.value)}><option>All sources</option>{Object.keys(channelAssets).map((item) => <option key={item}>{item}</option>)}</select><ChevronDown /></label>
              <label className="select-wrap sort-wrap"><ArrowDownUp /><span className="sr-only">Sort leads</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option>Newest first</option><option>Oldest first</option><option>Name A–Z</option></select><ChevronDown /></label>
            </div>
          </div>

          {filtered.length ? <>
            <div className="table-scroll">
              <table>
                <thead><tr><th>Lead</th><th>Contact</th><th>Source</th><th>Notes</th><th>Received</th></tr></thead>
                <tbody>{filtered.map((lead) => {
                  const received = formatReceived(lead.received)
                  return <tr key={lead.id}>
                    <td><button className="lead-link" aria-haspopup="dialog" onClick={() => openLead(lead)}><span>{lead.name}</span><small>View details</small></button></td>
                    <td><div className="contact-cell"><span><Mail />{lead.email}</span><span><Phone />{lead.phone}</span></div></td>
                    <td><SourceBadge lead={lead} theme={theme} /></td>
                    <td><p className="notes-cell">{lead.notes}</p></td>
                    <td><div className="received-cell"><strong>{received.date}</strong><span>{received.time} ET</span></div></td>
                  </tr>
                })}</tbody>
              </table>
            </div>
            <div className="mobile-cards">{filtered.map((lead) => {
              const received = formatReceived(lead.received)
              return <button className="lead-card" key={lead.id} aria-haspopup="dialog" onClick={() => openLead(lead)}>
                <span className="lead-card-top"><strong>{lead.name}</strong><SourceBadge lead={lead} theme={theme} /></span>
                <span className="lead-card-note">{lead.notes}</span>
                <span className="lead-card-meta"><span><Mail />{lead.email}</span><span><Phone />{lead.phone}</span><span><Clock3 />{received.date}, {received.time}</span></span>
              </button>
            })}</div>
          </> : <div className="empty-state"><div className="empty-icon"><Search /></div><h3>No matching leads</h3><p>Try another search or source.</p><Button onClick={() => { setQuery(''); setSource('All sources') }}>Clear filters</Button></div>}
        </Card>
        <p className="privacy-note">Fictional sample identities only. No patient data.</p>
      </main>

      {selected && <>
        <button className="scrim" aria-label="Close lead details" onClick={closeLead} />
        <aside ref={dialogRef} className="detail-sheet" role="dialog" aria-modal="true" aria-labelledby="lead-detail-title" aria-describedby="lead-detail-notes">
          <div className="sheet-header"><div><span className="sheet-kicker">Lead details</span><h2 id="lead-detail-title">{selected.name}</h2></div><IconButton label="Close lead details" onClick={closeLead}><X /></IconButton></div>
          <SourceBadge lead={selected} theme={theme} />
          <div className="detail-list">
            <div><span className="detail-icon"><Mail /></span><div><span>Email</span><a href={`mailto:${selected.email}`}>{selected.email}</a></div></div>
            <div><span className="detail-icon"><Phone /></span><div><span>Phone</span><a href={`tel:${selected.phone}`}>{selected.phone}</a></div></div>
            <div><span className="detail-icon"><CalendarDays /></span><div><span>Received</span><strong>{formatReceived(selected.received).date} at {formatReceived(selected.received).time} ET</strong></div></div>
          </div>
          <div className="notes-panel"><span>Notes</span><p id="lead-detail-notes">{selected.notes}</p></div>
          <p className="sheet-footnote">Fictional lead for this dashboard prototype.</p>
        </aside>
      </>}
    </div>
  )
}

export default App
