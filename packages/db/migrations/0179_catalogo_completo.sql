-- 0179 · 9n · Catálogo completo (ADM-CAT · LAUNCH L214 «Del diseño, pendiente»): mover, fusionar y renombrar subcategorías; categoría y
-- módulo activos por ciudad; plantilla de horario y ejemplos (placeholders) de «Publica tu negocio» por categoría; límites Free/Pro editables.
-- Lo que pone la base (el Super Admin › Catálogo lo usa con permiso cat:editar, motivo y auditoría en la misma transacción):
-- · Subcategorías: el id (NEG-<CAT>-<NN>) NO cambia al mover (businesses.subcategory_ids, sinónimos, mosaicos de la página y el código lo
--   nombran por id): mover solo cambia category_id. Fusionar A en B: status 'merged' con merged_into = B (nada se borra); los negocios con A
--   pasan a B (quien ya tenía las dos pierde solo A), los sinónimos que llevaban al nombre de A llevan al de B y el nombre de A queda como
--   sinónimo de B. Todo queda anotado en subcategory_merges y «Separar» lo devuelve (catalogo_separar). Los documentos de búsqueda se
--   recalculan en la misma transacción sin tocar updated_at (tolatino.solo_doc, 0020).
-- · categories.off_cities: la categoría no se ofrece en esas ciudades (página de categoría, Negocios, Buscar, Publica tu negocio; el servidor
--   lo decide). Las fichas de sus negocios se conservan.
-- · module_types.off_cities: el módulo se apaga en esas ciudades con la misma pausa que el equipo usa por negocio (businesses.modules_off,
--   que ya respetan la ficha, los pedidos, las citas, Novedades, Eventos…), marcada {"ciudad": true}; un negocio nuevo o que se muda a esa
--   ciudad la recibe (trigger). Encenderlo quita solo esa marca (la pausa propia de un negocio se queda).
-- · categories.onb: la plantilla de horario (lunes primero, horas con fracción; > 24 = pasa de medianoche) y los ejemplos del nombre y del
--   ítem de «Publica tu negocio». La semilla son los valores que la pantalla mostraba (lib/onb/datos.ts): nada visible cambia hasta editarlos.
--   Iglesias no lleva plantilla: su horario sale de los cultos que elige.
-- · Límites del plan (config_keys, sección «negocios»; se leen con lib/config.ts): ítems y fotos que se ven con Free, fotos de un Pro y
--   personas del equipo con Free. El techo de pedidos o citas en línea (free_ops_cap) ya vivía en Configuración.
-- Idempotente: se puede aplicar dos veces.
begin;

create or replace function pg_temp.ampliar_check(t regclass, nombre text, valores text[]) returns void language plpgsql as $$
declare d text; v text; nuevo text := '';
begin
  select pg_get_constraintdef(oid) into d from pg_constraint where conname = nombre and conrelid = t;
  if d is null then return; end if;
  foreach v in array valores loop
    if position(quote_literal(v) in d) = 0 then nuevo := nuevo || quote_literal(v) || '::text, '; end if;
  end loop;
  if nuevo = '' then return; end if;
  execute format('alter table %s drop constraint %I', t, nombre);
  execute format('alter table %s add constraint %I %s', t, nombre, replace(d, 'ARRAY[', 'ARRAY[' || nuevo));
end $$;

-- ── Subcategorías: fusionadas (nada se borra) ─────────────────────────────────────────────────────────────────────────────────────────
do $$ begin perform pg_temp.ampliar_check('subcategories', 'subcategories_status_check', array['merged']); end $$;
alter table subcategories add column if not exists merged_into text references subcategories (id);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'subcategories_fusion_ok') then
    alter table subcategories add constraint subcategories_fusion_ok check ((status = 'merged') = (merged_into is not null) and merged_into is distinct from id);
  end if;
end $$;

