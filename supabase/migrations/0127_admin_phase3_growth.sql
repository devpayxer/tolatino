-- 0127 · Super Admin Fase 3 (parte 2) — Zonas · Analíticas+Sistema · Stream
--
-- Herramientas de crecimiento y confianza de la consola v2. Todo agregado en
-- servidor (a 38.6k negocios / 1.2M usuarios nada se cuenta en el cliente).
--
-- NOTA de fidelidad honesta: la "zona" del handoff es el BARRIO. Hoy los negocios
-- solo guardan `city` (no barrio), así que la unidad real es la CIUDAD — que es
-- exactamente la palanca de crecimiento del founder (Hazleton, Bronx, …). El
-- grano barrio queda registrado en LAUNCH-CHECKLIST para cuando se capture.

-- ════════════════════════════════════════════════════════════════════════════
-- A · ZONAS ACTIVAS — el mapa de crecimiento por ciudad
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.admin_zones(in_sort text default 'gmv', in_city text default null)
returns table (
  zone text, city text, businesses bigint, users bigint, gmv30 numeric,
  trend7 numeric, ratio numeric, state text, opportunity numeric
) language plpgsql stable security definer set search_path = public as $fn$
begin
  perform public._require_admin();
  return query
  with biz as (
    select b.city, count(*) n from public.businesses b where b.city is not null group by b.city
  ), usr as (
    select p.city_label city, count(*) n from public.profiles p where p.city_label is not null group by p.city_label
  ), pay30 as (
    select b.city, coalesce(sum(pm.amount),0)/100.0 g
    from public.payments pm join public.businesses b on b.id = pm.business_id
    where pm.status in ('paid','fulfilled') and pm.created_at >= now() - interval '30 days'
    group by b.city
  ), pay7 as (
    select b.city, coalesce(sum(pm.amount),0)/100.0 g
    from public.payments pm join public.businesses b on b.id = pm.business_id
    where pm.status in ('paid','fulfilled') and pm.created_at >= now() - interval '7 days'
    group by b.city
  ), payprev7 as (
    select b.city, coalesce(sum(pm.amount),0)/100.0 g
    from public.payments pm join public.businesses b on b.id = pm.business_id
    where pm.status in ('paid','fulfilled')
      and pm.created_at >= now() - interval '14 days' and pm.created_at < now() - interval '7 days'
    group by b.city
  ), z as (
    select coalesce(biz.city, usr.city) city,
           coalesce(biz.n,0) nb, coalesce(usr.n,0) nu,
           coalesce(pay30.g,0) g30, coalesce(pay7.g,0) g7, coalesce(payprev7.g,0) gp7
    from biz full join usr on usr.city = biz.city
    left join pay30 on pay30.city = coalesce(biz.city, usr.city)
    left join pay7 on pay7.city = coalesce(biz.city, usr.city)
    left join payprev7 on payprev7.city = coalesce(biz.city, usr.city)
    where coalesce(biz.n,0) > 0 or coalesce(usr.n,0) > 0
  )
  select
    z.city, z.city, z.nb, z.nu, z.g30,
    round(case when z.gp7 > 0 then (z.g7 - z.gp7)/z.gp7*100 else case when z.g7 > 0 then 100 else 0 end end, 0),
    round(z.nu::numeric / greatest(z.nb,1), 0),
    case
      when z.nb = 0 and z.nu > 0 then 'uncovered'
      when z.nb <= 2 and z.nu > 40 then 'dormant'
      when z.g30 > 500 and z.g7 >= z.gp7 then 'hot'
      when z.g7 > z.gp7 then 'growing'
      when z.g7 < z.gp7 then 'cooling'
      else 'growing' end,
    round(z.nu::numeric / greatest(z.nb,1) * (1 + (case when z.gp7 > 0 then (z.g7 - z.gp7)/z.gp7 else 0 end)), 1)
  from z
  where in_city is null or in_city = 'all' or z.city = in_city
  order by
    case when in_sort = 'users' then z.nu when in_sort = 'density' then z.nu::numeric/greatest(z.nb,1)
         when in_sort = 'opportunity' then z.nu::numeric/greatest(z.nb,1) else z.g30 end desc
  limit 60;
