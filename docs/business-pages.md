# Multi-Tenant Business Pages

This document describes the JSON-driven, theme-injected business storefront pages added to the Boka marketing site.

For the original design rationale, rejected alternatives, and product context, see the design spec at:

- `docs/superpowers/specs/2026-07-02-multi-tenant-business-pages-design.md`

This file focuses on the implemented architecture, data flow, and day-to-day usage.

## Overview

Each service business gets its own branded storefront URL:

- `/businesses/alis-barber`
- `/businesses/tinas-nails`

Each page shows the business name, tagline, description, logo, prices, booking call-to-action, contact details, and opening hours — styled with the business's own light-mode color palette. The markup and layout are shared; only the JSON config and the selected theme change per business.

## End-to-end data flow

```
src/data/business-themes.json
        │
        ▼
src/data/businesses/<slug>.json   (references a theme key)
        │
        ▼
src/lib/businesses.js   (load + validate + resolve theme)
        │
        ▼
src/pages/businesses/[business]/index.astro   (getStaticPaths)
        │
        ▼
dist/businesses/<slug>/index.html   (static output)
```

At build time Astro asks the dynamic route for its paths. The route calls `getAllBusinesses()`, which returns every validated JSON config with its resolved full theme. Astro renders one static HTML file per slug.

At request time on a static host, `/businesses/<slug>` simply serves the pre-built HTML. There is no runtime lookup.

## Data layer

### Theme library

All business themes live in `src/data/business-themes.json`. Each theme is a named, self-contained light-mode palette:

```json
{
  "heritage-barbershop": {
    "name": "Heritage Barbershop",
    "source": "https://coolors.co/12100e-1e1812-8b5a2b-d4a574-c49a6c-f2e8d5",
    "bg": "#F2E8D5",
    "surface": "#FAF3EA",
    "text": "#3E2723",
    "primary": "#8B5A2B",
    "primaryStrong": "#5C3A21",
    "accent": "#C49A6C",
    "onPrimary": "#FFFFFF"
  },
  "blush-studio": {
    "name": "Blush Studio",
    "source": "https://coolors.co/1a0810-2a1020-c2185b-ff80ab-d81b60-f8bbd0-fff5f7",
    "bg": "#FFF5F7",
    "surface": "#FFFFFF",
    "text": "#4A0D24",
    "primary": "#C2185B",
    "primaryStrong": "#D81B60",
    "accent": "#F8BBD0",
    "onPrimary": "#FFFFFF"
  }
}
```

