-- 0094_updates_pro.sql — Novedades (business updates) grow up to Google-Business-
-- posts level:
-- 1) business_updates learns the full lifecycle: status (live/scheduled/draft/
--    archived), pinned, scheduled_at, updated_at — drafts & scheduled posts now
--    survive refresh instead of living only in component state.
-- 2) RLS split: the PUBLIC only ever reads LIVE posts; the owner reads all of
--    their own (drafts stay private).
-- 3) business_update_likes: real per-user likes (one per user per post) with
--    triggers that keep the denormalized likes counter true.
-- 4) business_updates_by_slug: consumer feed RPC (live only, pinned first).
-- 5) bump_update_views: batched view counter for the consumer tab.
-- Idempotent. Vanilla Postgres — portable to self-hosted.

-- ── 1 · Lifecycle columns ─────────────────────────────────────────────────────
alter table public.business_updates
  add column if not exists status       text not null default 'live',
  add column if not exists pinned       boolean not null default false,
  add column if not exists scheduled_at timestamptz,
  add column if not exists updated_at   timestamptz;

alter table public.business_updates drop constraint if exists business_updates_status_check;
alter table public.business_updates add constraint business_updates_status_check
  check (status in ('live', 'scheduled', 'draft', 'archived'));

-- Consumer feed ordering: live rows, pinned first, newest first.
create index if not exists business_updates_live_idx
  on public.business_updates (business_id, pinned desc, created_at desc)
  where status = 'live';

-- ── 2 · RLS: public sees LIVE only; the owner sees everything of their own ───
drop policy if exists "public read business_updates" on public.business_updates;
create policy "public read business_updates" on public.business_updates
  for select using (
    status = 'live'
    or exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
  );

-- ── 3 · Real per-user likes ───────────────────────────────────────────────────
create table if not exists public.business_update_likes (
  update_id  uuid not null references public.business_updates(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (update_id, user_id)
);
create index if not exists business_update_likes_user_idx on public.business_update_likes (user_id);

alter table public.business_update_likes enable row level security;
drop policy if exists "read own update likes"   on public.business_update_likes;
drop policy if exists "like as self"            on public.business_update_likes;
drop policy if exists "unlike as self"          on public.business_update_likes;
create policy "read own update likes" on public.business_update_likes for select using (auth.uid() = user_id);
create policy "like as self"   on public.business_update_likes for insert to authenticated with check (auth.uid() = user_id);
create policy "unlike as self" on public.business_update_likes for delete to authenticated using (auth.uid() = user_id);

-- Keep the denormalized counter true (display reads the counter, truth is the table).
create or replace function public.tg_update_like_count() returns trigger
language plpgsql security definer set search_path = public as $fn$
begin
  if tg_op = 'INSERT' then
    update public.business_updates set likes = likes + 1 where id = new.update_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.business_updates set likes = greatest(0, likes - 1) where id = old.update_id;
    return old;
  end if;
  return null;
end $fn$;
drop trigger if exists update_like_count on public.business_update_likes;
create trigger update_like_count
  after insert or delete on public.business_update_likes
  for each row execute function public.tg_update_like_count();

-- ── 4 · Consumer feed RPC (live only, pinned first, capped) ──────────────────
create or replace function public.business_updates_by_slug(in_slug text)
returns table (
  id uuid, kind text, body_es text, body_en text, image_url text,
  likes int, created_at timestamptz, pinned boolean
)
language sql stable security definer set search_path = public as $$
  select u.id, u.kind, u.body_es, u.body_en, u.image_url, u.likes, u.created_at, u.pinned
  from public.business_updates u
  join public.businesses b on b.id = u.business_id
  where b.slug = in_slug and u.status = 'live'
  order by u.pinned desc, u.created_at desc
  limit 50;
$$;
grant execute on function public.business_updates_by_slug(text) to anon, authenticated;

-- ── 5 · Batched view counter (consumer opens the Novedades tab) ──────────────
-- Views are an owner-facing metric (consumers never see them). Caps the batch at
-- 50 live rows so the RPC can't be abused to bump arbitrary volumes.
create or replace function public.bump_update_views(in_ids uuid[])
returns void
language sql security definer set search_path = public as $$
  update public.business_updates
  set views = views + 1
  where id = any (
    select distinct x from unnest(in_ids) as x limit 50
  ) and status = 'live';
$$;
grant execute on function public.bump_update_views(uuid[]) to anon, authenticated;

notify pgrst, 'reload schema';
