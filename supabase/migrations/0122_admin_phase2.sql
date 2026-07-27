-- 0122_admin_phase2.sql — Super Admin FASE 2: confianza.
-- Moderación · Reclamos (las dos caras) · Dinero · Pedidos.
-- Plan: docs/ADMIN-DASHBOARD-PLAN.md §3.4–3.7.
--
-- Decisión de diseño: para eventos/propiedades/vehículos/novedades NO se agrega
-- una bandera paralela — se reutiliza su `status` existente (draft/review), que
-- YA los oculta en todas las lecturas. Solo el UGC puro (posts, comentarios,
-- reseñas) necesita `hidden`, y ahí se filtra en la política RLS de SELECT, que
-- cubre TODOS los caminos de lectura de golpe.
-- Idempotente. Apply: node scripts/sbsql.mjs --file supabase/migrations/0122_admin_phase2.sql

-- ════════════════════════════════════════════════════════════════════════════
-- A · MODERACIÓN — ocultar UGC de verdad
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare t text;
begin
  foreach t in array array['posts','post_comments','reviews','event_reviews'] loop
    execute format('alter table public.%I add column if not exists hidden boolean not null default false', t);
    execute format('alter table public.%I add column if not exists hidden_reason text', t);
    execute format('alter table public.%I add column if not exists hidden_by uuid references auth.users(id) on delete set null', t);
    execute format('alter table public.%I add column if not exists hidden_at timestamptz', t);
  end loop;
end $$;

-- Las políticas de lectura excluyen lo oculto (el autor tampoco lo ve → sin confusión).
drop policy if exists "public read posts" on public.posts;
create policy "public read posts" on public.posts for select using (not hidden);
drop policy if exists "public read comments" on public.post_comments;
create policy "public read comments" on public.post_comments for select using (not hidden);
drop policy if exists "public read reviews" on public.reviews;
create policy "public read reviews" on public.reviews for select using (not hidden);
drop policy if exists "public read event reviews" on public.event_reviews;
create policy "public read event reviews" on public.event_reviews for select using (not hidden);

-- Reseñas: también se leen por RPC SECURITY DEFINER (salta RLS) → parche quirúrgico.
do $$
declare v_def text;
begin
  select pg_get_functiondef(oid) into v_def from pg_proc
    where proname = 'reviews_by_slug' and pronamespace = 'public'::regnamespace limit 1;
  if v_def is null then raise exception 'reviews_by_slug no existe'; end if;
  if position('r.hidden' in v_def) = 0 then
    if position('where b.slug = in_slug' in v_def) = 0 then
      raise exception 'ancla no encontrada en reviews_by_slug — revisar a mano';
    end if;
    execute replace(v_def, 'where b.slug = in_slug', 'where b.slug = in_slug and not r.hidden');
  end if;

  select pg_get_functiondef(oid) into v_def from pg_proc
    where proname = 'event_reviews_by_slug' and pronamespace = 'public'::regnamespace limit 1;
  if v_def is null then raise exception 'event_reviews_by_slug no existe'; end if;
  if position('r.hidden' in v_def) = 0 then
    if position('where e.slug = in_slug' in v_def) = 0 then
      raise exception 'ancla no encontrada en event_reviews_by_slug — revisar a mano';
    end if;
    execute replace(v_def, 'where e.slug = in_slug', 'where e.slug = in_slug and not r.hidden');
  end if;
end $$;

