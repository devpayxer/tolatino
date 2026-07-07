-- To'Latino — surface the business owner's reply on the public listing. The owner
-- can already reply to a review from the dashboard (reply_es/reply_en/replied_at,
-- migration 0023), but reviews_by_slug (0056) never returned those columns, so the
-- response never reached the consumer's BizDetail. A visible owner response is
-- table-stakes for a trustworthy listing (Yelp/Google both show it). This widens
-- reviews_by_slug to include the reply. Idempotent. Apply: paste + Run.

create or replace function public.reviews_by_slug(in_slug text, max_results int default 40)
returns table (
  id uuid, author_name text, author_initials text, rating int,
  body_es text, body_en text, created_at timestamptz, is_mine boolean,
  reply_es text, reply_en text, replied_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select r.id, r.author_name, r.author_initials, r.rating, r.body_es, r.body_en, r.created_at,
         (r.user_id is not null and r.user_id = auth.uid()),
         r.reply_es, r.reply_en, r.replied_at
  from public.reviews r join public.businesses b on b.id = r.business_id
  where b.slug = in_slug
  order by (r.user_id is not null and r.user_id = auth.uid()) desc, r.created_at desc
  limit greatest(1, least(max_results, 100));
$$;
grant execute on function public.reviews_by_slug(text, int) to anon, authenticated;

notify pgrst, 'reload schema';
