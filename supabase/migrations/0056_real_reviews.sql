-- To'Latino — real, persisted reviews (trust + discovery). Today "Escribir reseña"
-- only adds to local state. This ties a review to the signed-in user (one per
-- business), lets them post/update it under RLS, keeps the business's rating +
-- reviews_count in sync via a trigger, and exposes the reviews by slug for the
-- listing. Idempotent. Apply: paste into the Supabase SQL Editor + Run.

alter table public.reviews add column if not exists user_id uuid references auth.users(id) on delete set null;
-- one review per (business, user). NULL user_id (seeded rows) are distinct, so
-- multiple seeded reviews per business are fine.
create unique index if not exists reviews_biz_user_uidx on public.reviews (business_id, user_id);

-- RLS: public read stays (0001). Add author self-service (insert/update/delete own).
drop policy if exists "author insert own review" on public.reviews;
create policy "author insert own review" on public.reviews for insert with check (user_id = auth.uid());
drop policy if exists "author update own review" on public.reviews;
create policy "author update own review" on public.reviews for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "author delete own review" on public.reviews;
create policy "author delete own review" on public.reviews for delete using (user_id = auth.uid());

-- keep businesses.rating (avg) + reviews_count fresh on every review change
create or replace function public.tg_sync_business_rating() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_biz uuid;
begin
  v_biz := coalesce(new.business_id, old.business_id);
  update public.businesses set
    rating = coalesce((select round(avg(rating)::numeric, 1) from public.reviews where business_id = v_biz), 0),
    reviews_count = (select count(*) from public.reviews where business_id = v_biz)
  where id = v_biz;
  return coalesce(new, old);
end $$;
drop trigger if exists trg_sync_business_rating on public.reviews;
create trigger trg_sync_business_rating after insert or update or delete on public.reviews
  for each row execute function public.tg_sync_business_rating();

-- get-or-update the signed-in user's review for a business (by slug)
create or replace function public.post_review(in_slug text, in_rating int, in_body text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_biz uuid; v_name text; v_ini text; v_id uuid;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  if in_rating < 1 or in_rating > 5 then raise exception 'rating must be 1..5'; end if;
  select id into v_biz from public.businesses where slug = in_slug limit 1;
  if v_biz is null then return null; end if;
  select coalesce(nullif(btrim(display_name), ''), 'Cliente') into v_name from public.profiles where id = auth.uid();
  v_name := coalesce(v_name, 'Cliente');
  v_ini := upper(substr(v_name, 1, 1));
  insert into public.reviews (business_id, user_id, author_name, author_initials, rating, body_es, body_en)
    values (v_biz, auth.uid(), v_name, v_ini, in_rating, nullif(btrim(in_body), ''), nullif(btrim(in_body), ''))
  on conflict (business_id, user_id) do update
    set rating = excluded.rating, body_es = excluded.body_es, body_en = excluded.body_en,
        author_name = excluded.author_name, author_initials = excluded.author_initials, created_at = now()
  returning id into v_id;
  return v_id;
end $$;
grant execute on function public.post_review(text, int, text) to authenticated;

-- public: a business's reviews (newest first) for the listing
create or replace function public.reviews_by_slug(in_slug text, max_results int default 40)
returns table (id uuid, author_name text, author_initials text, rating int, body_es text, body_en text, created_at timestamptz, is_mine boolean)
language sql stable security definer set search_path = public as $$
  select r.id, r.author_name, r.author_initials, r.rating, r.body_es, r.body_en, r.created_at,
         (r.user_id is not null and r.user_id = auth.uid())
  from public.reviews r join public.businesses b on b.id = r.business_id
  where b.slug = in_slug
  order by (r.user_id is not null and r.user_id = auth.uid()) desc, r.created_at desc
  limit greatest(1, least(max_results, 100));
$$;
grant execute on function public.reviews_by_slug(text, int) to anon, authenticated;

notify pgrst, 'reload schema';
