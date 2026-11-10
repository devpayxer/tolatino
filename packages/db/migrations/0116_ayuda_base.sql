-- 0116 · ayuda_base (7a · docs/diseno/plan/fase7-compa.md §2 0116 y §4 7a). La ayuda escrita (docs/ayuda/) pasa a ser un producto: el
-- Centro de ayuda (/ayuda) y, desde 7c, la única base de conocimiento de El Compa. EL REPO ES LA FUENTE (§6 #12): estas tablas son el
-- índice que escribe el despliegue (scripts/ayuda/indexar.mjs → ayuda_indexar), nunca una pantalla. El Super Admin solo PAUSA un
-- artículo (con motivo) y lo vuelve a usar; el texto se corrige en el repo.
-- · help_topics: los temas del Centro de ayuda, cada uno de UNA audiencia, con su nombre ES/EN y su orden.
-- · help_articles: un archivo = un artículo (slug = nombre del archivo), título ES/EN, audiencia (vecino · negocio · portero · equipo),
--   tema, pantallas, versión, sha256 del archivo, estado live · paused (el equipo lo pausó: no sale en el Centro de ayuda ni lo usará
--   El Compa) · retired (el archivo ya no está en el repo). La base impone lo que dice el nombre: admin-* = equipo, panel-* = negocio,
--   puerta-* = portero (un artículo del equipo nunca puede quedar para vecinos o negocios, aunque alguien cambie su cabecera).
-- · help_chunks: los trozos por sección e idioma (≤ 1 800 letras) con su tsvector GENERADO (spanish / english sin acentos; título A,
--   encabezado B, cuerpo C) e índice GIN, y (audience, lang). Una sección marcada <!-- solo-equipo --> se guarda con audiencia
--   «equipo»: nunca sale para un vecino, un negocio o un portero. Son derivados del archivo: se rehacen cuando cambia su sha256.
-- · help_article_log (SOLO INSERCIÓN): indexado (sha anterior → nuevo), pausado, vuelto a usar, marcado y retirado, con quién y motivo.
-- · ayuda_indexar(jsonb) idempotente por sha256 (el mismo archivo otra vez = nada cambia) y ayuda_retirar(slugs vivos).
-- · ayuda_consulta(texto, idioma, modo): el tsquery de la búsqueda (prefijo en cada palabra y los sinónimos «query» del Catálogo).
-- · Configuración, sección nueva «El Compa»: ayuda_trozos_max 4 y ayuda_umbral_rank 50 milésimas (0.05: por debajo, «no lo sé»).
--   Las lee El Compa (7c): hasta entonces se ven en solo lectura.
-- · Super Admin › Textos y páginas (cms) sale de «pendiente» con su pestaña Ayuda (ver: cms:ver; pausar: cms:editar; la matriz no cambia).
-- Idempotente: se puede aplicar dos veces. Nada se borra (los trozos son derivados).
begin;

-- ── Temas ──
create table if not exists help_topics (
  key      text primary key check (key ~ '^[a-z]+$'),
  audience text not null check (audience in ('vecino', 'negocio', 'portero', 'equipo')),
  label    jsonb not null check (label ? 'es' and label ? 'en'),
  lead     jsonb not null check (lead ? 'es' and lead ? 'en'),
  icon     text not null,
  sort     integer not null default 0
);
insert into help_topics (key, audience, label, lead, icon, sort) values
  ('cuenta', 'vecino', '{"es":"Tu cuenta y tus avisos","en":"Your account and notifications"}', '{"es":"Entrar, Mi cuenta, avisos, direcciones y tus datos.","en":"Signing in, My account, notifications, addresses and your data."}', 'users', 10),
  ('explorar', 'vecino', '{"es":"Buscar y explorar","en":"Search and explore"}', '{"es":"Buscar, el mapa, la página de cada negocio y las reseñas.","en":"Search, the map, each business page and reviews."}', 'search', 20),
  ('pedidos', 'vecino', '{"es":"Pedidos, compras y pagos","en":"Orders, purchases and payments"}', '{"es":"Pedir, apartar, pagar con tarjeta, devoluciones y ayuda con un pedido.","en":"Ordering, holding items, paying by card, refunds and order help."}', 'bag', 30),
  ('citas', 'vecino', '{"es":"Citas, reservas y servicios","en":"Appointments, bookings and services"}', '{"es":"Citas, mesas, visitas, fiestas, viajes, inscripciones y su ayuda.","en":"Appointments, tables, visits, parties, trips, enrollments and their help."}', 'calendar', 40),
  ('eventos', 'vecino', '{"es":"Eventos y boletos","en":"Events and tickets"}', '{"es":"Buscar eventos, comprar boletos, el QR, transferir y devoluciones.","en":"Finding events, buying tickets, the QR, transfers and refunds."}', 'ticket', 50),
  ('comunidad', 'vecino', '{"es":"Comunidad","en":"Community"}', '{"es":"El muro, comentar, puntos, monedas, reportar y apelar.","en":"The feed, comments, points, coins, reporting and appeals."}', 'chat', 60),
  ('negocios', 'vecino', '{"es":"Tu negocio en To''Latino","en":"Your business on To''Latino"}', '{"es":"Publicar tu negocio, recuperarlo y el plan Pro.","en":"Listing your business, recovering it and the Pro plan."}', 'store', 70),
  ('panel', 'negocio', '{"es":"Tu panel","en":"Your dashboard"}', '{"es":"Lo que manejas desde el panel de tu negocio.","en":"What you manage from your business dashboard."}', 'grid', 80),
  ('puerta', 'portero', '{"es":"La puerta","en":"The door"}', '{"es":"To''Latino Puerta: escanear y trabajar sin señal.","en":"To''Latino Door: scanning and working offline."}', 'ticket', 90),
  ('equipo', 'equipo', '{"es":"Super Admin","en":"Super Admin"}', '{"es":"Ayuda interna del equipo de To''Latino.","en":"Internal help for the To''Latino team."}', 'shield', 100)
on conflict (key) do update set audience = excluded.audience, label = excluded.label, lead = excluded.lead, icon = excluded.icon, sort = excluded.sort;

-- ── Artículos ──
create table if not exists help_articles (
  slug          text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title         jsonb not null check (title ? 'es' and title ? 'en'),
  audience      text not null check (audience in ('vecino', 'negocio', 'portero', 'equipo')),
  topic         text not null references help_topics (key),
  screens       text[] not null default '{}',
  screens_text  text not null default '',
  version_label text not null,
  sha256        text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  city_id       text references cities (id),                -- null = todas las ciudades
  status        text not null default 'live' check (status in ('live', 'paused', 'retired')),
  paused_reason text,
  paused_by     uuid references users (id),
  paused_at     timestamptz,
  deployed_at   timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (status <> 'paused' or (paused_reason is not null and paused_at is not null)),
  -- Lo que obliga el nombre del archivo (nunca un admin-* para vecinos o negocios).
  check (slug not like 'admin-%' or audience = 'equipo'),
  check (slug not like 'panel-%' or audience = 'negocio'),
  check (slug not like 'puerta-%' or audience = 'portero')
);
create index if not exists help_articles_aud on help_articles (audience, status, topic);

-- El tema es de la misma audiencia que el artículo.
create or replace function help_articles_tema() returns trigger language plpgsql as $$
begin
  if (select audience from help_topics where key = new.topic) is distinct from new.audience then
    raise exception 'el tema % no es de la audiencia %', new.topic, new.audience;
  end if;
  return new;
end $$;
drop trigger if exists help_articles_tema on help_articles;
create trigger help_articles_tema before insert or update on help_articles for each row execute function help_articles_tema();

-- ── Trozos (búsqueda) ──
-- unaccent con su diccionario explícito no cambia entre llamadas: se envuelve como immutable para poder generar la columna.
create or replace function ayuda_sin_acentos(t text) returns text language sql immutable parallel safe as $$
  select public.unaccent('public.unaccent'::regdictionary, coalesce(t, ''))
$$;
create or replace function ayuda_tsv(lang text, titulo text, heading text, body text) returns tsvector language sql immutable parallel safe as $$
  select setweight(to_tsvector(case when lang = 'en' then 'english'::regconfig else 'spanish'::regconfig end, ayuda_sin_acentos(titulo)), 'A')
      || setweight(to_tsvector(case when lang = 'en' then 'english'::regconfig else 'spanish'::regconfig end, ayuda_sin_acentos(heading)), 'B')
      || setweight(to_tsvector(case when lang = 'en' then 'english'::regconfig else 'spanish'::regconfig end, ayuda_sin_acentos(body)), 'C')
$$;
create table if not exists help_chunks (
  id       bigint generated always as identity primary key,
  slug     text not null references help_articles (slug),
  lang     text not null check (lang in ('es', 'en')),
  ord      integer not null check (ord >= 0),
  sec      integer not null check (sec >= 0),
  nivel    smallint not null check (nivel in (2, 3)),
  title    text not null,
  heading  text not null,
  body     text not null check (char_length(body) <= 1800),
  audience text not null check (audience in ('vecino', 'negocio', 'portero', 'equipo')),
  tsv      tsvector generated always as (ayuda_tsv(lang, title, heading, body)) stored,
  unique (slug, ord)
);
create index if not exists help_chunks_tsv on help_chunks using gin (tsv);
create index if not exists help_chunks_aud on help_chunks (audience, lang);
-- Un trozo nunca es de una audiencia más abierta que su artículo (solo puede cerrarse: solo-equipo → equipo).
create or replace function help_chunks_audiencia() returns trigger language plpgsql as $$
begin
  if new.audience <> 'equipo' and new.audience <> (select audience from help_articles where slug = new.slug) then
    raise exception 'un trozo de % no puede ser de la audiencia %', new.slug, new.audience;
  end if;
  return new;
end $$;
drop trigger if exists help_chunks_audiencia on help_chunks;
create trigger help_chunks_audiencia before insert or update on help_chunks for each row execute function help_chunks_audiencia();

-- ── Libro (solo inserción) ──
create table if not exists help_article_log (
  id         bigint generated always as identity primary key,
  slug       text not null references help_articles (slug),
  sha256_old text,
  sha256_new text,
  action     text not null check (action in ('indexed', 'paused', 'resumed', 'flagged', 'retired')),
  by         uuid references users (id),               -- null = el despliegue
  reason     text,
  at         timestamptz not null default now(),
  check (action not in ('paused', 'resumed', 'flagged') or (by is not null and reason is not null))
);
create index if not exists help_article_log_slug on help_article_log (slug, at desc);
create or replace function help_article_log_inmutable() returns trigger language plpgsql as $$
begin raise exception 'help_article_log es solo de inserción'; end $$;
drop trigger if exists help_article_log_no_cambia on help_article_log;
create trigger help_article_log_no_cambia before update or delete on help_article_log for each row execute function help_article_log_inmutable();

-- ── Indexar (lo llama el despliegue) ──
-- a = { slug, title {es,en}, audience, topic, screens [], screens_text, version, sha256, chunks [{ lang, ord, sec, nivel, heading, body, equipo }] }
create or replace function ayuda_indexar(a jsonb) returns text language plpgsql as $$
declare v help_articles; s text := a->>'slug'; h text := a->>'sha256';
begin
  select * into v from help_articles where slug = s for update;
  if found and v.sha256 = h and v.status <> 'retired' then return 'igual'; end if;
  insert into help_articles (slug, title, audience, topic, screens, screens_text, version_label, sha256, status, deployed_at, updated_at)
  values (s, a->'title', a->>'audience', a->>'topic', coalesce((select array_agg(x) from jsonb_array_elements_text(a->'screens') x), '{}'),
          coalesce(a->>'screens_text', ''), a->>'version', h, 'live', now(), now())
  on conflict (slug) do update set title = excluded.title, audience = excluded.audience, topic = excluded.topic, screens = excluded.screens,
    screens_text = excluded.screens_text, version_label = excluded.version_label, sha256 = excluded.sha256, deployed_at = now(), updated_at = now(),
    status = case when help_articles.status = 'retired' then 'live' else help_articles.status end;
  -- Los trozos son derivados del archivo: se rehacen enteros.
  delete from help_chunks where slug = s;
  insert into help_chunks (slug, lang, ord, sec, nivel, title, heading, body, audience)
  select s, c->>'lang', (c->>'ord')::int, (c->>'sec')::int, (c->>'nivel')::smallint, a->'title'->>(c->>'lang'), c->>'heading', c->>'body',
         case when coalesce((c->>'equipo')::boolean, false) then 'equipo' else a->>'audience' end
    from jsonb_array_elements(a->'chunks') c;
  insert into help_article_log (slug, sha256_old, sha256_new, action, reason)
  values (s, v.sha256, h, 'indexed', case when v.slug is null then 'nuevo' when v.status = 'retired' then 'volvió al repo' else 'cambió' end);
  return case when v.slug is null then 'nuevo' else 'cambiado' end;
end $$;

-- Lo que ya no está en el repo queda «retirado» (nada se borra).
create or replace function ayuda_retirar(vivos text[]) returns integer language plpgsql as $$
declare n integer := 0; r record;
begin
  for r in select slug, sha256 from help_articles where status <> 'retired' and slug <> all(vivos) for update loop
    update help_articles set status = 'retired', updated_at = now() where slug = r.slug;
    insert into help_article_log (slug, sha256_old, action, reason) values (r.slug, r.sha256, 'retired', 'ya no está en docs/ayuda');
    n := n + 1;
  end loop;
  return n;
end $$;

-- ── La consulta de búsqueda ──
-- Cada palabra (sin acentos, 2+ letras, hasta 8) con prefijo y sus sinónimos «query» del Catálogo; modo 'and' (todas) u 'or' (alguna).
create or replace function ayuda_consulta(texto text, lang text, modo text default 'and') returns tsquery language plpgsql stable as $$
declare cfg regconfig := case when lang = 'en' then 'english'::regconfig else 'spanish'::regconfig end;
        w text; parte tsquery; sin text; salida tsquery;
begin
  for w in select x from regexp_split_to_table(lower(ayuda_sin_acentos(left(coalesce(texto, ''), 120))), '[^a-z0-9]+') x where char_length(x) >= 2 limit 8 loop
    parte := to_tsquery(cfg, quote_literal(w) || ':*');
    for sin in select distinct lower(ayuda_sin_acentos(target)) from synonyms where active and target_kind = 'query' and lower(ayuda_sin_acentos(term)) = w limit 5 loop
      parte := parte || plainto_tsquery(cfg, sin);
    end loop;
    if numnode(parte) = 0 then continue; end if;
    salida := case when salida is null then parte when modo = 'or' then salida || parte else salida && parte end;
  end loop;
  return salida;  -- null = nada que buscar (sin filas)
end $$;

-- ── Configuración › El Compa ──
alter table config_keys drop constraint if exists config_keys_section_check;
alter table config_keys add constraint config_keys_section_check check (section in ('comunidad', 'gamificacion', 'salud_pro', 'noche', 'edu', 'fe_inm_autos', 'eventos', 'compa'));
insert into config_keys (key, min, max, def, unit, section, label, help, editable, bloqueo, edit_in, sort) values
  ('ayuda_trozos_max', 1, 10, 4, '{"es":"trozos","en":"chunks"}', 'compa', '{"es":"Trozos de ayuda por respuesta","en":"Help chunks per answer"}',
    '{"es":"Cuántos trozos del Centro de ayuda (de la audiencia de la persona) recibe El Compa para contestar.","en":"How many Help center chunks (from the person''s audience) El Compa gets to answer."}',
    false, '{"es":"Lo lee El Compa: se cambia cuando El Compa se encienda.","en":"El Compa reads it: it can be changed once El Compa is on."}', null, 200),
  ('ayuda_umbral_rank', 1, 500, 50, '{"es":"milésimas","en":"thousandths"}', 'compa', '{"es":"Parecido mínimo para usar un trozo","en":"Minimum match to use a chunk"}',
    '{"es":"Por debajo de este rango (50 = 0.05), El Compa dice «No tengo ese dato» y lo pasa a una persona.","en":"Below this rank (50 = 0.05), El Compa says «I don''t have that» and hands off to a person."}',
    false, '{"es":"Lo lee El Compa: se cambia cuando El Compa se encienda.","en":"El Compa reads it: it can be changed once El Compa is on."}', null, 201)
on conflict (key) do update set min = excluded.min, max = excluded.max, def = excluded.def, unit = excluded.unit, section = excluded.section,
  label = excluded.label, help = excluded.help, editable = excluded.editable, bloqueo = excluded.bloqueo, edit_in = excluded.edit_in, sort = excluded.sort;

commit;
