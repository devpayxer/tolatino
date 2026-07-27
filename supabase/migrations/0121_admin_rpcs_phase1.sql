-- 0121_admin_rpcs_phase1.sql — Super Admin Fase 1: los RPCs.
-- Inicio (mission control) · Usuarios · Negocios · Cola de licencias · Bitácora.
-- TODOS son SECURITY DEFINER y empiezan con _require_admin(); toda mutación
-- escribe admin_audit en la MISMA transacción. Dinero en `payments.amount` está
-- en CENTAVOS → se divide entre 100 al exponerlo.
-- Idempotente. Apply: node scripts/sbsql.mjs --file supabase/migrations/0121_admin_rpcs_phase1.sql

-- ── whoami: NO lanza; devuelve vacío si no eres admin (el guard hace 404) ────
create or replace function public.admin_whoami()
returns table (role text, email text)
language sql stable security definer set search_path = public as $$
  select a.role, u.email
  from public.admins a join auth.users u on u.id = a.user_id
  where a.user_id = auth.uid();
$$;
grant execute on function public.admin_whoami() to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- INICIO — KPIs + alertas accionables
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.admin_dashboard()
returns jsonb language plpgsql stable security definer set search_path = public as $fn$
declare v jsonb;
begin
  perform public._require_admin();
  select jsonb_build_object(
    'users', jsonb_build_object(
      'total',     (select count(*) from auth.users),
      'new7',      (select count(*) from auth.users where created_at > now() - interval '7 days'),
      'new30',     (select count(*) from auth.users where created_at > now() - interval '30 days'),
      'suspended', (select count(*) from public.profiles where suspended_until > now())
    ),
    'businesses', jsonb_build_object(
      'total',     (select count(*) from public.businesses),
      'free',      (select count(*) from public.businesses where tier = 'free'),
      'verified',  (select count(*) from public.businesses where tier = 'verified'),
      'premium',   (select count(*) from public.businesses where tier = 'premium'),
      'suspended', (select count(*) from public.businesses where suspended),
      'connect',   (select count(*) from public.businesses where coalesce(connect_charges_enabled,false)),
      'new7',      (select count(*) from public.businesses where created_at > now() - interval '7 days')
    ),
    'money', jsonb_build_object(
      'gmv_today', (select coalesce(sum(amount),0)/100.0 from public.payments where status='paid' and created_at >= date_trunc('day', now())),
      'gmv_7',     (select coalesce(sum(amount),0)/100.0 from public.payments where status='paid' and created_at > now() - interval '7 days'),
      'gmv_30',    (select coalesce(sum(amount),0)/100.0 from public.payments where status='paid' and created_at > now() - interval '30 days'),
      'fees_30',   (select coalesce(sum(application_fee),0)/100.0 from public.payments where status='paid' and created_at > now() - interval '30 days'),
      'tx_30',     (select count(*) from public.payments where status='paid' and created_at > now() - interval '30 days'),
      'refunded_30',(select coalesce(sum(amount),0)/100.0 from public.payments where status='refunded' and created_at > now() - interval '30 days')
    ),
    'tx', jsonb_build_object(
      'orders_today',   (select count(*) from public.business_orders where created_at >= date_trunc('day', now())),
      'bookings_today', (select count(*) from public.business_bookings where created_at >= date_trunc('day', now())),
      'rentals_today',  (select count(*) from public.business_rental_orders where created_at >= date_trunc('day', now())),
      'tickets_today',  (select count(*) from public.event_tickets where created_at >= date_trunc('day', now()))
    ),
    'content', jsonb_build_object(
      'posts7',           (select count(*) from public.posts where created_at > now() - interval '7 days'),
      'events_upcoming',  (select count(*) from public.events where starts_at > now() and status = 'published'),
      'properties',       (select count(*) from public.properties where status = 'published'),
      'vehicles',         (select count(*) from public.vehicles where status = 'published'),
      'reviews7',         (select count(*) from public.reviews where created_at > now() - interval '7 days')
    ),
    'alerts', jsonb_build_object(
      -- riesgo residual documentado: webhook que murió tras reclamar el pago
      'stuck_fulfilling',  (select count(*) from public.pending_purchases where status='fulfilling' and updated_at < now() - interval '15 minutes'),
      'reports_pending',   (select count(*) from public.reports where status='pendiente'),
      'claims_open',       (select count(*) from public.claims where status in ('abierto','en_revision')),
      'licenses_pending',  (select count(*) from public.businesses
                             where verified_license = false
                               and coalesce(re_config->>'license', auto_config->>'license') is not null),
      'businesses_suspended', (select count(*) from public.businesses where suspended),
      'users_suspended',   (select count(*) from public.profiles where suspended_until > now())
    ),
    'recent_payments', (
      select coalesce(jsonb_agg(x order by x->>'created_at' desc), '[]'::jsonb) from (
        select jsonb_build_object(
          'id', p.id, 'kind', p.kind, 'status', p.status,
          'amount', p.amount/100.0, 'fee', coalesce(p.application_fee,0)/100.0,
          'business', b.name, 'created_at', p.created_at
        ) as x
        from public.payments p left join public.businesses b on b.id = p.business_id
        order by p.created_at desc limit 8
      ) s
    )
  ) into v;
  return v;
