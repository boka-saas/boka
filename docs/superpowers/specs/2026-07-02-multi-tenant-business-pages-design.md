# Multi-Tenant Business Pages Design

> Date: 2026-07-02
> Project: Boka SaaS v2 (Astro static marketing site)
> Topic: JSON-driven, theme-injected public business pages

## Goal

Add dynamic public business pages to the existing Astro marketing site so that each service business (barber, salon, nail bar, etc.) gets its own URL and branded storefront, without duplicating markup.

Example URLs:

- `/alis-barber`
- `/tinas-nails`
- `/the-groom-room`

Each page shows the business name, tagline, prices, booking call-to-action, and contact details, styled with the business's own colors and logo.

## Context

The project is a static-first Astro site (Astro 6.4, Tailwind CSS v4, MDX). It currently has marketing pages only (`/`, `/pricing`, `/about`, etc.). The goal is to add multi-tenant business pages while preserving the existing marketing site and design system.

## Approach

**JSON-driven static generation with CSS-variable theming.**

Each business is defined by a JSON config file. A single dynamic Astro route generates one static page per business at build time. Shared components render the page, reading business data and theme CSS variables from the config. This keeps the site static, fast, and easy to deploy, while still allowing each business to look distinct.

Alternatives considered:

- **SSR with an Astro adapter** — rejected for first version because it adds hosting complexity and is unnecessary when business data lives in version-controlled JSON.
- **Separate page per business** — rejected because it duplicates markup and does not scale.

## Data Model

Each business config lives at `src/data/businesses/<slug>.json`.

Required fields:

| Field | Type | Purpose |
| --- | --- | --- |
| `slug` | string | URL identifier, must match filename stem |
| `name` | string | Business display name |
| `tagline` | string | Short value proposition |
| `description` | string | Longer intro text |
| `logo` | string | Path to logo image in `public/` |
| `theme` | object | Color tokens for theming |
| `contact` | object | Address, phone, opening hours |
| `services` | array | List of services with prices and duration |
| `bookingUrl` | string | External booking link or anchor target |

Theme object:

| Field | Type | Purpose |
| --- | --- | --- |
| `primary` | string | Main brand color |
| `primaryStrong` | string | Hover/emphasis variant |
| `accent` | string | Highlight/CTA color |
| `bg` | string | Light-mode page background |
| `bgDark` | string | Dark-mode page background |
| `text` | string | Light-mode body text color |
| `textDark` | string | Dark-mode body text color |

Example `src/data/businesses/alis-barber.json`:

