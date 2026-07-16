-- 0096_review_notify.sql — close the reviews loop with notifications, both ways
-- (Yelp / Google Business grade):
--   • A customer posts a NEW review → the owner is notified ('review_new').
--   • The owner replies to a review → the reviewer is notified ('review_reply').
-- Both go through notify_user, so 0089's web-push fan-out delivers a real
-- browser/phone push automatically — no extra wiring.
--
-- Only NEW reviews notify the owner (edits stay silent, like Google). Seeded rows
-- (null user_id) and self-authored rows never notify. Idempotent. Vanilla
-- Postgres. Apply: paste into the Supabase SQL Editor + Run.

-- ── post_review v3: same 4-arg signature + owner notification on a new review ──
create or replace function public.post_review(in_slug text, in_rating int, in_body text, in_photos text[] default '{}')
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_biz uuid; v_name text; v_ini text; v_id uuid; v_photos text[];
  v_owner uuid; v_existed boolean;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  if in_rating < 1 or in_rating > 5 then raise exception 'rating must be 1..5'; end if;
  select id, owner_id into v_biz, v_owner from public.businesses where slug = in_slug limit 1;
  if v_biz is null then return null; end if;
  -- did this user already have a review here? (drives new-vs-edit)
  select exists (select 1 from public.reviews where business_id = v_biz and user_id = auth.uid())
    into v_existed;
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
  -- notify the owner on a genuinely NEW review from someone who isn't them
  if not v_existed and v_owner is not null and v_owner <> auth.uid() then
    perform public.notify_user(v_owner, 'review_new',
      jsonb_build_object('name', v_name, 'rating', in_rating), '/negocio?t=reviews');
  end if;
  return v_id;
end $$;
grant execute on function public.post_review(text, int, text, text[]) to authenticated;

-- ── reply_to_review v2: notify the reviewer when the owner responds ───────────
create or replace function public.reply_to_review(p_review_id uuid, p_reply text) returns void
language plpgsql security definer set search_path = public as $$
declare
  uid       uuid := auth.uid();
  clean     text := nullif(trim(p_reply), '');
  v_user    uuid;
  v_biz     uuid;
  v_bizname text;
  v_slug    text;
begin
  if uid is null then raise exception 'auth required'; end if;
  update public.reviews r
     set reply_es = clean,
         reply_en = clean,
         replied_at = case when clean is null then null else now() end
   where r.id = p_review_id
     and exists (select 1 from public.businesses b where b.id = r.business_id and b.owner_id = uid)
   returning r.user_id, r.business_id into v_user, v_biz;
  -- tell the reviewer their review got a response (skip removals, seeded rows,
  -- and the owner replying to their own review)
  if clean is not null and v_user is not null and v_user <> uid then
    select name, slug into v_bizname, v_slug from public.businesses where id = v_biz;
    perform public.notify_user(v_user, 'review_reply',
      jsonb_build_object('business', coalesce(v_bizname, ''), 'reply', left(clean, 140)),
      '/negocios/?b=' || coalesce(v_slug, '') || '&bt=reviews');
  end if;
end $$;
grant execute on function public.reply_to_review to authenticated;

notify pgrst, 'reload schema';
