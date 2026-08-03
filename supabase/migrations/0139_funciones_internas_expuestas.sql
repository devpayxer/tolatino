-- 0139_funciones_internas_expuestas.sql — 2ª auditoría de Comunidad (2026-08-03).
--
-- ════════════════════════════════════════════════════════════════════════════
-- A · CUATRO FUNCIONES INTERNAS ESTABAN PUBLICADAS COMO API PÚBLICA
-- ════════════════════════════════════════════════════════════════════════════
-- LA TRAMPA. En PostgreSQL, una función nueva es ejecutable por PUBLIC salvo que
-- se diga lo contrario. Y PostgREST publica automáticamente en `/rest/v1/rpc/…`
-- todo lo que haya en el esquema `public`. O sea: crear un ayudante interno en
-- `public` lo convierte, sin pedirlo, en un endpoint abierto a internet. Si
-- además es SECURITY DEFINER, corre con los privilegios del dueño.
--
-- Estas cuatro no comprobaban NADA sobre quién llamaba:
--
--   notify_once        (0136, mía) · notify_user        (0089)
--   set_market_rate    (bienes raíces) · set_rental_deposit (rentas)
--
-- LO QUE PERMITÍAN, verificado ejecutándolo con la llave publicable —la que va
-- dentro del JavaScript del sitio, o sea que la tiene cualquiera— y SIN cuenta:
--   · Meter una alerta falsa en la campana de cualquier usuario, eligiendo el
--     remitente, el texto y el ENLACE. Como el panel de notificaciones navega a
--     ese enlace al tocarlo, es una redirección abierta envuelta en nuestra
--     marca: «Mensaje de Soporte To'Latino → confirme su tarjeta».
--     Y como `notifications` reparte a Web Push, saldría también al teléfono.
--   · Escribir las tasas hipotecarias que la sección de Bienes Raíces enseña.
--   · Cambiar el estado del DEPÓSITO de una renta (retenido / capturado /
--     devuelto) — dinero.
--
-- POR QUÉ NO SE VIO ANTES. Las auditorías anteriores miraron las políticas RLS
-- de las TABLAS, que estaban bien. El agujero no estaba en las tablas: estaba en
-- que una función con privilegios las esquivaba por diseño.
--
-- Los 57 RPCs de `admin_*` NO tienen este problema: todos llaman a
-- `_require_admin(...)` en su primera línea. Y `notify_waitlist` exige sesión.
-- Comprobado uno a uno.

-- Nadie desde el navegador. Las llaman disparadores y otras funciones SECURITY
-- DEFINER (que corren como el dueño y no necesitan permiso), y las Edge
-- Functions con la clave de servicio — verificado quién las usa:
--   set_market_rate    → función `fred-rates`     (clave de servicio)
--   set_rental_deposit → `stripe-webhook`, `rental-deposit` (clave de servicio)
--   notify_user        → `stripe-webhook`, `refund-purchase` (clave de servicio)
--   notify_once        → solo los disparadores de 0136
revoke execute on function public.notify_once(uuid, text, jsonb, text, uuid, text) from public, anon, authenticated;
revoke execute on function public.notify_user(uuid, text, jsonb, text)             from public, anon, authenticated;
revoke execute on function public.set_market_rate(integer, numeric, date, text)    from public, anon, authenticated;
revoke execute on function public.set_rental_deposit(uuid, text, text, numeric)    from public, anon, authenticated;

-- Explícito, para que se vea que es a propósito y no un resto del `revoke`.
grant execute on function public.notify_user(uuid, text, jsonb, text)          to service_role;
grant execute on function public.set_market_rate(integer, numeric, date, text) to service_role;
grant execute on function public.set_rental_deposit(uuid, text, text, numeric) to service_role;

