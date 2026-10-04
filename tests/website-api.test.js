import test from 'node:test'
import assert from 'node:assert/strict'
import handler from '../api/website.js'
import { issueSession } from '../server/auth.js'
test('website API authenticates before provider reads and keeps fixtures development-only', async () => {
  const saved = { ...process.env }, originalFetch = global.fetch
  let calls = 0
  global.fetch = async () => { calls++; throw Error('Unexpected provider call') }
  const request = async (method = 'GET', cookie = '') => {
    const res = { headers: {}, setHeader(k,v) { this.headers[k] = v }, status(v) { this.code = v; return this }, json(v) { this.body = v; return this } }
    await handler({ method, headers: { cookie } }, res)
    assert.match(res.headers['Cache-Control'], /private, no-store/)
    return res
  }
  try {
    process.env.DASHBOARD_PASSWORD = 'synthetic-password'
    process.env.SESSION_SECRET = 'synthetic-secret-longer-than-thirty-two-characters'
    delete process.env.GOOGLE_ANALYTICS_SERVICE_ACCOUNT_JSON
    assert.equal((await request()).code, 401)
    assert.equal((await request('POST')).code, 405)
    assert.equal(calls, 0)
    const cookie = `__Host-exquisite_session=${issueSession(process.env.SESSION_SECRET)}`
    process.env.PATHWAYS_MODE = 'synthetic'
    process.env.NODE_ENV = 'development'
    assert.equal((await request('GET', cookie)).body.ga4.status, 'synthetic')
    process.env.NODE_ENV = 'production'
    const production = await request('GET', cookie)
    assert.equal(production.body.ga4.status, 'unavailable')
    assert.equal(production.body.gsc.status, 'unavailable')
    assert.equal(calls, 0)
  } finally { global.fetch = originalFetch; for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key]; Object.assign(process.env, saved) }
})