end $fn$;
grant execute on function public.admin_dashboard() to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- USUARIOS
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.admin_users_list(
  in_q text default null, in_state text default null,   -- 'all'|'suspended'|'owners'
  max_results integer default 30, in_offset integer default 0
) returns table (
  id uuid, email text, display_name text, initials text, avatar_color text,
  city_label text, created_at timestamptz, last_sign_in_at timestamptz,
  suspended_until timestamptz, suspended_reason text,
  businesses bigint, orders bigint, total_count bigint
) language plpgsql stable security definer set search_path = public as $fn$
begin
  perform public._require_admin();
  return query
  with base as (
    select u.id, u.email::text, p.display_name, p.initials, p.avatar_color, p.city_label,
           u.created_at, u.last_sign_in_at, p.suspended_until, p.suspended_reason
    from auth.users u
    left join public.profiles p on p.id = u.id
    where (in_q is null or in_q = '' or u.email ilike '%'||in_q||'%' or p.display_name ilike '%'||in_q||'%')
      and (in_state is null or in_state = 'all'
           or (in_state = 'suspended' and p.suspended_until > now())
           or (in_state = 'owners' and exists (select 1 from public.businesses b where b.owner_id = u.id)))
  )
  select b.*,
    (select count(*) from public.businesses x where x.owner_id = b.id),
    (select count(*) from public.business_orders o where o.user_id = b.id),
    count(*) over ()
  from base b
  order by b.created_at desc
  limit greatest(1, least(max_results, 100)) offset greatest(0, in_offset);
end $fn$;
grant execute on function public.admin_users_list(text, text, integer, integer) to authenticated;

create or replace function public.admin_user_detail(in_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $fn$
declare v jsonb;
begin
  perform public._require_admin();
  select jsonb_build_object(
    'id', u.id, 'email', u.email, 'created_at', u.created_at,
    'last_sign_in_at', u.last_sign_in_at, 'confirmed', u.email_confirmed_at is not null,
    'profile', to_jsonb(p) - 'location',
    'admin_role', (select a.role from public.admins a where a.user_id = u.id),
    'counts', jsonb_build_object(
      'businesses', (select count(*) from public.businesses where owner_id = u.id),
      'orders',     (select count(*) from public.business_orders where user_id = u.id),
      'bookings',   (select count(*) from public.business_bookings where user_id = u.id),
      'tickets',    (select count(*) from public.event_tickets where user_id = u.id),
      'posts',      (select count(*) from public.posts where author_id = u.id),
      'reviews',    (select count(*) from public.reviews where user_id = u.id),
      'properties', (select count(*) from public.properties where owner_id = u.id),
      'vehicles',   (select count(*) from public.vehicles where owner_id = u.id),
      'reports_made',(select count(*) from public.reports where reporter_id = u.id),
      'claims',     (select count(*) from public.claims where claimant_id = u.id)
    ),
    'businesses', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', b.id, 'slug', b.slug, 'name', b.name, 'tier', b.tier,
        'category', b.category_id, 'city', b.city, 'suspended', b.suspended)), '[]'::jsonb)
      from public.businesses b where b.owner_id = u.id),
    'payments', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', pm.id, 'kind', pm.kind, 'status', pm.status, 'amount', pm.amount/100.0,
        'created_at', pm.created_at) order by pm.created_at desc), '[]'::jsonb)
      from (select * from public.payments where buyer_id = u.id order by created_at desc limit 10) pm)
  ) into v
  from auth.users u left join public.profiles p on p.id = u.id
  where u.id = in_id;
  if v is null then raise exception 'usuario no encontrado'; end if;
  return v;
