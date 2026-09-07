import { authenticated, config, reply } from '../server/auth.js'
export default function handler(req, res) {
  if (req.method !== 'GET') return reply(res, 405, { error: 'Method not allowed.' })
  const cfg = config()
  if (!cfg) return reply(res, 503, { error: 'Dashboard authentication is not configured.' })
  return reply(res, 200, { authenticated: authenticated(req, cfg) })
}
