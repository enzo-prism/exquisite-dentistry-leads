import { authenticated, config, reply } from '../server/auth.js'
import { loadPathways } from '../server/pathways.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return reply(res, 405, { error: 'Method not allowed.' })
  const cfg = config()
  if (!cfg) return reply(res, 503, { error: 'Dashboard authentication is not configured.' })
  if (!authenticated(req, cfg)) return reply(res, 401, { error: 'Sign in to view leads.' })
  try { return reply(res, 200, await loadPathways()) }
  catch { return reply(res, 502, { error: 'Unable to load website pathways. Please retry.' }) }
}
