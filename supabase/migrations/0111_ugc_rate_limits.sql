-- 0111_ugc_rate_limits.sql
-- Anti-spam rate limits on user-generated content. Before this, only COD orders
-- were limited (0083) — a script with the public anon key could flood posts,
-- comments, reviews, likes, endorsements and messages. Reuses 0083's proven
-- pattern: a per-user hourly cap enforced by a BEFORE INSERT trigger. SECURITY
-- INVOKER + a current_user in ('authenticated','anon') guard, so trusted
-- server-side inserts (SECURITY DEFINER RPCs, service_role) are never limited and
-- only real end-user writes are. Idempotent.
-- Apply: node scripts/sbsql.mjs --file supabase/migrations/0111_ugc_rate_limits.sql

-- Generalized per-user hourly limiter. Trigger args: (user_id_column, max_per_hour).
create or replace function public.tg_ugc_ratelimit() returns trigger
language plpgsql set search_path to 'public' as $fn$
declare
  col text := tg_argv[0];
  lim int := tg_argv[1]::int;
  uid uuid;
  n   int;
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  uid := (to_jsonb(new) ->> col)::uuid;
  if uid is null or uid <> auth.uid() then return new; end if;   -- only the acting user's own writes
  execute format(
    'select count(*) from public.%I where %I = $1 and created_at > now() - interval ''1 hour''',
    tg_table_name, col
  ) into n using uid;
  if n >= lim then
    raise exception 'Demasiadas acciones en poco tiempo. Espera un momento e intenta de nuevo.'
      using errcode = 'check_violation';
  end if;
  return new;
end $fn$;

drop trigger if exists ugc_ratelimit on public.posts;
create trigger ugc_ratelimit before insert on public.posts
  for each row execute function public.tg_ugc_ratelimit('author_id', '20');

drop trigger if exists ugc_ratelimit on public.post_comments;
create trigger ugc_ratelimit before insert on public.post_comments
  for each row execute function public.tg_ugc_ratelimit('author_id', '60');

drop trigger if exists ugc_ratelimit on public.post_likes;
create trigger ugc_ratelimit before insert on public.post_likes
  for each row execute function public.tg_ugc_ratelimit('user_id', '300');

drop trigger if exists ugc_ratelimit on public.reviews;
create trigger ugc_ratelimit before insert on public.reviews
  for each row execute function public.tg_ugc_ratelimit('user_id', '10');

drop trigger if exists ugc_ratelimit on public.business_endorsements;
create trigger ugc_ratelimit before insert on public.business_endorsements
  for each row execute function public.tg_ugc_ratelimit('user_id', '60');

-- Messages have no user_id column (sender is from_owner + the conversation), so
-- cap them PER CONVERSATION per minute — stops either side flooding a chat.
create or replace function public.tg_message_ratelimit() returns trigger
language plpgsql set search_path to 'public' as $fn$
declare n int;
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  select count(*) into n from public.business_messages
   where conversation_id = new.conversation_id and created_at > now() - interval '1 minute';
  if n >= 30 then
    raise exception 'Demasiados mensajes en poco tiempo. Espera un momento.'
      using errcode = 'check_violation';
  end if;
  return new;
end $fn$;

drop trigger if exists message_ratelimit on public.business_messages;
create trigger message_ratelimit before insert on public.business_messages
  for each row execute function public.tg_message_ratelimit();

notify pgrst, 'reload schema';