-- Cola de reportes con el contenido en contexto (para decidir sin adivinar).
create or replace function public.admin_reports_queue(
  in_status text default 'pendiente', in_type text default null,
  max_results integer default 50, in_offset integer default 0
) returns table (
  id uuid, entity_type text, entity_id text, reason text, detail text, status text,
  reporter_email text, created_at timestamptz,
  content_preview text, content_author text, content_author_id uuid,
  content_hidden boolean, report_count bigint, total_count bigint
) language plpgsql stable security definer set search_path = public as $fn$
begin
  perform public._require_admin();
  return query
  select r.id, r.entity_type, r.entity_id, r.reason, r.detail, r.status,
         u.email::text, r.created_at,
         case r.entity_type
           when 'post'         then (select left(coalesce(p.body_es, ''), 240) from public.posts p where p.id::text = r.entity_id)
           when 'comment'      then (select left(coalesce(c.body, ''), 240) from public.post_comments c where c.id::text = r.entity_id)
           when 'review'       then (select left(coalesce(rv.body_es, ''), 240) from public.reviews rv where rv.id::text = r.entity_id)
           when 'event_review' then (select left(coalesce(er.body_es, ''), 240) from public.event_reviews er where er.id::text = r.entity_id)
           when 'business'     then (select b.name from public.businesses b where b.id::text = r.entity_id)
           when 'event'        then (select e.title_es from public.events e where e.id::text = r.entity_id)
           when 'property'     then (select pr.title from public.properties pr where pr.id::text = r.entity_id)
           when 'vehicle'      then (select v.year || ' ' || v.make || ' ' || v.model from public.vehicles v where v.id::text = r.entity_id)
           when 'update'       then (select left(coalesce(up.body_es, ''), 240) from public.business_updates up where up.id::text = r.entity_id)
           else null end,
         case r.entity_type
           when 'post'    then (select p.author_name from public.posts p where p.id::text = r.entity_id)
           when 'comment' then (select c.author_name from public.post_comments c where c.id::text = r.entity_id)
           when 'review'  then (select rv.author_name from public.reviews rv where rv.id::text = r.entity_id)
           else null end,
         case r.entity_type
           when 'post'         then (select p.author_id from public.posts p where p.id::text = r.entity_id)
           when 'comment'      then (select c.author_id from public.post_comments c where c.id::text = r.entity_id)
           when 'review'       then (select rv.user_id from public.reviews rv where rv.id::text = r.entity_id)
           when 'event_review' then (select er.user_id from public.event_reviews er where er.id::text = r.entity_id)
           else null end,
         case r.entity_type
           when 'post'         then (select p.hidden from public.posts p where p.id::text = r.entity_id)
           when 'comment'      then (select c.hidden from public.post_comments c where c.id::text = r.entity_id)
           when 'review'       then (select rv.hidden from public.reviews rv where rv.id::text = r.entity_id)
           when 'event_review' then (select er.hidden from public.event_reviews er where er.id::text = r.entity_id)
           else null end,
         (select count(*) from public.reports r2 where r2.entity_type = r.entity_type and r2.entity_id = r.entity_id),
         count(*) over ()
  from public.reports r
  left join auth.users u on u.id = r.reporter_id
  where (in_status is null or in_status = 'all' or r.status = in_status)
    and (in_type is null or in_type = 'all' or r.entity_type = in_type)
  order by r.created_at desc
  limit greatest(1, least(max_results, 100)) offset greatest(0, in_offset);
end $fn$;
grant execute on function public.admin_reports_queue(text, text, integer, integer) to authenticated;

