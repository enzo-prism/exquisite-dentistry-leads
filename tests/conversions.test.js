import test from 'node:test'
import assert from 'node:assert/strict'
import { reconcileConversions, reconciliationConfig } from '../server/openai-reconciliation.js'
import { prepareProviderSubmission } from '../server/openai-conversion-validation.js'
import handler from '../api/reconcile-conversions.js'
const now = Date.parse('2026-09-15T18:00:00Z')
const cfg = { formspreeKey: 'fixture-read', apiKey: 'fixture-capi', pixelId: 'V7dxjf8kBAWERq3f9VG2wM' }
const row = () => ({ _date: new Date(now).toISOString(), _id: 'receipt-1', site: 'exquisite', environment: 'production', form_key: 'chatgpt_ads_consultation', _codex_test: 'false', measurement_acquisition_lead: 'true', measurement_ads_consent: 'granted', measurement_consent_version: 'v2', measurement_consent_updated_at: '2026-09-15T17:00:00.000Z', measurement_event_timestamp_ms: String(now), measurement_event_id: '123e4567-e89b-42d3-a456-426614174000', measurement_source_url: 'https://exquisitedentistryla.com/lp/chatgpt/', oppref: 'original+opaque/id==', email: 'private@invalid.local', message: 'Private health inquiry' })
const response = rows => new Response(JSON.stringify({ submissions: rows }), { headers: { 'Content-Type': 'application/json' } })
test('reconciliation reads only provider and validates minimal events without ingestion', async () => {
  const calls = []
  const fetcher = async (url, init) => { calls.push({ url, init }); return url.startsWith('https://formspree.io/') ? response([row()]) : new Response('{}') }
  const result = await reconcileConversions(cfg, { fetcher, now })
  assert.equal(result.conversionsSent, 0); assert.equal(result.eligible, 1)
  const sent = JSON.parse(calls[1].init.body)
  assert.equal(sent.validate_only, true); assert.equal(sent.events[0].id, row().measurement_event_id)
  assert.equal(sent.events[0].oppref, row().oppref); assert.equal(sent.events[0].opt_out, true)
  assert.equal(calls[1].init.body.includes('private'), false); assert.equal(calls[1].init.body.includes('Private health'), false)
  assert.equal(calls[1].init.redirect, 'error')
})
test('old, denied, test, nonpatient, invalid source and absent attribution never reach OpenAI', async () => {
  for (const patch of [{ spam: true }, { _spam: true }, { _codex_test: 'true' }, { measurement_ads_consent: 'denied' }, { measurement_consent_updated_at: '' }, { measurement_event_timestamp_ms: String(now - 8 * 86400_000) }, { form_key: 'insurance_benefits' }, { measurement_source_url: 'https://evil.invalid/contact/' }, { oppref: '' }]) {
    let calls = 0
    const result = await reconcileConversions(cfg, { now, fetcher: async () => { calls++; return response([{ ...row(), ...patch }]) } })
    assert.equal(result.eligible, 0); assert.equal(calls, 1)
  }
})
test('upstream failure fails closed; same ID conflicting payload aborts before validation', async () => {
  await assert.rejects(reconcileConversions(cfg, { now, fetcher: async () => new Response('', { status: 503 }) }))
  const changed = { ...row(), _id: 'receipt-2', oppref: 'different' }
  await assert.rejects(reconcileConversions(cfg, { now, fetcher: async () => response([row(), changed]) }), /conflicting_event_id/)
})
test('slash normalization and contact persona checks match browser forms', () => {
  const submission = { ...row(), measurement_source_url: 'https://exquisitedentistryla.com/contact', form_key: 'contact', whichBestDescribesYou: 'Thinking about becoming a new patient' }
  assert.equal(prepareProviderSubmission({ form: 'xkgknpkl', submission }, 'xkgknpkl', now).accepted, true)
  submission.whichBestDescribesYou = 'Existing patient'
  assert.equal(prepareProviderSubmission({ form: 'xkgknpkl', submission }, 'xkgknpkl', now).accepted, false)
})
test('live mode and missing config cannot activate; unauthorized requests fail closed', async () => {
  assert.equal(reconciliationConfig({}), null)
  const env = { OPENAI_CONVERSIONS_MODE: 'validate_only', FORMSPREE_READ_KEY: 'fixture', OPENAI_CONVERSIONS_API_KEY: 'fixture', OPENAI_ADS_PIXEL_ID: cfg.pixelId, CRON_SECRET: 'fixture'.repeat(8) }
  assert.ok(reconciliationConfig(env)); assert.equal(reconciliationConfig({ ...env, OPENAI_CONVERSIONS_MODE: 'live' }), null)
  const saved = Object.fromEntries(Object.keys(env).map(key => [key, process.env[key]]))
  Object.assign(process.env, env)
  const res = { code: 0, headers: {}, setHeader(k,v) { this.headers[k]=v }, status(code) { this.code=code; return this }, json(body) { this.body=body; return this } }
  try { await handler({ method: 'GET', headers: {} }, res); assert.equal(res.code, 401); assert.match(res.headers['Cache-Control'], /no-store/) }
  finally { for (const [key,value] of Object.entries(saved)) { if (value === undefined) delete process.env[key]; else process.env[key]=value } }
})

