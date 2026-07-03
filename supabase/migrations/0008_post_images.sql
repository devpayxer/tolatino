-- To'Latino — photos on community posts. Images are compressed to WebP in the
-- browser (see apps/web/src/lib/image.ts) and uploaded to a public Storage
-- bucket; the post row keeps the public URLs. Uploads are locked to each user's
-- own folder (<uid>/<file>) via storage RLS. Idempotent.
--
-- Apply: paste into the Supabase SQL Editor and Run.

-- ── Post images (array of public URLs, display order) ───────────────────────
alter table public.posts add column if not exists images text[];

-- ── Storage bucket (public read; 10 MB cap — compressed WebP is ~300 KB, the
--    cap only guards the rare undecodable original that bypasses compression) ─
insert into storage.buckets (id, name, public, file_size_limit)
values ('post-photos', 'post-photos', true, 10485760)
on conflict (id) do update set public = true, file_size_limit = 10485760;

-- ── Storage RLS: public read, users write/delete only their own folder ──────
drop policy if exists "post-photos public read"   on storage.objects;
drop policy if exists "post-photos own upload"     on storage.objects;
drop policy if exists "post-photos own delete"     on storage.objects;

create policy "post-photos public read" on storage.objects
  for select using (bucket_id = 'post-photos');

create policy "post-photos own upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'post-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "post-photos own delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'post-photos' and (storage.foldername(name))[1] = auth.uid()::text);
