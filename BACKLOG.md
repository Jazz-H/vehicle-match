# Vehicle Match — Backlog & Plan

> Living plan for the Vehicle Match app. Written so a fresh session scoped to
> **only** `jazz-h/vehicle-match` can pick up with full context.

---

## Vision
A client-ready **portfolio project for Jazz Harris Studio** that proves the studio
can build real business tools. An interactive **vehicle recommendation platform**:
a shopper answers a few questions and gets matched to the right vehicle, with the
reasons why — plus lead capture and a dealer analytics view.

**Used for:** jazzharrisstudio.com · LinkedIn · outreach to automotive businesses · a case study.

Product name/skin: **Motorpool** brand (this is intentional — the studio's brand, not the
separate personal "Motorpool" garage app, which lives in its own repo).

---

## Decisions (locked)
| Decision | Choice |
|----------|--------|
| Product | Vehicle Match recommendation wizard (Type → Priorities → Preferences → Result) |
| Brand | Motorpool — wordmark, red `#d83a29` / steel palette, Saira Condensed + IBM Plex |
| Backend | **Supabase** (lightweight, real leads + live analytics) |
| Vehicle data | Curated ~20-vehicle demo set (no live API) |
| Repo | Standalone `jazz-h/vehicle-match`, files at root, GitHub Pages |

---

## Architecture
- **Front-end:** static, GitHub Pages. `index.html` (shell + styles), `app.js` (wizard state
  machine + rendering), `data.js` (dataset + config), `scoring.js` (pure match engine).
- **Data plane:** Supabase (Postgres). Browser inserts events + leads directly; row-level
  security keeps the anon key **insert-only** for `vm_events`/`vm_leads`; dashboard reads
  require an authenticated (dealer) session. Schema is in `schema.sql`.
- **Scoring:** `match % = weighted average of the shopper's chosen priority scores` (top pick
  weighted 3-2-1) after hard/soft filters (type, budget, seats, drivetrain), with graceful
  fallback. Every result explains *why* it fits. Pure + unit-tested (`test-scoring.js`).

### Data model
- `vehicle` — `{ id, name, year, type, price, spec, hp, seats, drivetrain, tow, blurb, scores{6} }`
- `vm_leads` — `{ name, email, vehicle_interest, priorities[], session_id, created_at }`
- `vm_events` — `{ session_id, step, choice(jsonb), created_at }`

---

## Status
- ✅ **M0 — Foundation:** dataset, scoring engine (+ tests), Supabase schema, branded shell.
- ✅ **M1 — Core loop:** landing → 3-step wizard → results (match %, why-chips, specs,
  alternates, quote CTA stub). Verified desktop + mobile, zero overflow, no console errors.

---

## Roadmap

### M2 — Polish (states + a11y)  ⟶ NEXT
- [ ] Step transitions / motion (respect `prefers-reduced-motion`).
- [ ] Loading state on results compute (skeleton or brief spinner).
- [ ] Empty/edge states (surface the fallback note nicely; "widen your filters" affordance).
- [ ] Accessibility: focus management on step change, `aria-live` announcements, full keyboard
      nav for tiles/segments, roles, tap targets ≥44px.
- [ ] Responsive polish pass (already responsive — tighten spacing, type scale).
- [ ] Meta/OG/Twitter tags + favicon + social share image; optional PWA manifest.
- [ ] Back-button preserves prior selections (state already persists in memory — verify on Back).

### M3 — Lead capture
- [ ] `supabase.js` client (project URL + anon key).
- [ ] Post-result **quote form** (name, email, vehicle interest) → insert `vm_leads`.
- [ ] Wire the `track()` stub in `app.js` → insert `vm_events` at each step + result.
- [ ] Form validation, success/thank-you + error states, basic privacy note.
- **Blocked on:** create Supabase project → run `schema.sql` → add keys.

### M4 — Dealer dashboard
- [ ] Gated view (Supabase auth — magic link or simple login).
- [ ] Stat tiles: total sessions, leads, conversion %, most-selected type.
- [ ] Charts: priority popularity, step funnel (from `vm_events`).
- [ ] Leads table (from `vm_leads`).
- [ ] Keep it tight: 4 tiles + 2 charts + 1 table, one login.

### M5 — Portfolio wrap
- [ ] Case-study copy: problem → approach → solution → data-driven insight.
- [ ] Screenshots (landing, wizard, result, dashboard).
- [ ] Deployed URL; custom domain decision (jazzharrisstudio.com or subpath).
- [ ] LinkedIn post draft.
- [ ] Project title/description finalized (see below).

---

## Setup checklist (owner actions)
- [ ] **Enable GitHub Pages:** repo → Settings → Pages → Deploy from branch → `main` / `/(root)`.
      → live at `https://jazz-h.github.io/vehicle-match/`.
- [ ] **Supabase:** create project → run `schema.sql` in SQL editor → copy Project URL + anon key.
- [ ] **Custom domain** (optional): point jazzharrisstudio.com (or a subpath) at Pages.
- [ ] **Real vehicle images** (optional): currently body-type SVG silhouettes; drop photos into a
      per-vehicle `image` field later (schema already accounts for it).

---

## Portfolio copy (from the plan — for M5)
- **Title:** Vehicle Match — Interactive Vehicle Recommendation Platform
- **Description:** A web application that simplifies vehicle discovery by matching customers with
  vehicles based on their preferences, lifestyle, and budget.
- **Highlights:** UX design · transparent recommendation logic · business problem-solving ·
  data-driven insights (analytics dashboard).

---

## Nice-to-haves (post-MVP — do NOT overbuild before M5 ships)
- More vehicles / more filter axes; live vehicle API.
- Shareable result via URL params; email-me-my-match.
- Side-by-side comparison view; financing/payment estimator.
- Real photos; per-trim data.

## Scope discipline
Keep the dataset ~20, the dashboard to 4 tiles + 2 charts + a leads table, and one gated login.
Ship the full M0→M5 loop before pulling anything up from nice-to-haves.
