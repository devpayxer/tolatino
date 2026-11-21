-- 0200 · Las copias por TEXTO de la dirección de una foto (LAUNCH 9u «Quitar una foto no llega a las copias por TEXTO» y 9t «Fotos guardadas como
-- texto fuera de media»; plan: docs/diseno/plan/fotos-revision-automatica.md, «una foto retenida o rechazada no se ve en ninguna pantalla»).
-- Cuatro columnas guardan la DIRECCIÓN de una foto nuestra (/medios/n/<uuid>.jpg) como texto y no miran media: items.photos (el menú y los catálogos:
-- Oficios, Servicios, Autos, Bienes Raíces, Renta de artículos; ~50 lectores), users.photo_url (foto de perfil), business_members.photo_url (la
-- foto de una persona del equipo) y businesses.logo_url (el logo). Cuando una foto deja de verse por moderación, la fila de media cambia de estado
-- y su archivo sale de n/ (capa 3), pero esas copias seguían apuntando a ella: se veía rota (o, con el «Quitar» de siempre, se seguía viendo).
-- Forma elegida: RETIRAR Y RESTAURAR en la base, no filtrar en cada lector. Un trigger de media, en la MISMA transacción que cambia el estado:
--   · deja de verse por moderación (capa 3: status 'review' + rev_capa 'c3'; el «Quitar» del equipo y la revisión: removed_reason 'admin' /
--     'revision'; la purga de una cuenta: purged_at) → la dirección sale de las cuatro columnas y cada salida queda en photo_text_refs (de qué
--     tabla, qué fila, en qué lugar del arreglo), en estado 'retirada'.
--   · vuelve a verse (la capa 2 la aprueba, una persona levanta la apelación, el equipo la restaura) y es PÚBLICA (no private, no rev_sin_c2) →
--     cada referencia 'retirada' de esa dirección vuelve a su lugar ('restaurada'); si ya no cabe (el artículo tiene 5 fotos, el perfil o el
--     logo tienen otra) queda 'descartada' con su porqué. Una purga no vuelve: 'descartada'.
-- Por qué así: los lectores (~50 consultas) siguen igual de simples y rápidos (un arreglo o una columna, sin unir media), un lector nuevo nace
-- correcto, y el cambio es raro (moderación) y por índice: GIN en items.photos y hash en las tres columnas de una dirección (un logo de la semilla
-- es un SVG en data: largo; el hash no tiene tope de tamaño). Solo direcciones NUESTRAS (/medios/n/…): lo de afuera (Pexels de la semilla) no se
-- toca nunca. Lo que el dueño quita él mismo ('owner', 'replaced', 'autor') no es moderación: su archivo sigue en n/ y no se retira nada.
-- Nada se borra: photo_text_refs es un libro de estados (retirada → restaurada | descartada, una sola vez; nunca se borra). city_id de la fila.
-- subcategories.photo_url: sin escritor ni lector (0 filas con valor): queda documentada como sin uso; el guardián fotosTextoComun falla si alguien la
-- empieza a usar sin pasar por aquí.
-- Además: media_chat_subidas_idx (0185) sobra: media_msj_subidas_idx (0187) tiene las mismas columnas y su condición (owner_kind in ('chat','dm'))
-- contiene la de la otra (owner_kind = 'chat'); el único lector (app/api/mensajes/foto, el tope por hora) pide las dos. Se quita la que sobra.
-- Idempotente: if not exists, funciones y triggers que se recrean.
begin;

create table if not exists photo_text_refs (
  id          bigint generated always as identity primary key,
  url         text not null check (url ~ '^/medios/n/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$'),
  media_id    uuid not null references media (id),
  tabla       text not null check (tabla in ('items', 'users', 'business_members', 'businesses')),
  fila        text not null check (char_length(fila) between 1 and 80),
  pos         smallint check (pos is null or pos between 1 and 50),
  city_id     text references cities (id),
  motivo      text not null check (motivo in ('reportes', 'admin', 'revision', 'purga')),
  status      text not null default 'retirada' check (status in ('retirada', 'restaurada', 'descartada')),
  porque      text check (porque is null or porque in ('lleno', 'ocupada', 'sin_fila', 'purgada')),
  created_at  timestamptz not null default now(),
  closed_at   timestamptz,
  check ((status = 'retirada') = (closed_at is null)),
  check (status <> 'descartada' or porque is not null)
);
-- Lo que espera volver, por dirección (restaurar lee solo esto); y por fila, para el panel y el Super Admin.
create index if not exists photo_text_refs_abiertas on photo_text_refs (url, id) where status = 'retirada';
create index if not exists photo_text_refs_fila on photo_text_refs (tabla, fila, id desc);
comment on table photo_text_refs is 'Copias por texto de la dirección de una foto que la moderación retiró (y su vuelta). Libro de estados: nunca se borra.';
comment on column subcategories.photo_url is 'Sin uso (0200): nadie la escribe ni la lee. Una foto de subcategoría iría por media; guardián fotosTextoComun.';

