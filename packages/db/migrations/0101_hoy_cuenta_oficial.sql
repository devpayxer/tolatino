-- 0101 · Hoy en el barrio y la cuenta oficial por ciudad (bloque 5e; fase5-comunidad.md §2, §4 5e). Idempotente; nada se borra.
-- · Hoy en el barrio sale de Novedades (business_posts): las en vivo (post_en_vivo: negocio Pro, Novedades encendido por el dueño, sin
--   pausa de To'Latino, no oculta, no detenida, sin vencer), para todos (no «solo seguidores»), publicadas hace menos de 24 h y que
--   To'Latino no retiró de Hoy. Retirar de Hoy (Super Admin › Contenido › Hoy en el barrio) deja la novedad en la página del negocio:
--   solo sale de Hoy, con motivo, quién y cuándo (hoy_off_*), y el negocio recibe el aviso.
-- · hoy_avisado_at: el barrido avisa una sola vez a quien sigue al negocio («Hoy de un negocio guardado», sin SMS, respeta «hoy»).
-- · La cuenta oficial no es una persona: escribe com_posts con author_kind 'official', sin author_user_id y con staff_id (quién del
--   equipo); programar = publish_at futuro; fijar = pinned_until (una a la vez por ciudad, hasta 7 días; lo ordena el barrido).
begin;

alter table business_posts add column if not exists hoy_off_at timestamptz;
alter table business_posts add column if not exists hoy_off_by uuid references users (id);
alter table business_posts add column if not exists hoy_off_reason text;
alter table business_posts add column if not exists hoy_avisado_at timestamptz;
alter table business_posts drop constraint if exists business_posts_hoy_off;
alter table business_posts add constraint business_posts_hoy_off check (
  (hoy_off_at is null) = (hoy_off_reason is null) and (hoy_off_at is null) = (hoy_off_by is null)
  and (hoy_off_reason is null or char_length(hoy_off_reason) between 1 and 500));

-- Hoy de una ciudad: lo de las últimas 24 h en vivo y no retirado (presupuesto ≤ 40 ms, §7).
create index if not exists business_posts_hoy_idx on business_posts (city_id, publish_at desc) where status = 'live' and hidden_at is null and hoy_off_at is null;

-- Negocios › «Recomendados por vecinos»: los negocios recomendados en comentarios de una ciudad (las publicaciones ya tienen su índice por tipo).
create index if not exists com_comments_negocio_ciudad_idx on com_comments (city_id, created_at desc) where business_id is not null and status = 'visible';

-- ¿Una novedad sale en Hoy en el barrio? Único lugar de la regla (lib/hoy.ts y el Super Admin la usan; guardián hoySoloEnVivo).
create or replace function post_en_hoy(p business_posts) returns boolean language sql stable as $$
  select post_en_vivo(p) and p.audience = 'all' and p.hoy_off_at is null and p.publish_at > now() - interval '24 hours'
$$;

-- Fijada: una a la vez por ciudad. Si la oficial programada y fijada sale mientras hay otra fijada, queda la más nueva.
create or replace function com_fijada_una() returns integer language sql as $$
  with ult as (
    select distinct on (city_id) city_id, id from com_posts
     where pinned_until > now() and publish_at <= now() and status = 'visible'
     order by city_id, publish_at desc, id desc),
  q as (
    update com_posts p set pinned_until = null from ult
     where p.city_id = ult.city_id and p.id <> ult.id and p.pinned_until > now() and p.publish_at <= now()
    returning p.id)
  select count(*)::int from q
$$;

insert into notif_templates (key, grp, pref, sms, title, body) values
  ('hoy_guardado', 'tx', 'hoy', false, '{"es":"Hoy en un negocio que sigues","en":"Today at a business you follow"}',
   '{"es":"{negocio}: {titulo}. Sale en Hoy en el barrio 24 horas.","en":"{negocio}: {titulo}. In Today nearby for 24 hours."}'),
  ('hoy_retirada', 'biz', null, false, '{"es":"Retiramos una novedad de Hoy en el barrio","en":"We took an update out of Today nearby"}',
   '{"es":"«{titulo}» ya no sale en Hoy en el barrio: {motivo}. Sigue en tu página.","en":"“{titulo}” no longer shows in Today nearby: {motivo}. It stays on your page."}')
on conflict (key) do nothing;

commit;