end $fn$;
grant execute on function public.admin_user_detail(uuid) to authenticated;

create or replace function public.admin_user_suspend(in_id uuid, in_days integer, in_reason text)
returns void language plpgsql security definer set search_path = public as $fn$
declare v_before jsonb; v_until timestamptz;
begin
  perform public._require_admin(array['moderador','soporte']);
  if coalesce(trim(in_reason),'') = '' then raise exception 'la razón es obligatoria'; end if;
  if exists (select 1 from public.admins where user_id = in_id) then
    raise exception 'no puedes suspender a un administrador';
  end if;
  v_until := now() + make_interval(days => greatest(1, coalesce(in_days, 7)));
  select jsonb_build_object('suspended_until', suspended_until, 'suspended_reason', suspended_reason)
    into v_before from public.profiles where id = in_id;
  update public.profiles set suspended_until = v_until, suspended_reason = in_reason where id = in_id;
  if not found then raise exception 'usuario no encontrado'; end if;
  perform public._admin_log('user.suspend', 'user', in_id::text, v_before,
    jsonb_build_object('suspended_until', v_until, 'suspended_reason', in_reason), in_reason);
  perform public.notify_user(in_id, 'account_suspended',
    jsonb_build_object('until', v_until, 'reason', in_reason), '/cuenta');
end $fn$;
grant execute on function public.admin_user_suspend(uuid, integer, text) to authenticated;

create or replace function public.admin_user_unsuspend(in_id uuid, in_reason text default null)
returns void language plpgsql security definer set search_path = public as $fn$
declare v_before jsonb;
begin
  perform public._require_admin(array['moderador','soporte']);
  select jsonb_build_object('suspended_until', suspended_until, 'suspended_reason', suspended_reason)
    into v_before from public.profiles where id = in_id;
  update public.profiles set suspended_until = null, suspended_reason = null where id = in_id;
  if not found then raise exception 'usuario no encontrado'; end if;
  perform public._admin_log('user.unsuspend', 'user', in_id::text, v_before, null, in_reason);
  perform public.notify_user(in_id, 'account_restored', '{}'::jsonb, '/cuenta');
end $fn$;
grant execute on function public.admin_user_unsuspend(uuid, text) to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- NEGOCIOS
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.admin_businesses_list(
  in_q text default null, in_cat text default null, in_city text default null,
  in_tier text default null, in_state text default null,   -- 'all'|'suspended'|'connect'|'no_connect'
  max_results integer default 30, in_offset integer default 0
) returns table (
  id uuid, slug text, name text, category_id text, city text, tier text,
  suspended boolean, verified_license boolean, connect boolean,
  rating numeric, reviews_count integer, owner_email text,
  created_at timestamptz, license text, total_count bigint
) language plpgsql stable security definer set search_path = public as $fn$
begin
  perform public._require_admin();
  return query
  select b.id, b.slug, b.name, b.category_id, b.city, b.tier,
         b.suspended, b.verified_license, coalesce(b.connect_charges_enabled,false),
         b.rating, b.reviews_count, u.email::text, b.created_at,
         coalesce(b.re_config->>'license', b.auto_config->>'license'),
         count(*) over ()
  from public.businesses b
  left join auth.users u on u.id = b.owner_id
  where (in_q is null or in_q = '' or b.name ilike '%'||in_q||'%' or b.slug ilike '%'||in_q||'%' or u.email ilike '%'||in_q||'%')
    and (in_cat is null or in_cat = 'all' or b.category_id = in_cat)
    and (in_city is null or in_city = '' or b.city ilike in_city||'%')
    and (in_tier is null or in_tier = 'all' or b.tier = in_tier)
    and (in_state is null or in_state = 'all'
         or (in_state = 'suspended' and b.suspended)
         or (in_state = 'connect' and coalesce(b.connect_charges_enabled,false))
         or (in_state = 'no_connect' and not coalesce(b.connect_charges_enabled,false)))
  order by b.created_at desc
  limit greatest(1, least(max_results, 100)) offset greatest(0, in_offset);
