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

## Unreleased: no site-level SEO files

- Removed `robots.txt`, `sitemap.xml` and `llms.txt`: after editorial approval the page is hosted at https://timeslanguages.in/mthealth/, and timeslanguages.in already serves these files. `.nojekyll` stays for the GitHub Pages MVP.
- At go-live only the base URL changes (canonical, og:url, og:image, Event JSON-LD urls). All page links, images, fonts and scripts are relative, so the page works from the `/mthealth/` sub-path as is. The only root-absolute paths are the three placeholder form actions (`/api/TODO-backend-...`), which the backend team replaces.

## Unreleased: Awards page content and Awards Terms & Conditions

- Awards page: added the Overview, full Eligibility criteria, Why Nominate, the two-step Judging Process, the Early Bird Offer label on discounted plans, the exact initiative disclaimer, and the full grouped FAQ (16 questions in 5 groups, written from one source for the page and the FAQPage JSON-LD). The "Meet the jury / jury announced soon" line is removed because the supplied content no longer has it. The FAQ answer "How can I submit a nomination?" says "Start a nomination" (the button on this page) instead of "Nominate Now".
- New page `awards/tnc/index.html` (final address https://timeslanguages.in/mthealth/awards/tnc): the Awards Terms & Conditions, text word for word, with a contents list. Awards only: the nomination form's consent link, the Awards footer and the Governing terms rule point to it; the Summit page keeps the event Terms and Conditions at timeslanguages.in. The "Website" definition in the supplied text reads `timeslanguages.in/mt-health` and was left as supplied.
- Footer copyright now reads "(c) 2027 Times Internet Limited" on both pages.
- `scripts/check-seo-sync.mjs` covers the new page and ignores the eligibility rule dates (31 March 2026, 1 April 2024), which are rules, not event dates.

## Unreleased: Summit page content check

- Compared against the previous Summit page and filled the gaps: hero Date/Venue facts and the "An initiative by Times Internet Languages Live" credit (also on the Awards hero); the full About text with the supplied heading, event line and all three paragraphs; "Who should attend" heading; the Awards teaser heading "Know someone who deserves to be seen?", the "N award categories across N segments" line and the segment list with category counts (from the API); "Join Maharashtra's Health Community"; labels "Full name", "Current city" and "Phone number" with a +91 prefix on all forms; "Be Part of the Sangam" with Ways to partner, Benefits and a "Talk to Our Team" button; "Frequently asked questions"; and "Reach the right team for your query." above the contact cards.
- Left out on purpose: "Ticket types coming soon" (the two passes replace it), the marketing-updates checkbox (one required consent box covers registration and query contact), and "Jan 2027" (the date is 30 Jan 2027 everywhere).

## Unreleased: accordions, tighter spacing, file:// and mobile fixes

- Scripts load as classic `defer` scripts (a module script is blocked when a page is opened from disk, which silently disabled the burger menu, sticky bar and reveals). The Awards T&C links point at `awards/tnc/index.html` so they also work from disk, where a folder link shows a directory listing.
- Eligibility cards and the five FAQ groups are accordions: closed by default except the first card, the first FAQ group and its first question.
- Section, hero and footer spacing reduced; mobile nav and button tweaks.

## Unreleased: lead-gen Awards form, journey order, console fixes

- Awards: every "Start a nomination" / "Start with this plan" CTA (header, hero, plans, why, close, sticky bar) now reads "Register now" and opens a lead-gen enquiry form (name, email, phone, designation, organisation, consent). The plan, segment and description fields are removed. No "Register to attend" on Awards.
- Section order by user journey. Awards: Overview, Why nominate, Categories, Eligibility, Process, Judging, Fees, Register, FAQ. Summit: About, Themes, Agenda, Who attends, Register, Awards, Partner, FAQ. Navbars follow the same order.
- Categories: if the live API fails, the section shows "Award categories coming soon. Want to know more? Contact Simran Singh: +91 7838788554" (no stale copy).
- Font is inlined in the CSS (data URI) and the preload removed: no CORS or preload errors when opened from disk. fonts/ removed.

## Unreleased: header page links, mobile menu fix

- Navbar first item is the current page (Awards on Awards, Summit on Summit). Switching pages and "All events" (timeslanguages.in) are separate header buttons; on phones and tablets they sit at the bottom of the menu. The full desktop header starts at 1180px.
- Fixed the phone menu opening to an empty panel: the header's backdrop blur made it the containing block of the fixed menu. The blur is now desktop-only.

## Rebuild on the original site (team feedback)

- The redesigned pages are replaced by the original timeslanguages.in/mt-health pages: same content, colours, fonts (Montserrat + Mukta), logos, forms and scripts (assets/styles.css, script.js, awardCategories.js, nomination.js). Additions live in assets/extra.css.
- Awards order follows what TFM and VK Real Estate share: Hero, Overview, Categories, Eligibility, Why Nominate, Fee, Judging, FAQ, Contact (Simran Singh and Sagun Kumari only). The fee plans are now their own section. No jury section yet.
- Header like TFM/VK: All Events, section links, then Summit/Awards switch, Enquire Now, Nominate Now (or Register Now). Full link bar from 1500px; menu button below that.
- Hero: the logo stays on its light background; soft shapes and a slow float animation sit around the edges, not behind it. Award Categories button added. Sticky CTA bar on phones and tablets.
- Removed the redesign files (css/, js/site.js, img/, scripts/, awards/tnc/). T&C links go to the live timeslanguages.in/mt-health/award/tnc page.

## Round 2 on the original site

- Summit header: Register Now + Partner Now. "Talk to Our Team" is now "Partner Now", opening a partnership enquiry form (name, organisation, work email, mobile, type of partnership, optional message). TODO(backend): no EventHub form code yet, so it validates and thanks without sending.
- Awards header: Enquire Now + Nominate Now. Summit/Awards switch moved into the nav links.
- Contact: navy panel with one row per team (Sponsorship, Expo and partnership, Awards, plus the general-query line) on Summit; Awards shows only Simran Singh and Sagun Kumari.
- Categories: segment tabs run across the top with categories in two columns (no empty space). "Healthcare Providers & Medical Excellence" shows as "Clinical Excellence Awards", first. If the API fails: "Award categories coming soon. Want to know more? Contact Simran Singh: +91 7838788554".
- Overview: photo beside the unchanged text. Eligibility: accordions, only Organisation & operational requirements open.
- Plan cards and forms restyled (labels above large rounded fields, +91 prefix, gradient top bar) in the original fonts and colours. Type is ~12% larger site-wide; the full desktop nav shows from 1700px.

## Header, hero and FAQ updates

- Header like the reference: section links, then outlined "Summit page"/"Awards page" and "All events", and a solid "Register now"/"Register to attend" button; Times Internet Languages Live logo only. Full bar from 1660px, menu button below.
- Summit hero: Register Now and Partner Now. Awards hero: Enquire Now and Nominate Now (new tab); plan cards use Enquire now. "Award Categories" button removed from the Awards hero.
- Awards FAQ: each of the five groups is an accordion (first two open), questions inside stay accordions.
- Contact: phone above email for every person.

## Cache busting

- CSS and JS links carry `?v=20261126a`. Change the value on every release so browsers fetch the new files straight away (GitHub Pages lets browsers cache assets for 10 minutes).
