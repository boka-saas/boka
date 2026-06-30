# Hero Live Dashboard Preview

## Summary

Replace the static dashboard screenshot on the landing page hero with a live iframe preview of the Boka business dashboard demo. The preview is clickable and opens the demo in a new tab with a smooth hover/click animation.

## Background

The current hero section in `src/components/home/HeroSection.astro` displays a static PNG (`/assets/boka/boka-dashboard.png`) inside a `BrowserFrame`. The demo URL already exists in `src/config/site.js` as `links.dashboardDemo`: `https://boka-business-demo.netlify.app/dashboard/`.

## Goal

Turn the hero preview into a real, interactive preview of the live dashboard while keeping the existing visual design and making it obvious that it opens the full demo.

## Design

### Component changes

- Modify `src/components/home/HeroSection.astro` only.
- Keep the existing `BrowserFrame` chrome, badges, and layout.
- Replace the `<img>` element inside the frame with an `<iframe>` whose `src` is `siteConfig.links.dashboardDemo`.
- Wrap the `BrowserFrame` in an `<a>` element pointing to the same URL with `target="_blank"` and `rel="noopener noreferrer"`.
- Preserve the existing AOS entrance animation.

### Visual interaction

- On hover, the `BrowserFrame` gently scales up (`transform: scale(1.02)`), lifts its shadow, and reveals a centered overlay hint: "Open live demo →".
- On click, the browser opens the demo URL in a new tab.
- Transitions use `transition-transform` and `transition-opacity` with a short duration (around 300ms).
- Respect `prefers-reduced-motion` by disabling transforms.

### Fallback

- If the demo site does not allow iframe embedding, the iframe will fail to load. The implementation should keep the existing static image code commented or available for quick reversion.

## Files touched

- `src/components/home/HeroSection.astro`
- `src/config/site.js` (no change, already contains the URL)

## Verification

- `pnpm build` passes.
- The hero section renders the iframe preview.
- Clicking the preview opens `https://boka-business-demo.netlify.app/dashboard/` in a new tab.
- Hover animation is smooth and disabled under `prefers-reduced-motion`.
