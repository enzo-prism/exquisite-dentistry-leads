# Project guide

Read README.md for deployment configuration, behavior, privacy boundaries and verification.

## Architecture

- src/App.tsx: authenticated client, memory-only submissions, filters, detail dialog and freshness.
- src/components/DashboardShell.tsx: authenticated sidebar, section navigation, theme, refresh, and lock controls.
- src/components/Pathways.tsx: overview, financing, and activity views with preserved filter state.
- src/components/ui/: shadcn Base UI primitives; src/components/ui.tsx adapts existing inbox controls.
- src/styles.css: Tailwind 4, Geist typography, evergreen semantic themes, and responsive layouts.
- src/shadcn.css: vendored shadcn state utilities (MIT).
- api/login.js, logout.js, session.js: server authentication endpoints.
- api/leads.js: protected, read-only complete Formspree inbox.
- api/pathways.js: protected Cherry mailbox notices and Vercel Web Analytics counts for the public website. `PATHWAYS_MODE=synthetic` returns fixture data and does not call either provider.
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

The desktop row is a pointer target with a native name button for keyboard access. Mobile cards include a View details label and a three-line notes preview. The shadcn Base UI dialog prevents background interaction, contains keyboard focus, supports Escape, and restores focus to the invoking control. Full notes use pre-wrap and overflow wrapping with no text truncation. Empty notes have an explicit message.

`normalize()` combines distinct nonempty message, notes and Message values in provider order, retaining their line breaks and avoiding repeated identical aliases. No extra provider fields or raw payloads are exposed. All data remains behind the existing authenticated, no-store API.

Use the synthetic local server to check desktop row clicks, keyboard activation, mobile cards at 390px and 320px, long notes through their final line, additional notes, empty notes, refresh while open, Escape/close/backdrop dismissal, focus return, and lock clearing private content. The synthetic fixture includes a deliberately long multiline message and separate notes. Do not use real submission screenshots as test artifacts.

## Website pathways

The sidebar separates Overview, Lead inbox, Cherry financing, and Website activity. Each view has one visible descriptive h1. Inbox filters include past 7, 30, 90 days or all time, source, form, person type, contact availability, and explicit tests. Secondary filters are under More filters. Column headers sort by name or received time, and active filters have removable chips. Cherry filters approved/funded notices and sorts by date, amount, or name. Activity filters Formspree/Vercel and sorts by count or name. Hidden views stay mounted to preserve filters; all private state clears on lock or expired authentication.

Overview distinguishes all-time submissions and the past seven days from rolling 90-day Formspree/Cherry reporting. Analytics uses its actual UTC calendar-day boundaries and explicitly labels the incomplete current day. Missing sources display unavailable values rather than zero. The source panels cover:

- Formspree rows whose received time falls in that window.
- Cherry widget clicks and on-site apply-button clicks from Vercel Web Analytics on `exquisite-dentistry`.
- Cherry approvals and funded plans from `withcherry.com` mail. Approval amount is a credit limit. Funded amount is the purchase amount on the issued plan. Unfinished applications are not in the mailbox.
- Scheduling clicks into `/schedule-consultation` and page views whose path contains `schedule`. A completed Simplifeye booking is not in this dashboard.
- Phone clicks. These are `tel:` clicks, not answered calls.

Analytics counts include only visitors who granted analytics consent. GA4 `generate_lead` is not shown because older contact page views were counted as leads.

## Navigation and accessibility

The 256px desktop sidebar collapses to icons. Mobile navigation uses a shadcn Sheet and closes on selection; focus moves to the new section heading. Sidebar controls provide theme switching and explicit lock. The sidebar and private views only mount after authentication. A skip link targets the page heading. The detail dialog preserves full multiline notes.

For design verification, use synthetic data only. Check 320px and 390px layouts, keyboard navigation, dark mode, filter retention, optional report failures, and logout. The October 4 redesign passed its TypeScript/build checks, 42 tests, and dependency audit. Live release verification remains distinct from local synthetic checks.
