-- 0120_admin_foundation.sql — Super Admin, Fase 1: FUNDACIÓN DE SEGURIDAD.
-- Plan: docs/ADMIN-DASHBOARD-PLAN.md §1/§5.
--
-- Principio: el admin NUNCA salta la seguridad desde el cliente. Estas tablas
-- son inaccesibles para anon/authenticated (RLS sin políticas + REVOKE); todo
-- acceso pasa por RPCs SECURITY DEFINER que llaman `_require_admin()` y auditan
-- en la MISMA transacción. La app es un export estático: sin fila en `admins`,
-- los RPCs devuelven 'forbidden' y la UI no obtiene ni un dato.
--
-- Idempotente. Apply: node scripts/sbsql.mjs --file supabase/migrations/0120_admin_foundation.sql

-- ════════════════════════════════════════════════════════════════════════════
-- 1 · admins — quién puede administrar y con qué rol
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       text not null check (role in ('superadmin','finanzas','moderador','soporte')),
  note       text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
-- Sin políticas = deny-all para anon/authenticated. Los definers (owner) sí leen.
revoke all on public.admins from anon, authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 2 · admin_audit — bitácora INMUTABLE de toda acción administrativa
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.admin_audit (
  id          bigserial primary key,
  actor_id    uuid references auth.users(id) on delete set null,
  actor_email text,
  action      text not null,              -- 'user.suspend', 'business.tier', …
  entity_type text,                       -- 'user' | 'business' | 'license' | …
  entity_id   text,                       -- uuid/slug/key (texto: sirve para todo)
  before      jsonb,
  after       jsonb,
  reason      text,
  created_at  timestamptz not null default now()
);
create index if not exists admin_audit_time_idx   on public.admin_audit (created_at desc);
create index if not exists admin_audit_actor_idx  on public.admin_audit (actor_id, created_at desc);
create index if not exists admin_audit_entity_idx on public.admin_audit (entity_type, entity_id, created_at desc);
alter table public.admin_audit enable row level security;
revoke all on public.admin_audit from anon, authenticated;
-- Inmutable incluso para el owner: sin UPDATE/DELETE por trigger.
create or replace function public.tg_audit_immutable() returns trigger
language plpgsql as $$
begin
  raise exception 'admin_audit es inmutable';
end $$;
drop trigger if exists audit_no_update on public.admin_audit;
create trigger audit_no_update before update or delete on public.admin_audit
  for each row execute function public.tg_audit_immutable();

-- ════════════════════════════════════════════════════════════════════════════
-- 3 · platform_flags (kill-switches, lectura pública) + platform_config (interno)
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.platform_flags (
  key        text primary key,            -- 'vertical.autos', 'banner.global', 'maintenance'
  enabled    boolean not null default true,
  payload    jsonb not null default '{}'::jsonb,
  label_es   text,
  label_en   text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.platform_flags enable row level security;
drop policy if exists "public read flags" on public.platform_flags;
-- El cliente LEE flags (para apagar una vertical al instante); solo admin escribe.
create policy "public read flags" on public.platform_flags for select using (true);

create table if not exists public.platform_config (
  key        text primary key,            -- 'fees.service_pct', 'fees.commission_pct', …
  value      jsonb not null,
  label_es   text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.platform_config enable row level security;
revoke all on public.platform_config from anon, authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 4 · reports — cola de moderación UNIFICADA (generaliza post_reports)
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in
    ('post','comment','review','event_review','business','event','property','vehicle','update','user','message')),
  entity_id   text not null,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason      text not null,
  detail      text,
  status      text not null default 'pendiente' check (status in ('pendiente','revisado','accionado','descartado')),
  handled_by  uuid references auth.users(id) on delete set null,
  handled_at  timestamptz,
  note        text,
  created_at  timestamptz not null default now(),
  unique (entity_type, entity_id, reporter_id)   -- un reporte por usuario por entidad
);
create index if not exists reports_queue_idx  on public.reports (status, created_at desc);
create index if not exists reports_entity_idx on public.reports (entity_type, entity_id);
alter table public.reports enable row level security;
drop policy if exists "own report insert" on public.reports;
create policy "own report insert" on public.reports for insert with check (reporter_id = auth.uid());
drop policy if exists "own report read" on public.reports;
create policy "own report read" on public.reports for select using (reporter_id = auth.uid());
drop trigger if exists ugc_ratelimit on public.reports;
create trigger ugc_ratelimit before insert on public.reports
  for each row execute function public.tg_ugc_ratelimit('reporter_id', '20');

