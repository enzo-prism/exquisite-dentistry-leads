# Project guide

Read README.md for deployment configuration, behavior, privacy boundaries and verification.

## Architecture

- src/App.tsx: authenticated client, memory-only submissions, filters, detail drawer and freshness.
- src/styles.css: existing brand treatment and responsive layouts.
- api/login.js, logout.js, session.js: server authentication endpoints.
- api/leads.js: protected, read-only complete Formspree inbox.
- server/auth.js: signing, cookie verification, origin validation and best-effort throttling.
- server/formspree.js: provider pagination, bounded response parsing and field normalization.
- tests/server.test.js: synthetic auth, normalization and provider-failure checks.
- scripts/local-server.mjs: loopback-only local verification server; optional synthetic fetch adapter.
- vercel.json: routing and security headers.

Production form ID is fixed to xkgknpkl, not request-controlled. Real API keys remain server-side. Static builds must never import exports or contain raw submission data. Read the provider using its read-only key only after approval to configure that integration.

Do not change Formspree classifications, delete submissions, send notifications, create bookings or deploy as part of a local verification run.

## September 7 read-only reconciliation

Authenticated Formspree UI showed 30 inbox records and 22 spam. One inbox record was explicitly marked as a test. Person type: 13 prospective, 9 existing, 1 vendor, 7 unspecified. Source fallback (utm_source, source, lead_source): 2 ChatGPT, 28 Unknown. These reflect submitted metadata, not independent attribution or qualification. No real record values were committed.
