# Changelog

Every commit: run `node scripts/check-seo-sync.mjs`, then add an entry here noting what changed and whether
title / meta description / Open Graph / JSON-LD were updated.

## Unreleased: first build (MVP static frontend, localhost only)

- Added `index.html` (Summit) and `awards.html` (Awards), linked from the nav. Plain HTML/CSS/JS, no build step.
- Event date is 30 Jan 2027 everywhere (single source of truth). The logo now reads 2027.
- SEO/AEO written for each page: `<title>`, meta description, Open Graph, Event JSON-LD (2027-01-30, Mumbai) and FAQPage JSON-LD that matches the visible FAQ.
  - Not final: `canonical` and `og:url` (no domain yet), absolute `og:image`, the venue ("Venue to be announced").
- Forms (registration, partnership, nomination enquiry): client-side validation, one required consent box (Terms, Privacy, Cancellation; transactional contact only), MVP confirmation pop-up. No data is sent.
- Award categories and plan prices are fetched from the Eventhub read-only endpoints copied from the earlier `mh-health` site (config in `js/site.js`).
- Handoff markers: `TODO(backend)`, `TODO(payment)`, `TODO(analytics)`, `TODO(content)`.
- All photographs are stand-ins (Pexels, Unsplash) for the content team to replace.

## Unreleased: UI rebuild (no copy, SEO or JSON-LD content changes)

- Dropped the taste-skill CSS/JS kit. One hand-written stylesheet (`css/site.css`, 8.5 KB) and one script (`js/site.js`, 5.6 KB gz) now drive both pages.
- Layout: sections size to their content (the kit forced one screen each, which caused dead space and the categories overflowing into "Nomination plans").
- Colour blocks with wave transitions: teal themes band, navy awards band, tinted forms; blue ticker strip under the hero.
- Motion (CSS + JS, reduced-motion safe): staggered scroll reveals, counters, header shadow and scroll progress bar, scroll-spy nav, hover lifts, floating hero card, FAQ accordion, dialog pop-in.
- Awards: live category filter, compact category cards with "Show details", featured plan card, step timeline.
- Mobile: full-screen menu, action bar after the hero, header button hidden on phones.
- SEO sync script updated for the accordion FAQ markup. Title, description, Open Graph and JSON-LD are unchanged.

## Unreleased: new event logo and cleanup

- Event logo replaced everywhere (hero on both pages, favicon, share image, preload) with https://static.langimg.com/photo/135920940.cms, self-hosted as lossless WebP (39 KB, 480px wide). It has a real transparent background, so no colour-keying is needed. Logo alt text and `og:image:alt` now read "Wellness and Healthcare Summit and Awards" to match the artwork. JSON-LD and meta tags are otherwise unchanged.
- Removed: the unused taste-skill kit (`assets/`, `.taste-skill/`), the old black-background logo PNG, the old logo sizes, and the three content/spec markdown files (`summit-content.md`, `awards-content.md`, `form-fields.md`). Backend field notes now live in the `TODO(backend)` comments and `js/site.js`.
- `scripts/check-seo-sync.mjs` is kept: it is the pre-commit check for title, meta, Open Graph and JSON-LD.

## Unreleased: passes, favicon, go-live files

- Registration form: two passes, Basic Rs 1,499 (was 1,999: session access only, no lunch, no networking arena access) and Premium Rs 1,999 (was 2,999: sessions, lunch, networking arena access). The pass is required, shown in the confirmation pop-up, and the hero chip and closing text now mention it. Payment is not connected (`TODO(payment)` marker).
- SEO/AEO updated to match: Event JSON-LD now has `offers` for both passes (checked against the page by `scripts/check-seo-sync.mjs`), and the FAQ plus FAQPage JSON-LD gain "What is the difference between the Basic and Premium pass?". The old "ticket types coming soon" copy is gone.
- Favicon is now the logo's emblem (figure, gold ring, leaf) on white, 64px, plus an apple-touch icon.
- Go-live: canonical, og:url, absolute og:image and JSON-LD urls point at https://singhavi279.github.io/mt-health/. Added `robots.txt`, `sitemap.xml`, `llms.txt` (rewritten for 30 Jan 2027), `.nojekyll` and `.gitignore`. The check script now also verifies canonical equals og:url and og:image is absolute.