-- Acciones sobre un reporte: ocultar / mostrar / eliminar / descartar.
create or replace function public.admin_report_handle(in_id uuid, in_action text, in_reason text default null)
returns void language plpgsql security definer set search_path = public as $fn$
declare r record; v_tbl text; v_ok boolean;
begin
  perform public._require_admin(array['moderador','soporte']);
  if in_action not in ('hide','unhide','delete','dismiss','reviewed') then raise exception 'acción inválida'; end if;
  select * into r from public.reports where id = in_id;
  if r.id is null then raise exception 'reporte no encontrado'; end if;

  v_tbl := case r.entity_type
    when 'post' then 'posts' when 'comment' then 'post_comments'
    when 'review' then 'reviews' when 'event_review' then 'event_reviews' else null end;

  if in_action in ('hide','unhide') then
    if v_tbl is not null then
      execute format('update public.%I set hidden = $1, hidden_reason = $2, hidden_by = $3, hidden_at = $4 where id::text = $5', v_tbl)
        using (in_action = 'hide'), in_reason, auth.uid(), case when in_action = 'hide' then now() end, r.entity_id;
    else
      -- eventos / propiedades / vehículos / novedades: se ocultan por su `status`
      if r.entity_type = 'event' then
        update public.events set status = case when in_action='hide' then 'draft' else 'published' end where id::text = r.entity_id;
      elsif r.entity_type = 'property' then
        update public.properties set status = case when in_action='hide' then 'draft' else 'published' end where id::text = r.entity_id;
      elsif r.entity_type = 'vehicle' then
        update public.vehicles set status = case when in_action='hide' then 'draft' else 'published' end where id::text = r.entity_id;
      elsif r.entity_type = 'update' then
        update public.business_updates set status = case when in_action='hide' then 'archived' else 'live' end where id::text = r.entity_id;
      elsif r.entity_type = 'business' then
        update public.businesses set suspended = (in_action='hide'),
               suspended_reason = case when in_action='hide' then in_reason else null end where id::text = r.entity_id;
      else
        raise exception 'ese tipo no se puede ocultar desde aquí';
      end if;
    end if;
  elsif in_action = 'delete' then
    if v_tbl is null then raise exception 'usa ocultar para este tipo'; end if;
    execute format('delete from public.%I where id::text = $1', v_tbl) using r.entity_id;
  end if;

  update public.reports
     set status = case in_action when 'dismiss' then 'descartado'
                                 when 'reviewed' then 'revisado'
                                 when 'unhide' then 'revisado'
                                 else 'accionado' end,
         handled_by = auth.uid(), handled_at = now(), note = in_reason
   where id = in_id;

  perform public._admin_log('report.' || in_action, r.entity_type, r.entity_id,
    jsonb_build_object('report_id', in_id, 'reason', r.reason), jsonb_build_object('action', in_action), in_reason);
end $fn$;
grant execute on function public.admin_report_handle(uuid, text, text) to authenticated;

-- Crear reporte (lado usuario) — cualquier entidad, uno por usuario.
create or replace function public.create_report(
  in_type text, in_entity_id text, in_reason text, in_detail text default null
) returns uuid language plpgsql security definer set search_path = public as $fn$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  if coalesce(trim(in_reason),'') = '' then raise exception 'la razón es obligatoria'; end if;
  insert into public.reports (entity_type, entity_id, reporter_id, reason, detail)
  values (in_type, in_entity_id, auth.uid(), in_reason, in_detail)
  on conflict (entity_type, entity_id, reporter_id)
    do update set reason = excluded.reason, detail = excluded.detail
  returning id into v_id;
  return v_id;
end $fn$;
grant execute on function public.create_report(text, text, text, text) to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- B · RECLAMOS — las dos caras
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.create_claim(
  in_kind text, in_ref_id uuid, in_ref_code text, in_business uuid,
  in_reason text, in_detail text default null
) returns uuid language plpgsql security definer set search_path = public as $fn$
declare v_id uuid; v_owner uuid;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  if in_kind not in ('orden','reserva','renta','boleto','otro') then raise exception 'tipo inválido'; end if;
  if coalesce(trim(in_reason),'') = '' then raise exception 'cuéntanos qué pasó'; end if;
  insert into public.claims (kind, ref_id, ref_code, business_id, claimant_id, reason, detail, messages)
  values (in_kind, in_ref_id, in_ref_code, in_business, auth.uid(), in_reason, in_detail,
    jsonb_build_array(jsonb_build_object('at', now(), 'side', 'cliente', 'user_id', auth.uid(), 'text', coalesce(in_detail, in_reason))))
  returning id into v_id;
  select owner_id into v_owner from public.businesses where id = in_business;
  perform public.notify_user(v_owner, 'claim_opened',
    jsonb_build_object('kind', in_kind, 'code', in_ref_code, 'reason', in_reason), '/negocio');
  return v_id;
end $fn$;
grant execute on function public.create_claim(text, uuid, text, uuid, text, text) to authenticated;