-- ════════════════════════════════════════════════════════════════════════════
-- B · EL GUARDIÁN, para que la clase no vuelva
-- ════════════════════════════════════════════════════════════════════════════
-- Un arreglo puntual no sirve de nada si mañana alguien crea otro ayudante en
-- `public`. Esta función lista, en una consulta, TODA función con privilegios
-- que esté abierta a internet y no compruebe quién llama. Se ejecuta antes de
-- lanzar y cada vez que se añadan RPCs:
--     select * from public.auditar_funciones_expuestas();
-- Lo correcto es que devuelva CERO filas.
create or replace function public.auditar_funciones_expuestas()
returns table (funcion text, argumentos text, motivo text)
language sql
stable
security definer
set search_path to 'public'
as $fn$
  select p.proname::text,
         pg_get_function_arguments(p.oid),
         case when p.proconfig is null or not exists (
                select 1 from unnest(p.proconfig) c where c like 'search_path=%')
              then 'SECURITY DEFINER sin search_path fijo (secuestrable por esquema)'
              else 'ESCRIBE, corre con privilegios, y cualquiera desde el navegador puede llamarla'
         end
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.prosecdef                                   -- corre con privilegios ajenos
     and p.prorettype <> 'trigger'::regtype            -- los disparadores no se llaman por HTTP
     -- VOLÁTIL = puede escribir. Una lectura pública (stable) con privilegios es un
     -- patrón legítimo — el catálogo de negocios lo usa por diseño. Lo peligroso es
     -- que ESCRIBA sin preguntar quién llama.
     and p.provolatile = 'v'
     -- Alcanzable desde el navegador: o el ACL es nulo (por defecto PostgreSQL da
     -- EXECUTE a PUBLIC), o hay una entrada para PUBLIC (empieza por '='), o para
     -- anon/authenticated, que son los roles de la llave que va en el JavaScript.
     -- OJO: no vale buscar '=X/' a secas — eso casa también con 'postgres=X/postgres'.
     and (p.proacl is null
          or exists (select 1 from unnest(p.proacl) a
                      where a::text like '=%' or a::text like 'anon=%' or a::text like 'authenticated=%'))
     -- Sin ninguna comprobación de quién llama, en ninguna de sus formas conocidas.
     and p.prosrc !~ '_require_admin|is_admin|auth\.uid\(\)|current_user|service_role'
   order by 1;
$fn$;

revoke execute on function public.auditar_funciones_expuestas() from public, anon, authenticated;

comment on function public.auditar_funciones_expuestas() is
  'Guardián de la 2ª auditoría (0139): funciones con privilegios abiertas a internet sin control. Debe devolver 0 filas.';

-- ════════════════════════════════════════════════════════════════════════════
-- C · LA SUPLANTACIÓN QUE 0135 NO CERRÓ DEL TODO
-- ════════════════════════════════════════════════════════════════════════════
-- El normalizador de 0135 sobreescribía la identidad SOLO `if p is not null`, es
-- decir, solo si quien escribe tiene fila en `profiles`. Pero `posts.author_id`
-- apunta a `auth.users`, NO a `profiles`, y la fila del perfil la crea la app
-- desde el navegador — no hay ningún disparador que la garantice.
--
-- Resultado, verificado ejecutándolo: alguien que valida su código y NO termina
-- el alta —o que va directo a la API— publica firmando como quiera. Es
-- exactamente el ataque «ALCALDÍA DE HAZLETON» que 0135 decía haber cerrado; los
-- contadores sí se normalizaban, la identidad no.
--
-- Ahora se sobreescribe SIEMPRE. Sin perfil, se firma como «Vecino»: es la
-- verdad —esa persona no ha puesto nombre— y no la elige el cliente.
create or replace function public.tg_posts_normalize_ins()
returns trigger
language plpgsql
set search_path to 'public'
as $fn$
declare p record;
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;

  select display_name, initials, avatar_color into p
    from public.profiles where id = new.author_id;

  -- SIEMPRE, haya perfil o no. `coalesce` cubre el caso sin fila (todo nulo).
  new.author_name     := coalesce(nullif(btrim(p.display_name), ''), 'Vecino');
  new.author_initials := coalesce(nullif(btrim(p.initials), ''), 'V');
  new.author_color    := coalesce(p.avatar_color, '#7B61FF');

  new.recommends      := 0;
  new.hidden          := false;
  new.hidden_reason   := null;
  new.hidden_by       := null;
  new.hidden_at       := null;
  new.featured        := false;
  new.featured_at     := null;
  new.featured_by     := null;
  new.pinned          := false;
  new.pinned_at       := null;
  new.endorsement_id  := null;
  new.created_at      := now();

  if new.poll_options is not null then
    new.poll_votes := (select coalesce(jsonb_agg(0), '[]'::jsonb) from jsonb_array_elements(new.poll_options));
  else
    new.poll_votes := null;
  end if;

  new.business_id     := null;
  new.business_name   := null;
  new.business_rating := null;
  return new;
