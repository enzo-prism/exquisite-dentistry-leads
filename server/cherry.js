const money = (value) => {
  const amount = Number(String(value).replace(/[$,\s]/g, ''))
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : null
}

export function parseCherryNotice({ id = '', date = '', subject = '', body = '' }) {
  const approved = String(subject).match(/^(.*?)\s+has been approved for \$?([0-9][0-9,]*(?:\.\d{2})?)\b/i)
  if (approved && /exquisite/i.test(subject)) {
    return { id, date, kind: 'approved', applicant: approved[1].trim(), amount: money(approved[2]), planId: '' }
  }
  if (!/successfully issued/i.test(subject) || !/\bExquisite Dentistry\b/i.test(`${subject}\n${body}`)) return null
  const amount = String(body).match(/Purchase Amount\s*[:\-]?\s*\$?\s*([0-9][0-9,]*(?:\.\d{2})?)/i)
  const plan = String(body).match(/Payment Plan ID\s*[:\-]?\s*([A-Za-z0-9-]+)/i)
  const name = String(body).match(/(?:^|\n)\s*Name\s*[:\-]\s*([^\n]+)/i)
  return {
    id,
    date,
    kind: 'issued',
    applicant: (name?.[1] || '').trim(),
    amount: amount ? money(amount[1]) : null,
    planId: plan?.[1] || '',
  }
}

const sum = (rows) => Math.round(rows.reduce((total, row) => total + (row.amount || 0), 0) * 100) / 100

export function summarizeCherry(notices) {
  const rows = [...notices].sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0))
  const approved = rows.filter((row) => row.kind === 'approved')
  const issued = rows.filter((row) => row.kind === 'issued')
  return {
    approvedCount: approved.length,
    approvedAmount: sum(approved),
    approvedAmountMissingCount: approved.filter((row) => row.amount == null).length,
    issuedCount: issued.length,
    issuedAmount: sum(issued),
    issuedAmountMissingCount: issued.filter((row) => row.amount == null).length,
    rows,
  }
}
