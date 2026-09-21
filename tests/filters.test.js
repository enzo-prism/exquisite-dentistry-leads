import test from 'node:test'
import assert from 'node:assert/strict'
import { filterLeads, sortLeads, filterCherry, sortCherry, filterSignals, sortSignals } from '../src/filters.js'

const now = Date.parse('2026-09-21T17:00:00.000Z')
const day = 86400000
const lead = (overrides) => ({ name: 'Avery', email: 'avery@example.com', phone: '555', notes: 'veneers', channel: 'Google', campaign: '', formType: 'contact', personType: 'Thinking about becoming a new patient', interest: '', pageUrl: '/contact/', received: new Date(now - 2 * day).toISOString(), isTest: false, ...overrides })

test('lead filters combine window, form, contact, tests and search', () => {
  const rows = [
    lead({}),
    lead({ name: 'Old', received: new Date(now - 40 * day).toISOString(), formType: 'insurance_benefits', phone: '', email: '' }),
    lead({ name: 'Test', isTest: true, channel: 'ChatGPT', formType: 'chatgpt_ads_consultation' }),
    lead({ name: 'Undated', received: '', phone: '', email: 'undated@example.com' }),
  ]
  const week = filterLeads(rows, { window: '7', source: 'all', form: '', person: '', tests: 'exclude', contact: 'any', query: '' }, now)
  assert.deepEqual(week.map((row) => row.name), ['Avery'])
  const benefits = filterLeads(rows, { window: 'all', source: 'all', form: 'insurance_benefits', person: '', tests: 'all', contact: 'missing', query: '' }, now)
  assert.deepEqual(benefits.map((row) => row.name), ['Old'])
  const search = filterLeads(rows, { window: 'all', source: 'ChatGPT', form: '', person: '', tests: 'only', contact: 'any', query: 'test' }, now)
  assert.deepEqual(search.map((row) => row.name), ['Test'])
  assert.deepEqual(filterLeads(rows, { window: '30', source: 'all', form: '', person: '', tests: 'all', contact: 'any', query: '' }, now).map((row) => row.name), ['Avery', 'Test'])
})

test('lead sort is stable for name, form and date', () => {
  const rows = [
    lead({ name: 'Zoe', received: new Date(now - day).toISOString(), formType: 'contact' }),
    lead({ name: 'Amy', received: new Date(now - 3 * day).toISOString(), formType: 'insurance_benefits' }),
  ]
  assert.deepEqual(sortLeads(rows, 'name-asc').map((row) => row.name), ['Amy', 'Zoe'])
  assert.deepEqual(sortLeads(rows, 'name-desc').map((row) => row.name), ['Zoe', 'Amy'])
  assert.deepEqual(sortLeads(rows, 'oldest').map((row) => row.name), ['Amy', 'Zoe'])
  assert.deepEqual(sortLeads(rows, 'newest').map((row) => row.name), ['Zoe', 'Amy'])
  assert.equal(sortLeads(rows, 'form')[0].formType, 'contact')
})

test('cherry and signal tables filter and sort independently', () => {
  const cherry = [
    { applicant: 'Zoe', kind: 'approved', amount: 1000, planId: '', date: '2026-09-01' },
    { applicant: 'Amy', kind: 'issued', amount: 8000, planId: 'LN-2', date: '2026-08-01' },
  ]
  assert.equal(filterCherry(cherry, { status: 'issued', query: 'ln-2' }).length, 1)
  assert.equal(sortCherry(cherry, 'amount-desc')[0].applicant, 'Amy')
  assert.equal(sortCherry(cherry, 'name')[0].applicant, 'Amy')
  const signals = [
    { label: 'Phone', count: 2, source: 'Vercel Analytics' },
    { label: 'Contact form', count: 9, source: 'Formspree' },
  ]
  assert.deepEqual(filterSignals(signals, 'Formspree').map((row) => row.label), ['Contact form'])
  assert.deepEqual(sortSignals(signals, 'count-asc').map((row) => row.label), ['Phone', 'Contact form'])
})
