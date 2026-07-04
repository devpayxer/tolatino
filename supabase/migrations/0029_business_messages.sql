-- To'Latino — customer messaging (Clientes → Mensajes). Conversations + messages,
-- owner-managed and PRIVATE. Idempotent. Apply: paste into the SQL Editor and Run.

create table if not exists public.business_conversations (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null references public.businesses(id) on delete cascade,
  customer_name     text not null,
  customer_initials text,
  customer_color    text,
  last_at           timestamptz not null default now(),
  unread            int not null default 0,
  created_at        timestamptz not null default now()
);
create index if not exists business_conversations_biz_idx on public.business_conversations (business_id, last_at desc);

create table if not exists public.business_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.business_conversations(id) on delete cascade,
  from_owner      boolean not null,
  body            text not null,
  created_at      timestamptz not null default now()
);
create index if not exists business_messages_conv_idx on public.business_messages (conversation_id, created_at);

alter table public.business_conversations enable row level security;
alter table public.business_messages enable row level security;

drop policy if exists "owner all business_conversations" on public.business_conversations;
create policy "owner all business_conversations" on public.business_conversations
  for all using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()))
          with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));

drop policy if exists "owner all business_messages" on public.business_messages;
create policy "owner all business_messages" on public.business_messages
  for all using (exists (select 1 from public.business_conversations c join public.businesses b on b.id = c.business_id where c.id = conversation_id and b.owner_id = auth.uid()))
          with check (exists (select 1 from public.business_conversations c join public.businesses b on b.id = c.business_id where c.id = conversation_id and b.owner_id = auth.uid()));