```json
{
  "slug": "alis-barber",
  "name": "Ali's Barber",
  "tagline": "Precision cuts in East London",
  "description": "Traditional barbering with modern style. Walk-ins welcome.",
  "logo": "/assets/businesses/alis-barber/logo.png",
  "theme": {
    "primary": "#8B5A2B",
    "primaryStrong": "#A66E3A",
    "accent": "#F4C430",
    "bg": "#FDF8F3",
    "bgDark": "#1A120B",
    "text": "#3E2723",
    "textDark": "#F5F0EB"
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

## Architecture

### Build-time flow

1. `src/lib/businesses.js` reads every `src/data/businesses/*.json` file.
2. It validates required fields and returns an array of business objects plus a `getBusinessBySlug(slug)` lookup.
3. `src/pages/[business]/index.astro` calls `getAllBusinesses()` inside `getStaticPaths()` to generate one route per slug.
4. Astro builds static HTML pages at `/<slug>/index.html`.

### Request-time flow

1. Visitor requests `/alis-barber`.
2. Astro serves the pre-built page for that slug.
3. The page receives `Astro.params.business` and calls `getBusinessBySlug('alis-barber')`.
4. The business object is passed into `BusinessLayout` and shared components.
5. `BusinessLayout` injects the theme as CSS custom properties on a wrapper element.
6. Components use those CSS variables for colors, so the same markup renders differently per business.

## Theming

Theme injection happens in `BusinessLayout.astro`:

```astro
<article
  class={`business-wrapper business-${business.slug}`}
  style={themeToStyle(business.theme)}
>
  <slot />
</article>
```

`themeToStyle` maps the JSON theme object to CSS custom properties:

```css
.business-alis-barber {
  --business-primary: #8B5A2B;
  --business-primary-strong: #A66E3A;
  --business-accent: #F4C430;
  --business-bg: #FDF8F3;
  --business-bg-dark: #1A120B;
  --business-text: #3E2723;
  --business-text-dark: #F5F0EB;
}
```

Components reference these variables instead of global tokens when inside a business page. Example:

```css
.business-button {
  background-color: var(--business-primary);
  color: white;
}

.business-button:hover {
  background-color: var(--business-primary-strong);
}
```

Dark mode is supported by overriding the variables with a `.dark` parent class:

```css
.dark .business-wrapper {
  --business-bg: var(--business-bg-dark);
  --business-text: var(--business-text-dark);
}
```

### Styling rules

- Use Tailwind utilities plus the business CSS variables.
- Prefer existing site components (`Button.astro`, `Badge.astro`) where they fit, but override their colors with business variables via a wrapping class.
- Business pages should still respect the global dark-mode toggle.
- Avoid one-off hex values; derive all colors from the injected theme object.

## Page Structure

Each business page contains these sections, top to bottom:

1. **BusinessHeader** — logo + business name + simple nav (Prices, Book).
2. **BusinessHero** — name, tagline, description, and two primary CTAs.
3. **BusinessPrices** — list of services with prices and durations (anchor `id="prices"`).
4. **BusinessBooking** — booking call-to-action linking to `bookingUrl` (anchor `id="booking"`).
5. **BusinessContact** — address, phone, and opening hours.

The Prices and Booking components are shared across all businesses and styled purely through the injected theme variables.

`BusinessHeader` links to `#prices` and `#booking` so the in-page anchors scroll smoothly.

## Dynamic Route

`src/pages/[business]/index.astro`:

```astro
---
import Layout from "@/layouts/Layout.astro";
import BusinessLayout from "@/components/businesses/BusinessLayout.astro";
import BusinessHeader from "@/components/businesses/BusinessHeader.astro";
import BusinessHero from "@/components/businesses/BusinessHero.astro";
import BusinessPrices from "@/components/businesses/BusinessPrices.astro";
import BusinessBooking from "@/components/businesses/BusinessBooking.astro";
import BusinessContact from "@/components/businesses/BusinessContact.astro";
import { getAllBusinesses, getBusinessBySlug } from "@/lib/businesses.js";

export async function getStaticPaths() {
  const businesses = await getAllBusinesses();
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

<Layout title={business.name} description={business.tagline}>
  <BusinessLayout business={business}>
    <BusinessHeader business={business} />
    <BusinessHero business={business} />
    <BusinessPrices business={business} />
    <BusinessBooking business={business} />
    <BusinessContact business={business} />
  </BusinessLayout>
</Layout>
```

`BusinessLayout` wraps the global `Layout.astro` (so site chrome, dark-mode script, analytics, header, and footer stay in place) and injects the business theme via a wrapper element.

## Component and File Plan

### Component props

All business components receive the same prop shape:

```ts
interface Props {
  business: Business;
}
```

Where `Business` is the validated object loaded by `src/lib/businesses.js`.

### Implementation conventions

- Use the existing `@/` path alias for imports (already configured in `astro.config.mjs`).
- Keep business components in `src/components/businesses/`.
- Keep business data in `src/data/businesses/`.
- Keep business styles in `src/styles/business.css`.
- Match the existing site's section spacing (`py-16 md:py-24`) and container classes (`site-container`) where appropriate.

### New files

```text
src/data/businesses/alis-barber.json
src/data/businesses/tinas-nails.json
src/lib/businesses.js
src/pages/[business]/index.astro
src/components/businesses/BusinessLayout.astro
src/components/businesses/BusinessHeader.astro
src/components/businesses/BusinessHero.astro
src/components/businesses/BusinessPrices.astro
src/components/businesses/BusinessBooking.astro
src/components/businesses/BusinessContact.astro
src/styles/business.css
```

### Modified files

```text
src/layouts/Layout.astro   (conditionally import business.css for business pages)
src/styles/global.css      (optional utility helpers)
```

## Error Handling

- **Missing business:** `getBusinessBySlug` returns `null` for unknown slugs. The page returns `new Response(null, { status: 404 })` so Astro renders the existing `src/pages/404.astro` page.
- **Invalid config:** `src/lib/businesses.js` validates required fields at import time. A missing required field throws an error during `pnpm build`, failing fast with a clear message.
- **Missing theme token:** Components fall back to the global site token if a specific business theme key is absent.
- **Missing logo image:** If the referenced logo is missing, render the business name as text fallback.
- **Currency format:** Prices are integers in the JSON and rendered with the British Pound symbol (`£`) for the sample businesses.

## Testing and Verification

- `pnpm build` passes.
- `pnpm check` passes (Biome formatting/lint).
- Manual route review:
  - `/alis-barber` renders with Ali's Barber theme.
  - `/tinas-nails` renders with Tina's Nails theme.
  - `/nonexistent-business` returns 404.
- Verify existing marketing routes are unaffected: `/`, `/pricing`, `/about`, `/contact`.
- Verify light/dark mode toggle works on business pages.
- Verify responsive layout at mobile, tablet, and desktop widths.

## Out of Scope (Future Work)

- Subdomain routing (`alis.boka.io`). Can be added later with hosting-level rewrites or an Astro SSR adapter.
- Backend-driven business config. The JSON approach can be replaced by an API later without changing the component structure.
- Real booking flow. The booking section links out to `bookingUrl` for now.
- Rich business landing pages (galleries, staff bios, reviews). The storefront is intentionally simple for the first version.

## Risks

- If many businesses are added, the JSON approach may become unwieldy. At that point, migrate to a CMS or database with SSR.
- Theme colors must have sufficient contrast. Validation does not check accessibility; authors must choose accessible pairs.

## Open Questions

None at spec time.
