import { authenticated, config, reply } from '../server/auth.js'
import { fetchLeads } from '../server/formspree.js'
export default async function handler(req, res) {
  if (req.method !== 'GET') return reply(res, 405, { error: 'Method not allowed.' })
  const cfg = config()
  if (!cfg) return reply(res, 503, { error: 'Dashboard authentication is not configured.' })
  if (!authenticated(req, cfg)) return reply(res, 401, { error: 'Sign in to view leads.' })
  if (!process.env.FORMSPREE_READ_KEY) return reply(res, 503, { error: 'Formspree connection is not configured.' })
  try { return reply(res, 200, await fetchLeads(process.env.FORMSPREE_READ_KEY)) }
  catch { return reply(res, 502, { error: 'Unable to load a complete Formspree inbox. Please retry.' }) }
}
