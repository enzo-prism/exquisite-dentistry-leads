const text = (value) => String(value || '').toLowerCase()
const time = (value) => {
  const parsed = new Date(value || '').getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

export const leadWindows = [
  { id: '7', label: '7 days' },
  { id: '30', label: '30 days' },
  { id: '90', label: '90 days' },
  { id: 'all', label: 'All time' },
]

export function filterLeads(leads, filters, now = Date.now()) {
  const needle = text(filters.query).trim()
  const windowMs = filters.window === 'all' ? null : Number(filters.window) * 86400000
  return leads.filter((lead) => {
    if (filters.source && filters.source !== 'all' && lead.channel !== filters.source) return false
    if (filters.form && (lead.formType || 'Not provided') !== filters.form) return false
    if (filters.person && (lead.personType || 'Not provided') !== filters.person) return false
    if (filters.tests === 'exclude' && lead.isTest === true) return false
    if (filters.tests === 'only' && lead.isTest !== true) return false
    const hasPhone = Boolean(String(lead.phone || '').trim())
    const hasEmail = Boolean(String(lead.email || '').trim())
    if (filters.contact === 'phone' && !hasPhone) return false
    if (filters.contact === 'email' && !hasEmail) return false
    if (filters.contact === 'missing' && (hasPhone || hasEmail)) return false
    if (windowMs != null) {
      const received = time(lead.received)
      if (!received || now - received < 0 || now - received >= windowMs) return false
    }
    if (!needle) return true
    return [lead.name, lead.email, lead.phone, lead.notes, lead.channel, lead.campaign, lead.formType, lead.personType, lead.interest, lead.pageUrl].some((value) => text(value).includes(needle))
  })
}

export function sortLeads(leads, sort) {
  const rows = [...leads]
  rows.sort((a, b) => {
    if (sort === 'oldest') return time(a.received) - time(b.received)
    if (sort === 'name-asc') return text(a.name).localeCompare(text(b.name))
    if (sort === 'name-desc') return text(b.name).localeCompare(text(a.name))
    if (sort === 'form') return text(a.formType).localeCompare(text(b.formType)) || time(b.received) - time(a.received)
    return time(b.received) - time(a.received)
  })
  return rows
}

export function filterCherry(rows, { query = '', status = 'all' } = {}) {
  const needle = text(query).trim()
  return rows.filter((row) => {
    if (status !== 'all' && row.kind !== status) return false
    if (!needle) return true
    return [row.applicant, row.planId, row.kind].some((value) => text(value).includes(needle))
  })
}

export function sortCherry(rows, sort) {
  const copy = [...rows]
  copy.sort((a, b) => {
    if (sort === 'oldest') return time(a.date) - time(b.date)
    if (sort === 'amount-desc') return (b.amount || 0) - (a.amount || 0)
    if (sort === 'amount-asc') return (a.amount || 0) - (b.amount || 0)
    if (sort === 'name') return text(a.applicant).localeCompare(text(b.applicant))
    return time(b.date) - time(a.date)
  })
  return copy
}

export function filterSignals(rows, source = 'all') {
  return source === 'all' ? rows : rows.filter((row) => row.source === source)
}

export function sortSignals(rows, sort) {
  const copy = [...rows]
  copy.sort((a, b) => {
    if (sort === 'count-asc') return (a.count ?? -1) - (b.count ?? -1)
    if (sort === 'name') return text(a.label).localeCompare(text(b.label))
    return (b.count ?? -1) - (a.count ?? -1)
  })
  return copy
}
