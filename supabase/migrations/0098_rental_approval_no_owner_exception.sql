-- 0098 · Renta: el estatus de una orden creada desde la superficie del CLIENTE
-- se deriva SIEMPRE de la configuración del negocio (rental_config.autoConfirm)
-- — sin excepciones por rol.
--
-- Bug (2026-07-16): create_rental_order (0097) traía una excepción "walk-in"
-- que confirmaba directo cualquier orden creada por el DUEÑO del negocio,
-- aunque el negocio requiriera aprobación. El founder, probando su propio
-- negocio (b@b.com) desde la app de cliente, veía la renta "confirmada" al
-- instante — mismo patrón que ya corregimos en Servicios (0095). La diferencia:
-- en Servicios la excepción del dueño existe SOLO para el walk-in del panel
-- (la agenda inserta citas ya confirmadas y el trigger no las toca); el panel
-- de Renta NO tiene walk-ins que pasen por este RPC, así que aquí ninguna
-- excepción aplica.
--
-- También: el dueño ahora recibe la notificación rental_new SIEMPRE — incluidas
-- órdenes creadas por él mismo al probar — para que una solicitud pendiente
-- nunca pase desapercibida en el panel.
--
-- fulfill_rental_order (service_role, pago en línea) no cambia: una orden
-- pagada queda confirmada por definición.
-- Idempotente (create or replace). Vanilla Postgres — portable a self-hosted.

create or replace function public.create_rental_order(
  in_slug text,
  in_start_at timestamptz,
  in_end_at timestamptz,
  in_lines jsonb,
  in_extras jsonb default '[]'::jsonb,
  in_notes text default null
) returns uuid
language plpgsql security definer set search_path = public as $fn$
declare
  v_biz uuid; v_owner uuid; v_auto boolean; v_name text;
  v_fee numeric := 0; v_dep numeric := 0; v_extra numeric := 0;
  v_status text; v_order uuid; ln jsonb;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  if in_lines is null or jsonb_array_length(in_lines) = 0 then raise exception 'empty cart'; end if;
  select id, owner_id, (rental_config->>'autoConfirm')::boolean
    into v_biz, v_owner, v_auto
    from public.businesses where slug = in_slug limit 1;
  if v_biz is null then raise exception 'business not found'; end if;

  select coalesce(sum(greatest((l->>'fee')::numeric, 0)), 0),
         coalesce(sum(greatest((l->>'deposit')::numeric, 0)), 0)
    into v_fee, v_dep
    from jsonb_array_elements(in_lines) l;
  select coalesce(sum(greatest((e->>'price')::numeric, 0)), 0) into v_extra
    from jsonb_array_elements(coalesce(in_extras, '[]')) e;
  v_fee := least(v_fee + v_extra, 1000000);
  v_dep := least(v_dep, 1000000);

  select coalesce(nullif(btrim(display_name), ''), 'Cliente') into v_name
    from public.profiles where id = auth.uid();
  v_name := coalesce(v_name, 'Cliente');

  -- Regla canónica: el estatus sale del modo de aprobación del negocio, para
  -- TODO el que ordene desde la app — dueño incluido. (0097 confirmaba directo
  -- si el creador era el dueño: eliminado.)
  v_status := case when coalesce(v_auto, false) then 'confirmed' else 'pending' end;

  insert into public.business_rental_orders
    (business_id, user_id, customer_name, start_at, end_at, status, fee_total, deposit_total, extras, notes)
  values (v_biz, auth.uid(), v_name, in_start_at, in_end_at, v_status, v_fee, v_dep,
          nullif(in_extras, '[]'::jsonb), nullif(btrim(in_notes), ''))
  returning id into v_order;

  for ln in select * from jsonb_array_elements(in_lines) loop
    insert into public.business_rentals
      (order_id, business_id, user_id, customer_name, item_name, item_id, start_at, end_at, qty, total, deposit, status)
    values (v_order, v_biz, auth.uid(), v_name,
            coalesce(ln->>'item_name', 'Artículo'),
            nullif(ln->>'item_id','')::uuid,
            in_start_at, in_end_at,
            greatest(coalesce((ln->>'qty')::int, 1), 1),
            greatest(coalesce((ln->>'fee')::numeric, 0), 0),
            greatest(coalesce((ln->>'deposit')::numeric, 0), 0),
            v_status);
  end loop;

  -- Avisar al dueño con las líneas ya insertadas — siempre, también en sus
  -- propias pruebas, para que la solicitud no quede invisible.
  if v_owner is not null then
    perform public.notify_user(v_owner, 'rental_new',
      jsonb_build_object('item', coalesce(in_lines->0->>'item_name', 'Renta'),
                         'name', v_name, 'count', jsonb_array_length(in_lines),
                         'status', v_status), '/negocio');
  end if;
  return v_order;
end $fn$;
