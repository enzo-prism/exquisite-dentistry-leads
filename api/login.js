import { allowAttempt, config, equal, issueSession, reply, sameOrigin, sessionCookie } from '../server/auth.js'
export default function handler(req, res) {
  if (req.method !== 'POST') return reply(res, 405, { error: 'Method not allowed.' })
  if (!sameOrigin(req)) return reply(res, 403, { error: 'Same-origin request required.' })
  const cfg = config()
  if (!cfg) return reply(res, 503, { error: 'Dashboard authentication is not configured.' })
  if (!allowAttempt(req)) return reply(res, 429, { error: 'Too many attempts. Try again in 15 minutes.' })
  if (!String(req.headers['content-type'] || '').startsWith('application/json')) return reply(res, 415, { error: 'JSON required.' })
  const password = req.body?.password
  if (typeof password !== 'string' || password.length > 1024 || !equal(password, cfg.password)) return reply(res, 401, { error: 'That password is not correct.' })
  res.setHeader('Set-Cookie', sessionCookie(issueSession(cfg.secret)))
  return reply(res, 200, { authenticated: true })
}
