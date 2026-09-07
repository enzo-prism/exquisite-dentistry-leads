import test from 'node:test'
import assert from 'node:assert/strict'
import { config, issueSession, validSession, sameOrigin, sessionCookie, authenticated } from '../server/auth.js'
import { normalize, fetchLeads } from '../server/formspree.js'
import leadsHandler from '../api/leads.js'
import loginHandler from '../api/login.js'
import logoutHandler from '../api/logout.js'

const secret = 'synthetic-test-secret-at-least-32-characters'
const now = 1800000000000
test('signed sessions reject tampering, expiry and wrong secret', () => {
  const token = issueSession(secret, now)
  assert.equal(validSession(token, secret, now), true)
  assert.equal(validSession(`${token}x`, secret, now), false)
  assert.equal(validSession(token, `${secret}x`, now), false)
  assert.equal(validSession(token, secret, now + 4 * 3600000), false)
  assert.equal(validSession('malformed', secret, now), false)
})
test('configuration fails closed and cookie has browser protection', () => {
  assert.equal(config({}), null)
  assert.equal(config({ DASHBOARD_PASSWORD: 'michael', SESSION_SECRET: secret }), null)
  assert.deepEqual(config({ DASHBOARD_PASSWORD: '12345678', SESSION_SECRET: secret }), { password: '12345678', secret })
  assert.deepEqual(config({ DASHBOARD_PASSWORD: 'exquisite', SESSION_SECRET: secret }), { password: 'exquisite', secret })
  assert.equal(config({ DASHBOARD_PASSWORD: '12345678', SESSION_SECRET: 'too-short-session-secret' }), null)
  assert.match(sessionCookie('test'), /__Host-.*HttpOnly; Secure; SameSite=Strict/)
  assert.match(sessionCookie('', true), /Max-Age=0/)
  assert.equal(authenticated({ headers: { cookie: 'exquisite-leads-access=granted' } }, { secret }), false)
})
test('mutating auth endpoints require strict HTTPS origin', () => {
  assert.equal(sameOrigin({ headers: { host: 'leads.example.com', origin: 'https://leads.example.com' } }), true)
  for (const origin of ['https://evil.example.com', 'null', 'http://leads.example.com', undefined]) {
    assert.equal(sameOrigin({ headers: { host: 'leads.example.com', origin } }), false)
  }
})
test('HTTP origin exception is limited to explicit development loopback hosts', () => {
  const local = { headers: { host: 'localhost:4173', origin: 'http://localhost:4173' } }
  assert.equal(sameOrigin(local, { NODE_ENV: 'development' }), true)
  assert.equal(sameOrigin(local, { NODE_ENV: 'production' }), false)
  assert.equal(sameOrigin(local, {}), false)
  assert.equal(sameOrigin({ headers: { host: '127.0.0.1:4173', origin: 'http://127.0.0.1:4173' } }, { NODE_ENV: 'development' }), true)
  assert.equal(sameOrigin({ headers: { host: 'remote.invalid', origin: 'http://remote.invalid' } }, { NODE_ENV: 'development' }), false)
  assert.equal(sameOrigin({ headers: { host: 'localhost:4173', origin: 'http://localhost:4174' } }, { NODE_ENV: 'development' }), false)
})
test('normalization preserves contact and message, unknown attribution, UTC and stable identity', () => {
  const row = { name: 'Synthetic Person', email: 'test@example.invalid', phone: '+1 555 0100', message: '<script>text</script>\nOriginal message', _date: '2026-09-01T12:00:00.123456' }
  const lead = normalize(row)
  assert.equal(lead.notes, row.message)
  assert.equal(lead.phone, row.phone)
  assert.equal(lead.channel, 'Unknown')
  assert.equal(lead.received, '2026-09-01T12:00:00.123Z')
  assert.equal(lead.id, normalize(Object.fromEntries(Object.entries(row).reverse())).id)
  assert.equal(normalize({ _date: 'bad' }).received, null)
  assert.equal(normalize({ utm_source: 'google', utm_campaign: 'real supplied value' }).channel, 'Google')
})
test('read-only API paginates entire inbox and excludes explicit spam', async () => {
  const urls = []
  const result = await fetchLeads('synthetic-key', async (url, opts) => {
    urls.push(url)
    assert.equal(opts.method, 'GET')
    assert.equal(opts.headers.Authorization, 'Bearer synthetic-key')
    assert.match(url, /spam=false/)
    const submissions = urls.length === 1 ? Array.from({ length: 100 }, (_, id) => ({ _id: String(id), _date: '2026-09-01T00:00:00Z' })) : [{ _id: '100', spam: true }, { _id: '101' }]
    return { ok: true, json: async () => ({ submissions }) }
  })
  assert.equal(urls.length, 2)
  assert.match(urls[1], /offset=100/)
  assert.equal(result.leads.length, 101)
  assert.equal(result.meta.complete, true)
})
test('observed website field keys preserve explicit form, persona, interest and test metadata', () => {
  const lead = normalize({ form_key: 'contact', _subject: 'legacy subject', whichBestDescribesYou: 'New patient', page_path: '/contact', consultation_interest: 'Consultation', _codex_test: 'true' })
  assert.equal(lead.formType, 'contact')
  assert.equal(lead.personType, 'New patient')
  assert.equal(lead.pageUrl, '/contact')
  assert.equal(lead.interest, 'Consultation')
  assert.equal(lead.isTest, true)
  assert.equal(normalize({ _codex_test: true }).isTest, true)
  assert.equal(normalize({ whichBestDescribesYou: 'Existing patient' }).personType, 'Existing patient')
  assert.equal(normalize({ message: 'Testing options for my teeth' }).isTest, false)
})
test('untrusted attribution cannot resolve inherited dictionary properties', () => {
  for (const source of ['__proto__', 'constructor', 'toString', 'hasOwnProperty']) {
    const lead = normalize({ utm_source: source })
    assert.equal(lead.channel, source)
    assert.equal(typeof lead.channel, 'string')
  }
})
test('oversized upstream response is rejected without a partial result', async () => {
  await assert.rejects(fetchLeads('test', async () => new Response('ignored', { headers: { 'content-length': String(6 * 1024 * 1024) } })), /upstream_invalid/)
  await assert.rejects(fetchLeads('test', async () => new Response('x'.repeat(6 * 1024 * 1024))), /upstream_invalid/)
  const result = await fetchLeads('test', async () => new Response(JSON.stringify({ submissions: [{ _id: 'synthetic-stream' }] })))
  assert.equal(result.leads.length, 1)
})
test('API failures and repeating pages never return partial success', async () => {
  await assert.rejects(fetchLeads('', async () => {}), /unconfigured/)
  await assert.rejects(fetchLeads('test', async () => ({ ok: false })), /unavailable/)
  await assert.rejects(fetchLeads('test', async () => ({ ok: true, json: async () => ({}) })), /invalid/)
  await assert.rejects(fetchLeads('test', async () => ({ ok: true, json: async () => ({ submissions: Array.from({ length: 100 }, (_, id) => ({ _id: String(id) })) }) })), /pagination_changed/)
})
const response = () => ({ headers: {}, setHeader(k, v) { this.headers[k] = v }, status(value) { this.code = value; return this }, json(value) { this.body = value; return this } })
test('protected endpoint never returns leads without authentication and never caches responses', async () => {
  const original = { password: process.env.DASHBOARD_PASSWORD, secret: process.env.SESSION_SECRET }
  process.env.DASHBOARD_PASSWORD = 'synthetic-long-password'
  process.env.SESSION_SECRET = secret
  try {
    const res = response()
    await leadsHandler({ method: 'GET', headers: {} }, res)
    assert.equal(res.code, 401)
    assert.equal(res.body.leads, undefined)
    assert.match(res.headers['Cache-Control'], /no-store/)
    assert.equal(res.headers['Vercel-CDN-Cache-Control'], 'no-store')
    const rejected = response()
    loginHandler({ method: 'POST', headers: { host: 'test.invalid', origin: 'https://evil.invalid' }, body: { password: 'synthetic-long-password' } }, rejected)
    assert.equal(rejected.code, 403)
    const validRequest = { method: 'POST', headers: { host: 'test.invalid', origin: 'https://test.invalid', 'content-type': 'application/json' }, body: { password: 'synthetic-long-password' } }
    const accepted = response()
    loginHandler(validRequest, accepted)
    assert.equal(accepted.code, 200)
    const cookie = accepted.headers['Set-Cookie'].split(';')[0]
    assert.equal(authenticated({ headers: { cookie } }, { secret }), true)
    const wrong = response()
    loginHandler({ ...validRequest, body: { password: 'wrong' } }, wrong)
    assert.equal(wrong.code, 401)
    const noKey = response()
    const savedKey = process.env.FORMSPREE_READ_KEY
    delete process.env.FORMSPREE_READ_KEY
    try {
      await leadsHandler({ method: 'GET', headers: { cookie } }, noKey)
      assert.equal(noKey.code, 503)
    } finally { if (savedKey !== undefined) process.env.FORMSPREE_READ_KEY = savedKey }
    const loggedOut = response()
    logoutHandler({ method: 'POST', headers: { host: 'test.invalid', origin: 'https://test.invalid' } }, loggedOut)
    assert.equal(loggedOut.code, 200)
    assert.match(loggedOut.headers['Set-Cookie'], /Max-Age=0/)
  } finally {
    for (const [key, value] of [['DASHBOARD_PASSWORD', original.password], ['SESSION_SECRET', original.secret]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value
    }
  }
})

test('full notes retain distinct message fields, paragraphs and long content without duplicating aliases', () => {
  const message = `First paragraph.\n\n${'Long synthetic note. '.repeat(500)}\nLast line.`
  const notes = 'Additional details\nPlease call after 3pm.'
  assert.equal(normalize({ message, notes, Message: message }).notes, `${message}\n\n${notes}`)
  assert.equal(normalize({ message: ' ', notes: 'Only notes' }).notes, 'Only notes')
  assert.equal(normalize({ message: '<script>text only</script>' }).notes, '<script>text only</script>')
  assert.equal(normalize({}).notes, '')
})
