-- To'Latino — let a business owner reply to reviews on their listing (Clientes →
-- Reseñas). Adds reply columns to reviews and a SECURITY DEFINER RPC so the owner
-- can set ONLY the reply (never edit the reviewer's text/rating). Public read of
-- reviews already exists. Idempotent. Apply: paste into the SQL Editor and Run.

alter table public.reviews add column if not exists reply_es    text;
alter table public.reviews add column if not exists reply_en    text;
alter table public.reviews add column if not exists replied_at  timestamptz;

create or replace function public.reply_to_review(p_review_id uuid, p_reply text) returns void
language plpgsql security definer set search_path = public as $$
declare
  uid   uuid := auth.uid();
  clean text := nullif(trim(p_reply), '');
begin
  if uid is null then raise exception 'auth required'; end if;
  update reviews r
     set reply_es = clean,
         reply_en = clean,
         replied_at = case when clean is null then null else now() end
   where r.id = p_review_id
     and exists (select 1 from businesses b where b.id = r.business_id and b.owner_id = uid);
end $$;
grant execute on function public.reply_to_review to authenticated;
