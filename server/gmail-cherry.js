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
  const token = await googleToken(serviceAccount, fetcher)
  const query = `from:withcherry.com newer_than:${Math.ceil((env.PATHWAY_WINDOW_MS ? Number(env.PATHWAY_WINDOW_MS) : 90 * 86400000) / 86400000)}d`
  const list = await fetcher(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=40&q=${encodeURIComponent(query)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!list.ok) throw new Error('Cherry mailbox could not be listed.')
  const listed = await list.json()
  const notices = []
  for (const item of listed.messages || []) {
    const message = await fetcher(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${item.id}?format=full`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!message.ok) throw new Error('Cherry mailbox could not be read.')
    const payload = await message.json()
    const headers = Object.fromEntries((payload.payload?.headers || []).map((header) => [header.name.toLowerCase(), header.value]))
    notices.push({
      id: payload.id,
      date: headers.date || new Date(Number(payload.internalDate) || now).toISOString(),
      subject: headers.subject || '',
      body: plainText(payload.payload),
    })
  }
  return notices
}
