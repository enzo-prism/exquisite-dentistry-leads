import { reply } from '../server/auth.js'
import { webhookConfig, deliverWebhook } from '../server/openai-webhook.js'

// The signature must cover original bytes, never a reserialized req.body.
export const config = { api: { bodyParser: false } }
export default async function handler(req, res) {
  if (req.method !== 'POST') return reply(res, 405, { error: 'Method not allowed.' })
  const cfg = webhookConfig(process.env)
  if (!cfg) return reply(res, 503, { error: 'Conversion webhook is disabled or unconfigured.' })
  if (typeof req.headers['formspree-signature'] !== 'string') return reply(res, 401, { error: 'Signature required.' })
  if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) return reply(res, 415, { error: 'JSON required.' })
  const chunks = []
  let size = 0
  try {
    for await (const chunk of req) {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      size += bytes.length
      if (size > 65536) return reply(res, 413, { error: 'Receipt too large.' })
      chunks.push(bytes)
    }
  } catch { return reply(res, 400, { error: 'Unable to read receipt.' }) }
  const result = await deliverWebhook(cfg, Buffer.concat(chunks), req.headers['formspree-signature'])
  return reply(res, result.status, result.body)
}
