-- To'Latino — owner-proposed "Lo que ofrece" features with admin moderation
-- (same pattern as 0038 subcategories). An owner suggests a feature not in the
-- standard list; it's stored `pending` and is NOT public until an admin approves
-- it. On approval a trigger appends the label to the business's `features` (so it
-- shows in "Lo que ofrece" + powers the Negocios feature filter). Admins approve
-- via the Supabase Table Editor by setting status = 'approved'. Idempotent.
-- Apply: paste into the SQL Editor + Run.

create table if not exists public.feature_suggestions (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  category_id text not null,
  label_es    text not null,
  label_en    text,
  status      text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at  timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists feature_suggestions_biz_idx    on public.feature_suggestions (business_id, category_id);
create index if not exists feature_suggestions_status_idx on public.feature_suggestions (status, created_at desc);

alter table public.feature_suggestions enable row level security;

drop policy if exists "read own feature suggestions"   on public.feature_suggestions;
drop policy if exists "insert own feature suggestions" on public.feature_suggestions;
drop policy if exists "delete own feature suggestions" on public.feature_suggestions;
create policy "read own feature suggestions" on public.feature_suggestions for select
  using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));
create policy "insert own feature suggestions" on public.feature_suggestions for insert
  with check (status = 'pending' and exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));
create policy "delete own feature suggestions" on public.feature_suggestions for delete
  using (status = 'pending' and exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));

-- On approval, append the label to the business's features (deduped).
create or replace function public.apply_feature_approval() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    update public.businesses
       set features = (
         select array(select distinct e
                        from unnest(coalesce(features, '{}'::text[]) || array[new.label_es]) as e)
       )
     where id = new.business_id;
    new.reviewed_at := now();
  elsif new.status = 'rejected' and old.status is distinct from 'rejected' then
    new.reviewed_at := now();
  end if;
  return new;
end $$;

drop trigger if exists feature_suggestion_apply on public.feature_suggestions;
create trigger feature_suggestion_apply before update on public.feature_suggestions
  for each row execute function public.apply_feature_approval();