-- Cada fusión, con lo necesario para deshacerla: quiénes tenían A (y de esos, quiénes ya tenían B), qué sinónimos se apagaron y cuáles creó.
create table if not exists subcategory_merges (
  id            bigint generated always as identity primary key,
  from_id       text not null references subcategories (id),
  into_id       text not null references subcategories (id),
  business_ids  text[] not null default '{}',
  had_both      text[] not null default '{}',
  syn_off       bigint[] not null default '{}',
  syn_new       bigint[] not null default '{}',
  reason        text not null check (char_length(reason) between 1 and 500),
  created_by    uuid references users (id),
  created_at    timestamptz not null default now(),
  undone_at     timestamptz,
  undone_by     uuid references users (id),
  undone_reason text,
  check (from_id <> into_id)
);
create index if not exists subcategory_merges_from_idx on subcategory_merges (from_id, created_at desc);
-- Una sola fusión viva por subcategoría.
create unique index if not exists subcategory_merges_viva on subcategory_merges (from_id) where undone_at is null;

-- El texto como lo guarda Buscar (sin acentos, minúsculas, solo letras, números y espacios): lo mismo que limpian sinAgregar y diccionario().
create or replace function catalogo_norm(t text) returns text language sql stable as $$
  select trim(regexp_replace(regexp_replace(lower(unaccent(coalesce(t, ''))), '[^a-z0-9 ]+', ' ', 'g'), '\s+', ' ', 'g'))
$$;

-- Fusionar A en B (misma categoría). Devuelve el id de la fusión. Lo llama acciones-catalogo.ts dentro de su transacción (con la auditoría).
create or replace function catalogo_fusionar(a text, b text, actor uuid, motivo text) returns bigint language plpgsql as $$
declare x subcategories; y subcategories; ids text[]; ambos text[]; apagados bigint[]; nuevos bigint[]; extra bigint[]; mid bigint;
        xes text; xen text; yes text; yen text;
begin
  select * into x from subcategories where id = a for update;
  select * into y from subcategories where id = b for update;
  if x.id is null or y.id is null then raise exception 'catalogo_fusionar: no existe' using errcode = 'check_violation'; end if;
  if x.id = y.id or x.status = 'merged' or y.status <> 'on' or x.category_id <> y.category_id then
    raise exception 'catalogo_fusionar: solo se fusiona una subcategoría en otra encendida de su misma categoría' using errcode = 'check_violation';
  end if;
  xes := catalogo_norm(x.name->>'es'); xen := catalogo_norm(coalesce(nullif(x.name->>'en', ''), x.name->>'es'));
  yes := catalogo_norm(y.name->>'es'); yen := catalogo_norm(coalesce(nullif(y.name->>'en', ''), y.name->>'es'));
  select coalesce(array_agg(id order by id), '{}'), coalesce(array_agg(id order by id) filter (where subcategory_ids @> array[b]), '{}') into ids, ambos
    from businesses where subcategory_ids @> array[a];
  perform set_config('tolatino.solo_doc', 'on', true);
  update businesses set subcategory_ids = case when subcategory_ids @> array[b] then array_remove(subcategory_ids, a) else array_replace(subcategory_ids, a, b) end
   where subcategory_ids @> array[a];
  perform set_config('tolatino.solo_doc', '', true);
  -- Los sinónimos que llevaban al nombre de A llevan al de B (los de A se apagan, no se borran).
  with v as (
    select s.term, s.lang, case when catalogo_norm(s.target) = xes then yes else yen end as destino
      from synonyms s where s.active and s.target_kind = 'query' and catalogo_norm(s.target) in (xes, xen)),
  ins as (
    insert into synonyms (term, lang, target_kind, target, created_by, updated_at)
    select distinct v.term, v.lang, 'query', v.destino, actor::text, now() from v where catalogo_norm(v.term) <> v.destino
    on conflict (term, lang, target_kind, target) do nothing returning id)
  select coalesce((select array_agg(id) from ins), '{}') into nuevos;
  with off as (
    update synonyms s set active = false, updated_at = now()
     where s.active and s.target_kind = 'query' and catalogo_norm(s.target) in (xes, xen) and not (s.id = any(nuevos)) returning s.id)
  select coalesce(array_agg(id), '{}') into apagados from off;
  -- El nombre de A queda como sinónimo de B: quien busque el nombre viejo encuentra lo que ahora es B.
  with p (term, lang, destino) as (values (xes, 'es', yes), (xen, 'en', yen)),
  ins as (
    insert into synonyms (term, lang, target_kind, target, created_by, updated_at)
    select term, lang, 'query', destino, actor::text, now() from p where char_length(term) >= 2 and term <> destino
    on conflict (term, lang, target_kind, target) do nothing returning id)
  select coalesce((select array_agg(id) from ins), '{}') into extra;
  update subcategories set status = 'merged', merged_into = b, status_reason = motivo, status_at = now(), updated_at = now() where id = a;
  insert into subcategory_merges (from_id, into_id, business_ids, had_both, syn_off, syn_new, reason, created_by)
  values (a, b, ids, ambos, apagados, nuevos || extra, motivo, actor) returning id into mid;
  return mid;
