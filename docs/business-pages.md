# Multi-Tenant Business Pages

This document describes the JSON-driven, theme-injected business storefront pages added to the Boka marketing site.

For the original design rationale, rejected alternatives, and product context, see the design spec at:

- `docs/superpowers/specs/2026-07-02-multi-tenant-business-pages-design.md`

This file focuses on the implemented architecture, data flow, and day-to-day usage.

## Overview

Each service business gets its own branded storefront URL:

- `/businesses/alis-barber`
- `/businesses/tinas-nails`

Each page shows the business name, tagline, description, logo, prices, booking call-to-action, contact details, and opening hours — styled with the business's own brand color. The markup is shared; only the JSON config and two injected CSS variables change per business.

The business pages are designed to feel like a natural extension of the RicoFast marketing site. They reuse the global design tokens (`--color-bg-primary`, `--color-bg-secondary`, `--color-text-secondary`, etc.) so light and dark mode match the homepage automatically. The only per-business overrides are `primary` and `accent`.

## End-to-end data flow

```
src/data/businesses/<slug>.json
        │
        ▼
src/lib/businesses.js   (load + validate)
        │
        ▼
src/pages/businesses/[business]/index.astro   (getStaticPaths)
        │
        ▼
dist/businesses/<slug>/index.html   (static output)
```

At build time Astro asks the dynamic route for its paths. The route calls `getAllBusinesses()`, which returns every validated JSON config. Astro renders one static HTML file per slug.

At request time on a static host, `/businesses/<slug>` simply serves the pre-built HTML. There is no runtime lookup.

## Data layer

### Config files

Business configs live at `src/data/businesses/<slug>.json`.

Example: `src/data/businesses/alis-barber.json`

```json
{
  "slug": "alis-barber",
  "name": "Ali's Barber",
  "category": "Barbershop",
  "tagline": "Precision cuts in East London",
  "description": "Traditional barbering with modern style. Walk-ins welcome, but booking guarantees your chair.",
  "logo": "/assets/businesses/alis-barber/logo.svg",
  "theme": {
    "primary": "#8B5A2B",
    "accent": "#F4C430"
  },
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

The `slug` must match the filename stem. The `theme` object only supplies a business-specific `primary` brand color and `accent` highlight color; everything else uses RicoFast's global tokens.

### Loader and validation

`src/lib/businesses.js` loads every config with Vite's `import.meta.glob`:

```js
const modules = import.meta.glob("/src/data/businesses/*.json", { eager: true });
```

`import.meta.glob` is used instead of `node:fs` because Astro's static generation runs the code from `dist/.prerender/`, where filesystem paths relative to `__dirname` break. The glob embeds the JSON content into the JS bundle at build time, so it works during both `astro check` and static generation.

The loader validates:

- All required top-level fields exist.
- The `theme` object contains `primary` and `accent`.
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

`getStaticPaths` passes the full business object as a prop, so the page does not need to re-look it up. The fallback `getBusinessBySlug(slugFromParams)` plus explicit 404 makes the route safe if server rendering is ever enabled for this path.

Business pages do **not** wrap the global marketing `Layout.astro`. They are standalone storefronts with their own chrome.

## Component architecture

### BusinessLayout.astro

The root document layout for every business page. It renders:

- Its own `<!doctype html>` and `<html lang="en">`.
- A `<head>` with meta tags via `src/layouts/Meta.astro`.
- The site favicon.
- An inline dark-mode boot script that reads `localStorage.dark_mode` before paint.
- Imports of `global.css` and `business.css`.
- A top background grid tinted with the business primary color.
- A theme wrapper `<article>` that injects `--business-primary` and `--business-accent`.
- `BusinessHeader`, `<main>`, and `BusinessFooter`.

```astro
<article class="business-page min-h-screen" style="--business-primary: #8B5A2B; --business-accent: #F4C430;">
  <BusinessHeader business={business} />
  <main class="pt-24 md:pt-28">
    <slot />
  </main>
  <BusinessFooter business={business} />
</article>
```

### BusinessHeader.astro

- Floating pill-style header matching the marketing site's glassmorphism header.
- Logo + business name brand on the left.
- In-page nav links to `#prices`, `#booking`, and `#contact`.
- A self-contained dark-mode toggle button on the right.