end $fn$;
grant execute on function public.admin_businesses_list(text, text, text, text, text, integer, integer) to authenticated;

create or replace function public.admin_business_detail(in_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $fn$
declare v jsonb;
begin
  perform public._require_admin();
  select jsonb_build_object(
    'business', to_jsonb(b) - 'location' - 'search_vector' - 'search_tsv',
    'owner', jsonb_build_object('id', u.id, 'email', u.email,
             'name', (select display_name from public.profiles where id = u.id)),
    'counts', jsonb_build_object(
      'orders',    (select count(*) from public.business_orders where business_id = b.id),
      'bookings',  (select count(*) from public.business_bookings where business_id = b.id),
      'items',     (select count(*) from public.business_items where business_id = b.id),
      'events',    (select count(*) from public.events where owner_id = b.owner_id),
      'properties',(select count(*) from public.properties where business_id = b.id),
      'vehicles',  (select count(*) from public.vehicles where business_id = b.id),
      'photos',    (select count(*) from public.business_photos where business_id = b.id),
      'staff',     (select count(*) from public.business_staff where business_id = b.id),
      'reviews',   (select count(*) from public.reviews where business_id = b.id)
    ),
    'money', jsonb_build_object(
      'gross_30', (select coalesce(sum(amount),0)/100.0 from public.payments
                    where business_id = b.id and status='paid' and created_at > now() - interval '30 days'),
      'fees_30',  (select coalesce(sum(application_fee),0)/100.0 from public.payments
                    where business_id = b.id and status='paid' and created_at > now() - interval '30 days'),
      'tx_30',    (select count(*) from public.payments where business_id = b.id and status='paid' and created_at > now() - interval '30 days')
    ),
    'subscription', (select to_jsonb(s) from public.business_subscriptions s where s.business_id = b.id limit 1)
  ) into v
  from public.businesses b left join auth.users u on u.id = b.owner_id
  where b.id = in_id;
  if v is null then raise exception 'negocio no encontrado'; end if;
  return v;
end $fn$;
grant execute on function public.admin_business_detail(uuid) to authenticated;

create or replace function public.admin_business_suspend(in_id uuid, in_suspend boolean, in_reason text)
returns void language plpgsql security definer set search_path = public as $fn$
declare v_before jsonb; v_owner uuid; v_name text;
begin
  perform public._require_admin(array['moderador','soporte']);
  if in_suspend and coalesce(trim(in_reason),'') = '' then raise exception 'la razón es obligatoria'; end if;
  select jsonb_build_object('suspended', suspended, 'suspended_reason', suspended_reason), owner_id, name
    into v_before, v_owner, v_name from public.businesses where id = in_id;
  if v_owner is null and v_before is null then raise exception 'negocio no encontrado'; end if;
  update public.businesses
     set suspended = in_suspend,
         suspended_reason = case when in_suspend then in_reason else null end
   where id = in_id;
  perform public._admin_log(case when in_suspend then 'business.suspend' else 'business.unsuspend' end,
    'business', in_id::text, v_before, jsonb_build_object('suspended', in_suspend, 'suspended_reason', in_reason), in_reason);
  perform public.notify_user(v_owner, case when in_suspend then 'business_suspended' else 'business_restored' end,
    jsonb_build_object('business', v_name, 'reason', in_reason), '/negocio');
end $fn$;
grant execute on function public.admin_business_suspend(uuid, boolean, text) to authenticated;

create or replace function public.admin_business_set_tier(in_id uuid, in_tier text, in_reason text)
returns void language plpgsql security definer set search_path = public as $fn$
declare v_before text; v_owner uuid; v_name text;
begin
  perform public._require_admin(array['finanzas','soporte']);
  if in_tier not in ('free','verified','premium') then raise exception 'plan inválido'; end if;
  select tier, owner_id, name into v_before, v_owner, v_name from public.businesses where id = in_id;
  if v_owner is null and v_before is null then raise exception 'negocio no encontrado'; end if;
  update public.businesses set tier = in_tier where id = in_id;
  perform public._admin_log('business.tier', 'business', in_id::text,
    jsonb_build_object('tier', v_before), jsonb_build_object('tier', in_tier), in_reason);
  perform public.notify_user(v_owner, 'business_tier_changed',
    jsonb_build_object('business', v_name, 'tier', in_tier), '/negocio');
end $fn$;
grant execute on function public.admin_business_set_tier(uuid, text, text) to authenticated;

-- ── Cola de verificación de licencias (agentes inmobiliarios / dealers) ─────
create or replace function public.admin_license_queue(max_results integer default 50)
returns table (
  id uuid, slug text, name text, category_id text, city text, tier text,
  license text, seller_type text, langs text, owner_email text,
  verified_license boolean, created_at timestamptz
) language plpgsql stable security definer set search_path = public as $fn$
begin
  perform public._require_admin();
  return query
  select b.id, b.slug, b.name, b.category_id, b.city, b.tier,
         coalesce(b.re_config->>'license', b.auto_config->>'license'),
         coalesce(b.re_config->>'specialty', b.auto_config->>'sellerType'),
         coalesce(b.re_config->>'langs', b.auto_config->>'langs'),
         u.email::text, b.verified_license, b.created_at
  from public.businesses b
  left join auth.users u on u.id = b.owner_id
  where coalesce(b.re_config->>'license', b.auto_config->>'license') is not null
  order by b.verified_license asc, b.created_at desc
  limit greatest(1, least(max_results, 200));
end $fn$;
grant execute on function public.admin_license_queue(integer) to authenticated;

create or replace function public.admin_license_verify(in_id uuid, in_approve boolean, in_reason text default null)
returns void language plpgsql security definer set search_path = public as $fn$
declare v_before boolean; v_owner uuid; v_name text; v_lic text;
begin
  perform public._require_admin(array['moderador','soporte']);
  select verified_license, owner_id, name, coalesce(re_config->>'license', auto_config->>'license')
    into v_before, v_owner, v_name, v_lic from public.businesses where id = in_id;
  if v_owner is null and v_before is null then raise exception 'negocio no encontrado'; end if;
  if in_approve and coalesce(trim(v_lic),'') = '' then raise exception 'ese negocio no tiene licencia registrada'; end if;
  update public.businesses set verified_license = in_approve where id = in_id;
  perform public._admin_log(case when in_approve then 'license.approve' else 'license.reject' end,
    'business', in_id::text, jsonb_build_object('verified_license', v_before),
    jsonb_build_object('verified_license', in_approve, 'license', v_lic), in_reason);
  perform public.notify_user(v_owner, case when in_approve then 'license_approved' else 'license_rejected' end,
    jsonb_build_object('business', v_name, 'reason', in_reason), '/negocio');
end $fn$;
grant execute on function public.admin_license_verify(uuid, boolean, text) to authenticated;

-- ── Bitácora (lectura) ──────────────────────────────────────────────────────
create or replace function public.admin_audit_list(
  in_entity_type text default null, in_entity_id text default null,
  in_action text default null, max_results integer default 50, in_offset integer default 0
) returns table (
  id bigint, actor_email text, action text, entity_type text, entity_id text,
  before jsonb, after jsonb, reason text, created_at timestamptz, total_count bigint
) language plpgsql stable security definer set search_path = public as $fn$
begin
  perform public._require_admin();
  return query
  select a.id, a.actor_email, a.action, a.entity_type, a.entity_id,
         a.before, a.after, a.reason, a.created_at, count(*) over ()
  from public.admin_audit a
  where (in_entity_type is null or a.entity_type = in_entity_type)
    and (in_entity_id is null or a.entity_id = in_entity_id)
    and (in_action is null or a.action like in_action || '%')
  order by a.created_at desc
  limit greatest(1, least(max_results, 200)) offset greatest(0, in_offset);
end $fn$;
grant execute on function public.admin_audit_list(text, text, text, integer, integer) to authenticated;
