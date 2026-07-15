-- 0089_web_push.sql — Web Push (VAPID) fan-out for the notification feed.
-- Every row that lands in public.notifications (created by the existing order/
-- booking/rental/chat triggers) is POSTed to the `send-push` Edge Function via
-- pg_net, which delivers a real browser/phone push to each device the user
-- subscribed — so the client is alerted at every step (confirmado, preparando,
-- en camino, entregado, cancelado) even with the app closed, like DoorDash.
-- Free: VAPID, no push vendor. Idempotent. Paste into the Supabase SQL Editor + Run.
--
-- Portability note (self-host later): pg_net is a Supabase extension. On a
-- self-hosted Postgres, drop the trigger and instead run a small NestJS worker
-- that LISTENs on the same notifications table (it's the queue) and calls
-- web-push directly. The table/RLS/subscription model stays identical.

create extension if not exists pg_net;

-- One row per browser/device push subscription (W3C Push API JSON).
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,           -- subscription.keys.p256dh
  auth       text not null,           -- subscription.keys.auth
  lang       text not null default 'es',
  ua         text,
  created_at timestamptz not null default now()
);
create index if not exists push_subs_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
-- a signed-in user manages ONLY their own device subscriptions.
drop policy if exists "own push subs select" on public.push_subscriptions;
create policy "own push subs select" on public.push_subscriptions for select using (user_id = auth.uid());
drop policy if exists "own push subs insert" on public.push_subscriptions;
create policy "own push subs insert" on public.push_subscriptions for insert with check (user_id = auth.uid());
drop policy if exists "own push subs update" on public.push_subscriptions;
create policy "own push subs update" on public.push_subscriptions for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "own push subs delete" on public.push_subscriptions;
create policy "own push subs delete" on public.push_subscriptions for delete using (user_id = auth.uid());

-- Server-only config the fan-out trigger reads: the Edge Function URL, a shared
-- secret the function checks (x-hook-secret), and the public anon key used only
-- to pass the Edge gateway. Lives in the `private` schema → never exposed through
-- PostgREST; no grants to anon/authenticated. The row is inserted out-of-band
-- (secrets are NOT committed to git — see the session that shipped this).
create schema if not exists private;
create table if not exists private.push_config (
  id          int primary key default 1,
  fn_url      text not null,
  hook_secret text not null,
  anon_key    text not null,
  constraint push_config_singleton check (id = 1)
);

-- Fan-out: every new notification → POST it to the send-push Edge Function.
-- SECURITY DEFINER so it can read private.push_config. A no-op until configured.
create or replace function public.tg_push_fanout()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare cfg record;
begin
  select fn_url, hook_secret, anon_key into cfg from private.push_config where id = 1;
  if cfg.fn_url is null then return new; end if; -- not configured yet → skip quietly
  perform net.http_post(
    url := cfg.fn_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', cfg.anon_key,
      'Authorization', 'Bearer ' || cfg.anon_key,
      'x-hook-secret', cfg.hook_secret
    ),
    body := jsonb_build_object('user_id', new.user_id, 'kind', new.kind, 'data', new.data, 'link', new.link)
  );
  return new;
end $fn$;

drop trigger if exists trg_push_fanout on public.notifications;
create trigger trg_push_fanout after insert on public.notifications
  for each row execute function public.tg_push_fanout();

notify pgrst, 'reload schema';
