# Exquisite Dentistry Lead Dashboard

Private dashboard for Formspree inbox `xkgknpkl`. The frontend contains no submission records or access password. An authenticated server endpoint reads the complete non-spam inbox directly from Formspree. No database copy or public snapshot is created.

## Production target

Deploy to the existing exquisite-dentistry-leads Vercel project. Verify authenticated inbox reconciliation and unauthenticated access denial after every release; a successful build alone does not establish live integration health.

## Behavior

- Responsive shadcn sidebar: Overview, Lead inbox, Cherry financing, and Website activity. Desktop collapses to icons; mobile uses a keyboard-accessible drawer.
- Inbox and pathway filters persist between sections; Filters opens an accessible dialog for source, form, person type, contact availability, tests, and sorting.
- Semantic light/dark colors, Geist typography, and shadcn Base UI cards, fields, tables, and dialogs.

- Server-validated shared-password sign-in; four-hour signed HttpOnly, Secure, SameSite=Strict cookie.
- Formspree data fetched only after authentication; responses are non-cacheable.
- Click any desktop submission row or mobile card to open submission details; the name button also supports keyboard access.
- Details show contact information, received time, complete notes with original paragraph breaks, and submitted context. Distinct message/notes fields are preserved; duplicate aliases are shown once.
- The modal supports Escape, close button, backdrop dismissal, contained keyboard focus and background scroll locking. Successful refreshes keep the selected submission open and current; missing records, failed reads, lock and expired authentication clear it.
- All inbox submissions shown by default, with explicit marked-test count/filter and person-type filter.
- Missing attribution stays Unknown. Submissions are not assumed to be qualified leads or booked patients.
- Received timestamps use Pacific time; the seven-day metric uses the current time.
- Loading, refresh, failure and last-successful-refresh states. Incomplete provider reads fail rather than appearing as a partial inbox.
- Private state stays in memory and is cleared on lock or expired authentication. No contact data in URLs, browser storage, analytics or logs.
- Formspree spam and separate Simplifeye bookings are excluded.
- A website-pathways section shows Cherry financing notices and consented Vercel Analytics counts for Cherry clicks, scheduling clicks, scheduler page views, and phone clicks. Approved Cherry dollars are a credit limit. Funded Cherry dollars are the purchase amount on an issued plan, not collected production. Completed Simplifeye bookings are not available.

## Server-only configuration

Set these in Vercel production environment variables, never VITE_* or checked-in files:

| Variable | Purpose |
| --- | --- |
| FORMSPREE_READ_KEY | Existing read-only API key for form xkgknpkl; never use its master key. |
| DASHBOARD_PASSWORD | Shared practice password. Production value, set 21 Sep 2026: `exquisite`. Code rejects anything shorter than 8 characters. Practice-shared login, not staff accounts. |
| SESSION_SECRET | Random signing secret, at least 32 characters. Rotate to revoke all sessions. |
| GOOGLE_SERVICE_ACCOUNT_JSON | Service account JSON used only to read Cherry mail for enzo@design-prism.com. Never commit it. |
| GOOGLE_IMPERSONATE | Mailbox to read. Production is `enzo@design-prism.com`. |
| VERCEL_ANALYTICS_TOKEN | Token that can query Web Analytics for the public website project. |
| VERCEL_ANALYTICS_TEAM_ID | Team that owns exquisitedentistryla.com. |
| VERCEL_ANALYTICS_PROJECT_ID | Vercel project id for `exquisite-dentistry`, not this dashboard. |

Obtain explicit approval before configuring external credentials or publishing. Production fails closed when configuration is absent. Configuring production variables does not authorize preview environments to access real submissions.

On 21 Sep 2026 the production `DASHBOARD_PASSWORD` was set to `exquisite` and the production deployment was rebuilt so the new value is live. A same-origin login with that password returned 200. A wrong password returned 401. Preview and development were left unchanged. Browsers that signed in before the change keep a valid cookie until it expires or `SESSION_SECRET` is rotated.

## Verification

Use Node.js 24 in Vercel. The sidebar release was built and tested on Node.js 24.