end $$;

-- Separar (deshacer la fusión viva de A): A vuelve encendida a los negocios que la tenían y los sinónimos vuelven como estaban. Devuelve
-- cuántos negocios recuperaron A.
create or replace function catalogo_separar(a text, actor uuid, motivo text) returns integer language plpgsql as $$
declare m subcategory_merges; n integer;
begin
  select * into m from subcategory_merges where from_id = a and undone_at is null for update;
  if m.id is null then raise exception 'catalogo_separar: no está fusionada' using errcode = 'check_violation'; end if;
  update subcategories set status = 'on', merged_into = null, status_reason = null, status_at = now(), updated_at = now() where id = a and status = 'merged';
  perform set_config('tolatino.solo_doc', 'on', true);
  with u as (
    update businesses set subcategory_ids = case when id = any(m.had_both) or not (subcategory_ids @> array[m.into_id]) then array_append(subcategory_ids, a)
                                                 else array_replace(subcategory_ids, m.into_id, a) end
     where id = any(m.business_ids) and not (subcategory_ids @> array[a]) returning 1)
  select count(*)::int into n from u;
  perform set_config('tolatino.solo_doc', '', true);
  update synonyms set active = true, updated_at = now() where id = any(m.syn_off);
  update synonyms set active = false, updated_at = now() where id = any(m.syn_new);
  update subcategory_merges set undone_at = now(), undone_by = actor, undone_reason = motivo where id = m.id;
  return n;
end $$;

-- ── Categoría y módulo activos por ciudad ────────────────────────────────────────────────────────────────────────────────────────────
alter table categories add column if not exists off_cities text[] not null default '{}';
alter table module_types add column if not exists off_cities text[] not null default '{}';

-- Un negocio nuevo (o que cambia de ciudad) recibe la pausa de los módulos apagados en su ciudad; la marca {"ciudad": true} distingue esta
-- pausa de la que el equipo pone a un negocio (esa nunca se quita aquí).
create or replace function businesses_modulos_ciudad() returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' then
    new.modules_off := coalesce((select jsonb_object_agg(e.k, e.v) from jsonb_each(coalesce(new.modules_off, '{}'::jsonb)) e(k, v)
                                  where not (e.v->>'ciudad' = 'true' and not exists (select 1 from module_types m where m.key = e.k and new.city_id = any(m.off_cities)))), '{}'::jsonb);
  end if;
  new.modules_off := coalesce(new.modules_off, '{}'::jsonb) || coalesce((
    select jsonb_object_agg(m.key, jsonb_build_object('reason', 'Apagado en la ciudad desde el Catálogo', 'at', now(), 'by', 'catalogo', 'ciudad', true))
      from module_types m where new.city_id = any(m.off_cities) and not (coalesce(new.modules_off, '{}'::jsonb) ? m.key)), '{}'::jsonb);
  return new;
end $$;
drop trigger if exists businesses_modulos_ciudad on businesses;
create trigger businesses_modulos_ciudad before insert or update of city_id on businesses for each row execute function businesses_modulos_ciudad();

-- Apagar o encender un módulo en una ciudad. Devuelve cuántos negocios cambiaron. Sin tocar updated_at (no es actividad del negocio).
create or replace function catalogo_modulo_ciudad(modulo text, ciudad text, apagar boolean, motivo text, actor text) returns integer language plpgsql as $$
declare n integer;
begin
  if not exists (select 1 from module_types where key = modulo) or not exists (select 1 from cities where id = ciudad) then
    raise exception 'catalogo_modulo_ciudad: módulo o ciudad inexistente' using errcode = 'check_violation';
  end if;
  update module_types set off_cities = case when apagar then array(select distinct x from unnest(off_cities || array[ciudad]) x order by 1) else array_remove(off_cities, ciudad) end
   where key = modulo;
  perform set_config('tolatino.solo_doc', 'on', true);
  if apagar then
    with u as (update businesses set modules_off = modules_off || jsonb_build_object(modulo, jsonb_build_object('reason', motivo, 'at', now(), 'by', actor, 'ciudad', true))
                where city_id = ciudad and not (modules_off ? modulo) returning 1)
    select count(*)::int into n from u;
  else
    with u as (update businesses set modules_off = modules_off - modulo where city_id = ciudad and modules_off->modulo->>'ciudad' = 'true' returning 1)
    select count(*)::int into n from u;
  end if;
  perform set_config('tolatino.solo_doc', '', true);
  return n;
