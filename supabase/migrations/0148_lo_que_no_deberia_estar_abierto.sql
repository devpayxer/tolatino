-- 0148_lo_que_no_deberia_estar_abierto.sql
-- Idempotente. Aplicar: pegar en el SQL Editor de Supabase y darle a Run.
--
-- DE DÓNDE SALE: el Security Advisor, después de arreglar las 145 políticas de
-- 0147, seguía marcando 356 avisos de OTRAS tres clases. Se comprobó cada una
-- contra PRODUCCIÓN (`vurqsebgsacickxsxfeh`), con la llave publicable —la que va
-- dentro del JavaScript del sitio, o sea que la tiene cualquiera— y SIN cuenta.
--
-- ════════════════════════════════════════════════════════════════════════════
-- LA TRAMPA DE FONDO, otra vez la de 0139
-- ════════════════════════════════════════════════════════════════════════════
-- En PostgreSQL una función nueva la puede ejecutar PUBLIC salvo que se diga lo
-- contrario, y PostgREST publica en `/rest/v1/rpc/…` todo lo que viva en el
-- esquema `public`. Crear algo en `public` lo abre a internet sin pedirlo.
--
-- En 0139 se tapó el agujero de CUATRO funciones concretas que no comprobaban
-- nada. Esto es la otra mitad del mismo problema, la que aquella vez no se
-- barrió: no *qué* funciones fallan, sino **cuáles no tendrían por qué estar
-- alcanzables desde fuera, aunque hoy aguanten**.
--
-- Lo que sí se verificó antes de tocar nada (esto NO es «por si acaso»):
--
--   · Las 56 `admin_*` AGUANTAN. Llamadas sin sesión devuelven
--     `401 · 42501 · auth required`, una por una. Y estáticamente: ninguna
--     escribe antes de llamar a `_require_admin` (se comparó la posición del
--     guard con la del primer `insert/update/delete` en el cuerpo: cero casos).
--   · La única sin guard es `admin_whoami`, y no filtra: es un `select … where
--     a.user_id = auth.uid()`, así que sin sesión `auth.uid()` es NULL y
--     devuelve `[]`. Comprobado por HTTP: `200 []`.
--
-- O sea que hoy no hay fuga. Lo que hay es **superficie**: 56 nombres de la
-- administración enumerables y fuzzeables desde fuera, y —lo que de verdad
-- importa— el día que alguien añada una `admin_*` nueva y se olvide del guard,
-- nace ABIERTA. Cerrar el `execute` hace que ese olvido sea inofensivo. Esa es
-- la razón, no el número del panel.
--
-- OJO CON EL REVOKE (la lección de `spatial_ref_sys`): el `acl` de estas
-- funciones es
--     {=X/postgres, postgres=X/postgres, anon=X/postgres, ...}
-- Ese `=X` de delante es PUBLIC. Revocarle solo a `anon` NO cierra nada, porque
-- el permiso le sigue llegando por PUBLIC. Hay que revocar a PUBLIC **y** al rol,
-- y volver a conceder a quien sí lo necesita. Y funciona porque aquí el que
-- concedió fue `postgres` —somos nosotros—, al revés que en `spatial_ref_sys`,
-- donde concedió `supabase_admin` y por eso el revoke se traga sin efecto.

-- ════════════════════════════════════════════════════════════════════════════
-- 1 · Los disparadores no son una API (53 funciones)
-- ════════════════════════════════════════════════════════════════════════════
-- Las `tg_*` son cuerpos de trigger: las llama la tabla al insertar o al
-- actualizar, nunca un navegador. Aun así estaban ejecutables por `anon`.
--
-- Por qué se puede quitar sin miedo: PostgreSQL comprueba el permiso de
-- EXECUTE al **crear** el trigger, no al dispararlo. El dueño (`postgres`)
-- conserva el suyo, así que los triggers siguen funcionando igual.
do $bucle$
declare f record; n int := 0;
begin
  for f in
    select p.oid::regprocedure as firma
      from pg_proc p
      join pg_namespace ns on ns.oid = p.pronamespace
     where ns.nspname = 'public'
       and p.prorettype = 'pg_catalog.trigger'::regtype
       and not exists (select 1 from pg_depend d join pg_extension e on e.oid = d.refobjid
                        where d.objid = p.oid and d.deptype = 'e')
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.firma);
    n := n + 1;
  end loop;
  raise notice 'disparadores cerrados: %', n;
end $bucle$;

