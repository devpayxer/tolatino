-- 0157_respaldo_de_spatial_ref_sys.sql
-- Idempotente. Aplicar: pegar en el SQL Editor de Supabase y darle a Run.
--
-- ════════════════════════════════════════════════════════════════════════════
-- POR QUÉ EXISTE: no podemos cerrar el agujero, pero sí podemos sobrevivirlo.
-- ════════════════════════════════════════════════════════════════════════════
-- El aviso automático de seguridad de Supabase (23-08-2026) señala
-- `public.spatial_ref_sys` como «tabla accesible públicamente». Es correcto y
-- ya está en su ticket abierto desde el 16-08. Lo que se midió al recibir el
-- aviso, en las DOS bases:
--
--   dueño de la tabla ......... supabase_admin   (nosotros somos `postgres`)
--   pertenece a la extensión .. sí, a PostGIS
--   permisos de `anon` ........ SELECT, INSERT, UPDATE, DELETE, TRUNCATE
--   quién los concedió ........ supabase_admin, sin opción de re-conceder
--   funciones nuestras que la tocan ... 0 de 228
--
-- Y lo más importante, PROBADO, no supuesto:
--
--   · `revoke insert,update,delete … from anon` → NO da error y NO hace nada.
--     Los permisos los concedió `supabase_admin`; solo quien concede revoca.
--   · `alter table … enable row level security` → ERROR 42501:
--     «must be owner of table spatial_ref_sys».
--
-- O sea: **el botón «Resolve issue» del correo tampoco puede arreglarlo**, y
-- si por alguna vía se activara RLS sin políticas, PostGIS dejaría de resolver
-- los sistemas de coordenadas y se caería la geolocalización entera. El arreglo
-- de verdad es el que Supabase ya ofreció (mover PostGIS a `extensions`), lo
-- hacen ellos, y la 0156 dejó la app preparada para que no se rompa al hacerlo.
--
-- MIENTRAS TANTO, EL RIESGO SIGUE VIVO: cualquiera con la llave pública —que
-- viaja en el paquete del navegador por diseño— puede vaciar esas 8.500 filas
-- y tumbar «negocios cerca de ti», el mapa y el radio de entrega.
--
-- Esto no lo impide. Lo que hace es que **volver a levantarlo cueste segundos
-- en vez de horas**: una copia en una tabla NUESTRA (con RLS y sin permisos
-- para nadie) y una función que restaura lo que falte. Comprobado que podemos:
-- `postgres` conserva INSERT sobre `spatial_ref_sys`.

-- ── 1 · la copia, en una tabla que sí controlamos ───────────────────────────
create table if not exists public.srs_respaldo (
  srid      integer primary key,
  auth_name varchar(256),
  auth_srid integer,
  srtext    varchar(2048),
  proj4text varchar(2048)
);

comment on table public.srs_respaldo is
  'Copia de public.spatial_ref_sys (PostGIS). Existe porque esa tabla es '
  'escribible por `anon` y no podemos revocarlo: no somos su dueño. Si alguien '
  'la vacía, `restaurar_srs()` la repone. Ver migración 0157.';

-- Se rellena/refresca en cada ejecución, así que la migración se puede repetir
-- y además sirve para actualizar la copia si PostGIS se actualiza.
insert into public.srs_respaldo (srid, auth_name, auth_srid, srtext, proj4text)
select srid, auth_name, auth_srid, srtext, proj4text from public.spatial_ref_sys
on conflict (srid) do update
   set auth_name = excluded.auth_name,
       auth_srid = excluded.auth_srid,
       srtext    = excluded.srtext,
       proj4text = excluded.proj4text;

-- ── 2 · cerrada a cal y canto ───────────────────────────────────────────────
-- Ésta SÍ es nuestra, así que aquí RLS sí se puede activar. Sin políticas =
-- nadie pasa; el dueño (`postgres`) la sigue leyendo, que es lo único que hace
-- falta para restaurar.
alter table public.srs_respaldo enable row level security;
revoke all on table public.srs_respaldo from anon, authenticated;

-- ── 3 · la restauración ─────────────────────────────────────────────────────
-- `security definer` para que corra con los permisos de `postgres` (que sí
-- puede insertar en `spatial_ref_sys`) y no con los de quien la llame.
-- `search_path` fijado con `extensions` incluido, como manda la 0156.
create or replace function public.restaurar_srs()
returns table (repuestas integer, total_ahora integer)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare n integer;
begin
  insert into public.spatial_ref_sys (srid, auth_name, auth_srid, srtext, proj4text)
  select b.srid, b.auth_name, b.auth_srid, b.srtext, b.proj4text
    from public.srs_respaldo b
   where not exists (select 1 from public.spatial_ref_sys s where s.srid = b.srid);
  get diagnostics n = row_count;
  return query select n, (select count(*)::integer from public.spatial_ref_sys);
end $$;

comment on function public.restaurar_srs() is
  'Repone en spatial_ref_sys las filas que falten, desde srs_respaldo. Se '
  'ejecuta si alguien vacía la tabla (ver 0157). Devuelve cuántas repuso.';

-- NADIE la puede llamar desde el navegador: es una operación de rescate, se
-- ejecuta desde el SQL Editor.
revoke all on function public.restaurar_srs() from public, anon, authenticated;

-- ── 4 · comprobación ────────────────────────────────────────────────────────
do $$
declare copia integer; viva integer;
begin
  select count(*) into copia from public.srs_respaldo;
  select count(*) into viva  from public.spatial_ref_sys;
  if copia < viva then
    raise exception 'La copia tiene % filas y la tabla viva %. No se guardó entera.', copia, viva;
  end if;
  raise notice 'Copia de seguridad al día: % filas guardadas (la tabla viva tiene %).', copia, viva;
end $$;

notify pgrst, 'reload schema';
