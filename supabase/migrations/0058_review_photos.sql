-- To'Latino — photo reviews. Real reviews (0056) + owner reply (0057) are live;
-- photo reviews are the last piece to reach parity with Yelp/Google/DoorDash and
-- are the strongest trust signal a listing can carry. Reviewers upload to the
-- existing `post-photos` bucket under their own uid folder (same storage RLS as
-- community posts — no new bucket/policy). This stores the photo URLs on the
-- review and returns them by slug. Idempotent. Apply: paste + Run.

alter table public.reviews add column if not exists photos text[] not null default '{}';

-- post_review gains an optional photo-URL array. This is a NEW 4-arg signature; the
-- old 3-arg (0056) must go, or a 3-arg call would match both (defaulted) overloads
-- ambiguously (Postgres 42725). The 4-arg default handles the old call shape too.
drop function if exists public.post_review(text, int, text);
create or replace function public.post_review(in_slug text, in_rating int, in_body text, in_photos text[] default '{}')
returns uuid language plpgsql security definer set search_path = public as $$
declare v_biz uuid; v_name text; v_ini text; v_id uuid; v_photos text[];
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  if in_rating < 1 or in_rating > 5 then raise exception 'rating must be 1..5'; end if;
  select id into v_biz from public.businesses where slug = in_slug limit 1;
  if v_biz is null then return null; end if;
  v_photos := (select coalesce(array_agg(p), '{}') from (
    select unnest(coalesce(in_photos, '{}')) as p limit 6
  ) s);
  select coalesce(nullif(btrim(display_name), ''), 'Cliente') into v_name from public.profiles where id = auth.uid();
  v_name := coalesce(v_name, 'Cliente');
  v_ini := upper(substr(v_name, 1, 1));
  insert into public.reviews (business_id, user_id, author_name, author_initials, rating, body_es, body_en, photos)
    values (v_biz, auth.uid(), v_name, v_ini, in_rating, nullif(btrim(in_body), ''), nullif(btrim(in_body), ''), v_photos)
  on conflict (business_id, user_id) do update
    set rating = excluded.rating, body_es = excluded.body_es, body_en = excluded.body_en,
        author_name = excluded.author_name, author_initials = excluded.author_initials,
        photos = excluded.photos, created_at = now()
  returning id into v_id;
  return v_id;
end $$;
grant execute on function public.post_review(text, int, text, text[]) to authenticated;

-- public: a business's reviews (newest first) for the listing, now with photos.
-- Adding the photos column changes the return type → drop before recreate (42P13).
drop function if exists public.reviews_by_slug(text, int);
create or replace function public.reviews_by_slug(in_slug text, max_results int default 40)
returns table (
  id uuid, author_name text, author_initials text, rating int,
  body_es text, body_en text, created_at timestamptz, is_mine boolean,
  reply_es text, reply_en text, replied_at timestamptz, photos text[]
)
language sql stable security definer set search_path = public as $$
  select r.id, r.author_name, r.author_initials, r.rating, r.body_es, r.body_en, r.created_at,
         (r.user_id is not null and r.user_id = auth.uid()),
         r.reply_es, r.reply_en, r.replied_at, r.photos
  from public.reviews r join public.businesses b on b.id = r.business_id
  where b.slug = in_slug
  order by (r.user_id is not null and r.user_id = auth.uid()) desc, r.created_at desc
  limit greatest(1, least(max_results, 100));
$$;
grant execute on function public.reviews_by_slug(text, int) to anon, authenticated;

notify pgrst, 'reload schema';