test('signed webhook only acknowledges upstream success and preserves exact retry ID', async () => {
  const { createHmac } = await import('node:crypto')
  const { deliverWebhook, webhookConfig } = await import('../server/openai-webhook.js')
  assert.equal(webhookConfig({}), null)
  const secret = 'synthetic-signing-secret'
  const raw = Buffer.from(JSON.stringify({ form: 'xkgknpkl', submission: row() }))
  const signature = `t=${now / 1000},v1=${createHmac('sha256', secret).update(`${now / 1000}.`).update(raw).digest('hex')}`
  const hookCfg = { ...cfg, signingSecret: secret, mode: 'live' }
  let requests = 0
  const fail = await deliverWebhook(hookCfg, raw, signature, { now, fetcher: async () => { requests++; return new Response('', { status: 429 }) } })
  assert.equal(fail.status, 503)
  const success = await deliverWebhook(hookCfg, raw, signature, { now, fetcher: async (_url, init) => {
    requests++; const body = JSON.parse(init.body)
    assert.equal(body.events[0].id, row().measurement_event_id)
    assert.equal(body.validate_only, false)
    return new Response('{}')
  } })
  assert.equal(success.status, 200)
  const invalid = await deliverWebhook(hookCfg, raw, 'bad', { now, fetcher: async () => { throw new Error('must not call') } })
  assert.equal(invalid.status, 401); assert.equal(requests, 2)
})

test('deployed handler shape reads exact chunked bytes and excludes signed tests without networking', async () => {
  const { Readable } = await import('node:stream')
  const { createHmac } = await import('node:crypto')
  const { default: webhookHandler } = await import('../api/formspree-conversion.js')
  const secret = 'fixture-secret-32-characters-long'
  const env = { OPENAI_WEBHOOK_MODE: 'validate_only', FORMSPREE_WEBHOOK_SIGNING_SECRET: secret, OPENAI_CONVERSIONS_API_KEY: 'fixture', OPENAI_ADS_PIXEL_ID: cfg.pixelId }
  const saved = Object.fromEntries(Object.keys(env).map(key => [key, process.env[key]]))
  Object.assign(process.env, env)
  const time = Math.floor(Date.now()/1000)
  const raw = Buffer.from(JSON.stringify({ form: 'xkgknpkl', submission: { ...row(), _codex_test: 'true' } }, null, 2))
  const signature = `t=${time},v1=${createHmac('sha256',secret).update(`${time}.`).update(raw).digest('hex')}`
  const req = Readable.from([raw.subarray(0, 10), raw.subarray(10)])
  req.method = 'POST'; req.headers = { 'formspree-signature': signature, 'content-type': 'application/json' }
  const res = { setHeader() {}, status(code) { this.code=code; return this }, json(body) { this.body=body; return this } }
  try { await webhookHandler(req, res); assert.equal(res.code, 200); assert.deepEqual(res.body, { accepted:false, excluded:true }) }
  finally { for (const [key,value] of Object.entries(saved)) { if (value === undefined) delete process.env[key]; else process.env[key]=value } }
})

test('HMAC rejects changed bytes, old signatures, malformed headers and oversized bodies', async () => {
  const { createHmac } = await import('node:crypto')
  const { verifyFormspreeSignature } = await import('../server/openai-conversion-validation.js')
  const secret = 'local-only-fixture-secret'
  const raw = Buffer.from('{}')
  const signature = time => `t=${time},v1=${createHmac('sha256',secret).update(`${time}.`).update(raw).digest('hex')}`
  assert.equal(verifyFormspreeSignature(raw, signature(now/1000), secret, now), true)
  assert.equal(verifyFormspreeSignature(Buffer.from('{ }'), signature(now/1000), secret, now), false)
  assert.equal(verifyFormspreeSignature(raw, signature(now/1000-301), secret, now), false)
  assert.equal(verifyFormspreeSignature(raw, 't=NaN,v1=abc', secret, now), false)
  assert.equal(verifyFormspreeSignature(Buffer.alloc(65537), signature(now/1000), secret, now), false)
})
