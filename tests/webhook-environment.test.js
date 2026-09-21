import test from 'node:test'
import assert from 'node:assert/strict'
import { webhookConfig } from '../server/openai-webhook.js'
import handler from '../api/formspree-conversion.js'

const credentials = {
  FORMSPREE_WEBHOOK_SIGNING_SECRET: 'synthetic-signing-secret',
  OPENAI_CONVERSIONS_API_KEY: 'synthetic-api-key',
  OPENAI_ADS_PIXEL_ID: 'V7dxjf8kBAWERq3f9VG2wM',
}
const nonProductionEnvironments = [undefined, '', 'preview', 'development', 'staging', 'Production']

test('live webhook configuration requires an exact production deployment environment', () => {
  for (const deployment of nonProductionEnvironments) {
    assert.equal(webhookConfig({ ...credentials, OPENAI_WEBHOOK_MODE: 'live', VERCEL_ENV: deployment }), null)
  }
  const production = { ...credentials, OPENAI_WEBHOOK_MODE: 'live', VERCEL_ENV: 'production' }
  assert.equal(webhookConfig(production)?.mode, 'live')
  for (const key of Object.keys(credentials)) {
    assert.equal(webhookConfig({ ...production, [key]: '' }), null)
  }
  assert.equal(webhookConfig({ ...production, OPENAI_ADS_PIXEL_ID: 'another-pixel' }), null)
})

test('validation-only remains available deliberately without permitting unknown modes', () => {
  for (const deployment of [...nonProductionEnvironments, 'production']) {
    const env = { ...credentials, OPENAI_WEBHOOK_MODE: 'validate_only', VERCEL_ENV: deployment }
    assert.equal(webhookConfig(env)?.mode, 'validate_only')
    assert.equal(webhookConfig({ ...env, OPENAI_WEBHOOK_MODE: 'LIVE' }), null)
    assert.equal(webhookConfig({ ...env, OPENAI_CONVERSIONS_API_KEY: '' }), null)
  }
})

test('HTTP handler rejects nonproduction live configuration before consuming receipts or fetching', async () => {
  const keys = [...Object.keys(credentials), 'OPENAI_WEBHOOK_MODE', 'VERCEL_ENV']
  const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]))
  const savedFetch = globalThis.fetch
  let reads = 0
  let requests = 0
  const req = {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'formspree-signature': 'synthetic-header' },
    async *[Symbol.asyncIterator]() { reads++; yield Buffer.from('{}') },
  }
  const response = () => ({
    headers: {},
    setHeader(key, value) { this.headers[key] = value },
    status(code) { this.code = code; return this },
    json(body) { this.body = body; return this },
  })
  try {
    globalThis.fetch = async () => { requests++; throw new Error('Unexpected outbound request') }
    Object.assign(process.env, credentials, { OPENAI_WEBHOOK_MODE: 'live' })
    for (const deployment of nonProductionEnvironments) {
      if (deployment === undefined) delete process.env.VERCEL_ENV
      else process.env.VERCEL_ENV = deployment
      const res = response()
      await handler(req, res)
      assert.equal(res.code, 503)
      assert.match(res.headers['Cache-Control'], /no-store/)
    }
    assert.equal(reads, 0)
    assert.equal(requests, 0)
    // Production passes configuration gating but still requires a valid signature.
    process.env.VERCEL_ENV = 'production'
    const res = response()
    await handler(req, res)
    assert.equal(res.code, 401)
    assert.equal(reads, 1)
    assert.equal(requests, 0)
  } finally {
    globalThis.fetch = savedFetch
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
})
