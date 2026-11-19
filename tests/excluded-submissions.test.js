import test from 'node:test'
import assert from 'node:assert/strict'
import { EXCLUDED_SUBMISSION_IDS, isExcludedSubmission } from '../server/excluded-submissions.js'
import { fetchLeads, normalize } from '../server/formspree.js'

const vendorNoon = '1d06fccd-67e2-4a78-be42-c0d588df8c5b'
const vendorEvening = '80e48f2c-8674-4ac6-8fb9-3d2f65048d74'
const keptEvent = '5c3ad18a-5393-4afa-a4c8-5aec36b86f5d'

test('exclusions are exact identifier matches and never use contact fields', () => {
  assert.equal(EXCLUDED_SUBMISSION_IDS.size, 2)
  assert.equal(isExcludedSubmission({ measurement_event_id: vendorNoon }), true)
  assert.equal(isExcludedSubmission({ measurement_event_id: vendorEvening }), true)
  assert.equal(isExcludedSubmission({ _id: vendorNoon }), true)
  assert.equal(isExcludedSubmission({ id: vendorEvening }), true)
  assert.equal(isExcludedSubmission({}, { id: vendorNoon }), true)
  assert.equal(isExcludedSubmission({ measurement_event_id: keptEvent }), false)
  assert.equal(isExcludedSubmission({ measurement_event_id: `${vendorNoon}x` }), false)
  assert.equal(isExcludedSubmission({ measurement_event_id: vendorNoon.slice(0, 8) }), false)
  assert.equal(isExcludedSubmission({ measurement_event_id: '' }), false)
  assert.equal(isExcludedSubmission({ name: vendorNoon, email: 'vendor@example.invalid' }), false)
})

test('inbox fetch drops id-excluded rows and keeps neighboring submissions', async () => {
  const result = await fetchLeads('synthetic-key', async () => ({
    ok: true,
    json: async () => ({
      submissions: [
        { _id: 'kept-a', measurement_event_id: keptEvent, _date: '2026-11-18T19:32:20Z', form_key: 'insurance_benefits' },
        { _id: 'vendor-noon', measurement_event_id: vendorNoon, _date: '2026-11-18T20:00:37Z', form_key: 'veneers_contact' },
        { _id: 'vendor-evening', measurement_event_id: vendorEvening, _date: '2026-11-18T06:57:40Z', form_key: 'veneers_contact' },
        { _id: 'kept-b', measurement_event_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', _date: '2026-11-18T21:00:00Z', form_key: 'contact' },
        { _id: 'spam-row', spam: true, measurement_event_id: 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff' },
      ],
    }),
  }))
  assert.deepEqual(result.leads.map(lead => lead.id), ['kept-a', 'kept-b'])
  assert.equal(result.leads[0].formType, 'insurance_benefits')
  assert.equal(result.meta.complete, true)
  assert.equal(result.meta.total, 2)
  assert.equal(normalize({ measurement_event_id: vendorNoon, _date: '2026-11-18T20:00:37Z' }).formType, '')
})