Themes are sourced from [Coolors](https://coolors.co/) palettes and adapted for light-mode use.

### Config files

Business configs live at `src/data/businesses/<slug>.json` and reference a theme by key.

Example: `src/data/businesses/alis-barber.json`

```json
{
  "slug": "alis-barber",
  "name": "Ali's Barber",
  "category": "Barbershop",
  "tagline": "Precision cuts in East London",
  "description": "Traditional barbering with modern style. Walk-ins welcome, but booking guarantees your chair.",
  "logo": "/assets/businesses/alis-barber/logo.svg",
  "theme": "heritage-barbershop",
  "contact": {
    "address": "123 High Street, London E1 1AA",
    "phone": "020 1234 5678",
    "hours": {
      "mon": "09:00–18:00",
      "tue": "09:00–18:00",
      "wed": "09:00–18:00",
      "thu": "09:00–20:00",
      "fri": "09:00–20:00",
      "sat": "09:00–17:00",
      "sun": "Closed"
    }
  },
  "services": [
    { "name": "Haircut", "price": 25, "duration": "30 min" },
    { "name": "Beard Trim", "price": 15, "duration": "20 min" },
    { "name": "Haircut & Beard", "price": 35, "duration": "50 min" }
  ],
  "bookingUrl": "https://booking.example.com/alis-barber"
}
```

The `slug` must match the filename stem. The `theme` field is a key into `src/data/business-themes.json`.

### Loader and validation

`src/lib/businesses.js` loads every config with Vite's `import.meta.glob`:

```js
const modules = import.meta.glob("/src/data/businesses/*.json", { eager: true });
```

`import.meta.glob` is used instead of `node:fs` because Astro's static generation runs the code from `dist/.prerender/`, where filesystem paths relative to `__dirname` break. The glob embeds the JSON content into the JS bundle at build time, so it works during both `astro check` and static generation.

The loader validates:

- All required top-level fields exist.
- The `theme` value is a string key that exists in `business-themes.json`.
- The resolved theme contains every required palette token.
- `services` is a non-empty array and each entry has a `name` and numeric `price`.
- The `slug` matches the filename stem.

It exposes three helpers:

```js
export function getAllBusinesses() { ... }
export function getBusinessBySlug(slug) { ... }
export function formatPrice(price) { return `£${price}`; }
```

`getBusinessBySlug` returns `null` for unknown slugs. The page turns that into a 404 response.

## Dynamic route

`src/pages/businesses/[business]/index.astro`

```astro
---
import BusinessBooking from "@/components/businesses/BusinessBooking.astro";
import BusinessContact from "@/components/businesses/BusinessContact.astro";
import BusinessHero from "@/components/businesses/BusinessHero.astro";
import BusinessLayout from "@/components/businesses/BusinessLayout.astro";
import BusinessPrices from "@/components/businesses/BusinessPrices.astro";
import { getAllBusinesses, getBusinessBySlug } from "@/lib/businesses.js";

export async function getStaticPaths() {
  const businesses = getAllBusinesses();
  return businesses.map((business) => ({
    params: { business: business.slug },
    props: { business },
  }));
}

const { business: businessFromProps } = Astro.props;
const { business: slugFromParams } = Astro.params;
const business = businessFromProps ?? getBusinessBySlug(slugFromParams);

if (!business) {
  return new Response(null, { status: 404 });
}
---

<BusinessLayout business={business}>
  <BusinessHero business={business} />
  <BusinessPrices business={business} />
  <BusinessBooking business={business} />
  <BusinessContact business={business} />
</BusinessLayout>
```

`getStaticPaths` passes the full business object (with resolved theme) as a prop, so the page does not need to re-look it up. The fallback `getBusinessBySlug(slugFromParams)` plus explicit 404 makes the route safe if server rendering is ever enabled for this path.

Business pages do **not** wrap the global marketing `Layout.astro`. They are standalone storefronts with their own chrome.

## Component architecture

### BusinessLayout.astro

The root document layout for every business page. It renders:

- Its own `<!doctype html>` and `<html lang="en">`.
- A `<head>` with meta tags via `src/layouts/Meta.astro`.
- The site favicon.
- Imports of `global.css` and `business.css`.
- A top background grid tinted with the business primary color.
- A theme wrapper `<article>` that injects the full business palette as CSS custom properties.
- `BusinessHeader` (desktop only), `<main>`, and `BusinessFooter`.

```astro
<article
  class="business-page min-h-screen"
  style="--business-bg: #F2E8D5;
         --business-surface: #FAF3EA;
         --business-text: #3E2723;
         --business-primary: #8B5A2B;
         --business-primary-strong: #5C3A21;
         --business-accent: #C49A6C;
         --business-on-primary: #FFFFFF;"
>
  <BusinessHeader business={business} />
  <main class="md:pt-28">
    <slot />
  </main>
  <BusinessFooter business={business} />
</article>
```

These variables are consumed by the components and by `business.css`.

### BusinessHeader.astro

- Floating pill-style glassmorphism header matching the marketing site's shape.
- Logo + business name brand on the left.
- In-page nav links to `#prices`, `#booking`, and `#contact`.
- Hidden on mobile; the hero already exposes the main CTAs.

### BusinessHero.astro

- Address eyebrow using the business primary color.
- Category badge using the business accent color.
- Business name as the page `<h1>` in `font-brand`.
- Tagline in the business primary color.
- Description in business text color.
- Two CTAs: "Book now" → `#booking`, and "See prices from £{lowestPrice}" → `#prices`.

The lowest price is computed with `Math.min(...)` over the services array.

### BusinessPrices.astro

- Section anchor `id="prices"`.
- Responsive grid of service cards using the business surface and primary colors.
- Shows the service name, optional duration, and price formatted with `formatPrice`.

### BusinessBooking.astro

- Section anchor `id="booking"`.
- A focused CTA card with a gradient background tinted by the business primary color.
- Links to the external `bookingUrl` in a new tab with `rel="noopener noreferrer"`.

### BusinessContact.astro

- Section anchor `id="contact"`.
- Two-column card: address and phone on the left, opening hours on the right.
- Maps JSON keys (`mon`, `tue`, ...) to full day names for display.

### BusinessFooter.astro

- Branded footer using the business palette.
- Business name, category, address, phone.
- "Book now" button and copyright line.

## Theming system

`src/styles/business.css` defines the component styles. Every color comes from CSS variables set on `.business-page`.

```css
.business-page {
  --business-bg: #fdfaf5;
  --business-surface: #ffffff;
  --business-text: #3f4a5a;
  --business-primary: #2d6dc3;
  --business-primary-strong: #0066ff;
  --business-accent: #fad13b;
  --business-on-primary: #ffffff;

  background-color: var(--business-bg);
  color: var(--business-text);
}
```

The values above are fallbacks. They are overridden by the inline `style` attribute from `BusinessLayout.astro`. Headings are also overridden so RicoFast's global `h1,h2,h3` colors cannot leak Boka blue onto the page.

## How to add a new business

1. Pick or create a theme in `src/data/business-themes.json` (or source one from [Coolors](https://coolors.co/)).
2. Create `public/assets/businesses/<slug>/logo.svg` (or `logo.png`).
3. Create `src/data/businesses/<slug>.json` matching the schema above and reference the theme key.
4. Run `pnpm build`.
5. The new page is available at `/businesses/<slug>`.

## Verification

- `pnpm build` passes and generates `/businesses/alis-barber/index.html` and `/businesses/tinas-nails/index.html`.
- `pnpm check` passes.
- Marketing pages (`/`, `/pricing`, `/about`, `/contact`) have no business styles.
- Sitemap includes `/businesses/alis-barber/` and `/businesses/tinas-nails/`.
- The existing 404 page handles unknown `/businesses/<slug>` routes.
- Business pages render in light mode only with no Boka blue leakage.

## Design decisions

- **Standalone layout.** Business pages do not reuse the global `Layout.astro` because they need their own chrome and must not show the marketing navigation or footer.
- **`import.meta.glob` for data.** Keeps the build static and simple. If the number of businesses grows, the loader can be replaced by a CMS or database source without changing the components.
- **Theme library.** Business configs reference a named theme instead of duplicating a full palette. This makes it easy to apply the same theme to multiple businesses and to source palettes from external tools like Coolors.
- **Light-mode-only business pages.** Business pages intentionally do not support dark mode. The hero already surfaces the main CTAs, so the header is hidden on mobile and no theme toggle is needed.
- **CSS variables for theming.** Tailwind classes are static; per-business colors come from data. CSS variables are the cleanest bridge between dynamic JSON values and shared component markup.
- **Minimal Biome config.** The project had no `biome.json`, so `pnpm check` was scanning generated directories and pre-existing files with lint errors. A minimal config was added to ignore those while keeping the new code checked.

## Sources

- Heritage Barbershop palette inspired by [Coolors](https://coolors.co/261c15-5c3a21-8b5a2b-c49a6c-f2e8d5).
- Blush Studio palette inspired by [Coolors](https://coolors.co/2a0a15-4a0d24-c2185b-d81b60-f8bbd0).
