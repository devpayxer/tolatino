-- 0124 · Abrir un reclamo sin conocer el UUID del negocio
--
-- `create_claim` (0122) exigía `in_business`. Funciona para pedidos/reservas/
-- rentas (el cliente ya trae `business_id` en su actividad), pero NO para un
-- boleto: el boleto cuelga del evento, y el negocio dueño (`events.owner_id`)
-- nunca viaja al cliente. Sin esto, "abrir un reclamo" quedaba imposible justo
-- en la compra donde más duele que no se pueda reclamar.
--
-- Ahora `in_business` es opcional: si viene null, el servidor lo deduce de la
-- compra referenciada (`in_ref_id`). Sigue validando que la compra sea DEL QUE
-- RECLAMA — un usuario no puede abrir un reclamo sobre la compra de otro.

create or replace function public.create_claim(
  in_kind text, in_ref_id uuid, in_ref_code text, in_business uuid,
  in_reason text, in_detail text default null
) returns uuid language plpgsql security definer set search_path = public as $fn$
declare v_id uuid; v_owner uuid; v_biz uuid; v_buyer uuid;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  if in_kind not in ('orden','reserva','renta','boleto','otro') then raise exception 'tipo inválido'; end if;
  if coalesce(trim(in_reason),'') = '' then raise exception 'cuéntanos qué pasó'; end if;

  v_biz := in_business;

  -- Deduce el negocio (y de paso comprueba que la compra es tuya).
  if in_ref_id is not null then
    if in_kind = 'orden' then
      select o.business_id, o.user_id into v_biz, v_buyer from public.business_orders o where o.id = in_ref_id;
    elsif in_kind = 'reserva' then
      select b.business_id, b.user_id into v_biz, v_buyer from public.business_bookings b where b.id = in_ref_id;
    elsif in_kind = 'renta' then
      select r.business_id, r.user_id into v_biz, v_buyer from public.business_rental_orders r where r.id = in_ref_id;
    elsif in_kind = 'boleto' then
      select e.owner_id, t.user_id into v_biz, v_buyer
        from public.event_tickets t join public.events e on e.id = t.event_id where t.id = in_ref_id;
    end if;
    if v_buyer is not null and v_buyer <> auth.uid() then
      raise exception 'esa compra no es tuya' using errcode = '42501';
    end if;
    -- si la compra no se encontró, cae de vuelta a lo que mandó el cliente
    v_biz := coalesce(v_biz, in_business);
  end if;

  if v_biz is null then raise exception 'dinos sobre qué negocio es el reclamo'; end if;

  insert into public.claims (kind, ref_id, ref_code, business_id, claimant_id, reason, detail, messages)
  values (in_kind, in_ref_id, in_ref_code, v_biz, auth.uid(), in_reason, in_detail,
    jsonb_build_array(jsonb_build_object('at', now(), 'side', 'cliente', 'user_id', auth.uid(), 'text', coalesce(in_detail, in_reason))))
  returning id into v_id;

  select owner_id into v_owner from public.businesses where id = v_biz;
  perform public.notify_user(v_owner, 'claim_opened',
    jsonb_build_object('kind', in_kind, 'code', in_ref_code, 'reason', in_reason), '/negocio');
  return v_id;
end $fn$;
grant execute on function public.create_claim(text, uuid, text, uuid, text, text) to authenticated;
