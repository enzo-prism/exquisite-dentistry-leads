# Project guide

Read README.md for deployment configuration, behavior, privacy boundaries and verification.

## Architecture

- src/App.tsx: authenticated client, memory-only submissions, filters, detail dialog and freshness.
- src/components/DashboardShell.tsx: authenticated sidebar, section navigation, theme, refresh, and lock controls.
- src/components/Pathways.tsx: overview and financing views with preserved filter state.
- src/components/ui/: shadcn Base UI primitives; src/components/ui.tsx adapts existing inbox controls.
- src/styles.css: Tailwind 4, Geist typography, evergreen semantic themes, and responsive layouts.
- src/shadcn.css: vendored shadcn state utilities (MIT).
- api/login.js, logout.js, session.js: server authentication endpoints.
- api/leads.js: protected, read-only complete Formspree inbox.
- api/pathways.js: protected Cherry mailbox notices and Vercel Web Analytics counts for the public website. `PATHWAYS_MODE=synthetic` returns fixture data and does not call either provider.
- api/website.js: authenticated GA4 and Search Console reporting; source adapter in server/google-website.js, aggregate-only instance cache in server/report-cache.js.
- src/components/WebsiteData.tsx: overview metrics and Traffic/Search tabs with source/date dialogs.
- server/cherry.js: turns Cherry approval and issued-plan mail into amounts. Marketing mail is ignored.
- server/pathways.js: combines those notices with analytics. Widget-ready events are reported separately and are not treated as applications.
- server/auth.js: signing, cookie verification, origin validation and best-effort throttling.
- server/formspree.js: provider pagination, bounded response parsing and field normalization.
- tests/server.test.js: synthetic auth, normalization and provider-failure checks.
- scripts/local-server.mjs: loopback-only local verification server; optional synthetic fetch adapter.
- vercel.json: routing and security headers.

Production form ID is fixed to xkgknpkl, not request-controlled. Real API keys remain server-side. Static builds must never import exports or contain raw submission data. Read the provider using its read-only key only after approval to configure that integration.

## Shared password

Production `DASHBOARD_PASSWORD` is `exquisite`. It was set in the Vercel production environment on 21 Sep 2026 and confirmed with a same-origin login. The value is not in the frontend. Preview and development do not carry it. Password changes do not revoke cookies already issued; rotate `SESSION_SECRET` to sign everyone out. See README.md for the session lifetime and the rest of the server configuration.

Do not change Formspree classifications, delete submissions, send notifications, create bookings or deploy as part of a local verification run.

## September 7 read-only reconciliation

Authenticated Formspree UI showed 30 inbox records and 22 spam. One inbox record was explicitly marked as a test. Person type: 13 prospective, 9 existing, 1 vendor, 7 unspecified. Source fallback (utm_source, source, lead_source): 2 ChatGPT, 28 Unknown. These reflect submitted metadata, not independent attribution or qualification. No real record values were committed.

## Submission details interaction

The desktop row is a pointer target with a native name button for keyboard access. Mobile cards show the name, source, received date, and explicit test badge. A chevron indicates access to full details. The shadcn Base UI dialog prevents background interaction, contains keyboard focus, supports Escape, and restores focus to the invoking control. Full notes use pre-wrap and overflow wrapping with no text truncation. Empty notes have an explicit message.

`normalize()` combines distinct nonempty message, notes and Message values in provider order, retaining their line breaks and avoiding repeated identical aliases. No extra provider fields or raw payloads are exposed. All data remains behind the existing authenticated, no-store API.

Use the synthetic local server to check desktop row clicks, keyboard activation, mobile cards at 390px and 320px, long notes through their final line, additional notes, empty notes, refresh while open, Escape/close/backdrop dismissal, focus return, and lock clearing private content. The synthetic fixture includes a deliberately long multiline message and separate notes. Do not use real submission screenshots as test artifacts.

## Website pathways

The sidebar separates Overview, Lead inbox, Cherry financing, and Website & search. Hidden views preserve filters and reporting tabs; lock or expired authentication clears all private data. Inbox filters include received window, source, form, person type, contact availability, and explicit tests. Cherry filters approved/funded notices and sorts by date, amount, or name.

Overview distinguishes all-time and seven-day submissions, rolling 90-day Cherry financing, 28 complete Pacific days of GA4 traffic, and a separate 28-day finalized Search Console window. Every web metric labels its exact source/window; source dialogs explain freshness and measurement limits. GA4 uses property 498175984 and only the public website hosts; GSC uses the domain property. See README for the dedicated server-only reporting credential and cache policy. The Gmail credential is unchanged.

Formspree remains the source for submissions. Cherry approval dollars are credit limits and funded dollars are issued-plan purchase amounts, not collected revenue. GA4 clicks are interactions rather than confirmed calls or appointments. Historical generate_lead and financing_engagement are excluded because their definitions do not support a reliable lead or financing-click headline. Search totals come directly from ungrouped reports; top rows cannot be summed to recreate them.

Legacy Vercel analytics code is retained behind ENABLE_VERCEL_ANALYTICS=true for explicit diagnostics, but disabled by default and absent from the current UI. Earlier dated Vercel verification in README is historical.

## Navigation and accessibility

The 256px desktop sidebar collapses to icons. Mobile navigation uses a shadcn Sheet and closes on selection; focus moves to the new section heading. Sidebar controls provide theme switching and explicit lock. The sidebar and private views only mount after authentication. A skip link targets the page heading. The detail dialog preserves full multiline notes and campaign attribution. Metric information, source health, and methodology use labeled click/tap dialogs; tooltips only supplement controls. Essential unavailable and subtotal warnings stay visible.

For design verification, use synthetic data only. Check 320px and 390px layouts, keyboard navigation, dark mode, filter retention, optional report failures, and logout. The October 4 redesign passed its TypeScript/build checks, 42 tests, and dependency audit. Live release verification remains distinct from local synthetic checks.
