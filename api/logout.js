import { reply, sameOrigin, sessionCookie } from '../server/auth.js'
export default function handler(req, res) {
  if (req.method !== 'POST') return reply(res, 405, { error: 'Method not allowed.' })
  if (!sameOrigin(req)) return reply(res, 403, { error: 'Same-origin request required.' })
  res.setHeader('Set-Cookie', sessionCookie('', true))
  return reply(res, 200, { authenticated: false })
}