end $fn$;
grant execute on function public.admin_zones(text, text) to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- B · ANALÍTICAS + SISTEMA
-- ════════════════════════════════════════════════════════════════════════════
-- Crecimiento semanal por vertical (nuevas filas 7d como % del acumulado previo).
create or replace function public.admin_growth()
returns table (kind text, label text, pct numeric)
language plpgsql stable security definer set search_path = public as $fn$
declare v_week interval := interval '7 days';
begin
  perform public._require_admin(array['finanzas','moderador']);
  return query
  with per_vertical as (
    select 'comunidad' k, (select count(*) from public.posts where created_at >= now()-v_week) n7, (select count(*) from public.posts) tot
    union all select 'negocios', (select count(*) from public.businesses where created_at >= now()-v_week), (select count(*) from public.businesses)
    union all select 'eventos', (select count(*) from public.events where created_at >= now()-v_week), (select count(*) from public.events)
    union all select 'bienes_raices', (select count(*) from public.properties where created_at >= now()-v_week), (select count(*) from public.properties)
    union all select 'autos', (select count(*) from public.vehicles where created_at >= now()-v_week), (select count(*) from public.vehicles)
    union all select 'usuarios', (select count(*) from public.profiles where created_at >= now()-v_week), (select count(*) from public.profiles)
  )
  select 'vertical'::text, k, round(n7::numeric / greatest(tot - n7, 1) * 100, 1) from per_vertical
  union all
  select 'city', c.city, round(c.n7::numeric / greatest(c.tot - c.n7, 1) * 100, 1)
  from (
    select p.city_label city, count(*) filter (where p.created_at >= now()-v_week) n7, count(*) tot
    from public.profiles p where p.city_label is not null group by p.city_label order by count(*) desc limit 5
  ) c;
end $fn$;
grant execute on function public.admin_growth() to authenticated;

-- Embudo REAL con lo que sí medimos: vistas de negocio → contacto (llamar/cómo
-- llegar) → transacción pagada. Los pasos "abrió menú / agregó al carrito" del
-- diseño necesitan tracking de eventos en el cliente → LAUNCH-CHECKLIST.
create or replace function public.admin_funnel()
returns table (step text, label text, count bigint, pct numeric)
language plpgsql stable security definer set search_path = public as $fn$
declare v_views bigint; v_contact bigint; v_paid bigint;
begin
  perform public._require_admin(array['finanzas','moderador']);
  select coalesce(sum(count),0) into v_views from public.business_metric_daily where kind='view' and day >= current_date - 30;
  select coalesce(sum(count),0) into v_contact from public.business_metric_daily where kind in ('call','direction') and day >= current_date - 30;
  select count(*) into v_paid from public.payments where status in ('paid','fulfilled') and created_at >= now()-interval '30 days';
  return query
  select 'view'::text, 'Vieron el negocio'::text, v_views, 100::numeric
  union all select 'contact', 'Contactaron (llamar / cómo llegar)', v_contact, round(v_contact::numeric/greatest(v_views,1)*100,0)
  union all select 'paid', 'Pagaron', v_paid, round(v_paid::numeric/greatest(v_views,1)*100,0);
end $fn$;
grant execute on function public.admin_funnel() to authenticated;

create or replace function public.admin_top_biz(max_results integer default 6)
returns table (rank integer, id uuid, name text, gmv numeric)
language plpgsql stable security definer set search_path = public as $fn$
begin
  perform public._require_admin(array['finanzas','moderador']);
  return query
  select (row_number() over (order by g.gmv desc))::int, g.id, g.name, g.gmv
  from (
    select b.id, b.name, coalesce(sum(pm.amount),0)/100.0 gmv
    from public.businesses b
    join public.payments pm on pm.business_id = b.id
    where pm.status in ('paid','fulfilled') and pm.created_at >= now()-interval '30 days'
    group by b.id, b.name order by gmv desc limit greatest(1, least(max_results, 20))
  ) g;
end $fn$;
grant execute on function public.admin_top_biz(integer) to authenticated;

-- Salud del sistema desde lo observable en SQL: pagos atascados, último pago,
-- tareas programadas, última migración. (La salud de edge functions vive en su
-- panel; aquí mostramos lo que la base sabe.)
create or replace function public.admin_health()
returns table (label text, value text, ok boolean)
language plpgsql stable security definer set search_path = public as $fn$
declare v_stuck int; v_last timestamptz; v_cron int;
begin
  perform public._require_admin();
  select count(*) into v_stuck from public.pending_purchases
    where status in ('fulfilling','failed') or (status='pending' and stripe_payment_intent is not null and updated_at < now()-interval '30 minutes');
  select max(created_at) into v_last from public.payments;
  select count(*) into v_cron from cron.job where active;
  return query
  select 'Pagos por entregar'::text, v_stuck::text, (v_stuck = 0)
  union all select 'Último pago', coalesce(to_char(v_last, 'DD Mon HH24:MI'), '—'), (v_last is not null)
  union all select 'Tareas programadas activas', v_cron::text, (v_cron > 0)
  union all select 'Pagos en línea', case when (select enabled from public.platform_flags where key='checkout.online') then 'ON' else 'OFF' end,
    (select enabled from public.platform_flags where key='checkout.online');