-- ════════════════════════════════════════════════════════════════════════════
-- 2 · La administración no se alcanza sin sesión (56 funciones)
-- ════════════════════════════════════════════════════════════════════════════
-- `authenticated` SÍ conserva el permiso: el panel `/admin` lo usa con la sesión
-- del administrador, y quien decide de verdad sigue siendo `_require_admin`
-- dentro de cada función. Esto es una segunda puerta, no la cerradura.
do $bucle$
declare f record; n int := 0;
begin
  for f in
    select p.oid::regprocedure as firma
      from pg_proc p
      join pg_namespace ns on ns.oid = p.pronamespace
     where ns.nspname = 'public'
       and p.proname like 'admin\_%'
       and p.prokind = 'f'
  loop
    execute format('revoke execute on function %s from public, anon', f.firma);
    execute format('grant  execute on function %s to authenticated, service_role', f.firma);
    n := n + 1;
  end loop;
  raise notice 'admin_* cerradas a anon: %', n;
end $bucle$;

-- ════════════════════════════════════════════════════════════════════════════
-- 3 · `pg_net` — SE INTENTÓ Y NO SE PUEDE. Aquí no hay SQL, hay una nota.
-- ════════════════════════════════════════════════════════════════════════════
-- `net.http_post` hace peticiones HTTP **desde el servidor de la base**, y
-- `anon` puede ejecutarla. Se intentó cerrarla y el resultado hay que contarlo
-- entero, porque el fracaso es silencioso y es fácil creer que quedó hecho:
--
--   revoke execute on function net.http_post(...) from public, anon, authenticated;
--     → el acl pasa de
--         {=X/supabase_admin, supabase_admin=X/…, postgres=X/…, anon=X/…, …}
--       a
--         {=X/supabase_admin, supabase_admin=X/supabase_admin}
--       …y `has_function_privilege('anon', …, 'execute')` **sigue siendo TRUE**.
--       Se llevó por delante las concesiones explícitas, que era lo único que
--       `postgres` había podido tocar, y dejó en pie el `=X` de PUBLIC — que lo
--       concedió `supabase_admin`, así que no es nuestro para revocarlo.
--   revoke usage on schema net from public, anon, authenticated;
--     → no cambia NADA. Ni un byte del acl. La misma pared.
--
-- Es exactamente el caso de `spatial_ref_sys`: quien concedió fue
-- `supabase_admin` y un REVOKE ajeno se traga sin error y sin efecto. Va al
-- mismo ticket de soporte (`docs/ticket-supabase-spatial-ref-sys.md`).
--
-- POR QUÉ SE PUEDE LANZAR ASÍ, y no es «ya lo miraremos»:
--   · El esquema `net` NO lo publica PostgREST, así que desde el navegador no se
--     alcanza. Comprobado: `/rest/v1/rpc/http_post` no existe.
--   · La única función de `public` que menciona `net.http` es `tg_push_fanout`
--     —buscado en el cuerpo de las 175 SECURITY DEFINER, una sola coincidencia—
--     y es SECURITY DEFINER de `postgres`: corre con el permiso de su dueño, no
--     con el de quien dispara el trigger.
--   Así que hoy no hay camino desde fuera. Lo que queda es el riesgo del día que
--   alguien escriba una función en `public` que le pase texto del usuario a
--   `net.http_*` — y ese día el SSRF lo pone nuestra función, no este permiso.

-- ════════════════════════════════════════════════════════════════════════════
-- 4 · El cubo de fotos se ve, pero no se INVENTARÍA
-- ════════════════════════════════════════════════════════════════════════════
-- `post-photos` es público a propósito: las fotos de las publicaciones se ven
-- sin cuenta. El problema no es leer una foto cuya URL ya tienes — es que la
-- política de SELECT dejaba **listar el cubo entero** sin sesión. Comprobado por
-- HTTP contra producción:
--
--   POST /storage/v1/object/list/post-photos  →  200
--        [{"name":"dda5d71b-…"}]                  ← la carpeta ES el user_id
--   POST … {"prefix":"dda5d71b-…/"}          →  200, el nombre de cada archivo
--
-- O sea: un censo de qué usuarios han subido fotos y cuántas. Nadie tiene que
-- adivinar una URL; se las dan hechas.
--
-- POR QUÉ NO ROMPE LAS FOTOS: en un cubo público, `/storage/v1/object/public/…`
-- se sirve **sin pasar por RLS**. La política solo gobierna el listado y el
-- borrado. Y el sitio nunca lista: `apps/web/src/lib/image.ts` solo hace
-- `upload`, `getPublicUrl` y `remove` — buscado en todo `apps/web/src`, cero
-- llamadas a `.list(`. Aun así esto se probó primero en la base de PRUEBAS,
-- mirando que una foto siguiera cargando por su URL pública antes de tocar
-- producción.
drop policy if exists "post-photos public read" on storage.objects;
drop policy if exists "post-photos own read"    on storage.objects;

