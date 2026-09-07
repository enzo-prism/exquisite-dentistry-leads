# Exquisite Dentistry Lead Dashboard

Private dashboard for Formspree inbox `xkgknpkl`. The frontend contains no submission records or access password. An authenticated server endpoint reads the complete non-spam inbox directly from Formspree. No database copy or public snapshot is created.

## Production target

Deploy to the existing exquisite-dentistry-leads Vercel project. Verify authenticated inbox reconciliation and unauthenticated access denial after every release; a successful build alone does not establish live integration health.

## Behavior

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

## Server-only configuration

Set these in Vercel production environment variables, never VITE_* or checked-in files:

| Variable | Purpose |
| --- | --- |
| FORMSPREE_READ_KEY | Existing read-only API key for form xkgknpkl; never use its master key. |
| DASHBOARD_PASSWORD | Shared practice password, at least 8 characters. Production is the simple shared value `exquisite` (practice-shared login, not staff accounts). |
| SESSION_SECRET | Random signing secret, at least 32 characters. Rotate to revoke all sessions. |

Obtain explicit approval before configuring external credentials or publishing. Production fails closed when configuration is absent. Configuring production variables does not authorize preview environments to access real submissions.

## Verification

Use Node.js 24 in Vercel. This change was also built/tested on the local Node.js 22.23.1 runtime.

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