end $fn$;
grant execute on function public.admin_health() to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- C · STREAM — moderar Comunidad en vivo
-- ════════════════════════════════════════════════════════════════════════════
-- Marcado por PALABRAS CLAVE (no IA todavía — registrado en LAUNCH-CHECKLIST).
-- Devuelve un motivo y una "confianza" derivada de cuántas señales encontró.
create or replace function public._stream_flag(in_text text)
returns table (label text, score integer)
language plpgsql immutable set search_path = public as $fn$
declare v text := lower(coalesce(in_text,''));
begin
  if v ~ '(https?://|www\.|\.com|\.net|whatsapp|telegram)' and v ~ '(gratis|ganar|dinero|inversion|invierte|bitcoin|crypto|prestamo)' then
    return query select 'spam-fraude'::text, 92; return;
  end if;
  if v ~ '(idiota|estupid|maldito|puta|pendejo|racista|odio a)' then
    return query select 'lenguaje ofensivo'::text, 80; return;
  end if;
  if v ~ '(gana dinero|trabaja desde casa|inversion garantizada|multiplica tu)' then
    return query select 'posible spam'::text, 66; return;
  end if;
  return; -- sin señales
end $fn$;

create or replace function public.admin_stream(
  in_type text default 'all', in_state text default 'all', in_city text default null, max_results integer default 40
) returns table (
  id uuid, author text, initials text, color text, hood text, city text, ptype text,
  body text, likes integer, comments bigint, shares integer, created_at timestamptz,
  hidden boolean, pinned boolean, featured boolean, flag_label text, flag_score integer
) language plpgsql stable security definer set search_path = public as $fn$
begin
  perform public._require_admin(array['moderador']);
  return query
  select p.id, p.author_name, p.author_initials, p.author_color, p.hood, p.city, p.type,
         coalesce(p.body_es,''), coalesce(array_length(p.recommends,1),0),
         (select count(*) from public.post_comments c where c.post_id = p.id),
         0, p.created_at, p.hidden, p.pinned, p.featured,
         (select f.label from public._stream_flag(p.body_es) f),
         (select f.score from public._stream_flag(p.body_es) f)
  from public.posts p
  where (in_type is null or in_type = 'all' or p.type = in_type)
    and (in_city is null or in_city = 'all' or p.city = in_city)
    and (
      in_state is null or in_state = 'all'
      or (in_state = 'flagged' and (select f.label from public._stream_flag(p.body_es) f) is not null)
      or (in_state = 'hidden' and p.hidden)
      or (in_state = 'pinned' and p.pinned)
    )
  order by p.pinned desc, p.created_at desc
  limit greatest(1, least(max_results, 100));
end $fn$;
grant execute on function public.admin_stream(text, text, text, integer) to authenticated;

create or replace function public.admin_stream_stats()
returns table (posts_today bigint, comments_today bigint, flagged bigint, auto_pct numeric)
language plpgsql stable security definer set search_path = public as $fn$
declare v_posts bigint; v_flagged bigint;
begin
  perform public._require_admin(array['moderador']);
  select count(*) into v_posts from public.posts where created_at >= current_date;
  select count(*) into v_flagged from public.posts where created_at >= current_date
    and (select f.label from public._stream_flag(body_es) f) is not null;
  return query select
    v_posts,
    (select count(*) from public.post_comments where created_at >= current_date),
    v_flagged,
    round((1 - v_flagged::numeric / greatest(v_posts,1)) * 100, 0);
end $fn$;
grant execute on function public.admin_stream_stats() to authenticated;

-- Fijar / dejar de fijar un post en su zona.
create or replace function public.admin_post_pin(in_id uuid, in_on boolean, in_reason text)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  perform public._require_admin(array['moderador']);
  update public.posts set pinned = in_on, pinned_at = case when in_on then now() end where id = in_id;
  perform public._admin_log('stream.pin', 'post', in_id::text, null, jsonb_build_object('pinned', in_on), in_reason);
end $fn$;
grant execute on function public.admin_post_pin(uuid, boolean, text) to authenticated;