-- Migrar los reportes de posts existentes (sin perder nada).
insert into public.reports (entity_type, entity_id, reporter_id, reason, created_at)
select 'post', pr.post_id::text, pr.reporter_id, coalesce(pr.reason, 'sin razón'), pr.created_at
from public.post_reports pr
on conflict (entity_type, entity_id, reporter_id) do nothing;

-- ════════════════════════════════════════════════════════════════════════════
-- 5 · claims — reclamos/disputas comprador ↔ vendedor (hilo a 3 bandas)
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.claims (
  id            uuid primary key default gen_random_uuid(),
  kind          text not null check (kind in ('orden','reserva','renta','boleto','otro')),
  ref_id        uuid,                     -- id de la orden/reserva/renta/boleto
  ref_code      text,                     -- código legible
  business_id   uuid references public.businesses(id) on delete set null,
  claimant_id   uuid not null references auth.users(id) on delete cascade,
  reason        text not null,
  detail        text,
  status        text not null default 'abierto' check (status in ('abierto','en_revision','resuelto','rechazado')),
  assigned_to   uuid references auth.users(id) on delete set null,
  resolution    text,
  refund_amount numeric(12,2),
  messages      jsonb not null default '[]'::jsonb,  -- [{at, side:'cliente'|'negocio'|'admin', user_id, text}]
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  resolved_at   timestamptz
);
create index if not exists claims_queue_idx on public.claims (status, created_at desc);
create index if not exists claims_biz_idx   on public.claims (business_id, created_at desc);
create index if not exists claims_user_idx  on public.claims (claimant_id, created_at desc);
alter table public.claims enable row level security;
drop policy if exists "claim read parties" on public.claims;
-- Lo ven las dos partes (comprador y dueño del negocio). El admin va por RPC.
create policy "claim read parties" on public.claims for select using (
  claimant_id = auth.uid()
  or exists (select 1 from public.businesses b where b.id = claims.business_id and b.owner_id = auth.uid())
);
drop policy if exists "claim insert own" on public.claims;
create policy "claim insert own" on public.claims for insert with check (claimant_id = auth.uid());
drop trigger if exists ugc_ratelimit on public.claims;
create trigger ugc_ratelimit before insert on public.claims
  for each row execute function public.tg_ugc_ratelimit('claimant_id', '10');

-- ════════════════════════════════════════════════════════════════════════════
-- 6 · Suspensiones y verificación (columnas sobre lo existente)
-- ════════════════════════════════════════════════════════════════════════════
alter table public.profiles   add column if not exists suspended_until  timestamptz;
alter table public.profiles   add column if not exists suspended_reason text;
alter table public.businesses add column if not exists suspended        boolean not null default false;
alter table public.businesses add column if not exists suspended_reason text;
alter table public.businesses add column if not exists verified_license boolean not null default false;
create index if not exists businesses_suspended_idx on public.businesses (suspended) where suspended;

-- ════════════════════════════════════════════════════════════════════════════
-- 7 · Helpers: _require_admin (portero) y _admin_log (bitácora)
-- ════════════════════════════════════════════════════════════════════════════
-- Devuelve el rol del llamante o lanza 'forbidden'. superadmin siempre pasa.
create or replace function public._require_admin(in_roles text[] default null)
returns text language plpgsql stable security definer set search_path = public as $fn$
declare v_role text;
begin
  if auth.uid() is null then raise exception 'auth required' using errcode = '42501'; end if;
  select role into v_role from public.admins where user_id = auth.uid();
  if v_role is null then raise exception 'forbidden' using errcode = '42501'; end if;
  if in_roles is not null and v_role <> 'superadmin' and not (v_role = any (in_roles)) then
    raise exception 'forbidden: se requiere %', array_to_string(in_roles, ' / ') using errcode = '42501';
  end if;
  return v_role;
end $fn$;
revoke all on function public._require_admin(text[]) from public, anon, authenticated;

-- Escribe en la bitácora. Solo invocable desde otros definers (revocado al cliente).
create or replace function public._admin_log(
  in_action text, in_entity_type text, in_entity_id text,
  in_before jsonb default null, in_after jsonb default null, in_reason text default null
) returns void language plpgsql security definer set search_path = public as $fn$
declare v_email text;
begin
  select email into v_email from auth.users where id = auth.uid();
  insert into public.admin_audit (actor_id, actor_email, action, entity_type, entity_id, before, after, reason)
  values (auth.uid(), v_email, in_action, in_entity_type, in_entity_id, in_before, in_after, in_reason);
