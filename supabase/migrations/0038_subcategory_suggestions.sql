-- To'Latino — owner-proposed subcategories with admin moderation. A listing
-- owner can suggest a subcategory that isn't in the standard list; it is stored
-- as `pending` and is NOT public until an admin approves it. On approval a trigger
-- adds the label to the business's `subcategories` (so it goes live + becomes
-- searchable). Admins approve via the Supabase Table Editor (service role) by
-- setting status = 'approved'. Idempotent. Apply: paste into the SQL Editor + Run.

create table if not exists public.subcategory_suggestions (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  category_id text not null,
  label_es    text not null,
  label_en    text,
  status      text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at  timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists subcat_suggestions_biz_idx    on public.subcategory_suggestions (business_id, category_id);
create index if not exists subcat_suggestions_status_idx on public.subcategory_suggestions (status, created_at desc);

alter table public.subcategory_suggestions enable row level security;

-- The business owner manages ONLY their own suggestions, and only while pending;
-- they can never self-approve (insert/delete gated to status = 'pending', no
-- update policy). Admins moderate with the service role (Supabase dashboard).
drop policy if exists "read own subcat suggestions"   on public.subcategory_suggestions;
drop policy if exists "insert own subcat suggestions" on public.subcategory_suggestions;
drop policy if exists "delete own subcat suggestions" on public.subcategory_suggestions;
create policy "read own subcat suggestions" on public.subcategory_suggestions for select
  using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));
create policy "insert own subcat suggestions" on public.subcategory_suggestions for insert
  with check (status = 'pending' and exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));
create policy "delete own subcat suggestions" on public.subcategory_suggestions for delete
  using (status = 'pending' and exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));

-- On approval, append the label to the business's subcategories (deduped) so it
-- publishes + filters immediately. security definer → can update businesses past RLS.
create or replace function public.apply_subcategory_approval() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    update public.businesses
       set subcategories = (
         select array(select distinct e
                        from unnest(coalesce(subcategories, '{}'::text[]) || array[new.label_es]) as e)
       )
     where id = new.business_id;
    new.reviewed_at := now();
  elsif new.status = 'rejected' and old.status is distinct from 'rejected' then
    new.reviewed_at := now();
  end if;
  return new;
end $$;

drop trigger if exists subcategory_suggestion_apply on public.subcategory_suggestions;
create trigger subcategory_suggestion_apply before update on public.subcategory_suggestions
  for each row execute function public.apply_subcategory_approval();
