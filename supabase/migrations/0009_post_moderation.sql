-- To'Latino — post ownership actions (edit/delete) + reporting. Authors can
-- update/delete their own posts; any signed-in user can report someone else's
-- post (one report per user per post). Reports are private (admin-reviewed).
-- Idempotent. Apply: paste into the Supabase SQL Editor and Run.

-- ── Owner can edit / delete their own posts (public read already exists) ─────
drop policy if exists "update own posts" on public.posts;
drop policy if exists "delete own posts" on public.posts;
create policy "update own posts" on public.posts
  for update using (auth.uid() = author_id) with check (auth.uid() = author_id);
create policy "delete own posts" on public.posts
  for delete using (auth.uid() = author_id);
-- (Deleting a post cascades to its comments, likes and saves via their FKs.)

-- ── Reports (one per user per post; not publicly readable) ───────────────────
create table if not exists public.post_reports (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason      text not null,
  created_at  timestamptz not null default now(),
  unique (post_id, reporter_id)
);
create index if not exists post_reports_post_idx on public.post_reports (post_id);

alter table public.post_reports enable row level security;
drop policy if exists "insert own report" on public.post_reports;
drop policy if exists "read own report"   on public.post_reports;
-- A user may file a report as themselves, and see only their own (admins read
-- everything via the service role). No public read.
create policy "insert own report" on public.post_reports
  for insert to authenticated with check (auth.uid() = reporter_id);
create policy "read own report" on public.post_reports
  for select to authenticated using (auth.uid() = reporter_id);