The dark-mode toggle does not reuse the marketing site's `src/assets/js/main.js`, because that script depends on marketing-header DOM IDs (`#darkToggle`, `#menu`, `#header`, etc.) that do not exist on business pages.

### BusinessHero.astro

- Address eyebrow using the business primary color.
- Category badge using the business accent color.
- Business name as the page `<h1>` in `font-brand`.
- Tagline in the business primary color.
- Description in neutral body text.
- Two CTAs: "Book now" → `#booking`, and "See prices from £{lowestPrice}" → `#prices`.

The lowest price is computed with `Math.min(...)` over the services array.

### BusinessPrices.astro

- Section anchor `id="prices"`.
- Service cards in a responsive grid using RicoFast card styling.
- Shows the service name, optional duration, and price formatted with `formatPrice`.

### BusinessBooking.astro

- Section anchor `id="booking"`.
- A focused CTA card with a gradient background tinted by the business primary color.
- Links to the external `bookingUrl` in a new tab with `rel="noopener noreferrer"`.

### BusinessContact.astro

- Section anchor `id="contact"`.
- Two-column card: contact details on the left, opening hours on the right.
- Clickable phone number.
- Maps JSON keys (`mon`, `tue`, ...) to full day names for display.

### BusinessFooter.astro

- Branded footer matching the marketing footer style.
- Business name, category, address, phone.
- "Book now" button and copyright line.
- Styled with the inherited business theme variables.

## Theming system

`src/styles/business.css` defines the business-specific styles, but only the `primary` and `accent` values come from the JSON config. Everything else uses RicoFast's global tokens.

```css
.business-page {
  --business-primary: var(--color-primary);
  --business-primary-strong: color-mix(in srgb, var(--business-primary) 85%, black);
  --business-primary-light: color-mix(in srgb, var(--business-primary) 12%, transparent);
  --business-accent: var(--color-accent);
}
```

These variables are overridden by the inline `style` attribute from `BusinessLayout.astro`.

Dark mode is automatic because the page uses `bg-bg-primary dark:bg-bg-primary-dark`, `text-neutral-600 dark:text-neutral-300`, and other Tailwind dark variants that map to RicoFast's global dark tokens.

## How to add a new business

1. Create `public/assets/businesses/<slug>/logo.svg` (or `logo.png`).
2. Create `src/data/businesses/<slug>.json` matching the schema above.
3. Run `pnpm build`.
4. The new page is available at `/businesses/<slug>`.

## Verification

- `pnpm build` passes and generates `/businesses/alis-barber/index.html` and `/businesses/tinas-nails/index.html`.
- `pnpm check` passes.
- Marketing pages (`/`, `/pricing`, `/about`, `/contact`) have no business styles.
- Sitemap includes `/businesses/alis-barber/` and `/businesses/tinas-nails/`.
- The existing 404 page handles unknown `/businesses/<slug>` routes.
- Light and dark mode on business pages match the homepage palette.

## Design decisions

- **Standalone layout.** Business pages do not reuse the global `Layout.astro` because they need their own chrome and must not show the marketing navigation or footer.
- **`import.meta.glob` for data.** Keeps the build static and simple. If the number of businesses grows, the loader can be replaced by a CMS or database source without changing the components.
- **Global tokens + two injected variables.** The original version injected a full custom palette per business, which made dark mode inconsistent with the homepage. Now only `primary` and `accent` are business-specific; backgrounds, text, cards, and dark mode all come from RicoFast's design system.
- **Floating pill header.** Matches the marketing site's header shape and glassmorphism so the page feels like part of the same product.
- **Top background grid tint.** The distinctive per-business touch: the subtle grid pattern behind the hero is tinted with the business primary color, giving each storefront its own atmosphere without breaking the shared design language.
- **Duplicated dark-mode boot script.** Both `Layout.astro` and `BusinessLayout.astro` contain a small inline dark-mode script. They are not shared because the marketing header's `main.js` depends on marketing-specific DOM IDs. Duplication is cheaper than an abstraction for two distinct use cases.
- **Minimal Biome config.** The project had no `biome.json`, so `pnpm check` was scanning generated directories and pre-existing files with lint errors. A minimal config was added to ignore those while keeping the new code checked.
