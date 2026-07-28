-- 0128 · Super Admin Fase 3 (parte 3) — Notificaciones · Módulos
--
-- Cierra el backend de la consola v2.

-- ════════════════════════════════════════════════════════════════════════════
-- A · NOTIFICACIONES Y ANUNCIOS — envío segmentado con historial
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.notif_broadcasts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  segment jsonb not null default '{}'::jsonb,
  reach integer not null default 0,
  sent integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.notif_broadcasts enable row level security;
-- Sin políticas → solo service_role / SECURITY DEFINER lo tocan (deny-all al cliente).
revoke all on public.notif_broadcasts from anon, authenticated;

-- Alcance calculado: usuarios que cumplen ciudad + rol. (El "factor vertical" del
-- diseño necesita interés por vertical por usuario, que aún no medimos → se aplica
-- como filtro suave = no reduce el alcance real. Registrado en LAUNCH-CHECKLIST.)
create or replace function public.admin_broadcast_reach(in_city text default null, in_role text default 'all')
returns bigint language plpgsql stable security definer set search_path = public as $fn$
declare v bigint;
begin
  perform public._require_admin(array['moderador','finanzas']);
  select count(*) into v from public.profiles p
  where (in_city is null or in_city = 'all' or p.city_label = in_city)
    and (
      in_role is null or in_role = 'all'
      or (in_role = 'owner'   and exists (select 1 from public.businesses b where b.owner_id = p.id))
      or (in_role = 'citizen' and not exists (select 1 from public.businesses b where b.owner_id = p.id))
    );
  return v;
end $fn$;
grant execute on function public.admin_broadcast_reach(text, text) to authenticated;

-- Envía el anuncio. A 1.2M la difusión real es un job (BullMQ) — aquí insertamos
-- hasta un tope seguro y guardamos el alcance total para no mentir en el historial.
-- Registrado en LAUNCH-CHECKLIST el paso a job de fanout.
create or replace function public.admin_broadcast_send(
  in_title text, in_body text, in_city text default null, in_role text default 'all', in_vertical text default 'all'
) returns uuid language plpgsql security definer set search_path = public as $fn$
declare v_id uuid; v_reach bigint; v_sent int; v_cap int := 5000;
begin
  perform public._require_admin(array['moderador','finanzas']);
  if coalesce(trim(in_title),'') = '' or coalesce(trim(in_body),'') = '' then
    raise exception 'el título y el mensaje son obligatorios';
  end if;
  v_reach := public.admin_broadcast_reach(in_city, in_role);
  v_id := gen_random_uuid();

  with target as (
    select p.id from public.profiles p
    where (in_city is null or in_city = 'all' or p.city_label = in_city)
      and (
        in_role is null or in_role = 'all'
        or (in_role = 'owner'   and exists (select 1 from public.businesses b where b.owner_id = p.id))
        or (in_role = 'citizen' and not exists (select 1 from public.businesses b where b.owner_id = p.id))
      )
    limit v_cap
  ), ins as (
    insert into public.notifications (user_id, kind, data, link)
    select t.id, 'broadcast',
           jsonb_build_object('title', in_title, 'body', in_body, 'broadcast', v_id::text), '/comunidad'
    from target t
    returning 1
  )
  select count(*) into v_sent from ins;

  insert into public.notif_broadcasts (id, title, body, segment, reach, sent, created_by)
  values (v_id, in_title, in_body,
    jsonb_build_object('city', in_city, 'role', in_role, 'vertical', in_vertical), v_reach, v_sent, auth.uid());

  perform public._admin_log('broadcast.send', 'broadcast', v_id::text, null,
    jsonb_build_object('reach', v_reach, 'sent', v_sent, 'city', in_city, 'role', in_role), in_title);
  return v_id;
end $fn$;
grant execute on function public.admin_broadcast_send(text, text, text, text, text) to authenticated;

