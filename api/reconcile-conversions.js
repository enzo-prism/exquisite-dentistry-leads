import { equal, reply } from '../server/auth.js'
import { reconciliationConfig, reconcileConversions } from '../server/openai-reconciliation.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return reply(res, 405, { error: 'Method not allowed.' })
  const cfg = reconciliationConfig(process.env)
  if (!cfg) return reply(res, 503, { error: 'Conversion reconciliation is disabled or unconfigured.' })
  if (typeof req.headers.authorization !== 'string' || !equal(req.headers.authorization, `Bearer ${cfg.cronSecret}`)) {
    return reply(res, 401, { error: 'Unauthorized.' })
  }
  try { return reply(res, 200, await reconcileConversions(cfg)) }
  catch { return reply(res, 502, { error: 'Conversion validation could not complete. No live conversions were sent.' }) }
}
