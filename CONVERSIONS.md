# OpenAI conversion delivery

## Architecture and activation status

The signed Formspree webhook at `/api/formspree-conversion` is the primary server delivery path. Formspree retains the original submission and documents automatic plugin retries. The handler acknowledges eligible receipts only after OpenAI returns HTTP success. It returns 503 on upstream failure/timeouts, retaining the same event ID on retries. This is **Formspree-backed retry delivery**, not an independently persisted outbox. There is no database or in-memory delivery ledger.

The handler is disabled until all required server variables are present. Deploying this code alone does not activate a webhook or campaign optimization. No live delivery was enabled while implementing it.

The optional authenticated `/api/reconcile-conversions` endpoint reads the existing durable Formspree inbox and sends only `validate_only: true` requests. It cannot ingest conversions, even if repeatedly invoked. No recurring job is configured. OpenAI's public documentation says to reuse event IDs on retries, but does not state a deduplication retention guarantee; therefore unbounded live inbox replay is deliberately unsupported.

## Server variables

Primary webhook:

- `OPENAI_WEBHOOK_MODE`: `validate_only` first; change to `live` only after preview/raw-byte and provider validation verification.
- `FORMSPREE_WEBHOOK_SIGNING_SECRET`: dedicated HMAC secret from the Formspree webhook configuration, not the read API key.
- `OPENAI_CONVERSIONS_API_KEY`: Exquisite's server-only Conversions API key.
- `OPENAI_ADS_PIXEL_ID`: must equal verified Exquisite pixel `V7dxjf8kBAWERq3f9VG2wM`.

Optional manual validation scanner:

- `OPENAI_CONVERSIONS_MODE=validate_only` (no live mode exists).
- `FORMSPREE_READ_KEY`: existing authenticated inbox read credential.
- `CRON_SECRET`: random server secret of at least 32 characters; caller supplies `Authorization: Bearer <secret>`. Never expose it to client code.
- Same OpenAI API key and pixel variables as above.

Never prefix secrets `VITE_`, log them, or commit them. Configure production and preview deliberately; do not activate live events in a preview.

## Browser receipt contract

All FormData values are strings:

| Field | Accepted server value |
|---|---|
| `measurement_event_id` | UUID v4, same ID sent as browser pixel `event_id` |
| `measurement_event_timestamp_ms` | Integer milliseconds, no older than 7 days, no more than 1 minute future |
| `measurement_ads_consent` | `granted` |
| `measurement_consent_version` | `v2` |
| `measurement_consent_updated_at` | UTC ISO date, recorded choice no later than event |
| `measurement_acquisition_lead` | `true` |
| `measurement_source_url` | Canonical Exquisite `/contact/` or `/lp/chatgpt/`, optional missing terminal slash; no query/hash |
| `_codex_test` | Explicit `false`; known test identities still rejected |
| `oppref` | Original nonblank opaque token, at most 2048 chars, never rewritten |

Provider `_date` must be within seven days and within five minutes of the client event time; delayed retries retain the original receipt/event times. Also require `site=exquisite`, `environment=production`, and route-appropriate `form_key`. Contact requires `whichBestDescribesYou=Thinking about becoming a new patient`; benefits/vendor/existing-patient submissions are excluded. Legacy grants without a recorded consent timestamp fail closed. No IP, user agent, name, email, phone, hashes, health answers or treatment interest is sent to OpenAI. `opt_out: true` matches the browser pixel.

The upstream provider signature proves receipt origin, not human identity or patient qualification. Browser fields can be fabricated by a determined submitter; operational spam/lead-quality review still matters. A snapshot records consent at submission; subsequent withdrawal is not propagated into Formspree retries automatically. Resolve that lifecycle before allowing delayed replay outside immediate delivery.

## Verification and setup sequence

1. Confirm Exquisite account, selected campaign event (`lead_created`) and pixel connection in Ads Manager.
2. Run `npm test` and `npm run build`. Tests use synthetic local payloads and stub all outbound conversion requests.
3. Deploy with missing config (503) or `validate_only` plus server credentials. Confirm unsigned POST returns 401 and unexpected methods 405. Verify a signed, explicitly test-tagged synthetic request is excluded with no CAPI request. This proves raw bytes survive the deployed Vercel request handler. Never reconstruct `req.body` for signatures.
4. In Formspree Workflow, configure a Simple Webhook with HMAC signing, exact `/api/formspree-conversion` URL and secret. Available webhook plans currently Professional/Business; verify account entitlement. Verify actual form identifier, signature header and retry diagnostics with provider UI. The legacy REST Hook handshake is not authentication for later requests.
5. Run OpenAI validation mode. `validate_only` does not save conversions. Excluded/old receipts are acknowledged as excluded; malformed or wrong-form requests fail, and upstream failures return503. Never classify an HTTP acceptance as campaign attribution.
6. After provider diagnostics and consent lifecycle checks, set primary mode live. Follow the next real, consented acquisition inquiry's shared event ID through provider receipt and Ads Manager. No own-ad clicks or manufactured live leads.
7. Watch provider webhook failure diagnostics. Retry schedule/retention are not specified in the public Formspree docs; obtain account-specific confirmation before promising an SLA. Events older than seven days cannot be sent; do not refresh timestamps to conceal age.

## Primary references

- [Formspree signed webhooks](https://help.formspree.io/articles/advanced-features/verify-webhook-signatures)
- [Formspree webhook plans and payload](https://help.formspree.io/articles/plugins/webhooks/)
- [Formspree Workflow automatic retries](https://help.formspree.io/articles/building-your-form/getting-started-with-workflow/)
- [OpenAI Conversions API](https://developers.openai.com/ads/conversions-api)
