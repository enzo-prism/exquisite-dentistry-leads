# Project Guide

## Purpose

This repository is a front-end prototype for an Exquisite Dentistry website lead dashboard. Its primary working surface is a searchable, filterable lead list with responsive desktop and mobile layouts.

## Current scope

- Displays 12 fictional sample leads.
- Includes name, email, phone, attributed source, campaign, notes, and received timestamp.
- Supports search, source filtering, sorting, and an accessible lead-detail sheet.
- Supports persistent light and dark themes.
- Uses supplied Exquisite Dentistry wordmark and icon assets.
- Uses locally cached, optimized SVGL marks for Google, Instagram, TikTok, and OpenAI.
- Shows all four source marks in an interactive attribution overview and in each lead record.

## Architecture

- `src/App.tsx`: sample data, filtering, theme state, source attribution assets, source overview, and the lead-detail experience.
- `src/components/ui.tsx`: local source-owned UI primitives following shadcn/ui composition conventions.
- `src/styles.css`: design tokens, branded themes, responsive table/card layouts, and accessibility states.
- `public/brand`: supplied Exquisite Dentistry PNG assets.
- `public/logos`: optimized source-attribution SVG assets from the documented SVGL API, normalized with the standalone SVG XML namespace.
- `vercel.json`: Vite framework and SPA routing configuration.

## Data boundary

All identities, phone numbers, emails, notes, dates, campaigns, and metrics are fictional sample data. The app does not currently receive website forms, ad-platform events, CRM records, or patient information.

Do not treat the sample source labels as evidence of active campaigns. Live attribution will require an agreed field model and trusted server-side capture of values such as UTM parameters, referring page, form identifier, and platform click IDs.

## Production hardening before live data

1. Add authenticated, role-based access.
2. Select an approved database or CRM as the system of record.
3. Validate and normalize submissions on the server.
4. Define consent, retention, deletion, and export policies.
5. Keep contact details and notes out of analytics payloads and URLs.
6. Add audit logging, error monitoring, loading states, and integration health checks.
7. Verify source attribution end to end with controlled test submissions.

## Verification

```bash
npm ci
npm run build
npm run preview
```

The production build includes TypeScript validation followed by the Vite bundle.

Source-logo verification should confirm more than a successful HTTP response: each image must have a non-zero intrinsic size and a visible rendered mark in both themes. The component selects one theme-resolved SVG, and its text fallback prevents an undecodable asset from becoming an unexplained empty slot.

## Deployment

The project is configured for Vercel and connected to the GitHub `main` branch.

- Production: https://exquisite-dentistry-leads.vercel.app
- Repository: https://github.com/enzo-prism/exquisite-dentistry-leads
- Vercel project: `enzo-design-prisms-projects/exquisite-dentistry-leads`

Recommended Vercel settings are Node.js 24, `npm run build`, and output directory `dist`.
