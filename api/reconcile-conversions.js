import { equal, reply } from '../server/auth.js'
import { reconciliationConfig, reconcileConversions, validationConfig, probeConversionValidation } from '../server/openai-reconciliation.js'

export default async function handler(req, res) {
  const probe = req.method === 'POST' && new URL(req.url || '/', 'https://localhost').searchParams.get('probe') === 'true'
  if (req.method !== 'GET' && !probe) return reply(res, 405, { error: 'Method not allowed.' })
  const cfg = probe ? validationConfig(process.env) : reconciliationConfig(process.env)
  if (!cfg) return reply(res, 503, { error: 'Conversion reconciliation is disabled or unconfigured.' })
  if (typeof req.headers.authorization !== 'string' || !equal(req.headers.authorization, `Bearer ${cfg.cronSecret}`)) {
    return reply(res, 401, { error: 'Unauthorized.' })
  }
  try { return reply(res, 200, await (probe ? probeConversionValidation(cfg) : reconcileConversions(cfg))) }
  catch { return reply(res, 502, { error: 'Conversion validation could not complete. No live conversions were sent.' }) }
}