end $fn$;

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
  new.author_name     := coalesce(nullif(btrim(p.display_name), ''), 'Vecino');
  new.author_initials := coalesce(nullif(btrim(p.initials), ''), 'V');
  new.author_color    := coalesce(p.avatar_color, '#7B61FF');
  new.like_count  := 0;
  new.created_at  := now();
  new.biz_id      := null;
  new.biz_name    := null;
  new.biz_rating  := null;
  return new;
end $fn$;

notify pgrst, 'reload schema';

-- ════════════════════════════════════════════════════════════════════════════
-- D · LO QUE APARECIÓ AL PASAR EL GUARDIÁN: FUNCIONES DE DINERO ABIERTAS
-- ════════════════════════════════════════════════════════════════════════════
-- El guardián de la sección B, en su primera ejecución, destapó algo bastante
-- peor que el motivo por el que se escribió — y fuera de Comunidad.
--
-- Estas funciones cumplen pedidos, emiten boletos, marcan pagos y activan planes
-- de suscripción. Las llama el webhook de Stripe DESPUÉS de cobrar. Pero estaban
-- concedidas a `anon` y `authenticated`, o sea alcanzables por HTTP con la llave
-- publicable que va dentro del JavaScript del sitio.
--
-- VERIFICADO EJECUTÁNDOLO contra pruebas, sin cuenta y sin sesión:
--   POST /rest/v1/rpc/apply_subscription  → HTTP 409, error 23503 (clave foránea)
--   POST /rest/v1/rpc/mark_payment        → HTTP 409, error 23503 (clave foránea)
-- Lo único que las paró fue que usé un id de negocio inventado: el error es de
-- INTEGRIDAD, no de permisos. Con el id de un negocio real —que es público, sale
-- en cualquier ficha— habrían entrado. Es decir: activarse el plan Premium
-- gratis, dejar un pago marcado como pagado, emitir boletos sin comprarlos.
--
-- Comprobado quién las llama de verdad: NINGUNA se usa desde el navegador. Solo
-- desde las Edge Functions stripe-webhook / marketplace-checkout / connect-* /
-- refund-purchase, todas con la clave de servicio, que no pasa por estos GRANTs.
revoke execute on function public.apply_subscription(uuid, text, text, text, text, timestamptz) from public, anon, authenticated;
revoke execute on function public.mark_payment(uuid, uuid, text, text, text, text, integer, integer, text) from public, anon, authenticated;
revoke execute on function public.fulfill_order(uuid, uuid, jsonb, numeric, text, jsonb) from public, anon, authenticated;
revoke execute on function public.apply_connect_status(uuid, text, boolean, boolean) from public, anon, authenticated;

-- Las de boletos, reservas y rentas: se revocan por firma completa, sacada del
-- catálogo, para no dejarse ninguna sobrecarga fuera.
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure::text as firma
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('_issue_tickets_multi','fulfill_event_tickets_multi','fulfill_rental',
                         'fulfill_booking','fulfill_rental_order','resolve_event_addons')
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.firma);
  end loop;
end $$;

-- Los contadores de vistas (bump_update_views, track_property_view,
-- track_vehicle_view) SÍ se llaman desde el navegador: son parte del producto y
-- se quedan. Que alguien pueda inflar un contador de vistas ya está anotado en
-- LAUNCH-CHECKLIST (L1, inflación de métricas por anónimos) y no es de esta clase.

notify pgrst, 'reload schema';
