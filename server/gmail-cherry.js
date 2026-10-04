import { createSign } from 'node:crypto'

const decode = (data = '') => Buffer.from(data, 'base64url').toString('utf8')

function plainText(part) {
  if (!part) return ''
  if (part.mimeType === 'text/plain' && part.body?.data) return decode(part.body.data)
  return (part.parts || []).map(plainText).filter(Boolean).join('\n')
}

async function googleToken(serviceAccount, fetcher) {
  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const claim = Buffer.from(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/gmail.modify',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    sub: serviceAccount.subject,
  })).toString('base64url')
  const signer = createSign('RSA-SHA256')
  signer.update(`${header}.${claim}`)
  const assertion = `${header}.${claim}.${signer.sign(serviceAccount.private_key).toString('base64url')}`
  const response = await fetcher('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  })
  if (!response.ok) throw new Error('Cherry mailbox authentication failed.')
  const payload = await response.json()
  if (!payload.access_token) throw new Error('Cherry mailbox authentication failed.')
  return payload.access_token
}

export async function fetchCherryNotices({ env = process.env, fetcher = fetch, now = Date.now() } = {}) {
  if (!env.GOOGLE_SERVICE_ACCOUNT_JSON || !env.GOOGLE_IMPERSONATE) throw new Error('Cherry mailbox is not configured.')
  const serviceAccount = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON)
  serviceAccount.subject = env.GOOGLE_IMPERSONATE
  const windowMs = Number(env.PATHWAY_WINDOW_MS || 90 * 86400000)
  if (!Number.isFinite(now) || !Number.isFinite(windowMs) || windowMs <= 0) throw new Error('Cherry mailbox window is invalid.')
  const start = now - windowMs
  const signal = AbortSignal.timeout(15_000)
  const request = (url, options = {}) => fetcher(url, { ...options, signal })
  const token = await googleToken(serviceAccount, request)
  const query = `from:withcherry.com after:${Math.floor(start / 1000) - 1} before:${Math.ceil(now / 1000) + 1}`
  const ids = new Set()
  const tokens = new Set()
  let pageToken = ''
  do {
    const params = new URLSearchParams({ maxResults: '100', q: query })
    if (pageToken) params.set('pageToken', pageToken)
    const list = await request(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!list.ok) throw new Error('Cherry mailbox could not be listed completely.')
    const listed = await list.json()
    if (!listed || typeof listed !== 'object' || Array.isArray(listed) ||
        (listed.messages !== undefined && !Array.isArray(listed.messages)) ||
        (listed.messages === undefined && listed.resultSizeEstimate !== 0)) {
      throw new Error('Cherry mailbox returned an invalid message list.')
    }
    for (const item of listed.messages || []) {
      if (!item || typeof item.id !== 'string' || !item.id) throw new Error('Cherry mailbox returned an invalid message id.')
      ids.add(item.id)
    }
    if (ids.size > 5000) throw new Error('Cherry mailbox exceeds the complete-read limit.')
    if (listed.nextPageToken !== undefined && (typeof listed.nextPageToken !== 'string' || !listed.nextPageToken)) {
      throw new Error('Cherry mailbox returned invalid pagination.')
    }
    pageToken = listed.nextPageToken || ''
    if (pageToken) {
      if (tokens.has(pageToken) || tokens.size >= 100) throw new Error('Cherry mailbox pagination did not complete.')
      tokens.add(pageToken)
    }
  } while (pageToken)
  const notices = []
  const messages = [...ids]
  for (let index = 0; index < messages.length; index += 5) {
    const batch = await Promise.all(messages.slice(index, index + 5).map(async (id) => {
      const message = await request(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(id)}?format=full`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!message.ok) throw new Error('Cherry mailbox could not be read completely.')
      const payload = await message.json()
      if (payload?.id !== id || !Array.isArray(payload.payload?.headers)) throw new Error('Cherry mailbox returned an invalid message.')
      const headers = Object.fromEntries(payload.payload.headers.map((header) => {
        if (typeof header?.name !== 'string' || typeof header.value !== 'string') throw new Error('Cherry mailbox returned invalid headers.')
        return [header.name.toLowerCase(), header.value]
      }))
      const received = payload.internalDate != null ? Number(payload.internalDate) : Date.parse(headers.date || '')
      if (!Number.isFinite(received) || received <= 0) throw new Error('Cherry mailbox returned an invalid received date.')
      if (received <= start || received > now) return null
      return { id, date: new Date(received).toISOString(), subject: headers.subject || '', body: plainText(payload.payload) }
    }))
    notices.push(...batch.filter(Boolean))
  }
  return notices
}