```bash
npm ci
npm test
npm run build
npm audit
npm run start:local -- --synthetic
```

The last command binds localhost:4317 and uses clearly synthetic in-memory data only. Its synthetic password is `synthetic-local-check-only`. The harness cannot be used as a production data source. With approved credentials, `.env.local` is ignored and `npm run start:local` uses the provider. Production functions never read a local fixture or export.

Before publication, verify the current project identity, configure only production server variables, and run the checks above. After approved deployment, verify unauthenticated /api/leads returns401, cross-origin login fails, authenticated inbox count reconciles with Formspree, explicit test/source/persona breakdowns match, and logout denies further reads. Never expose actual submissions in screenshots or logs.

## Limits

This provides a shared practice login, not individual staff accounts, roles or audit trails. Login throttling is best-effort per server instance; use platform/distributed protection for sustained abuse. Logging out clears the current browser cookie; copied stateless tokens remain valid until expiry or SESSION_SECRET rotation. Password rotation alone does not revoke existing sessions. Marked-test filtering only uses an explicit provider marker; it does not silently classify or delete other records. No messages, scheduling changes or Formspree mutations are performed.

## Sources

- Dashboard: https://exquisite-dentistry-leads.vercel.app/
- Repository: https://github.com/enzo-prism/exquisite-dentistry-leads
- Formspree submissions API: https://help.formspree.io/articles/the-forms-api/form-submissions-api
- Authentication: https://help.formspree.io/articles/the-forms-api/api-authentication

## October 4 freshness hardening (released)

Cherry mailbox reads now paginate completely, validate responses, normalize received timestamps, and apply an exact rolling 90-day window. Funded notices must identify Exquisite Dentistry; unknown amounts are disclosed as missing from known subtotals. Website analytics validate response shape and counts, fail on group saturation, and return their actual UTC-calendar-day query window. Both providers have bounded parallel reads. A pathways failure cannot discard a healthy lead inbox, and unavailable analytics never render zero-valued detail labels.

Provider UTC-day coverage is disclosed separately from rolling-window inbox and financing totals. A pathway check timestamp is an attempted source read; each source status still determines whether its values are available.

The October 4 release was approved and published. Production returned an analytics access denial; replacing the credential with a dedicated team-scoped token restored access. Project-scoped tokens returned 404 for the analytics endpoint and were not retained. The replacement token is stored only in the production server environment and expires October 4, 2027; renew it before then. Other environments and existing shared credentials were unchanged. Live readback verified 35 inbox submissions, 14 Cherry approvals ($124,800), 10 funded plans ($39,453.50), 94 Cherry clicks, 37 scheduling clicks, 63 scheduling page views, and 13 phone clicks. Both pathway source statuses returned ok. Desktop and 390px viewport checks passed. The original token's underlying access-denial cause was not independently established.

## October 4 sidebar release

The sidebar redesign is approved for main and production. Its four views retain existing source calculations, authenticated APIs, and in-memory private state. A fresh install, production build, and all 42 tests passed. Dependency audit returned zero vulnerabilities. Synthetic browser checks covered filter persistence, full notes, optional-report failure isolation, mobile navigation, and logout/API denial. Axe reported zero violations in all four desktop views, including the dark inbox. Production verification must follow deployment; local results alone do not establish live health.

Generated shadcn components are source-owned under `src/components/ui`. Shared Tailwind utilities are vendored in `src/shadcn.css` with their MIT license in `licenses/shadcn-MIT.txt`; the generation CLI is not an application dependency. Use `npx shadcn@latest` for future additions and review its diff before overwriting components.

## Spacious workspace refresh

The dashboard uses a quiet, spacious layout with consistent Lucide icons. Overview has one inbox summary strip and four focused metrics. The inbox surface shows names, sources, received dates, and explicit test badges; opening a record reveals full contact information, notes, campaign, and submitted context. Metric explanations, freshness, methodology, and source health are available through labeled dialogs. Unavailable sources and partial subtotals remain visible. Desktop/mobile, dialog interaction, filter retention, dark mode, and accessibility were checked with synthetic records before release.
