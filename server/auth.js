import { createHmac, createHash, timingSafeEqual, randomBytes } from 'node:crypto'

const COOKIE = '__Host-exquisite_session'
const TTL = 60 * 60 * 4
const attempts = new Map()

export function config(env = process.env) {
  if (!env.DASHBOARD_PASSWORD || env.DASHBOARD_PASSWORD.length < 8 || !env.SESSION_SECRET || env.SESSION_SECRET.length < 32) return null
  return { password: env.DASHBOARD_PASSWORD, secret: env.SESSION_SECRET }
}
export function equal(a, b) {
  return timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest())
}
const signature = (body, secret) => createHmac('sha256', secret).update(body).digest('base64url')
export function issueSession(secret, now = Date.now()) {
  const body = Buffer.from(JSON.stringify({ exp: Math.floor(now / 1000) + TTL, nonce: randomBytes(16).toString('hex') })).toString('base64url')
  return `${body}.${signature(body, secret)}`
}
export function validSession(token, secret, now = Date.now()) {
  if (typeof token !== 'string' || token.length > 1024) return false
  const parts = token.split('.')
  if (parts.length !== 2 || !equal(parts[1], signature(parts[0], secret))) return false
  try {
    const data = JSON.parse(Buffer.from(parts[0], 'base64url').toString())
    return Number.isInteger(data.exp) && data.exp > now / 1000 && data.exp <= now / 1000 + TTL && typeof data.nonce === 'string'
  } catch { return false }
}
export function authenticated(req, cfg) {
  const cookies = String(req.headers.cookie || '').split(';').map(part => part.trim())
  const cookie = cookies.find(part => part.startsWith(`${COOKIE}=`))
  return Boolean(cfg && cookie && validSession(cookie.slice(COOKIE.length + 1), cfg.secret))
}
export function sessionCookie(value, clear = false) {
  return `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${clear ? 0 : TTL}`
}
export function sameOrigin(req, env = process.env) {
  const origin = req.headers.origin
  if (typeof origin !== 'string') return false
  try {
    const parsed = new URL(origin)
    const localDevelopment = env.NODE_ENV === 'development' && parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname)
    return (parsed.protocol === 'https:' || localDevelopment) && parsed.host === req.headers.host && (!req.headers['sec-fetch-site'] || req.headers['sec-fetch-site'] === 'same-origin')
  } catch { return false }
}
// Best-effort per-instance abuse protection; a distributed/WAF rule is still required in production.
export function allowAttempt(req, now = Date.now()) {
  for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key)
  const address = String(req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown')
  const key = createHash('sha256').update(address).digest('hex')
  const bucket = attempts.get(key) || { count: 0, until: now + 15 * 60 * 1000 }
  if (attempts.size >= 10000 && !attempts.has(key)) return false
  bucket.count += 1
  attempts.set(key, bucket)
  return bucket.count <= 10
}
export function reply(res, status, payload) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  res.setHeader('CDN-Cache-Control', 'no-store')
  res.setHeader('Vercel-CDN-Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  return res.status(status).json(payload)
}