-- Un renglón solo se cierra una vez (retirada → restaurada | descartada) y no cambia nada más; nunca se borra.
create or replace function photo_text_refs_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'una referencia retirada de una foto no se borra'; end if;
  if old.status <> 'retirada' or new.status = 'retirada'
     or (new.id, new.url, new.media_id, new.tabla, new.fila, new.pos, new.city_id, new.motivo, new.created_at)
        is distinct from (old.id, old.url, old.media_id, old.tabla, old.fila, old.pos, old.city_id, old.motivo, old.created_at) then
    raise exception 'una referencia retirada de una foto se cierra una sola vez';
  end if;
  new.closed_at := now();
  return new;
end $$;
drop trigger if exists photo_text_refs_antes on photo_text_refs;
create trigger photo_text_refs_antes before update or delete on photo_text_refs for each row execute function photo_text_refs_antes();

-- Los índices de búsqueda por dirección (la retirada no recorre ninguna tabla).
create index if not exists items_fotos_idx on items using gin (photos);
create index if not exists users_foto_idx on users using hash (photo_url) where photo_url is not null;
create index if not exists business_members_foto_idx on business_members using hash (photo_url) where photo_url is not null;
create index if not exists businesses_logo_idx on businesses using hash (logo_url) where logo_url is not null;

-- ── Retirar: la dirección sale de las cuatro columnas; cada salida, un renglón. final = la purga (no vuelve). ──
create or replace function fotos_texto_retirar(p_url text, p_media uuid, p_motivo text, p_final boolean default false) returns integer
language plpgsql as $$
declare n integer := 0; k integer;
  st text := case when p_final then 'descartada' else 'retirada' end;
  pq text := case when p_final then 'purgada' end;
  cerr timestamptz := case when p_final then now() end;
begin
  if p_url is null or p_url !~ '^/medios/n/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$' then return 0; end if;
  -- El menú y los catálogos: el lugar que tenía en el arreglo (para volver ahí).
  with r as (select i.id, array_position(i.photos, p_url) as pos, b.city_id from items i join businesses b on b.id = i.business_id
              where i.photos @> array[p_url] for update of i),
       u as (update items i set photos = array_remove(i.photos, p_url), updated_at = now() from r where i.id = r.id returning i.id),
       ins as (insert into photo_text_refs (url, media_id, tabla, fila, pos, city_id, motivo, status, porque, closed_at)
             select p_url, p_media, 'items', r.id::text, least(r.pos, 50), r.city_id, p_motivo, st, pq, cerr from r join u on u.id = r.id returning 1)
  select count(*) into k from ins; n := n + k;
  -- La foto de perfil.
  with u as (update users x set photo_url = null where x.photo_url = p_url returning x.id, x.home_city_id),
       ins as (insert into photo_text_refs (url, media_id, tabla, fila, city_id, motivo, status, porque, closed_at)
             select p_url, p_media, 'users', u.id::text, u.home_city_id, p_motivo, st, pq, cerr from u returning 1)
  select count(*) into k from ins; n := n + k;
  -- La foto de una persona del equipo.
  with u as (update business_members m set photo_url = null, updated_at = now() where m.photo_url = p_url returning m.id, m.business_id),
       ins as (insert into photo_text_refs (url, media_id, tabla, fila, city_id, motivo, status, porque, closed_at)
             select p_url, p_media, 'business_members', u.id::text, (select b.city_id from businesses b where b.id = u.business_id), p_motivo, st, pq, cerr from u returning 1)
  select count(*) into k from ins; n := n + k;
  -- El logo (las pantallas que lo leen ya caen a la primera foto visible de la galería cuando no hay).
  with u as (update businesses b set logo_url = null, updated_at = now() where b.logo_url = p_url returning b.id, b.city_id),
       ins as (insert into photo_text_refs (url, media_id, tabla, fila, city_id, motivo, status, porque, closed_at)
             select p_url, p_media, 'businesses', u.id, u.city_id, p_motivo, st, pq, cerr from u returning 1)
  select count(*) into k from ins; n := n + k;
  -- Purgada: lo que esperaba volver ya no vuelve.
  if p_final then
    update photo_text_refs set status = 'descartada', porque = 'purgada' where url = p_url and status = 'retirada';
  end if;
  return n;
