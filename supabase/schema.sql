-- Simcademy — shared playground designs
-- Run this once in the Supabase dashboard → SQL Editor (safe to re-run).
--
-- Stores a serialized playground graph under a short id. Anonymous sharing:
-- anyone can save a design and open a shared one (no accounts). The client
-- uses the public "publishable" key, which acts as the `anon` role.

-- 1. Table
create table if not exists public.designs (
  id         text primary key,           -- short id used in ?d=<id> links
  graph      text not null,              -- base64-encoded design (store.serialize())
  created_at timestamptz not null default now()
);

-- 2. Row Level Security
alter table public.designs enable row level security;

-- 3. Policies (idempotent: drop-then-create so re-running is safe)
drop policy if exists "anon can insert designs" on public.designs;
create policy "anon can insert designs" on public.designs
  for insert to anon
  with check (true);

drop policy if exists "anon can read designs" on public.designs;
create policy "anon can read designs" on public.designs
  for select to anon
  using (true);
