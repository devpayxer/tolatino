-- 0135_comunidad_confianza_y_enlace.sql — auditoría de Comunidad (2026-08-03).
--
-- Cierra dos cosas que no deben llegar al lanzamiento:
--
--   A · SUPLANTACIÓN Y PRUEBA SOCIAL FALSA. Las políticas de `posts` decían
--       "puedes escribir tus publicaciones", y eso incluía TODAS las columnas.
--       Verificado el 2026-08-03 golpeando PostgREST como usuario normal:
--         author_name → 'Alcaldía de Hazleton'   (firmar como quien sea)
--         recommends  → 9999                     (♥ inventados que todos ven)
--         pinned/featured → true                 (auto-destacarse)
--       El nombre del autor va DENORMALIZADO en la fila, así que quien controla
--       esa columna controla de quién parece ser el mensaje. En un feed de barrio
--       eso no es un bug cosmético: es el fin de la confianza en la sección.
--       Mismo agujero que 0130 cerró en `profiles` y `businesses`; a las
--       publicaciones y a los comentarios no llegó.
--
--   B · EL NEGOCIO ETIQUETADO NO LLEVABA A NINGÚN LADO, y no por un enlace
--       olvidado: la base solo guardaba `business_name`, texto libre. No había
--       adónde enlazar. Ahora el cliente manda SOLO el slug y el SERVIDOR
--       resuelve id y nombre desde `businesses` — de paso, nadie puede etiquetar
--       el nombre de un negocio y apuntar el enlace a otro.
--
-- Idempotente. Portable a Postgres vanilla (nada propietario de Supabase).

-- ════════════════════════════════════════════════════════════════════════════
-- A1 · Al CREAR: las columnas de identidad y de ranking las pone el servidor
-- ════════════════════════════════════════════════════════════════════════════
-- La política de INSERT solo comprobaba `auth.uid() = author_id`; todo lo demás
-- venía del cliente. Aquí se sobreescribe en vez de rechazar: la app manda ya los
-- valores correctos, así que no cambia nada para ella, y un cliente hostil
-- simplemente no consigue nada.
--
-- ⚠️ SECURITY INVOKER a propósito, y esto importa: dentro de una función
-- SECURITY DEFINER, `current_user` es el DUEÑO de la función, no quien llama —
-- así que el filtro de abajo nunca se cumpliría y el trigger no haría nada.
-- (Comprobado: la primera versión de esta migración era DEFINER y dejaba pasar
-- un INSERT firmado como "ALCALDIA DE HAZLETON" con 9999 ♥.)
-- Como INVOKER sí funciona, y leer `profiles` está permitido: la política de
-- INSERT exige `auth.uid() = author_id`, y cada quien puede leer su propia fila.
-- El filtro por `current_user` deja pasar a los RPCs legítimos (el auto-post de
-- recomendaciones de 0103, los del admin, el service_role), que corren como el
-- dueño y no como `authenticated`.
create or replace function public.tg_posts_normalize_ins()
returns trigger
language plpgsql
set search_path to 'public'
as $fn$
declare p record;
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;

  -- Identidad: SIEMPRE la del perfil de quien escribe. No la que diga el cliente.
  select display_name, initials, avatar_color into p
    from public.profiles where id = new.author_id;
  if p is not null then
    new.author_name     := coalesce(nullif(btrim(p.display_name), ''), 'Vecino');
    new.author_initials := coalesce(nullif(btrim(p.initials), ''), 'V');
    new.author_color    := coalesce(p.avatar_color, '#7B61FF');
  end if;

  -- Nada de arrancar con ♥, destacado, fijado u oculto puestos a mano.
  new.recommends      := 0;
  new.hidden          := false;
  new.hidden_reason   := null;
  new.hidden_by       := null;
  new.hidden_at       := null;
  new.featured        := false;
  new.featured_at     := null;
  new.featured_by     := null;
  new.pinned          := false;
  new.pinned_at       := null;   -- (no hay `pinned_by` en esta tabla; sí `featured_by`)
  new.endorsement_id  := null;
  new.created_at      := now();   -- si no, se publica "en el futuro" y no baja nunca

  -- La encuesta empieza en cero, con tantos contadores como opciones.
  if new.poll_options is not null then
    new.poll_votes := (select coalesce(jsonb_agg(0), '[]'::jsonb) from jsonb_array_elements(new.poll_options));
  else
    new.poll_votes := null;
  end if;

  -- El negocio etiquetado se pide SOLO por slug; el nombre, el id y la
  -- calificación los pone el servidor abajo (o nadie). Si el cliente pudiera
  -- mandar `business_name` a mano, tendríamos otra vez una etiqueta que dice una
  -- cosa y no lleva a ninguna parte — el bug que esta migración viene a cerrar.
  new.business_id     := null;
  new.business_name   := null;
  new.business_rating := null;
  return new;
end $fn$;

