-- 0210 · Fotos a la medida · F3b y F4, lo que quedó (LAUNCH, 22 nov).
-- · Las privadas de las OTRAS rutas subidas antes del 22 nov (Mensajes privado/m/, ayuda privado/a/, entrega privado/e/, reclamo privado/r/) no
--   tienen variantes: las completa el barrido (lib/fotos-privadas.ts barrerVariantesDeRuta), por tandas, la más vieja primero. Su índice parcial
--   (media_privadas_ruta_sin_variantes_idx) es el MISMO predicado que su consulta: sin él, cada minuto recorría media entera (2 M de filas: 53 mil
--   páginas, ~180 ms); con él, solo las que faltan. Se vacía solo (una con variantes, o con '{}', sale del índice). Incluye las de Mensajes en
--   revisión: es la misma foto y la ve quien la subió.
-- · Las cifras de fotos del Super Admin (Contenido › Auto-moderación › «Fotos a la medida»; cifrasFotos y cifrasFotosPrivadas) recorrían media
--   entera en cada carga (2 M de filas: ~450 ms las públicas y ~100 ms las privadas, cada vez). Ahora son un DERIVADO: media_cifras_cache, una
--   fila para las públicas y otra para las privadas, que rehace el barrido cada 10 minutos (fotos_cifras_al_dia, como contenido_al_dia de 0133)
--   con las mismas consultas de antes; la pantalla lee dos filas. Nunca editable: solo lo escribe fotos_cifras_contar (trigger, como las cifras de un patrocinio en
--   0173). Las privadas cuentan también las cuatro familias de las otras rutas.
-- El índice se crea dentro de la transacción (como 0195 y 0197 sobre media): mientras se construye, las escrituras en media esperan (se midió:
-- ~0,3 s con 2 M de filas). «create index concurrently» no puede ir dentro de begin/commit (guardián migracionConTransaccion).
-- Idempotente; solo expande (no cambia columnas ni checks). Para deshacerla: drop del trigger, de las dos funciones, de la tabla y del índice.
begin;

create index if not exists media_privadas_ruta_sin_variantes_idx on media (created_at)
  where private and var_at is null and status in ('visible', 'review') and purged_at is null and url ~ '^privado/[amer]/';

create table if not exists media_cifras_cache (
  k               text primary key check (k in ('pub', 'priv')),
  total           integer not null check (total >= 0),
  convertidas     integer not null check (convertidas >= 0),
  pendientes      integer not null check (pendientes >= 0),
  sin_maestra     integer not null check (sin_maestra >= 0),
  bytes_maestras  bigint not null check (bytes_maestras >= 0),
  bytes_variantes bigint not null check (bytes_variantes >= 0),
  m640            bigint not null check (m640 >= 0),
  v640            bigint not null check (v640 >= 0),
  refreshed_at    timestamptz not null default now()
);

create or replace function fotos_cifras_no_editables() returns trigger language plpgsql as $$
begin
  if coalesce(current_setting('tl.fotos_cifras', true), '') <> 'on' then
    raise exception 'derivado_no_editable: las cifras de fotos las escribe solo la base (fotos_cifras_contar)';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
drop trigger if exists media_cifras_cache_no_editable on media_cifras_cache;
create trigger media_cifras_cache_no_editable before insert or update or delete on media_cifras_cache for each row execute function fotos_cifras_no_editables();

-- Los universos, los mismos de antes: públicas = las de nuestro almacén que se ven, una por archivo (la fila con el id del nombre); privadas = las
-- de destino privado (/api/medios/privada/) y, desde aquí, las de las otras rutas (privado/m|a|e|r/). Las sumas, por posición (como mucho 4).
create or replace function fotos_cifras_contar() returns integer language plpgsql as $$
declare a record; p record;
begin
  -- Las públicas: la misma consulta que tenía cifrasFotos (lib/fotos-variantes.ts).
  select count(*)::int as total, count(*) filter (where cardinality(var_widths) > 0)::int as convertidas, count(*) filter (where var_at is null)::int as pendientes,
         count(*) filter (where var_widths = '{}')::int as sin_maestra, coalesce(sum(bytes), 0)::bigint as bytes_maestras,
         coalesce(sum(coalesce(var_bytes[1], 0) + coalesce(var_bytes[2], 0) + coalesce(var_bytes[3], 0) + coalesce(var_bytes[4], 0)), 0)::bigint as bytes_variantes,
         coalesce(sum(bytes) filter (where cardinality(var_widths) > 0), 0)::bigint as m640,
         coalesce(sum(coalesce(var_bytes[array_position(var_widths, 640::smallint)], var_bytes[cardinality(var_bytes)])) filter (where cardinality(var_widths) > 0), 0)::bigint as v640
    into a
    from media where status = 'visible' and purged_at is null and url like '/medios/n/%.jpg' and url = '/medios/n/' || id::text || '.jpg';
  -- Las privadas: la que tenía cifrasFotosPrivadas (lib/fotos-privadas.ts) más las cuatro familias de las otras rutas.
  select count(*)::int as total, count(*) filter (where cardinality(var_widths) > 0)::int as convertidas, count(*) filter (where var_at is null)::int as pendientes,
         count(*) filter (where var_widths = '{}')::int as sin_maestra, coalesce(sum(bytes), 0)::bigint as bytes_maestras,
         coalesce(sum(coalesce(var_bytes[1], 0) + coalesce(var_bytes[2], 0) + coalesce(var_bytes[3], 0) + coalesce(var_bytes[4], 0)), 0)::bigint as bytes_variantes
    into p
    from media where private and status = 'visible' and purged_at is null and (url like '/api/medios/privada/%' or url ~ '^privado/[amer]/');
  perform set_config('tl.fotos_cifras', 'on', true);
  insert into media_cifras_cache (k, total, convertidas, pendientes, sin_maestra, bytes_maestras, bytes_variantes, m640, v640, refreshed_at)
  values ('pub', a.total, a.convertidas, a.pendientes, a.sin_maestra, a.bytes_maestras, a.bytes_variantes, a.m640, a.v640, now()),
         ('priv', p.total, p.convertidas, p.pendientes, p.sin_maestra, p.bytes_maestras, p.bytes_variantes, 0, 0, now())
  on conflict (k) do update set total = excluded.total, convertidas = excluded.convertidas, pendientes = excluded.pendientes, sin_maestra = excluded.sin_maestra,
    bytes_maestras = excluded.bytes_maestras, bytes_variantes = excluded.bytes_variantes, m640 = excluded.m640, v640 = excluded.v640, refreshed_at = excluded.refreshed_at;
  perform set_config('tl.fotos_cifras', 'off', true);
  return 2;
end $$;

-- El barrido (lib/barrido.ts, tarea fotosCifras) la llama cada minuto: rehace solo si lo guardado tiene más de 10 minutos.
create or replace function fotos_cifras_al_dia() returns integer language plpgsql as $$
begin
  if (select count(*) from media_cifras_cache where refreshed_at > now() - interval '10 minutes') = 2 then return 0; end if;
  return fotos_cifras_contar();
end $$;

-- Sin llenarla aquí: el recuento recorre media y alargaría el candado del índice. La llena el barrido en su primera vuelta (o la primera carga
-- de la pantalla, si llega antes: lib/fotos-variantes.ts cifrasGuardadas).

commit;
