// Inbox exclusions keyed only by stable submission identifiers: Formspree `_id`
// or `id`, or the submitted `measurement_event_id`. Never key by name or contact
// fields. This list does not mutate Formspree; it only hides matching rows from
// the authenticated inbox and its counts.
//
// Current entries are veneers_contact vendor-pitch submissions that Formspree
// delivered to the non-spam inbox:
// - 2026-11-18 12:00 PM PT — 1d06fccd-67e2-4a78-be42-c0d588df8c5b
// - 2026-11-17 10:57 PM PT — 80e48f2c-8674-4ac6-8fb9-3d2f65048d74
export const EXCLUDED_SUBMISSION_IDS = new Set([
  '1d06fccd-67e2-4a78-be42-c0d588df8c5b',
  '80e48f2c-8674-4ac6-8fb9-3d2f65048d74',
])

function keysOf(row, lead) {
  return [lead?.id, row?._id, row?.id, row?.measurement_event_id]
    .filter(value => typeof value === 'string' && value.trim())
    .map(value => value.trim())
}

export function isExcludedSubmission(row, lead) {
  return keysOf(row, lead).some(id => EXCLUDED_SUBMISSION_IDS.has(id))
}
