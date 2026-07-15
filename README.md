# Vehicle Match

**An interactive vehicle recommendation platform** — shoppers answer three quick
questions (type → priorities → preferences) and get matched to the right vehicle, with
the reasons why. Captured interest becomes a qualified lead, and every interaction feeds
a live dealer analytics dashboard.

Built by **Jazz Harris Studio** under the **Motorpool** brand.

🔗 **Live:** https://jazz-h.github.io/vehicle-match/
&nbsp;·&nbsp; 🖥️ **Dealer dashboard:** `/dashboard.html` (gated)
&nbsp;·&nbsp; 🖼️ **Case study page:** [`/case-study.html`](https://jazz-h.github.io/vehicle-match/case-study.html)
&nbsp;·&nbsp; 📄 **Case study (text):** [CASE-STUDY.md](CASE-STUDY.md)

![Vehicle Match — results](docs/screenshots/03-results.png)

## What it does
- **Guided match** — a 3-step wizard returns one confident recommendation with a
  transparent **match %**, the priorities it satisfies, full specs, and two alternates.
- **Lead capture** — the result ends in a personalized-quote form that writes to Supabase.
- **Dealer dashboard** — a gated analytics view: sessions, leads, conversion %, top type,
  a priority-popularity chart, a session funnel, and a leads table.

## Structure
| File | Role |
|------|------|
| `index.html` | Shopper app shell + Motorpool design system (styles) |
| `data.js` | Curated demo dataset (~20 vehicles) + wizard config |
| `scoring.js` | Transparent, pure scoring engine (weighted priorities + filters) |
| `app.js` | Wizard state machine, rendering, results, quote form |
| `supabase.js` | Data client — insert-only lead/event writes + dealer auth & reads |
| `dashboard.html` / `dashboard.js` | Gated dealer analytics dashboard |
| `schema.sql` | Supabase tables, row-level security, aggregate views |
| `test-scoring.js` | Node unit tests for the scoring engine (`node test-scoring.js`) |

## Recommendation logic
`match % = weighted average of the shopper's chosen priority scores` (top pick
weighted 3-2-1), after hard/soft filters (type, budget, seats, drivetrain). If filters
are too strict, they relax gracefully and the result explains it. Every match surfaces
*why* it fits. Pure and unit-tested — run `node test-scoring.js`.

## Status
- ✅ **M0/M1** — dataset, scoring engine (+ tests), branded wizard + results.
- ✅ **M2** — states + accessibility polish, meta/OG, PWA manifest.
- ✅ **M3** — lead capture (post-result quote form → Supabase `vm_leads`), live.
- ✅ **M4** — dealer analytics dashboard (live from `vm_events` / `vm_leads`).
- ⏳ **M5** — portfolio wrap (this case study; deployed URL / custom-domain decision).

## Setup (backend)
1. Create a Supabase project; run [`schema.sql`](schema.sql) in the SQL editor.
2. Put the project URL + anon key in `supabase.js` (`SUPABASE_URL`, `SUPABASE_ANON_KEY`).
   RLS keeps the anon key **insert-only** for `vm_events` / `vm_leads`; dashboard reads
   require an authenticated dealer session.
3. Create a dealer login: Supabase → **Authentication → Users → Add user** (auto-confirm),
   then sign in at `/dashboard.html`.

## Screenshots
| | |
|---|---|
| ![Landing](docs/screenshots/01-landing.png) | ![Wizard](docs/screenshots/02-wizard.png) |
| ![Quote](docs/screenshots/04-quote.png) | ![Dashboard](docs/screenshots/06-dashboard.png) |
