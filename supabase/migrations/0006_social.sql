-- To'Latino — social layer for community posts: comments (+ replies), post
-- likes (♥ recommends), comment likes, and saves. Per-user, RLS-protected.
-- Counters live on the parent row and are moved only by SECURITY DEFINER
-- toggle functions (so users can't edit counts directly), which also enforce
-- one-like-per-user via the membership tables.
--
-- Apply: paste into the Supabase SQL Editor and Run.

-- ── Comments (threaded one level: parent_id → reply) ────────────────────────
create table if not exists public.post_comments (
  id             uuid primary key default gen_random_uuid(),
  post_id        uuid not null references public.posts(id) on delete cascade,
  parent_id      uuid references public.post_comments(id) on delete cascade,
  author_id      uuid not null references auth.users(id) on delete cascade,
  author_name    text not null,
  author_initials text not null,
  author_color   text not null default '#7B61FF',
  body           text not null default '',
  biz_name       text,
  biz_rating     text,
  like_count     int  not null default 0,
  created_at     timestamptz not null default now()
);
-- a comment may be just a business recommendation (no text), so body can be
-- empty as long as a business is tagged.
alter table public.post_comments add column if not exists biz_name   text;
alter table public.post_comments add column if not exists biz_rating text;
create index if not exists post_comments_post_idx   on public.post_comments (post_id, created_at);
create index if not exists post_comments_parent_idx on public.post_comments (parent_id);

alter table public.post_comments enable row level security;
drop policy if exists "public read comments" on public.post_comments;
drop policy if exists "insert own comment"   on public.post_comments;
drop policy if exists "delete own comment"   on public.post_comments;
create policy "public read comments" on public.post_comments for select using (true);
create policy "insert own comment"   on public.post_comments for insert with check (auth.uid() = author_id);
create policy "delete own comment"   on public.post_comments for delete using (auth.uid() = author_id);

-- ── Membership tables (one row per user per target) ─────────────────────────
create table if not exists public.post_likes (
  post_id uuid references public.posts(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create table if not exists public.comment_likes (
  comment_id uuid references public.post_comments(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete cascade,
  primary key (comment_id, user_id)
);
create table if not exists public.saved_posts (
  post_id uuid references public.posts(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.post_likes    enable row level security;
alter table public.comment_likes enable row level security;
alter table public.saved_posts   enable row level security;

-- users read + manage only their own membership rows
do $$
declare t text;
begin
  foreach t in array array['post_likes','comment_likes','saved_posts'] loop
    execute format('drop policy if exists "own read %1$s" on public.%1$s', t);
    execute format('drop policy if exists "own write %1$s" on public.%1$s', t);
    execute format('drop policy if exists "own delete %1$s" on public.%1$s', t);
    execute format('create policy "own read %1$s"  on public.%1$s for select using (auth.uid() = user_id)', t);
    execute format('create policy "own write %1$s" on public.%1$s for insert with check (auth.uid() = user_id)', t);
    execute format('create policy "own delete %1$s" on public.%1$s for delete using (auth.uid() = user_id)', t);
  end loop;
end $$;

-- ── Toggle functions (move the counter safely) ──────────────────────────────
create or replace function public.toggle_post_like(p_post uuid)
returns table (liked boolean, count int)
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); has boolean;
begin
  if uid is null then raise exception 'auth required'; end if;
  select exists(select 1 from post_likes where post_id = p_post and user_id = uid) into has;
  if has then
    delete from post_likes where post_id = p_post and user_id = uid;
    update posts set recommends = greatest(0, recommends - 1) where id = p_post;
  else
    insert into post_likes(post_id, user_id) values (p_post, uid) on conflict do nothing;
    update posts set recommends = recommends + 1 where id = p_post;
  end if;
  return query select (not has), coalesce((select recommends from posts where id = p_post), 0);
end $$;

create or replace function public.toggle_comment_like(p_comment uuid)
returns table (liked boolean, count int)
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); has boolean;
begin
  if uid is null then raise exception 'auth required'; end if;
  select exists(select 1 from comment_likes where comment_id = p_comment and user_id = uid) into has;
  if has then
    delete from comment_likes where comment_id = p_comment and user_id = uid;
    update post_comments set like_count = greatest(0, like_count - 1) where id = p_comment;
  else
    insert into comment_likes(comment_id, user_id) values (p_comment, uid) on conflict do nothing;
    update post_comments set like_count = like_count + 1 where id = p_comment;
  end if;
  return query select (not has), coalesce((select like_count from post_comments where id = p_comment), 0);
end $$;

grant execute on function public.toggle_post_like    to authenticated;
grant execute on function public.toggle_comment_like to authenticated;