end $fn$;
revoke all on function public._admin_log(text, text, text, jsonb, jsonb, text) from public, anon, authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 8 · La suspensión de usuario MUERDE de verdad (punto único de control)
--     tg_ugc_ratelimit ya corre antes de cada insert de contenido del usuario
--     (posts, comentarios, reseñas, propiedades, vehículos, leads, tours,
--     pruebas, reportes, reclamos) → añadimos ahí el chequeo de suspensión.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.tg_ugc_ratelimit() returns trigger
language plpgsql set search_path to 'public' as $fn$
declare
  col text := tg_argv[0];
  lim int := tg_argv[1]::int;
  uid uuid;
  n   int;
  susp timestamptz;
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  uid := (to_jsonb(new) ->> col)::uuid;
  if uid is null or uid <> auth.uid() then return new; end if;   -- only the acting user's own writes
  -- Suspensión (0120): un usuario suspendido no puede publicar nada.
  select p.suspended_until into susp from public.profiles p where p.id = uid;
  if susp is not null and susp > now() then
    raise exception 'Tu cuenta está suspendida temporalmente. Escríbenos si crees que es un error.'
      using errcode = 'check_violation';
  end if;
  execute format(
    'select count(*) from public.%I where %I = $1 and created_at > now() - interval ''1 hour''',
    tg_table_name, col
  ) into n using uid;
  if n >= lim then
    raise exception 'Demasiadas acciones en poco tiempo. Espera un momento e intenta de nuevo.'
      using errcode = 'check_violation';
  end if;
  return new;
end $fn$;

-- ════════════════════════════════════════════════════════════════════════════
-- 9 · La suspensión de NEGOCIO lo oculta del cliente (búsqueda + detalle)
--     Parche quirúrgico: reinyecta el filtro en el WHERE de los RPCs de lectura
--     sin reescribir sus cuerpos (idempotente: no re-parchea si ya está).
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare v_def text;
begin
  select pg_get_functiondef(p.oid) into v_def
    from pg_proc p where p.proname = 'search_businesses' and p.pronamespace = 'public'::regnamespace limit 1;
  if v_def is not null and position('b.suspended' in v_def) = 0 then
    v_def := replace(v_def, 'where b.tile_a is not null', 'where b.tile_a is not null and b.suspended = false');
    execute v_def;
  end if;

  select pg_get_functiondef(p.oid) into v_def
    from pg_proc p where p.proname = 'business_by_slug' and p.pronamespace = 'public'::regnamespace limit 1;
  if v_def is not null and position('b.suspended' in v_def) = 0 then
    v_def := replace(v_def, 'where b.slug = in_slug', 'where b.slug = in_slug and b.suspended = false');
    execute v_def;
  end if;
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- 10 · Semillas: primer superadmin + config y flags por defecto
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare v_uid uuid;
begin
  select id into v_uid from auth.users where lower(email) = 'dev@payxer.com' limit 1;
  if v_uid is not null then
    insert into public.admins (user_id, role, note)
    values (v_uid, 'superadmin', 'Fundador — primer superadmin (semilla 0120)')
    on conflict (user_id) do update set role = 'superadmin';
  end if;
end $$;

insert into public.platform_config (key, value, label_es) values
  ('fees.service_pct',    '5'::jsonb,    'Cargo por servicio al comprador (%)'),
  ('fees.commission_pct', '15'::jsonb,   'Comisión de To''Latino al negocio (%)'),
  ('limits.free_listings','3'::jsonb,    'Listados incluidos en el plan gratis'),
  ('support.email',       '"hola@tolatino.com"'::jsonb, 'Correo de soporte')
on conflict (key) do nothing;

insert into public.platform_flags (key, enabled, label_es, label_en) values
  ('vertical.comunidad',    true, 'Comunidad',            'Community'),
  ('vertical.negocios',     true, 'Negocios',             'Businesses'),
  ('vertical.eventos',      true, 'Eventos',              'Events'),
  ('vertical.bienes_raices',true, 'Bienes Raíces',        'Real Estate'),
  ('vertical.autos',        true, 'Dealer de carros',     'Car Dealers'),
  ('checkout.online',       true, 'Pagos en línea',       'Online payments'),
  ('maintenance',          false, 'Modo mantenimiento',   'Maintenance mode'),
  ('banner.global',        false, 'Banner global',        'Global banner')
on conflict (key) do nothing;