-- Mensaje en el hilo — cliente, dueño del negocio o admin (el lado se deduce).
create or replace function public.claim_add_message(in_id uuid, in_text text)
returns void language plpgsql security definer set search_path = public as $fn$
declare c record; v_side text; v_owner uuid; v_admin text;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  if coalesce(trim(in_text),'') = '' then raise exception 'escribe un mensaje'; end if;
  select * into c from public.claims where id = in_id;
  if c.id is null then raise exception 'reclamo no encontrado'; end if;
  select owner_id into v_owner from public.businesses where id = c.business_id;
  select role into v_admin from public.admins where user_id = auth.uid();
  v_side := case when auth.uid() = c.claimant_id then 'cliente'
                 when auth.uid() = v_owner then 'negocio'
                 when v_admin is not null then 'admin' else null end;
  if v_side is null then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.claims
     set messages = messages || jsonb_build_object('at', now(), 'side', v_side, 'user_id', auth.uid(), 'text', in_text),
         updated_at = now()
   where id = in_id;
  -- avisa a la otra parte
  if v_side = 'cliente' then perform public.notify_user(v_owner, 'claim_message', jsonb_build_object('code', c.ref_code), '/negocio');
  elsif v_side = 'negocio' then perform public.notify_user(c.claimant_id, 'claim_message', jsonb_build_object('code', c.ref_code), '/cuenta');
  else
    perform public.notify_user(c.claimant_id, 'claim_message', jsonb_build_object('code', c.ref_code), '/cuenta');
    perform public.notify_user(v_owner, 'claim_message', jsonb_build_object('code', c.ref_code), '/negocio');
  end if;
end $fn$;
grant execute on function public.claim_add_message(uuid, text) to authenticated;

-- Mis reclamos (Mi Cuenta)
create or replace function public.my_claims()
returns table (id uuid, kind text, ref_code text, business_name text, reason text,
               status text, messages jsonb, created_at timestamptz, resolved_at timestamptz, resolution text)
language sql stable security definer set search_path = public as $$
  select c.id, c.kind, c.ref_code, b.name, c.reason, c.status, c.messages,
         c.created_at, c.resolved_at, c.resolution
  from public.claims c left join public.businesses b on b.id = c.business_id
  where c.claimant_id = auth.uid()
  order by c.created_at desc limit 50;
$$;
grant execute on function public.my_claims() to authenticated;

create or replace function public.admin_claims_list(
  in_status text default null, max_results integer default 50, in_offset integer default 0
) returns table (
  id uuid, kind text, ref_code text, reason text, status text,
  business_name text, business_id uuid, claimant_email text, claimant_id uuid,
  assigned_email text, messages jsonb, created_at timestamptz, updated_at timestamptz,
  resolution text, hours_open numeric, total_count bigint
) language plpgsql stable security definer set search_path = public as $fn$
begin
  perform public._require_admin();
  return query
  select c.id, c.kind, c.ref_code, c.reason, c.status, b.name, c.business_id,
         u.email::text, c.claimant_id, a.email::text, c.messages, c.created_at, c.updated_at,
         c.resolution,
         round(extract(epoch from (coalesce(c.resolved_at, now()) - c.created_at)) / 3600.0, 1),
         count(*) over ()
  from public.claims c
  left join public.businesses b on b.id = c.business_id
  left join auth.users u on u.id = c.claimant_id
  left join auth.users a on a.id = c.assigned_to
  where (in_status is null or in_status = 'all' or c.status = in_status)
  order by (c.status in ('abierto','en_revision')) desc, c.created_at desc
  limit greatest(1, least(max_results, 100)) offset greatest(0, in_offset);
end $fn$;
grant execute on function public.admin_claims_list(text, integer, integer) to authenticated;

