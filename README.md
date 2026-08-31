# Exquisite Dentistry Lead Dashboard

A clean, responsive lead-management dashboard concept for Exquisite Dentistry. It presents incoming website inquiries in a searchable, filterable table with a mobile-friendly card view and lead detail panel.

**Status:** front-end prototype using fictional sample records. No live lead ingestion is enabled.

- [Production dashboard](https://exquisite-dentistry-leads.vercel.app)
- [GitHub repository](https://github.com/enzo-prism/exquisite-dentistry-leads)

The interface follows shadcn/ui's source-owned component approach and design language, with project-local Button, Card, Badge, Input, and table compositions customized to the practice brand.

## Included

- 12 clearly fictional sample leads
- Name, email, phone, source, notes, and received date/time
- Search, source filtering, and sorting
- Responsive desktop table and mobile cards
- Keyboard-accessible lead detail drawer
- Persistent light and dark themes
- SVGL source marks for Google, Instagram, TikTok, and ChatGPT/OpenAI
- Interactive source overview with one-click attribution filtering
- Minimal modern-art visual system with restrained Exquisite Dentistry green
- Responsive Exquisite Dentistry wordmark and icon treatments from supplied brand assets

## Local development

```bash
npm ci
npm run dev
```

## Production build

```bash
npm run build
```

## Technology

- React 19, TypeScript, and Vite
- Project-local components using shadcn/ui's source-owned design language; shadcn is not installed as a runtime package
- Responsive light and dark themes saved in browser storage
- Static Vercel deployment with SPA routing
- Node.js 24

## Data and privacy boundary

This prototype uses sample data only. It is not connected to the practice website, ad platforms, CRM, or patient records.

Before live lead ingestion is added, the production implementation should include authenticated access, server-side validation, an approved system of record, audit logging, retention rules, and a review of how notes and contact details are handled. Do not place lead details in analytics events, URLs, browser logs, or public exports.

## SVGL attribution assets

The Google, Instagram, TikTok, and OpenAI marks used in lead-source tags are cached local copies of the optimized SVG responses from the [official SVGL API](https://svgl.app/docs/api). Each cached SVG is normalized with the standard SVG XML namespace so it renders reliably as a standalone image. The exact `api.svgl.app/svg/...` source URL is preserved as `data-svgl-url` on each logo frame.

The interface renders a single light- or dark-theme asset at a time, avoiding selector-dependent image swapping. If a local asset cannot be decoded, the frame shows a compact text fallback instead of silently leaving an empty space.

The “ChatGPT” source label uses SVGL's OpenAI mark because SVGL does not currently provide a separate ChatGPT record. Third-party trademarks remain the property of their respective owners; source badges indicate attribution only and do not imply endorsement.

## Brand and repository use

The Exquisite Dentistry wordmark and icon were supplied for this dashboard prototype. No open-source license is granted for the repository or its brand assets. Do not reuse or redistribute the practice branding without authorization.

## Project documentation

See [docs/PROJECT.md](docs/PROJECT.md) for product scope, architecture, brand assets, deployment notes, and the path from this prototype to a live lead dashboard.
