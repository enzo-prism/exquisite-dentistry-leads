# Exquisite Dentistry Lead Dashboard

A clean, responsive lead-management dashboard concept for Exquisite Dentistry. It presents incoming website inquiries in a searchable, filterable table with a mobile-friendly card view and lead detail panel.

The interface follows shadcn/ui's source-owned component approach and design language, with project-local Button, Card, Badge, Input, and table compositions customized to the practice brand.

## Included

- 12 clearly fictional sample leads
- Name, email, phone, source, notes, and received date/time
- Search, source filtering, and sorting
- Responsive desktop table and mobile cards
- Keyboard-accessible lead detail drawer
- Persistent light and dark themes
- SVGL source marks for Google, Instagram, TikTok, and ChatGPT/OpenAI
- Minimal modern-art visual system with restrained Exquisite Dentistry green
- Responsive Exquisite Dentistry wordmark and icon treatments from supplied brand assets

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

This prototype uses sample data only. It is not connected to the practice website, ad platforms, CRM, or patient records.

## SVGL attribution assets

The Google, Instagram, TikTok, and OpenAI marks used in lead-source tags are cached local copies of the optimized SVG responses from the [official SVGL API](https://svgl.app/docs/api). The exact `api.svgl.app/svg/...` source URL is preserved as `data-svgl-url` on each rendered logo.