create or replace function public.admin_claim_update(
  in_id uuid, in_status text default null, in_assign_me boolean default false,
  in_resolution text default null
) returns void language plpgsql security definer set search_path = public as $fn$
declare c record;
begin
  perform public._require_admin(array['moderador','soporte','finanzas']);
  select * into c from public.claims where id = in_id;
  if c.id is null then raise exception 'reclamo no encontrado'; end if;
  if in_status is not null and in_status not in ('abierto','en_revision','resuelto','rechazado') then
    raise exception 'estado inválido';
  end if;
  if in_status in ('resuelto','rechazado') and coalesce(trim(in_resolution),'') = '' then
    raise exception 'escribe cómo se resolvió';
  end if;
  update public.claims
     set status = coalesce(in_status, status),
         assigned_to = case when in_assign_me then auth.uid() else assigned_to end,
         resolution = coalesce(in_resolution, resolution),
         resolved_at = case when in_status in ('resuelto','rechazado') then now() else resolved_at end,
         updated_at = now()
   where id = in_id;
  perform public._admin_log('claim.' || coalesce(in_status, 'update'), 'claim', in_id::text,
    jsonb_build_object('status', c.status), jsonb_build_object('status', in_status), in_resolution);
  if in_status in ('resuelto','rechazado') then
    perform public.notify_user(c.claimant_id, 'claim_' || in_status,
      jsonb_build_object('code', c.ref_code, 'resolution', in_resolution), '/cuenta');
  end if;
end $fn$;
grant execute on function public.admin_claim_update(uuid, text, boolean, text) to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- C · DINERO — ledger, pendientes atascados, reembolso admin
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.admin_payments_list(
  in_q text default null, in_kind text default null, in_status text default null,
  max_results integer default 40, in_offset integer default 0
) returns table (
  id uuid, kind text, status text, amount numeric, fee numeric, ref text,
  business_name text, business_id uuid, buyer_email text, intent text,
  created_at timestamptz, total_count bigint, sum_amount numeric
) language plpgsql stable security definer set search_path = public as $fn$
begin
  perform public._require_admin(array['finanzas','soporte']);
  return query
  select p.id, p.kind, p.status, p.amount/100.0, coalesce(p.application_fee,0)/100.0, p.ref,
         b.name, p.business_id, u.email::text, p.stripe_payment_intent, p.created_at,
         count(*) over (), sum(p.amount/100.0) over ()
  from public.payments p
  left join public.businesses b on b.id = p.business_id
  left join auth.users u on u.id = p.buyer_id
  where (in_q is null or in_q = '' or p.ref ilike '%'||in_q||'%' or b.name ilike '%'||in_q||'%' or u.email ilike '%'||in_q||'%')
    and (in_kind is null or in_kind = 'all' or p.kind = in_kind)
    and (in_status is null or in_status = 'all' or p.status = in_status)
  order by p.created_at desc
  limit greatest(1, least(max_results, 100)) offset greatest(0, in_offset);
end $fn$;
grant execute on function public.admin_payments_list(text, text, text, integer, integer) to authenticated;

-- Pagos cobrados que nunca se entregaron (el riesgo residual del webhook).
create or replace function public.admin_pending_monitor(max_results integer default 50)
returns table (
  id uuid, kind text, status text, ref text, amount numeric,
  business_name text, buyer_email text, intent text,
  created_at timestamptz, updated_at timestamptz, minutes_stuck numeric, error text
) language plpgsql stable security definer set search_path = public as $fn$
begin
  perform public._require_admin(array['finanzas','soporte']);
  return query
  select pp.id, pp.kind, pp.status, pp.ref, pp.amount/100.0, b.name, u.email::text,
         pp.stripe_payment_intent, pp.created_at, pp.updated_at,
         round(extract(epoch from (now() - pp.updated_at))/60.0, 0), pp.error
  from public.pending_purchases pp
  left join public.businesses b on b.id = pp.business_id
  left join auth.users u on u.id = pp.buyer_id
  where pp.status in ('fulfilling','failed')
     or (pp.status = 'pending' and pp.stripe_payment_intent is not null and pp.updated_at < now() - interval '30 minutes')
  order by pp.updated_at asc
  limit greatest(1, least(max_results, 100));