end $$;

-- ── «Publica tu negocio» por categoría: plantilla de horario y ejemplos ──────────────────────────────────────────────────────────────
alter table categories add column if not exists onb jsonb not null default '{}'::jsonb;
update categories c set onb = jsonb_strip_nulls(jsonb_build_object(
    'horario', v.horario::jsonb,
    'ph_nombre', '{"es":"Ej.: Barbería Don Fello","en":"E.g. Barbería Don Fello"}'::jsonb,
    'ph_item', '{"es":"Nombre","en":"Name"}'::jsonb))
  from (values
  ('NEG-FOOD', '[{"on":true,"a":11,"b":21},{"on":true,"a":11,"b":21},{"on":true,"a":11,"b":21},{"on":true,"a":11,"b":21},{"on":true,"a":11,"b":21},{"on":true,"a":11,"b":21},{"on":true,"a":11,"b":21}]'),
  ('NEG-BELL', '[{"on":true,"a":9,"b":19},{"on":true,"a":9,"b":19},{"on":true,"a":9,"b":19},{"on":true,"a":9,"b":19},{"on":true,"a":9,"b":19},{"on":true,"a":9,"b":19},{"on":false,"a":9,"b":17}]'),
  ('NEG-AUTO', '[{"on":true,"a":8,"b":18},{"on":true,"a":8,"b":18},{"on":true,"a":8,"b":18},{"on":true,"a":8,"b":18},{"on":true,"a":8,"b":18},{"on":true,"a":8,"b":14},{"on":false,"a":9,"b":17}]'),
  ('NEG-HOGAR', '[{"on":true,"a":8,"b":17},{"on":true,"a":8,"b":17},{"on":true,"a":8,"b":17},{"on":true,"a":8,"b":17},{"on":true,"a":8,"b":17},{"on":true,"a":8,"b":12},{"on":false,"a":9,"b":17}]'),
  ('NEG-NOCHE', '[{"on":false,"a":9,"b":17},{"on":false,"a":9,"b":17},{"on":false,"a":9,"b":17},{"on":true,"a":21,"b":26},{"on":true,"a":21,"b":26},{"on":true,"a":21,"b":26},{"on":true,"a":20,"b":25}]'),
  ('NEG-MERC', '[{"on":true,"a":7,"b":21},{"on":true,"a":7,"b":21},{"on":true,"a":7,"b":21},{"on":true,"a":7,"b":21},{"on":true,"a":7,"b":21},{"on":true,"a":7,"b":21},{"on":true,"a":7,"b":21}]'),
  ('NEG-FIESTA', '[{"on":true,"a":10,"b":18},{"on":true,"a":10,"b":18},{"on":true,"a":10,"b":18},{"on":true,"a":10,"b":18},{"on":true,"a":10,"b":18},{"on":true,"a":10,"b":18},{"on":false,"a":9,"b":17}]'),
  ('NEG-SALUD', '[{"on":true,"a":8,"b":17},{"on":true,"a":8,"b":17},{"on":true,"a":8,"b":17},{"on":true,"a":8,"b":17},{"on":true,"a":8,"b":17},{"on":true,"a":9,"b":13},{"on":false,"a":9,"b":17}]'),
  ('NEG-PRO', '[{"on":true,"a":9,"b":18},{"on":true,"a":9,"b":18},{"on":true,"a":9,"b":18},{"on":true,"a":9,"b":18},{"on":true,"a":9,"b":18},{"on":true,"a":10,"b":14},{"on":false,"a":9,"b":17}]'),
  ('NEG-TIENDA', '[{"on":true,"a":10,"b":19},{"on":true,"a":10,"b":19},{"on":true,"a":10,"b":19},{"on":true,"a":10,"b":19},{"on":true,"a":10,"b":19},{"on":true,"a":10,"b":19},{"on":true,"a":11,"b":17}]'),
  ('NEG-TRANS', '[{"on":true,"a":6,"b":22},{"on":true,"a":6,"b":22},{"on":true,"a":6,"b":22},{"on":true,"a":6,"b":22},{"on":true,"a":6,"b":22},{"on":true,"a":6,"b":22},{"on":true,"a":6,"b":22}]'),
  ('NEG-EDU', '[{"on":true,"a":17,"b":21},{"on":true,"a":17,"b":21},{"on":true,"a":17,"b":21},{"on":true,"a":17,"b":21},{"on":false,"a":9,"b":17},{"on":true,"a":9,"b":13},{"on":false,"a":9,"b":17}]'),
  ('NEG-NINOS', '[{"on":true,"a":6.5,"b":18},{"on":true,"a":6.5,"b":18},{"on":true,"a":6.5,"b":18},{"on":true,"a":6.5,"b":18},{"on":true,"a":6.5,"b":18},{"on":false,"a":9,"b":17},{"on":false,"a":9,"b":17}]'),
  ('NEG-DEPORTE', '[{"on":true,"a":5,"b":22},{"on":true,"a":5,"b":22},{"on":true,"a":5,"b":22},{"on":true,"a":5,"b":22},{"on":true,"a":5,"b":22},{"on":true,"a":7,"b":19},{"on":true,"a":7,"b":19}]'),
  ('NEG-FE', null),
  ('NEG-INMUEBLE', '[{"on":true,"a":9,"b":18},{"on":true,"a":9,"b":18},{"on":true,"a":9,"b":18},{"on":true,"a":9,"b":18},{"on":true,"a":9,"b":18},{"on":true,"a":10,"b":14},{"on":false,"a":9,"b":17}]'),
  ('NEG-DEALER', '[{"on":true,"a":9,"b":19},{"on":true,"a":9,"b":19},{"on":true,"a":9,"b":19},{"on":true,"a":9,"b":19},{"on":true,"a":9,"b":19},{"on":true,"a":9,"b":17},{"on":false,"a":9,"b":17}]')
  ) v (id, horario)
 where c.id = v.id and c.onb = '{}'::jsonb;