end $$;

-- ── Restaurar: cada referencia retirada de esa dirección vuelve a su lugar, si cabe. ──
create or replace function fotos_texto_restaurar(p_url text) returns integer language plpgsql as $$
declare r record; ok boolean; pq text; n integer := 0;
begin
  for r in select id, tabla, fila, pos from photo_text_refs where url = p_url and status = 'retirada' order by id for update loop
    ok := false; pq := 'sin_fila';
    if r.tabla = 'items' then
      update items i set photos = i.photos[1:least(coalesce(r.pos, 99), cardinality(i.photos) + 1) - 1] || p_url || i.photos[least(coalesce(r.pos, 99), cardinality(i.photos) + 1):], updated_at = now()
       where i.id = r.fila::bigint and not (i.photos @> array[p_url]) and cardinality(i.photos) < 5;
      ok := found;
      if not ok and exists (select 1 from items i where i.id = r.fila::bigint) then
        ok := exists (select 1 from items i where i.id = r.fila::bigint and i.photos @> array[p_url]); pq := 'lleno';
      end if;
    elsif r.tabla = 'users' then
      update users x set photo_url = p_url where x.id = r.fila::uuid and x.photo_url is null and x.status <> 'deleted';
      ok := found;
      if not ok and exists (select 1 from users x where x.id = r.fila::uuid) then ok := exists (select 1 from users x where x.id = r.fila::uuid and x.photo_url = p_url); pq := 'ocupada'; end if;
    elsif r.tabla = 'business_members' then
      update business_members m set photo_url = p_url, updated_at = now() where m.id = r.fila::uuid and m.photo_url is null;
      ok := found;
      if not ok and exists (select 1 from business_members m where m.id = r.fila::uuid) then ok := exists (select 1 from business_members m where m.id = r.fila::uuid and m.photo_url = p_url); pq := 'ocupada'; end if;
    elsif r.tabla = 'businesses' then
      update businesses b set logo_url = p_url, updated_at = now() where b.id = r.fila and b.logo_url is null;
      ok := found;
      if not ok and exists (select 1 from businesses b where b.id = r.fila) then ok := exists (select 1 from businesses b where b.id = r.fila and b.logo_url = p_url); pq := 'ocupada'; end if;
    end if;
    if ok then update photo_text_refs set status = 'restaurada' where id = r.id; n := n + 1;
    else update photo_text_refs set status = 'descartada', porque = pq where id = r.id; end if;
  end loop;
  return n;
end $$;

-- ── El trigger de media: todos los caminos por los que una foto deja de verse o vuelve pasan por aquí (sin depender de quién la cambie). ──
create or replace function media_fotos_texto() returns trigger language plpgsql as $$
begin
  if new.purged_at is not null and old.purged_at is null then
    perform fotos_texto_retirar(old.url, new.id, 'purga', true);
  elsif old.status = 'visible' and new.status <> 'visible'
        and ((new.status = 'review' and new.rev_capa = 'c3') or new.removed_reason in ('admin', 'revision')) then
    perform fotos_texto_retirar(old.url, new.id, case when new.status = 'review' then 'reportes' else new.removed_reason end);
  elsif new.status = 'visible' and old.status <> 'visible' and new.purged_at is null and not new.private and not new.rev_sin_c2 then
    perform fotos_texto_restaurar(new.url);
  end if;
  return null;
end $$;
drop trigger if exists media_fotos_texto on media;
create trigger media_fotos_texto after update of status, purged_at on media for each row
  when ((old.status is distinct from new.status or old.purged_at is distinct from new.purged_at) and old.url like '/medios/n/%')
  execute function media_fotos_texto();

-- ── Los dos índices que se pisan: queda el de Mensajes (chat + dm) ──
drop index if exists media_chat_subidas_idx;

commit;
