// Authoritative server validator; browser metadata contract is documented in CONVERSIONS.md.
/** Server-only preparation shared by signed webhook and authenticated reconciliation. */
import { createHmac, timingSafeEqual } from 'node:crypto';
const MAX_BODY_BYTES = 64 * 1024;
const MAX_EVENT_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const SOURCES = new Set([
    'https://exquisitedentistryla.com/lp/chatgpt/',
    'https://exquisitedentistryla.com/contact/',
]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
/** Verify the exact bytes before parsing. No body/signature/PII is logged. */
export function verifyFormspreeSignature(rawBody, header, secret, nowMs) {
    if (!secret || !Number.isSafeInteger(nowMs) || rawBody.length > MAX_BODY_BYTES)
        return false;
    const match = /^t=(\d{1,12}),v1=([a-fA-F0-9]{64})$/.exec(header);
    if (!match)
        return false;
    const timestamp = Number(match[1]);
    if (Math.abs(Math.floor(nowMs / 1000) - timestamp) > 300)
        return false;
    const expected = createHmac('sha256', secret).update(`${match[1]}.`).update(rawBody).digest();
    return timingSafeEqual(expected, Buffer.from(match[2], 'hex'));
}
const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
/** Only signed provider receipts qualify; browser success claims are never inputs. */
export function prepareFormspreeConversion(input) {
    const now = input.nowMs ?? Date.now();
    if (!input.signingSecret || !input.expectedFormId)
        return { accepted: false, reason: 'configuration' };
    if (!verifyFormspreeSignature(input.rawBody, input.signature, input.signingSecret, now)) {
        return { accepted: false, reason: 'signature' };
    }
    let body;
    try {
        body = JSON.parse(input.rawBody.toString('utf8'));
    }
    catch {
        return { accepted: false, reason: 'payload' };
    }
    return prepareProviderSubmission(body, input.expectedFormId, now);
}
/** Use only after an authenticated Formspree API read; never expose to a browser route. */
export function prepareProviderSubmission(body, expectedFormId, now) {
    if (!expectedFormId || !Number.isSafeInteger(now))
        return { accepted: false, reason: 'configuration' };
    if (!isRecord(body) || !isRecord(body.submission))
        return { accepted: false, reason: 'payload' };
    if (body.form !== expectedFormId)
        return { accepted: false, reason: 'form' };
    const data = body.submission;
    const source = typeof data.measurement_source_url === 'string' ? data.measurement_source_url.replace(/(?<!\/)$/, '/') : '';
    const acquisitionForm = (data.form_key === 'chatgpt_ads_consultation' && source === 'https://exquisitedentistryla.com/lp/chatgpt/')
        || (data.form_key === 'contact' && source === 'https://exquisitedentistryla.com/contact/'
            && data.whichBestDescribesYou === 'Thinking about becoming a new patient');
    if (data.spam === true || data._spam === true || !acquisitionForm || data.site !== 'exquisite' || data.environment !== 'production' || data._codex_test !== 'false' || data.measurement_acquisition_lead !== 'true'
        || (typeof data.name === 'string' && /^(?:codex tracking test|exquisite launch test)\b/i.test(data.name.trim()))
        || (typeof data.email === 'string' && /@(?:example\.(?:com|org|net)|test\.invalid)$/i.test(data.email.trim()))
        || (typeof data._gotcha === 'string' && data._gotcha.trim() !== '')) {
        return { accepted: false, reason: 'ineligible' };
    }
    const grantedAt = data.measurement_consent_updated_at;
    const eventTime = typeof data.measurement_event_timestamp_ms === 'string' && /^\d{13}$/.test(data.measurement_event_timestamp_ms)
        ? Number(data.measurement_event_timestamp_ms) : NaN;
    if (data.measurement_ads_consent !== 'granted' || data.measurement_consent_version !== 'v2'
        || typeof grantedAt !== 'string' || !ISO_DATE.test(grantedAt)
        || !Number.isFinite(Date.parse(grantedAt)) || Date.parse(grantedAt) > eventTime) {
        return { accepted: false, reason: 'consent' };
    }
    const receiptTime = typeof data._date === 'string' ? Date.parse(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(data._date) ? data._date : `${data._date}Z`) : NaN;
    if (!Number.isFinite(receiptTime) || receiptTime > now + 60000 || receiptTime < now - MAX_EVENT_AGE_MS
        || Math.abs(receiptTime - eventTime) > 5 * 60000) return { accepted: false, reason: 'metadata' };
    if (!Number.isSafeInteger(eventTime) || eventTime > now + 60_000 || eventTime < now - MAX_EVENT_AGE_MS
        || typeof data.measurement_event_id !== 'string' || !UUID.test(data.measurement_event_id)
        || typeof data.measurement_source_url !== 'string' || !SOURCES.has(source)) {
        return { accepted: false, reason: 'metadata' };
    }
    // Conservative matching policy: do not send an unmatchable event or synthesize identifiers.
    if (typeof data.oppref !== 'string' || !data.oppref || data.oppref.length > 2048 || (/\s/.test(data.oppref) || Array.from(data.oppref).some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127))) {
        return { accepted: false, reason: 'attribution' };
    }
    return {
        accepted: true,
        consent: { version: 'v2', grantedAt },
        event: {
            id: data.measurement_event_id,
            type: 'lead_created',
            timestamp_ms: eventTime,
            oppref: data.oppref,
            source_url: source,
            action_source: 'web',
            opt_out: true,
            data: { type: 'customer_action' },
        },
    };
}
/** Build a validation-only batch; this pure helper performs no network requests. */
export function createValidationBatch(result) {
    return { validate_only: true, integration_source: 'exquisite_dentistry', events: [result.event] };
}