-- ── Límites del plan (Configuración, sección «negocios»; se cambian en Catálogo › Módulos y Free/Pro y en Configuración) ─────────────
insert into config_keys (key, min, max, def, unit, section, label, help, editable, bloqueo, edit_in, sort) values
  ('free_items', 1, 50, 5, '{"es":"ítems","en":"items"}', 'negocios', '{"es":"Free · ítems que se ven y se piden (Menú, Servicios, Tienda)","en":"Free · items shown and ordered (Menu, Services, Shop)"}',
    '{"es":"Con Free, la página muestra los primeros ítems de su módulo principal y solo esos se piden en línea; los demás quedan guardados y vuelven con Pro.","en":"On Free, the page shows the first items of its main module and only those can be ordered online; the rest stay saved and come back with Pro."}', true, null, null, 3),
  ('free_fotos', 1, 20, 3, '{"es":"fotos","en":"photos"}', 'negocios', '{"es":"Free · fotos de la galería que se ven","en":"Free · gallery photos shown"}',
    '{"es":"Con Free, la página muestra las primeras fotos de la galería; las demás quedan guardadas y vuelven con Pro.","en":"On Free, the page shows the first gallery photos; the rest stay saved and come back with Pro."}', true, null, null, 4),
  ('pro_fotos', 10, 200, 60, '{"es":"fotos","en":"photos"}', 'negocios', '{"es":"Pro · fotos de la galería que se ven","en":"Pro · gallery photos shown"}',
    '{"es":"Tope de fotos que muestra la página de un negocio Pro.","en":"Most photos a Pro business page shows."}', true, null, null, 5),
  ('free_equipo', 1, 10, 1, '{"es":"personas","en":"people"}', 'negocios', '{"es":"Free · personas del equipo","en":"Free · team members"}',
    '{"es":"Con Free, cuántas personas del equipo cuenta el plan (el dueño es la primera); el equipo completo sale con Pro.","en":"On Free, how many team members the plan counts (the owner is the first); the full team shows with Pro."}', true, null, null, 6)
on conflict (key) do nothing;

commit;
