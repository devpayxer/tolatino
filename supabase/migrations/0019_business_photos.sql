-- To'Latino — business gallery photos (Listado → Fotos y media). Metadata rows
-- point at files already uploaded to the public 'post-photos' storage bucket
-- (reused; the client compresses to WebP and uploads under the owner's own
-- <uid>/ folder, enforced by the existing storage RLS). Public read so the
-- listing can show them; each owner manages only their own business's photos.
-- Idempotent. Apply: paste into the Supabase SQL Editor and Run.

create table if not exists public.business_photos (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  url         text not null,
  sort        int  not null default 0,
  is_cover    boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists business_photos_biz_idx on public.business_photos (business_id, sort, created_at);

alter table public.business_photos enable row level security;

drop policy if exists "public read business_photos"  on public.business_photos;
drop policy if exists "owner insert business_photos" on public.business_photos;
drop policy if exists "owner update business_photos" on public.business_photos;
drop policy if exists "owner delete business_photos" on public.business_photos;

create policy "public read business_photos" on public.business_photos
  for select using (true);
create policy "owner insert business_photos" on public.business_photos
  for insert with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));
create policy "owner update business_photos" on public.business_photos
  for update using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()))
          with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));
create policy "owner delete business_photos" on public.business_photos
  for delete using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));