create policy "post-photos own read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'post-photos'
    and (storage.foldername(name))[1] = ( select auth.uid() )::text
  );

-- ════════════════════════════════════════════════════════════════════════════
-- 5 · Las 41 RPC que YA rechazan al visitante, ahora ni se alcanzan
-- ════════════════════════════════════════════════════════════════════════════
-- Quedaban 82 funciones SECURITY DEFINER en `public` alcanzables por `anon`.
-- No se decidió a ojo: se clasificaron por lo que hace su CUERPO y se
-- comprobaron una a una por HTTP contra la base de PRUEBAS, sin sesión.
--
--   A · 35 que ni miran quién llama → son públicas de verdad (`search_businesses`,
--       `business_by_slug`, `vehicles_search`…). NO se tocan: el catálogo, la
--       búsqueda y las fichas tienen que verse sin cuenta. Ese es el producto.
--   B · 31 que miran `auth.uid()` y ABORTAN. Las 31 devolvieron
--       `400 · P0001 · auth required` sin sesión — las 31, no una muestra. Y
--       estáticamente, en las 31 el `raise` está ANTES del primer
--       `insert/update/delete`, así que abortan sin haber tocado nada.
--   C · 16 que miran `auth.uid()` y devuelven vacío. De esas, 10 son de dueño o
--       de cuenta (`owner_*`, `my_*`, `blocked_users`, `business_metrics`,
--       `refund_ctx`, `rental_deposit_ctx`) y solo se llaman desde pantallas con
--       sesión — verificado en el código, sitio por sitio. Se cierran también.
--       Las otras 6 (`reviews_by_slug`, `endorsements_by_slug`,
--       `neighbor_profile`, `search_businesses_link`, `track_listing_view`,
--       `track_search_appearance`) usan `auth.uid()` solo para saber si TÚ ya
--       recomendaste; funcionan y deben funcionar sin cuenta. Se quedan.
--
-- O sea: B + C-privadas = 41. Para `anon` no cambia NADA observable —antes
-- recibía «auth required», ahora «permission denied»—, y para todos los demás
-- tampoco, porque `authenticated` y `service_role` conservan el permiso.
-- `refund_ctx` y `rental_deposit_ctx` las llaman las Edge Functions
-- `refund-purchase` y `rental-deposit` **bajo el JWT del dueño**, no con la
-- clave de servicio; por eso `authenticated` NO se toca.
do $bucle$
declare f record; n int := 0;
  nombres text[] := array[
    -- B · abortan sin sesión
    'book_property_tour','book_vehicle_test','business_relations_admin',
    'buy_event_tickets','buy_event_tickets_multi','cancel_event','checkin_ticket',
    'claim_add_message','create_business','create_claim','create_event',
    'create_event_full','create_property_lead','create_rental_order','create_report',
    'create_vehicle_lead','join_waitlist','leave_waitlist','notify_waitlist',
    'post_event_review','post_review','reply_to_review','request_business_relation',
    'respond_business_relation','start_conversation','toggle_comment_like',
    'toggle_endorsement','toggle_post_like','upsert_property','upsert_vehicle',
    'vote_poll',
    -- C · de dueño o de cuenta
    'blocked_users','business_metrics','my_claims','my_endorsements',
    'owner_customer_stats','owner_events_summary','owner_order_stats',
    'owner_promo_stats','refund_ctx','rental_deposit_ctx'
  ];
begin
  for f in
    select p.oid::regprocedure as firma
      from pg_proc p
      join pg_namespace ns on ns.oid = p.pronamespace
     where ns.nspname = 'public'
       and p.prokind = 'f'
       and p.proname = any (nombres)
  loop
    execute format('revoke execute on function %s from public, anon', f.firma);
    execute format('grant  execute on function %s to authenticated, service_role', f.firma);
    n := n + 1;
  end loop;
  raise notice 'RPC cerradas a anon: %', n;
end $bucle$;

notify pgrst, 'reload schema';
