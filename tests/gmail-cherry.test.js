import test from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync } from 'node:crypto'
import { fetchCherryNotices } from '../server/gmail-cherry.js'

const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const env = {
  GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({ client_email: 'synthetic@example.com', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }) }),
  GOOGLE_IMPERSONATE: 'synthetic@example.com',
}
const now = Date.parse('2026-10-04T20:00:00Z')
const response = (body, ok = true) => ({ ok, json: async () => body })
function provider(pages, dates = {}, failId = '') {
  const calls = []
  return {
    calls,
    fetcher: async (url, options) => {
      assert.ok(options.signal)
      if (url.includes('oauth2')) return response({ access_token: 'synthetic' })
      const parsed = new URL(url)
      calls.push(parsed)
      if (!parsed.pathname.match(/messages\//)) return response(pages[parsed.searchParams.get('pageToken') || 'first'])
      const id = parsed.pathname.split('/').at(-1)
      if (id === failId) return response({}, false)
      return response({ id, internalDate: String(dates[id] ?? now - 1000), payload: { mimeType: 'text/plain', body: { data: Buffer.from('Synthetic notice').toString('base64url') }, headers: [{ name: 'Date', value: 'Wed, 01 Jan 2020 00:00:00 +0000' }, { name: 'Subject', value: 'Synthetic notice' }] } })
    },
  }
}

test('Cherry mailbox follows all pages and reads each message once', async () => {
  const source = provider({ first: { messages: [{ id: 'a' }], nextPageToken: 'second' }, second: { messages: [{ id: 'a' }, { id: 'b' }] } })
  const rows = await fetchCherryNotices({ env, now, fetcher: source.fetcher })
  assert.deepEqual(rows.map(row => row.id), ['a', 'b'])
  assert.equal(source.calls.filter(url => url.pathname.endsWith('/messages/a')).length, 1)
  assert.equal(rows[0].date, new Date(now - 1000).toISOString())
})

test('Cherry mailbox uses exact received-time window and excludes future messages', async () => {
  const start = now - 90 * 86400000
  const source = provider({ first: { messages: ['old', 'edge', 'inside', 'future', 'latest'].map(id => ({ id })) } }, { old: start - 1, edge: start, inside: start + 1, future: now + 1, latest: now })
  const rows = await fetchCherryNotices({ env, now, fetcher: source.fetcher })
  assert.deepEqual(rows.map(row => row.id), ['inside', 'latest'])
  assert.match(source.calls[0].searchParams.get('q'), /after:\d+ before:\d+/)
})

test('Cherry mailbox rejects partial pages, loops, malformed lists and failed message reads', async () => {
  for (const pages of [
    { first: { messages: [], nextPageToken: 'repeat' }, repeat: { messages: [], nextPageToken: 'repeat' } },
    { first: { unexpected: true } },
    { first: { messages: [{}] } },
    { first: { messages: [], nextPageToken: 123 } },
  ]) {
    await assert.rejects(fetchCherryNotices({ env, now, fetcher: provider(pages).fetcher }), /Cherry mailbox/)
  }
  await assert.rejects(fetchCherryNotices({ env, now, fetcher: provider({ first: { messages: [{ id: 'a' }, { id: 'b' }] } }, {}, 'b').fetcher }), /completely/)
})

test('Cherry mailbox accepts verified empty inbox and rejects invalid dates/window', async () => {
  assert.deepEqual(await fetchCherryNotices({ env, now, fetcher: provider({ first: { resultSizeEstimate: 0 } }).fetcher }), [])
  await assert.rejects(fetchCherryNotices({ env, now, fetcher: provider({ first: { messages: [{ id: 'a' }] } }, { a: 'invalid' }).fetcher }), /date/)
  await assert.rejects(fetchCherryNotices({ env: { ...env, PATHWAY_WINDOW_MS: 'invalid' }, now, fetcher: provider({}).fetcher }), /window/)
})