end $fn$;
grant execute on function public.admin_pending_monitor(integer) to authenticated;

-- Reintentar la entrega de un pago cobrado que quedó a medias (mismo camino que
-- el webhook). Idempotente: si ya está entregado, no hace nada.
create or replace function public.admin_pending_retry(in_id uuid)
returns text language plpgsql security definer set search_path = public as $fn$
declare pp record; pl jsonb; v_ok boolean := false; v_msg text;
begin
  perform public._require_admin(array['finanzas','soporte']);
  select * into pp from public.pending_purchases where id = in_id;
  if pp.id is null then raise exception 'pago no encontrado'; end if;
  if pp.status = 'fulfilled' then return 'ya entregado'; end if;
  if pp.status = 'refunded' then return 'ya reembolsado'; end if;
  pl := coalesce(pp.payload, '{}'::jsonb);

  begin
    if pp.kind = 'order' then
      perform public.fulfill_order(pp.buyer_id, pp.business_id, coalesce(pl->'items','[]'::jsonb),
        coalesce((pl->>'total')::numeric, pp.subtotal/100.0), coalesce(pl->>'channel','pickup'), coalesce(pl->'fulfillment','{}'::jsonb));
      v_ok := true;
    elsif pp.kind = 'ticket' then
      perform public.fulfill_event_tickets_multi(pp.buyer_id, pp.ref, coalesce(pl->'items','[]'::jsonb),
        pl->>'promo', pl->'seats', pl->'addons');
      v_ok := true;
    elsif pp.kind = 'booking' then
      perform public.fulfill_booking(pp.buyer_id, pp.business_id, pl->>'service_name',
        nullif(pl->>'service_id','')::uuid, nullif(pl->>'starts_at','')::timestamptz,
        nullif(pl->>'party_size','')::integer, coalesce((pl->>'deposit')::numeric, pp.subtotal/100.0),
        nullif(pl->>'duration_min','')::integer, pl->>'staff_id', pl->>'staff_name',
        pl->'addons', pl->>'variant', nullif(pl->>'total','')::numeric, pl->>'notes');
      v_ok := true;
    elsif pp.kind = 'rental' and (pl->>'order')::boolean is true then
      perform public.fulfill_rental_order(pp.buyer_id, pp.business_id,
        nullif(pl->>'start_at','')::timestamptz, nullif(pl->>'end_at','')::timestamptz,
        coalesce(pl->'lines','[]'::jsonb), coalesce(pl->'extras','[]'::jsonb),
        coalesce((pl->>'fee_total')::numeric, pp.subtotal/100.0), coalesce((pl->>'deposit_total')::numeric, 0));
      v_ok := true;
    else
      raise exception 'este tipo (%) no se puede reintentar — usa reembolso', pp.kind;
    end if;
  exception when others then
    v_msg := sqlerrm;
    update public.pending_purchases set status = 'failed', error = v_msg, updated_at = now() where id = in_id;
    perform public._admin_log('payment.retry_failed', 'pending_purchase', in_id::text, null,
      jsonb_build_object('error', v_msg), null);
    raise exception 'No se pudo entregar: %', v_msg;
  end;

  if v_ok then
    update public.pending_purchases set status = 'fulfilled', updated_at = now() where id = in_id;
    perform public._admin_log('payment.retry_ok', 'pending_purchase', in_id::text,
      jsonb_build_object('status', pp.status), jsonb_build_object('status', 'fulfilled'), null);
    perform public.notify_user(pp.buyer_id, 'purchase_fulfilled', jsonb_build_object('kind', pp.kind), '/cuenta');
    return 'entregado';
  end if;
  return 'sin cambios';
end $fn$;
grant execute on function public.admin_pending_retry(uuid) to authenticated;

-- Contexto para el reembolso admin (lo consume la edge function refund-purchase).
create or replace function public.admin_refund_ctx(in_payment uuid)
returns table (intent text, amount integer, fee integer, business_id uuid, buyer_id uuid,
               kind text, ref text, status text, pending_id uuid)
