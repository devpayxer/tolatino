-- 0123 · Reportar desde el cliente: cerrar los huecos de identificador
--
-- La cola unificada `reports` (0120/0122) guarda `entity_id` como el UUID de la
-- fila — así el admin puede ocultarla/eliminarla sin adivinar. Pero el cliente
-- NO conoce el UUID de un negocio ni de un evento: sus RPCs públicos exponen
-- `slug`, nunca el id (a propósito: el slug es la identidad pública). Sin esto,
-- "Reportar este negocio" no se podía escribir.
--
-- Dos cambios, ambos idempotentes:
--   1. `create_report` acepta un SLUG para business/event y lo resuelve a UUID
--      del lado del servidor. Sigue guardando el UUID: la cola no cambia.
--   2. `event_reviews_by_slug` devuelve el `id` de la reseña, para que la reseña
--      de un evento se pueda reportar igual que la de un negocio.

-- ── 1 · create_report resuelve slug → uuid ───────────────────────────────────
create or replace function public.create_report(
  in_type text, in_entity_id text, in_reason text, in_detail text default null
) returns uuid language plpgsql security definer set search_path = public as $fn$
declare v_id uuid; v_entity text; v_uuid uuid;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  if coalesce(trim(in_reason),'') = '' then raise exception 'la razón es obligatoria'; end if;
  if in_type not in ('post','comment','review','event_review','business','event','property','vehicle','update') then
    raise exception 'tipo inválido';
  end if;

  v_entity := trim(in_entity_id);
  if coalesce(v_entity,'') = '' then raise exception 'falta el contenido a reportar'; end if;

  -- ¿ya es un uuid? entonces se usa tal cual; si no, para negocio/evento se
  -- interpreta como slug (es lo único que el cliente conoce de ellos).
  if v_entity ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    v_uuid := v_entity::uuid;
  elsif in_type = 'business' then
    select b.id into v_uuid from public.businesses b where b.slug = v_entity;
  elsif in_type = 'event' then
    select e.id into v_uuid from public.events e where e.slug = v_entity;
  end if;
  if v_uuid is null then raise exception 'no encontramos eso que reportas'; end if;

  insert into public.reports (entity_type, entity_id, reporter_id, reason, detail)
  values (in_type, v_uuid::text, auth.uid(), in_reason, in_detail)
  on conflict (entity_type, entity_id, reporter_id)
    do update set reason = excluded.reason, detail = excluded.detail
  returning id into v_id;
  return v_id;
end $fn$;
grant execute on function public.create_report(text, text, text, text) to authenticated;

-- ── 2 · event_reviews_by_slug devuelve el id (para poder reportarla) ─────────
-- El tipo de retorno se ensancha → hay que soltarla antes de recrearla.
drop function if exists public.event_reviews_by_slug(text, integer);
create function public.event_reviews_by_slug(in_slug text, max_results integer default 20)
returns table (id uuid, author_name text, author_initials text, rating integer,
               body_es text, body_en text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.id, r.author_name, r.author_initials, r.rating, r.body_es, r.body_en, r.created_at
  from public.event_reviews r join public.events e on e.id = r.event_id
  where e.slug = in_slug and not r.hidden
  order by r.created_at desc limit greatest(1, least(max_results, 50));
$$;
grant execute on function public.event_reviews_by_slug(text, integer) to anon, authenticated;
