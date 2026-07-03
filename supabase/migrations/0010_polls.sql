-- To'Latino — real poll voting. Votes persist (one per user per poll, final),
-- the per-option counts live on posts.poll_votes (jsonb) and are moved only by a
-- SECURITY DEFINER rpc so users can't edit counts directly. Counts broadcast via
-- Realtime (posts is already published), so votes update live.
-- Idempotent. Apply: paste into the Supabase SQL Editor and Run.

-- ── Membership: one vote per user per poll post ─────────────────────────────
create table if not exists public.poll_votes (
  post_id      uuid not null references public.posts(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  option_index int  not null,
  created_at   timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index if not exists poll_votes_post_idx on public.poll_votes (post_id);

alter table public.poll_votes enable row level security;
drop policy if exists "read own poll vote" on public.poll_votes;
-- A user can see their own vote (to restore the selection after refresh). Writes
-- go only through vote_poll() below, which also bumps the counter.
create policy "read own poll vote" on public.poll_votes
  for select to authenticated using (auth.uid() = user_id);

-- ── Vote (records once, increments the counter, returns fresh counts) ────────
-- Output column is named `counts` (not `poll_votes`) so it doesn't shadow the
-- posts.poll_votes column inside the function body.
create or replace function public.vote_poll(p_post uuid, p_option int)
returns table (counts jsonb, my_option int)
language plpgsql security definer set search_path = public as $$
declare
  uid      uuid := auth.uid();
  existing int;
  opts     jsonb;
begin
  if uid is null then raise exception 'auth required'; end if;

  select p.poll_options into opts from posts p where p.id = p_post;
  if opts is null then raise exception 'not a poll'; end if;
  if p_option < 0 or p_option >= jsonb_array_length(opts) then
    raise exception 'invalid option';
  end if;

  -- make sure the counts array exists and is aligned with the options
  update posts
     set poll_votes = (select jsonb_agg(0) from generate_series(1, jsonb_array_length(opts)))
   where id = p_post and (poll_votes is null or jsonb_array_length(poll_votes) <> jsonb_array_length(opts));

  select pv.option_index into existing from poll_votes pv where pv.post_id = p_post and pv.user_id = uid;
  if existing is null then
    insert into poll_votes(post_id, user_id, option_index) values (p_post, uid, p_option);
    update posts
       set poll_votes = jsonb_set(
             poll_votes,
             array[p_option::text],
             to_jsonb(coalesce((poll_votes ->> p_option)::int, 0) + 1)
           )
     where id = p_post;
    existing := p_option;
  end if;

  return query select p.poll_votes, existing from posts p where p.id = p_post;
  -- (p.poll_votes → out `counts`; `existing` → out `my_option`)
end $$;

grant execute on function public.vote_poll to authenticated;