drop trigger if exists posts_normalize_ins on public.posts;
create trigger posts_normalize_ins
  before insert on public.posts
  for each row execute function public.tg_posts_normalize_ins();

-- ════════════════════════════════════════════════════════════════════════════
-- A2 · Al EDITAR: lista blanca de lo que se puede cambiar
-- ════════════════════════════════════════════════════════════════════════════
-- Lista BLANCA a propósito, no lista negra: así una columna nueva queda protegida
-- por defecto. Es la lección de 0130 y 0132 — un permiso enumerado nunca cubre lo
-- que se añade después, y ahí es donde se cuelan los agujeros.
--
-- Lo editable coincide con lo que la app edita de verdad (PostMenu → Editar solo
-- toca el texto). Si algún día se permite editar la encuesta o la ciudad, hay que
-- añadir la columna AQUÍ, y pensarlo al hacerlo.
create or replace function public.tg_posts_guard_upd()
returns trigger
language plpgsql
as $fn$
declare
  editable text[] := array['body_es', 'body_en', 'images', 'business_slug'];
  k text;
  vieja jsonb := to_jsonb(old);
  nueva jsonb := to_jsonb(new);
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;

  for k in select jsonb_object_keys(nueva) loop
    if k = any(editable) then continue; end if;
    -- Las columnas GENERADAS (`location`, `search_vector`) llegan nulas a un
    -- trigger BEFORE, así que compararlas daría un falso positivo y bloquearía
    -- TODA edición. Se consultan al catálogo en vez de escribirlas a mano, para
    -- que una columna generada nueva no rompa las ediciones el día que se añada.
    if exists (
      select 1 from pg_attribute a
      where a.attrelid = 'public.posts'::regclass
        and a.attname = k
        and a.attgenerated <> ''
    ) then continue; end if;

    if (nueva -> k) is distinct from (vieja -> k) then
      raise exception 'No puedes cambiar "%" de una publicación.', k
        using errcode = 'check_violation';
    end if;
  end loop;
  return new;
end $fn$;

drop trigger if exists posts_guard_upd on public.posts;
create trigger posts_guard_upd
  before update on public.posts
  for each row execute function public.tg_posts_guard_upd();

-- ════════════════════════════════════════════════════════════════════════════
-- A3 · Lo mismo en los comentarios
-- ════════════════════════════════════════════════════════════════════════════
-- `post_comments` no tiene política de UPDATE (nadie puede editar un comentario),
-- así que solo hace falta el INSERT. Pero ahí el nombre del autor también viajaba
-- desde el cliente: mismo camino para firmar como otro.
create or replace function public.tg_comments_normalize_ins()
returns trigger
language plpgsql
set search_path to 'public'
as $fn$
declare p record;
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  select display_name, initials, avatar_color into p
    from public.profiles where id = new.author_id;
  if p is not null then
    new.author_name     := coalesce(nullif(btrim(p.display_name), ''), 'Vecino');
    new.author_initials := coalesce(nullif(btrim(p.initials), ''), 'V');
    new.author_color    := coalesce(p.avatar_color, '#7B61FF');
  end if;
  new.like_count  := 0;
  new.created_at  := now();
  new.biz_id      := null;   -- igual que en las publicaciones: solo se manda el slug
  new.biz_name    := null;
  new.biz_rating  := null;   -- nunca se fabrica una calificación
  return new;
end $fn$;

drop trigger if exists comments_normalize_ins on public.post_comments;
create trigger comments_normalize_ins
  before insert on public.post_comments
  for each row execute function public.tg_comments_normalize_ins();

-- ════════════════════════════════════════════════════════════════════════════
-- B1 · El negocio etiquetado: un id de verdad
-- ════════════════════════════════════════════════════════════════════════════
alter table public.posts
  add column if not exists business_id   uuid references public.businesses(id) on delete set null,
  add column if not exists business_slug text;

alter table public.post_comments
  add column if not exists biz_id   uuid references public.businesses(id) on delete set null,
  add column if not exists biz_slug text;

comment on column public.posts.business_slug is
  'Lo ÚNICO que manda el cliente al etiquetar. El servidor resuelve id y nombre.';

-- Para "¿qué dice la comunidad de este negocio?" — la ficha lo va a querer.
create index if not exists posts_business_idx
  on public.posts (business_id, created_at desc) where business_id is not null;
create index if not exists comments_biz_idx
  on public.post_comments (biz_id) where biz_id is not null;

