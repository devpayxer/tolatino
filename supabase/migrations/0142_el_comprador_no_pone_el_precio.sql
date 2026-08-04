-- 0142_el_comprador_no_pone_el_precio.sql
-- Auditoría de Negocios (2026-08-04) · clase «dinero», hallazgo 1.
-- Idempotente. Aplicar: pegar en el SQL Editor de Supabase y darle a Run.
--
-- EL PROBLEMA, comprobado con un ataque real (no leyendo el código):
-- como comprador autenticado, con la llave publicable, se podía hacer
--
--   insert into business_orders (business_id, user_id, items, total, status)
--   values (<negocio ajeno>, yo, '[{"name":"Plato caro","qty":3,"price":45}]', 0.01, 'new');
--
-- y quedaba ACEPTADO: tres platos de $45 registrados como UN CENTAVO. Lo mismo
-- con `business_bookings.total` («Cobra en sitio $X»). Es el peor tipo de fallo
-- para esta app: el negocio prepara la comida y el cliente enseña la pantalla.
--
-- POR QUÉ PASABA: el pedido pagado CON TARJETA sí se precia en el servidor
-- (`marketplace-checkout` recalcula desde `business_items`), pero el pedido EN
-- EFECTIVO lo insertaba el navegador con el total que él dijera. Y el navegador
-- tenía DOS constructores de líneas: el de tarjeta mandaba `id` y las opciones
-- elegidas, el de efectivo los tiraba — justo lo que haría falta para recalcular.
--
-- EL ARREGLO (dos partes; esta es la de la base):
--   · Cliente + función: el pedido en efectivo pasa por la MISMA función que el
--     de tarjeta, que lo precia desde el catálogo y lo inserta con el rol de
--     servicio. Una sola implementación de precios: dos copias a mano se separan
--     (lección de las notificaciones, 2026-08-03).
--   · Aquí: se cierra la puerta directa. El comprador ya no puede insertar la
--     fila, y si insertara una reserva, el SERVIDOR le pone el precio.

-- ════════════════════════════════════════════════════════════════════════════
-- 1 · PEDIDOS — el comprador ya no inserta la fila
-- ════════════════════════════════════════════════════════════════════════════
-- Quien inserta un pedido es ahora: el rol de servicio (la función de pago, para
-- los dos caminos: tarjeta y efectivo) o el DUEÑO del negocio (mostrador).
drop policy if exists "insert business_orders" on public.business_orders;
create policy "insert business_orders" on public.business_orders
  for insert to authenticated
  with check (
    exists (select 1 from public.businesses b
             where b.id = business_orders.business_id and b.owner_id = auth.uid())
  );

-- ════════════════════════════════════════════════════════════════════════════
-- 2 · RESERVAS — el precio lo pone el servidor, no quien reserva
-- ════════════════════════════════════════════════════════════════════════════
-- Aquí NO se cierra la puerta: la reserva del cliente se inserta desde el
-- navegador a propósito (0095 le aplica la aprobación del dueño con un trigger,
-- y eso ya está comprobado). Lo que se corrige es el dinero: si quien inserta es
-- el CLIENTE, el total y el depósito se recalculan desde el catálogo del negocio
-- y se ignora lo que mandó. Si quien inserta es el DUEÑO (agenda del panel, un
-- walk-in), sus números se respetan: es su negocio y su precio.
create or replace function public.tg_booking_price_guard() returns trigger
language plpgsql security definer set search_path = public as $fn$
declare
  es_duenio  boolean;
  v_precio   numeric;
  v_por_pers boolean;
  v_cfg      jsonb;
  v_extras   numeric := 0;
  v_total    numeric;
begin
  -- Sin sesión (rol de servicio, seeds, funciones internas) no se toca nada.
  if auth.uid() is null then return new; end if;

  select exists (select 1 from public.businesses b
                  where b.id = new.business_id and b.owner_id = auth.uid())
    into es_duenio;
  if es_duenio then return new; end if;

  -- Un depósito lo decide el negocio, nunca quien reserva.
  new.deposit := null;

  if new.service_id is null then
    -- Sin servicio del catálogo no hay precio que verificar: no se inventa uno.
    new.total := null;
    return new;
  end if;

  select i.price,
         coalesce((i.attrs->>'perPerson')::boolean, false),
         b.service_config
    into v_precio, v_por_pers, v_cfg
    from public.business_items i
    join public.businesses b on b.id = i.business_id
   where i.id = new.service_id and i.business_id = new.business_id;

  if v_precio is null then
    new.total := null;
    return new;
  end if;

  -- Los complementos se suman por su precio EN LA BASE, y solo los que el
  -- negocio ofrece de verdad. Lo que venga en `addons` es una etiqueta para
  -- enseñar, no una cifra en la que confiar.
  if jsonb_typeof(new.addons) = 'array' then
    select coalesce(sum((c->>'price')::numeric), 0) into v_extras
      from jsonb_array_elements(coalesce(v_cfg->'addons', '[]'::jsonb)) c
     where exists (
       select 1 from jsonb_array_elements(new.addons) a
        where coalesce(a->>'n', '') = coalesce(c->>'name', '__nada__')
     );
  end if;

  v_total := case when v_por_pers then v_precio * greatest(1, coalesce(new.party_size, 1))
                  else v_precio end + coalesce(v_extras, 0);
  new.total := round(v_total, 2);
  return new;
end $fn$;

drop trigger if exists booking_price_guard on public.business_bookings;
-- Se llama `a_…` para correr ANTES que `booking_apply_mode` (los triggers van en
-- orden alfabético): primero el precio, después el estado.
drop trigger if exists a_booking_price_guard on public.business_bookings;
create trigger a_booking_price_guard
  before insert on public.business_bookings
  for each row execute function public.tg_booking_price_guard();

-- ════════════════════════════════════════════════════════════════════════════
-- 3 · GUARDIÁN — que no vuelva a abrirse la puerta
-- ════════════════════════════════════════════════════════════════════════════
-- Devuelve una fila por cada tabla de DINERO donde un usuario cualquiera pueda
-- insertar sin ser el dueño del negocio. Debe salir vacío.
create or replace function public.auditar_precio_del_comprador()
returns table (tabla text, politica text, motivo text)
language sql stable security definer set search_path = public as $fn$
  select p.tablename::text, p.policyname::text,
         'un comprador puede insertar una fila con dinero sin ser el dueño'
    from pg_policies p
   where p.schemaname = 'public'
     and p.tablename in ('business_orders', 'business_rental_orders', 'event_tickets')
     and p.cmd in ('INSERT', 'ALL')
     and coalesce(p.with_check, p.qual, '') not like '%owner_id = auth.uid()%'
     and coalesce(p.with_check, p.qual, '') not like '%owner_id%';
$fn$;
revoke execute on function public.auditar_precio_del_comprador() from public, anon, authenticated;

notify pgrst, 'reload schema';
