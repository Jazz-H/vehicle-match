# Vehicle Match

An interactive vehicle recommendation tool — shoppers answer three quick questions
(type → priorities → preferences) and get matched to the right vehicle, with the
reasons why. Built as a Jazz Harris Studio demo under the **Motorpool** brand.

**Live path:** `/vehicle-match/`

## Structure
| File | Role |
|------|------|
| `index.html` | App shell + Motorpool design system (styles) |
| `data.js` | Curated demo dataset (~20 vehicles) + wizard config |
| `scoring.js` | Transparent, pure scoring engine (weighted priorities + filters) |
| `app.js` | Wizard state machine, rendering, results |
| `schema.sql` | Supabase tables + row-level security (leads + analytics events) |
| `test-scoring.js` | Node unit tests for the scoring engine (`node test-scoring.js`) |

## Recommendation logic
`match % = weighted average of the shopper's chosen priority scores` (top pick
weighted 3-2-1), after hard/soft filters (type, budget, seats, drivetrain). If
filters are too strict, they relax gracefully and the result explains it. Every
match surfaces *why* it fits.

## Roadmap
- **M0/M1 (done):** dataset, scoring, branded wizard + results, mobile-responsive.
- **M2:** loading/empty/error states, polish pass.
- **M3:** lead capture (post-result quote form → Supabase).
- **M4:** dealer analytics dashboard (live from `vm_events` / `vm_leads`).
- **M5:** case study, deployed URL, portfolio wrap.

## Backend setup (M3+)
1. Create a Supabase project; run `schema.sql` in the SQL editor.
2. Add the project URL + anon key to a small `supabase.js` client (RLS keeps the
   anon key insert-only for `vm_events` / `vm_leads`; reads require auth).