-- Historial con tasa de apertura real (notifications.read de las que llevan
-- este broadcast id).
create or replace function public.admin_broadcasts_history(max_results integer default 30)
returns table (id uuid, title text, segment jsonb, reach integer, sent integer, opened bigint, open_pct numeric, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $fn$
begin
  perform public._require_admin(array['moderador','finanzas']);
  return query
  select b.id, b.title, b.segment, b.reach, b.sent,
         (select count(*) from public.notifications n where n.data->>'broadcast' = b.id::text and n.read),
         round((select count(*) from public.notifications n where n.data->>'broadcast' = b.id::text and n.read)::numeric
               / greatest(b.sent,1) * 100, 0),
         b.created_at
  from public.notif_broadcasts b
  order by b.created_at desc limit greatest(1, least(max_results, 100));
end $fn$;
grant execute on function public.admin_broadcasts_history(integer) to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- B · MÓDULOS — centro de control por vertical
-- ════════════════════════════════════════════════════════════════════════════
-- 4 KPIs por vertical. Eventos / Bienes Raíces / Autos con datos reales;
-- Trabajos / Transporte aún no existen como producto → ceros + bandera piloto
-- (la UI muestra el aviso "en piloto" del diseño).
create or replace function public.admin_module_kpis(in_vertical text)
returns table (label text, value text)
language plpgsql stable security definer set search_path = public as $fn$
begin
  perform public._require_admin();
  if in_vertical = 'eventos' then
    return query
      select 'Eventos activos'::text, (select count(*)::text from public.events where status='published' and coalesce(ends_at, starts_at) >= now())
      union all select 'Boletos vendidos', (select coalesce(sum(qty),0)::text from public.event_tickets)
      union all select 'Órdenes', (select count(*)::text from public.payments where kind='ticket')
      union all select 'Asistentes', (select count(*)::text from public.event_attendance);
  elsif in_vertical = 'bienes_raices' then
    return query
      select 'Propiedades'::text, (select count(*)::text from public.properties where status='published')
      union all select 'Tours', (select count(*)::text from public.property_tours)
      union all select 'Leads', (select count(*)::text from public.property_leads)
      union all select 'Agentes', (select count(*)::text from public.businesses where category_id='RealEstate');
  elsif in_vertical = 'autos' then
    return query
      select 'Inventario'::text, (select count(*)::text from public.vehicles where status='published')
      union all select 'Pruebas de manejo', (select count(*)::text from public.vehicle_tests)
      union all select 'Leads', (select count(*)::text from public.vehicle_leads)
      union all select 'Dealers', (select count(*)::text from public.businesses where category_id='CarDealer');
  else
    return query select 'Piloto'::text, '—'::text union all select 'Piloto','—' union all select 'Piloto','—' union all select 'Piloto','—';
  end if;
end $fn$;
grant execute on function public.admin_module_kpis(text) to authenticated;

-- Filas por vertical + pestaña, en una forma uniforme para la tarjeta del diseño.
create or replace function public.admin_module_rows(in_vertical text, in_tab text, max_results integer default 40)
returns table (id uuid, ini text, color text, title text, sub text, val text, status text, featured boolean)
language plpgsql stable security definer set search_path = public as $fn$
begin
  perform public._require_admin();
  -- ── EVENTOS ──
  if in_vertical = 'eventos' and in_tab = 'eventos' then
    return query select e.id, upper(left(e.title_es,2)), '#6D4DF6', e.title_es,
      coalesce(e.city,'')||' · '||to_char(e.starts_at,'DD Mon'), e.price_label, e.status, e.featured
      from public.events e order by e.starts_at desc limit max_results;
  elsif in_vertical = 'eventos' and in_tab = 'boletos' then
    return query select t.id, left(t.code,2), '#1F8A4C', t.code,
      coalesce(t.customer_name,'')||' · '||t.qty||' boleto(s)', '$'||round(t.total::numeric,0), t.status, false
      from public.event_tickets t order by t.created_at desc limit max_results;
  elsif in_vertical = 'eventos' and in_tab = 'organizadores' then
    return query select b.id, upper(left(b.name,2)), '#B5791A', b.name,
      'eventos: '||(select count(*) from public.events e where e.owner_id=b.owner_id)::text, '', b.suspended::text, false
      from public.businesses b where exists (select 1 from public.events e where e.owner_id=b.owner_id) limit max_results;
  -- ── BIENES RAÍCES ──
  elsif in_vertical = 'bienes_raices' and in_tab = 'propiedades' then
    return query select pr.id, 'PR', '#6D4DF6', pr.title, coalesce(pr.city,''), '', pr.status, pr.featured
      from public.properties pr order by pr.created_at desc limit max_results;
  elsif in_vertical = 'bienes_raices' and in_tab = 'tours' then
    return query select tr.id, 'TR', '#1F8A4C', coalesce(tr.name,'Cliente'),
      coalesce(tr.mode,'')||' · '||to_char(tr.at,'DD Mon HH24:MI'), '', tr.status, false
      from public.property_tours tr order by tr.created_at desc limit max_results;
  elsif in_vertical = 'bienes_raices' and in_tab = 'leads' then
    return query select l.id, 'LD', '#B5791A', coalesce(l.name,'Cliente'),
      coalesce(l.kind,'')||' · '||coalesce(l.phone,''), '', l.stage, false
      from public.property_leads l order by l.created_at desc limit max_results;
  -- ── AUTOS ──
  elsif in_vertical = 'autos' and in_tab = 'inventario' then
    return query select v.id, 'AU', '#6D4DF6', (v.year||' '||v.make||' '||v.model), coalesce(v.city,''), '', v.status, v.featured
      from public.vehicles v order by v.created_at desc limit max_results;
  elsif in_vertical = 'autos' and in_tab = 'pruebas' then
    return query select te.id, 'PM', '#1F8A4C', coalesce(te.name,'Cliente'),
      to_char(te.at,'DD Mon HH24:MI'), '', te.status, false
      from public.vehicle_tests te order by te.created_at desc limit max_results;
  elsif in_vertical = 'autos' and in_tab = 'leads' then
    return query select l.id, 'LD', '#B5791A', coalesce(l.name,'Cliente'),
      coalesce(l.kind,'')||' · '||coalesce(l.phone,''), coalesce('$'||round(l.offer_amount::numeric,0),''), l.stage, false
      from public.vehicle_leads l order by l.created_at desc limit max_results;
  else
    return; -- piloto (trabajos/transporte) o pestaña sin datos → vacío
  end if;
end $fn$;
grant execute on function public.admin_module_rows(text, text, integer) to authenticated;