-- ════════════════════════════════════════════════════════════════════════════
-- B2 · Resolver el negocio EN EL SERVIDOR
-- ════════════════════════════════════════════════════════════════════════════
-- Por qué en el servidor y no en el cliente: si el cliente mandara nombre y
-- enlace por separado, podría etiquetar "Panadería La Bendición" y apuntar el
-- enlace a otro negocio — una recomendación falsa con una sola petición. Aquí el
-- nombre SALE del id, así que los dos siempre concuerdan.
--
-- Si el slug no existe, los tres campos quedan nulos: antes que enseñar una
-- etiqueta que no lleva a ningún sitio, mejor no enseñar etiqueta (regla #8).
create or replace function public.tg_posts_resolve_business()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare b record;
begin
  -- Sin slug no se toca NADA: los RPCs con privilegios (el auto-post de
  -- recomendaciones de 0103) escriben `business_name` ellos mismos y borrárselo
  -- aquí les rompería la etiqueta. A los clientes ya se la vació el normalizador
  -- de arriba, así que ellos no pueden colar un nombre suelto por este hueco.
  -- El auto-post de "👍 Recomiendo a X" (0103) nace desde un RPC que conoce el
  -- negocio pero guardaba solo su nombre. Se resuelve aquí, por su recomendación,
  -- en vez de reescribir aquel RPC: esas publicaciones también son
  -- recomendaciones y también tienen que llevar a la ficha.
  if (new.business_slug is null or btrim(new.business_slug) = '') and new.endorsement_id is not null then
    select b2.slug into new.business_slug
      from public.business_endorsements e
      join public.businesses b2 on b2.id = e.business_id
     where e.id = new.endorsement_id;
  end if;

  if new.business_slug is null or btrim(new.business_slug) = '' then
    new.business_slug := null;
    return new;
  end if;
  select id, name, slug into b from public.businesses where slug = btrim(new.business_slug);
  if b is null then
    new.business_slug := null;
    new.business_id   := null;
    new.business_name := null;
  else
    new.business_slug := b.slug;
    new.business_id   := b.id;
    new.business_name := b.name;
  end if;
  return new;
end $fn$;

-- Se llama `z_...` para que corra DESPUÉS del guardián de la lista blanca: el
-- guardián compara lo que mandó el cliente, y este trigger escribe columnas que
-- el cliente no puede tocar. Al revés, el guardián vería sus escrituras como si
-- fueran del usuario y rechazaría la edición.
drop trigger if exists z_posts_resolve_business on public.posts;
create trigger z_posts_resolve_business
  before insert or update on public.posts
  for each row execute function public.tg_posts_resolve_business();

create or replace function public.tg_comments_resolve_business()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare b record;
begin
  if new.biz_slug is null or btrim(new.biz_slug) = '' then
    new.biz_slug := null;
    return new;
  end if;
  select id, name, slug into b from public.businesses where slug = btrim(new.biz_slug);
  if b is null then
    new.biz_slug := null; new.biz_id := null; new.biz_name := null;
  else
    new.biz_slug := b.slug; new.biz_id := b.id; new.biz_name := b.name;
  end if;
  return new;
end $fn$;

drop trigger if exists z_comments_resolve_business on public.post_comments;
create trigger z_comments_resolve_business
  before insert or update on public.post_comments
  for each row execute function public.tg_comments_resolve_business();

-- ════════════════════════════════════════════════════════════════════════════
-- B3 · Rescatar lo ya publicado
-- ════════════════════════════════════════════════════════════════════════════
-- Solo cuando el nombre casa con UN negocio y con uno solo. Si hay dos con el
-- mismo nombre no se adivina: se queda sin enlace, que es honesto.
update public.posts p
   set business_id = b.id, business_slug = b.slug
  from public.businesses b
 where p.business_id is null
   and p.business_name is not null
   and lower(btrim(p.business_name)) = lower(btrim(b.name))
   and (select count(*) from public.businesses b2
         where lower(btrim(b2.name)) = lower(btrim(p.business_name))) = 1;

update public.post_comments c
   set biz_id = b.id, biz_slug = b.slug
  from public.businesses b
 where c.biz_id is null
   and c.biz_name is not null
   and lower(btrim(c.biz_name)) = lower(btrim(b.name))
   and (select count(*) from public.businesses b2
         where lower(btrim(b2.name)) = lower(btrim(c.biz_name))) = 1;

-- ════════════════════════════════════════════════════════════════════════════
-- C · `businesses.slug` deja de ser escribible por el dueño
-- ════════════════════════════════════════════════════════════════════════════
-- Ahora que las publicaciones guardan el slug para enlazar, un cambio de slug
-- rompería todos esos enlaces — y además cualquier enlace ya compartido, cada
-- código QR impreso y el posicionamiento en Google de esa ficha. La app no lo
-- cambia en ningún sitio (se genera al crear el negocio), así que cerrarlo no
-- quita nada. Se añade al guardián que ya existe de 0130/0081.
create or replace function public.tg_businesses_guard_slug()
returns trigger
language plpgsql
as $fn$
begin
  if current_user in ('authenticated', 'anon') and new.slug is distinct from old.slug then
    raise exception 'La dirección del negocio no se puede cambiar.'
      using errcode = 'check_violation';
  end if;
  return new;
end $fn$;

drop trigger if exists businesses_guard_slug on public.businesses;
create trigger businesses_guard_slug
  before update on public.businesses
  for each row execute function public.tg_businesses_guard_slug();

notify pgrst, 'reload schema';
