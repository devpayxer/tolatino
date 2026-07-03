-- To'Latino — enable Supabase Realtime for the community social layer so likes
-- and comments update live (no page refresh). We only publish the tables whose
-- PUBLICLY-READABLE columns drive the UI:
--   • posts          → `recommends` (♥ count) changes via toggle_post_like
--   • post_comments  → new comments/replies (INSERT) + `like_count` (UPDATE)
-- Membership tables (post_likes / comment_likes / saved_posts) are per-user and
-- RLS-private, so we never broadcast them; the public counter columns above are
-- the source of truth for everyone.
--
-- RLS still applies to realtime: subscribers only receive rows they may SELECT.
-- Both tables have a public read policy, so anon + authenticated get the events.
--
-- Apply: paste into the Supabase SQL Editor and Run. Idempotent.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'posts'
  ) then
    execute 'alter publication supabase_realtime add table public.posts';
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'post_comments'
  ) then
    execute 'alter publication supabase_realtime add table public.post_comments';
  end if;
end $$;