language plpgsql stable security definer set search_path = public as $fn$
begin
  perform public._require_admin(array['finanzas','soporte']);
  return query
  select p.stripe_payment_intent, p.amount, coalesce(p.application_fee,0), p.business_id, p.buyer_id,
         p.kind, p.ref, p.status,
         (select pp.id from public.pending_purchases pp
           where pp.stripe_payment_intent = p.stripe_payment_intent order by pp.created_at desc limit 1)
  from public.payments p where p.id = in_payment;
end $fn$;
grant execute on function public.admin_refund_ctx(uuid) to authenticated;

-- Cierra el reembolso: ledger + pending + estado de la entidad + aviso + bitácora.
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
  -- la entidad comprada refleja el reembolso (el boleto libera su asiento por trigger 0116)
  if p.kind = 'order'   then update public.business_orders        set status='cancelled' where code = p.ref;
  elsif p.kind = 'booking' then
    update public.business_bookings set status='cancelled'
     where id::text = p.ref or upper(left(id::text,8)) = upper(p.ref);
  elsif p.kind = 'rental' then
    update public.business_rental_orders set status='cancelled'
     where id::text = p.ref or upper(left(id::text,8)) = upper(p.ref);
  elsif p.kind = 'ticket'  then update public.event_tickets       set status='refunded'  where code = p.ref;
  end if;
  perform public._admin_log('payment.refund', 'payment', in_payment::text,
    jsonb_build_object('status', p.status, 'amount', p.amount/100.0),
    jsonb_build_object('status', 'refunded'), in_reason);
  perform public.notify_user(p.buyer_id, 'purchase_refunded',
    jsonb_build_object('kind', p.kind, 'code', p.ref, 'reason', in_reason), '/cuenta');
end $fn$;
grant execute on function public.admin_refund_finalize(uuid, text) to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- D · PEDIDOS — vista global cruzando las 4 superficies transaccionales
-- ════════════════════════════════════════════════════════════════════════════
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
    select 'boleto', t.id, t.code, t.status, t.total, e.owner_id, t.user_id, t.created_at
      from public.event_tickets t left join public.events e on e.id = t.event_id
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

create or replace function public.admin_order_set_status(
  in_kind text, in_id uuid, in_status text, in_reason text
) returns void language plpgsql security definer set search_path = public as $fn$
declare v_before text; v_buyer uuid; v_code text;
begin
  perform public._require_admin(array['soporte','moderador','finanzas']);
  if coalesce(trim(in_reason),'') = '' then raise exception 'la razón es obligatoria'; end if;
  if in_kind = 'orden' then
    select status, user_id, code into v_before, v_buyer, v_code from public.business_orders where id = in_id;
    update public.business_orders set status = in_status where id = in_id;
  elsif in_kind = 'reserva' then
    select status, user_id, upper(left(id::text,8)) into v_before, v_buyer, v_code from public.business_bookings where id = in_id;
    update public.business_bookings set status = in_status where id = in_id;
  elsif in_kind = 'renta' then
    select status, user_id, upper(left(id::text,8)) into v_before, v_buyer, v_code from public.business_rental_orders where id = in_id;
    update public.business_rental_orders set status = in_status where id = in_id;
  elsif in_kind = 'boleto' then
    select status, user_id, code into v_before, v_buyer, v_code from public.event_tickets where id = in_id;
    update public.event_tickets set status = in_status where id = in_id;
  else raise exception 'tipo inválido';
  end if;
  if v_before is null then raise exception 'no encontrado'; end if;
  perform public._admin_log('order.status', in_kind, in_id::text,
    jsonb_build_object('status', v_before), jsonb_build_object('status', in_status), in_reason);
  perform public.notify_user(v_buyer, 'order_status_admin',
    jsonb_build_object('kind', in_kind, 'code', v_code, 'status', in_status), '/cuenta');
end $fn$;
grant execute on function public.admin_order_set_status(text, uuid, text, text) to authenticated;
