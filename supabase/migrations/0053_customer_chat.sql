-- To'Latino — two-way in-app chat (buyer ↔ seller). Extends the owner-managed
-- messaging (0029) so a signed-in CUSTOMER can hold a live conversation with a
-- business: one conversation per (business, customer), customer read/send under
-- RLS, a get-or-create RPC, an insert trigger that keeps last_at + unread counts
-- fresh, and realtime on the messages table. Idempotent. Apply: paste into the
-- Supabase SQL Editor + Run.

-- 1) customer participation on the conversation
alter table public.business_conversations
  add column if not exists customer_user_id uuid references auth.users(id) on delete set null;
alter table public.business_conversations
  add column if not exists customer_unread int not null default 0;
create unique index if not exists business_conversations_biz_customer_uidx
  on public.business_conversations (business_id, customer_user_id)
  where customer_user_id is not null;

-- 2) RLS: the customer can read/update their own conversation and read/send its
--    messages (owner policies from 0029 stay — RLS combines with OR).
drop policy if exists "customer read own conversations" on public.business_conversations;
create policy "customer read own conversations" on public.business_conversations
  for select using (customer_user_id = auth.uid());
drop policy if exists "customer update own conversations" on public.business_conversations;
create policy "customer update own conversations" on public.business_conversations
  for update using (customer_user_id = auth.uid()) with check (customer_user_id = auth.uid());

drop policy if exists "customer read own conv messages" on public.business_messages;
create policy "customer read own conv messages" on public.business_messages
  for select using (exists (select 1 from public.business_conversations c where c.id = conversation_id and c.customer_user_id = auth.uid()));
drop policy if exists "customer send own conv messages" on public.business_messages;
create policy "customer send own conv messages" on public.business_messages
  for insert with check (from_owner = false and exists (select 1 from public.business_conversations c where c.id = conversation_id and c.customer_user_id = auth.uid()));

-- 3) get-or-create the signed-in customer's conversation with a business (by slug)
create or replace function public.start_conversation(in_slug text, in_name text, in_initials text, in_color text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_biz uuid;
  v_conv uuid;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  select id into v_biz from public.businesses where slug = in_slug limit 1;
  if v_biz is null then return null; end if;
  select id into v_conv from public.business_conversations
    where business_id = v_biz and customer_user_id = auth.uid() limit 1;
  if v_conv is null then
    insert into public.business_conversations (business_id, customer_user_id, customer_name, customer_initials, customer_color)
      values (v_biz, auth.uid(), coalesce(nullif(in_name, ''), 'Cliente'), in_initials, in_color)
      returning id into v_conv;
  end if;
  return v_conv;
end
$$;
grant execute on function public.start_conversation(text, text, text, text) to authenticated;

-- 4) keep the conversation fresh on every new message (last_at + unread per side)
create or replace function public.bump_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.business_conversations
    set last_at = now(),
        unread = unread + (case when new.from_owner then 0 else 1 end),
        customer_unread = customer_unread + (case when new.from_owner then 1 else 0 end)
    where id = new.conversation_id;
  return new;
end
$$;
drop trigger if exists trg_bump_conversation on public.business_messages;
create trigger trg_bump_conversation after insert on public.business_messages
  for each row execute function public.bump_conversation();

-- 5) realtime on the messages table (both sides get live updates)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'business_messages'
  ) then
    alter publication supabase_realtime add table public.business_messages;
  end if;
end
$$;

notify pgrst, 'reload schema';
