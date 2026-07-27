-- 0125 · Boletos: arreglar el vínculo evento → negocio en las RPCs de Fase 2
--
-- Encontrado verificando 0122/0124 en un navegador real: la lista global de
-- Pedidos mostraba "Sin negocio" en cada boleto. La causa es que
-- `events.owner_id` apunta a **auth.users** (el organizador), NO a `businesses`
-- — y 0122/0124 lo trataban como si fuera un id de negocio. Efectos reales:
--
--   1. `admin_orders_global` → todo boleto salía sin negocio (el founder no
--      podía saber a quién reclamarle).
--   2. `create_claim` (kind='boleto') → guardaba un id de USUARIO en
--      `claims.business_id`; con FK a businesses el insert habría reventado, y
--      sin ella el reclamo apuntaba a la nada. Abrir un reclamo por un boleto
--      estaba roto.
--   3. `admin_refund_finalize` → para boletos hacía `where code = p.ref`, pero
--      en un pago de boletos `ref` es el **slug del evento** (una compra puede
--      traer varios boletos), así que NUNCA marcaba ninguno como reembolsado:
--      Stripe devolvía el dinero y el boleto seguía válido para entrar.
--
-- La resolución correcta es: evento → dueño (usuario) → su negocio. La dejo en
-- una sola función para que no vuelva a divergir entre RPCs.

-- Negocio dueño de un evento. `stable` para que el planner la reutilice; sin
-- security definer porque solo lee `businesses` (lectura pública) y `events`.
create or replace function public.event_business_id(in_event uuid)
returns uuid language sql stable set search_path = public as $$
  select b.id from public.events e
    join public.businesses b on b.owner_id = e.owner_id
   where e.id = in_event
   order by b.created_at asc
   limit 1;
$$;
grant execute on function public.event_business_id(uuid) to anon, authenticated;

-- ── 1 · Pedidos: el boleto ya trae su negocio ────────────────────────────────
create or replace function public.admin_orders_global(
  in_q text default null, in_kind text default null, in_status text default null,
  max_results integer default 40, in_offset integer default 0
) returns table (
  kind text, id uuid, code text, status text, total numeric,
  business_name text, business_id uuid, buyer_email text, created_at timestamptz, total_count bigint
) language plpgsql stable security definer set search_path = public as $fn$
begin
  perform public._require_admin();
  return query
  with all_tx as (
    select 'orden'::text as kind, o.id, o.code, o.status, o.total, o.business_id, o.user_id, o.created_at
      from public.business_orders o
    union all
    select 'reserva', bk.id, upper(left(bk.id::text, 8)), bk.status, coalesce(bk.total, bk.deposit), bk.business_id, bk.user_id, bk.created_at
      from public.business_bookings bk
    union all
    select 'renta', ro.id, upper(left(ro.id::text, 8)), ro.status, ro.fee_total, ro.business_id, ro.user_id, ro.created_at
      from public.business_rental_orders ro
    union all
    -- events.owner_id es el USUARIO organizador → su negocio es el vendedor
    select 'boleto', t.id, t.code, t.status, t.total, public.event_business_id(t.event_id), t.user_id, t.created_at
      from public.event_tickets t
  )
  select x.kind, x.id, x.code, x.status, x.total, b.name, x.business_id, u.email::text, x.created_at, count(*) over ()
  from all_tx x
  left join public.businesses b on b.id = x.business_id
  left join auth.users u on u.id = x.user_id
  where (in_kind is null or in_kind = 'all' or x.kind = in_kind)
    and (in_status is null or in_status = 'all' or x.status = in_status)
    and (in_q is null or in_q = '' or x.code ilike '%'||in_q||'%' or b.name ilike '%'||in_q||'%' or u.email ilike '%'||in_q||'%')
  order by x.created_at desc
  limit greatest(1, least(max_results, 100)) offset greatest(0, in_offset);
end $fn$;
grant execute on function public.admin_orders_global(text, text, text, integer, integer) to authenticated;

-- ── 2 · Reclamo por un boleto: negocio real, no el id del organizador ───────
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

  if in_ref_id is not null then
    if in_kind = 'orden' then
      select o.business_id, o.user_id into v_biz, v_buyer from public.business_orders o where o.id = in_ref_id;
    elsif in_kind = 'reserva' then
      select b.business_id, b.user_id into v_biz, v_buyer from public.business_bookings b where b.id = in_ref_id;
    elsif in_kind = 'renta' then
      select r.business_id, r.user_id into v_biz, v_buyer from public.business_rental_orders r where r.id = in_ref_id;
    elsif in_kind = 'boleto' then
      select public.event_business_id(t.event_id), t.user_id into v_biz, v_buyer
        from public.event_tickets t where t.id = in_ref_id;
    end if;
    if v_buyer is not null and v_buyer <> auth.uid() then
      raise exception 'esa compra no es tuya' using errcode = '42501';
    end if;
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

-- ── 3 · Reembolso de boletos: invalidar TODOS los de esa compra ──────────────
-- En un pago de boletos `payments.ref` es el slug del evento, no un código de
-- boleto: hay que anular los boletos de ESE comprador para ESE evento, o el
-- cliente entra gratis con dinero ya devuelto.
create or replace function public.admin_refund_finalize(in_payment uuid, in_reason text)
returns void language plpgsql security definer set search_path = public as $fn$
declare p record;
begin
  perform public._require_admin(array['finanzas','soporte']);
  select * into p from public.payments where id = in_payment;
  if p.id is null then raise exception 'pago no encontrado'; end if;
  update public.payments set status = 'refunded', updated_at = now() where id = in_payment;
  update public.pending_purchases set status = 'refunded', updated_at = now()
   where stripe_payment_intent = p.stripe_payment_intent;

  if p.kind = 'order' then
    update public.business_orders set status='cancelled' where code = p.ref;
  elsif p.kind = 'booking' then
    update public.business_bookings set status='cancelled'
     where id::text = p.ref or upper(left(id::text,8)) = upper(p.ref);
  elsif p.kind = 'rental' then
    update public.business_rental_orders set status='cancelled'
     where id::text = p.ref or upper(left(id::text,8)) = upper(p.ref);
  elsif p.kind = 'ticket' then
    -- el boleto libera su asiento por el trigger de 0116 al pasar a 'refunded'
    update public.event_tickets t set status = 'refunded'
     where t.user_id = p.buyer_id and t.status <> 'refunded'
       and (t.code = p.ref
            or t.event_id in (select e.id from public.events e where e.slug = p.ref));
  end if;

  perform public._admin_log('payment.refund', 'payment', in_payment::text,
    jsonb_build_object('status', p.status, 'amount', p.amount/100.0),
    jsonb_build_object('status', 'refunded'), in_reason);
  perform public.notify_user(p.buyer_id, 'purchase_refunded',
    jsonb_build_object('kind', p.kind, 'code', p.ref, 'reason', in_reason), '/cuenta');
end $fn$;
grant execute on function public.admin_refund_finalize(uuid, text) to authenticated;
