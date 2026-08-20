-- 0156_abrir_paso_a_extensions_antes_de_mover_postgis.sql
-- Idempotente. Aplicar: pegar en el SQL Editor de Supabase y darle a Run.
--
-- DE DÓNDE SALE: el soporte de Supabase respondió al ticket de
-- `spatial_ref_sys` (2026-08-16) y se ofreció a MOVER PostGIS del esquema
-- `public` al esquema `extensions`. El diagnóstico de ellos es correcto y el
-- problema es real — se comprobó en la base de producción:
--
--     anon puede SELECT  → true
--     anon puede DELETE  → true      ← cualquiera con la llave pública
--     anon puede INSERT  → true         puede vaciar 8.500 filas
--
-- Y esa llave viaja en el paquete del navegador por diseño. Es decir: hoy
-- cualquiera puede borrar `spatial_ref_sys` y tumbar TODA la geolocalización.
--
-- ════════════════════════════════════════════════════════════════════════════
-- PERO SI LO MUEVEN HOY, LA APP SE ROMPE ENTERA. ESTA MIGRACIÓN LO EVITA.
-- ════════════════════════════════════════════════════════════════════════════
-- Medido en producción antes de escribir esto:
--   · 89 funciones nuestras usan PostGIS (st_dwithin, st_x, st_makepoint…)
--   · 226 funciones llevan `search_path` FIJADO y NINGUNA incluye `extensions`
--     (la 0147 las fijó a `public` como refuerzo de seguridad — bien hecho
--      entonces, y justo lo que ahora las vuelve frágiles)
--
-- El cuerpo de una función `AS $$ … $$` se resuelve CADA VEZ que se ejecuta,
-- usando su `search_path`. Si PostGIS deja de estar en `public` y `extensions`
-- no está en el camino, `st_dwithin` deja de existir para esas funciones:
-- «negocios cerca de ti», el mapa, el radio de entrega y la búsqueda por
-- distancia dejan de funcionar de golpe.
--
-- Lo que NO se rompe, y por eso no hace falta tocarlo:
--   · las 8 columnas `geography`/`geometry` → guardan el OID del tipo
--   · los 6 índices GIST                    → guardan el OID de la clase
--   · las 2 vistas que usan PostGIS         → se enlazan al crearse, por OID
-- Solo los CUERPOS de función se resuelven por nombre. Ese es todo el peligro.
--
-- QUÉ HACE ESTA MIGRACIÓN: añade `extensions` al camino de cada función NUESTRA
-- (las de las extensiones no se tocan). HOY es inofensiva: PostGIS sigue en
-- `public`, que va primero en el camino, así que se resuelve igual que siempre
-- y nada cambia de comportamiento. El día que lo muevan, es lo único que evita
-- la caída.
--
-- ORDEN CORRECTO, y no se puede alterar:
--   1. Aplicar ESTA migración en PRUEBAS y en PRODUCCIÓN.
--   2. Pedir a Supabase que mueva PostGIS **primero en el proyecto de
--      PRUEBAS** (zpkaxojonufdwgahiqjh).
--   3. Verificar allí la geolocalización de punta a punta.
--   4. Solo entonces, pedirlo en PRODUCCIÓN (vurqsebgsacickxsxfeh).

do $$
declare
  f record;
  camino text;
begin
  for f in
    select p.oid,
           n.nspname as esquema,
           p.proname as nombre,
           pg_get_function_identity_arguments(p.oid) as args,
           p.proconfig
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      -- `deptype='e'` = la función PERTENECE a una extensión. Esas son suyas,
      -- no nuestras, y tocarlas sería pisar lo que la extensión gestiona.
      left join pg_depend d on d.objid = p.oid and d.deptype = 'e'
     where n.nspname = 'public'
       and d.objid is null
  loop
    -- ¿Ya tiene `extensions` en su camino? Entonces nada que hacer (esto es lo
    -- que hace la migración repetible sin efectos).
    if f.proconfig is not null
       and exists (select 1 from unnest(f.proconfig) c
                    where c like 'search_path=%' and c like '%extensions%') then
      continue;
    end if;

    -- Se conserva `pg_temp` al final cuando ya estaba: quitarlo cambiaría el
    -- comportamiento de seguridad que fijó la 0147.
    if f.proconfig is not null
       and exists (select 1 from unnest(f.proconfig) c
                    where c like 'search_path=%' and c like '%pg_temp%') then
      camino := 'public, extensions, pg_temp';
    else
      camino := 'public, extensions';
    end if;

    execute format('alter function %I.%I(%s) set search_path = %s',
                   f.esquema, f.nombre, f.args, camino);
  end loop;
end $$;

-- Comprobación: después de esto, NINGUNA función nuestra debe quedar con un
-- `search_path` fijado que no incluya `extensions`.
do $$
declare n int;
begin
  select count(*) into n
    from pg_proc p
    join pg_namespace n2 on n2.oid = p.pronamespace
    left join pg_depend d on d.objid = p.oid and d.deptype = 'e'
   where n2.nspname = 'public'
     and d.objid is null
     and p.proconfig is not null
     and exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%')
     and not exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%' and c like '%extensions%');
  if n > 0 then
    raise exception 'Quedan % funciones sin `extensions` en su camino — NO pedir el traslado de PostGIS', n;
  end if;
  raise notice 'Todas las funciones propias admiten ya PostGIS fuera de public.';
end $$;

notify pgrst, 'reload schema';
