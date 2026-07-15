-- Vehicle Match — Supabase schema (run once in the SQL editor).
-- Two tables: anonymous shoppers INSERT selection events + leads;
-- only an authenticated dealer can READ them (for the dashboard).

create table if not exists public.vm_events (
  id          bigint generated always as identity primary key,
  session_id  text not null,
  step        text not null,          -- 'type' | 'priorities' | 'prefs' | 'result'
  choice      jsonb,                  -- the selection payload for that step
  created_at  timestamptz not null default now()
);

create table if not exists public.vm_leads (
  id                bigint generated always as identity primary key,
  name              text not null,
  email             text not null,
  vehicle_interest  text,             -- the vehicle they were matched with
  priorities        text[],           -- their chosen priorities
  session_id        text,
  created_at        timestamptz not null default now()
);

create index if not exists vm_events_created_idx on public.vm_events (created_at);
create index if not exists vm_events_step_idx    on public.vm_events (step);
create index if not exists vm_leads_created_idx   on public.vm_leads  (created_at);

-- Lock everything down, then open exactly what's needed.
alter table public.vm_events enable row level security;
alter table public.vm_leads  enable row level security;

-- Public (anon key, from the browser) may INSERT only — never read.
drop policy if exists "anon insert events" on public.vm_events;
create policy "anon insert events" on public.vm_events
  for insert to anon with check (true);

drop policy if exists "anon insert leads" on public.vm_leads;
create policy "anon insert leads" on public.vm_leads
  for insert to anon with check (true);

-- Explicit table grants (belt-and-suspenders alongside the RLS policies above).
grant usage on schema public to anon;
grant insert on public.vm_events to anon;
grant insert on public.vm_leads  to anon;

-- Dashboard reads require a logged-in (authenticated) user.
drop policy if exists "auth read events" on public.vm_events;
create policy "auth read events" on public.vm_events
  for select to authenticated using (true);

drop policy if exists "auth read leads" on public.vm_leads;
create policy "auth read leads" on public.vm_leads
  for select to authenticated using (true);

-- Convenience aggregates for the dashboard. security_invoker makes each view
-- run with the querying user's privileges, so the base-table RLS above still
-- applies (a view would otherwise run as its definer and bypass RLS).
create or replace view public.vm_type_popularity
  with (security_invoker = true) as
  select choice->>'type' as type, count(*) as picks
  from public.vm_events where step = 'type' group by 1 order by 2 desc;

create or replace view public.vm_funnel
  with (security_invoker = true) as
  select step, count(distinct session_id) as sessions
  from public.vm_events group by step;
