-- 0149_el_indice_de_nombres_que_nadie_podia_usar.sql
-- Idempotente. Aplicar: pegar en el SQL Editor de Supabase y darle a Run.
--
-- DE DÓNDE SALE: comparando las DOS bases función por función después de aplicar
-- 0148. La huella de permisos no cuadraba, y tirando del hilo apareció algo que
-- no tenía nada que ver con los permisos:
--
--   PRODUCCIÓN → create index businesses_name_trgm_idx … (lower(tl_unaccent(name)))
--   PRUEBAS    → create index businesses_name_trgm_idx … (lower(sin_tildes(name)))
--
-- El MISMO índice, construido sobre DOS funciones distintas. Y las 8 funciones de
-- búsqueda llaman a `tl_unaccent`, no a `sin_tildes`. O sea: **en la base de
-- pruebas ese índice está muerto** — PostgreSQL solo usa un índice de expresión
-- si la consulta escribe la expresión EXACTA, así que la búsqueda difusa por
-- nombre iba a recorrer la tabla entera.
--
-- POR QUÉ PASÓ: al hacer 0144 escribí `sin_tildes` sin saber que `tl_unaccent`
-- ya existía y hacía lo mismo. Al darme cuenta borré la mía —«dos funciones que
-- hacen lo mismo acaban divergiendo»— pero el índice ya se había creado sobre
-- ella en pruebas, así que el `drop function` no pudo llevársela y se quedó
-- colgando, sujetando un índice inútil.
--
-- POR QUÉ IMPORTA MÁS DE LO QUE PARECE: con 548 negocios no se nota, así que no
-- lo habría visto probando. Pero significa que **la base donde el fundador prueba
-- no medía lo mismo que producción**. Es la trampa de siempre: un lado bien y el
-- otro mal es peor que los dos mal, porque parece arreglado.
--
-- En PRODUCCIÓN esto no cambia nada (allí el índice ya está bien y `sin_tildes`
-- no existe). Se aplica en las dos para que quede escrito que quedan iguales.

-- 1 · El índice, sobre la función que las consultas SÍ escriben.
drop index if exists public.businesses_name_trgm_idx;
create index if not exists businesses_name_trgm_idx
  on public.businesses using gin (lower(public.tl_unaccent(name)) gin_trgm_ops);

-- 2 · Fuera la duplicada. Ahora ya no la sujeta nada.
drop function if exists public.sin_tildes(text);

notify pgrst, 'reload schema';
