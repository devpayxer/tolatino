-- 0081 · Noche: servicios (cover que sigue a la herramienta, lista, mesa con cuántas hay, VIP, noche especial, por fecha),
-- «Esta noche» (Tu herramienta), el historial de lo publicado cada noche, la licencia de licor y la comisión (Fase 4 · 4na).
-- Plan: docs/diseno/plan/fase4-noche.md §2 y §4na. Diseño: neg-noche.js (nt), neg-noche-listing.js (k cover · lista · mesa · vip ·
-- evento · fecha), dash2-cat.js blocksC L387–396. La app NO vende cover, tragos ni botellas: la lista es $0 y la mesa solo lleva
-- depósito (4nc). Lo que sale en la tarjeta y en Buscar se deriva de noche_settings: nunca se edita a mano. Idempotente.
begin;

alter table items drop constraint if exists items_svc_kind_check;
alter table items add constraint items_svc_kind_check check (svc_kind = any (array[
  'fijo', 'desde', 'cotiza', 'diag', 'lav', 'goma', 'insp', 'grua', 'visita', 'hora', 'area', 'pres', 'emer', 'plan',
  'cons', 'tele', 'walk', 'free', 'proc', 'pct', 'pack', 'unid', 'asiento', 'priv', 'caja',
  'cover', 'lista', 'mesa', 'vip', 'evento', 'fecha']));

-- «Esta noche» (una fila por negocio). Las horas van en minutos desde las 12 PM de la noche (660 = 11 PM, 780 = 1 AM): la noche
-- pasa de las 24 sin cambiar de fecha.
create table if not exists noche_settings (
  business_id text primary key references businesses (id),
  city_id text not null references cities (id),
  cover_cents int not null default 0 check (cover_cents between 0 and 10000 and cover_cents % 100 = 0),
  after_min smallint check (after_min is null or after_min in (660, 720)),
  after_cents int check (after_cents is null or (after_cents between 0 and 15000 and after_cents % 100 = 0)),
  cover_by_dow jsonb not null default '{}'::jsonb check (jsonb_typeof(cover_by_dow) = 'object'),
  min_age smallint not null default 21 check (min_age in (18, 21)),
  list_on boolean not null default false,
  list_until_min smallint check (list_until_min is null or list_until_min between 540 and 780),
  list_cap smallint check (list_cap is null or list_cap between 1 and 2000),
  line_min smallint check (line_min is null or line_min in (0, 10, 20, 35)),
  line_at timestamptz,
  music text[] not null default '{}' check (music <@ array['m:salsa', 'm:bachata', 'm:tipico', 'm:reggaeton', 'm:banda', 'm:envivo', 'm:mixto']),
  music_note jsonb check (music_note is null or char_length(music_note->>'es') <= 60),
  dress jsonb check (dress is null or char_length(dress->>'es') <= 60),
  reply_min smallint not null default 60 check (reply_min between 15 and 240),
  hold_min smallint not null default 30 check (hold_min between 10 and 120),
  -- Lo que el barrido mira para recalcular la tarjeta y los filtros solo cuando cambia algo (la noche o la fila deja de ser de ahora).
  derived_night date,
  derived_line_live boolean not null default false,
  kind_override text check (kind_override in ('club', 'salsa', 'urbano', 'banda', 'bar', 'sport', 'karaoke', 'billar', 'cerve', 'lounge', 'show', 'dj', 'promo', 'salon')),
  updated_by uuid references users (id),
  updated_at timestamptz not null default now(),
  -- «Después de cierta hora» solo si sube (MEM 164): las dos juntas o ninguna.
  check ((after_min is null) = (after_cents is null)),
  check (after_cents is null or after_cents > cover_cents),
  check (not list_on or list_until_min is not null),
  check ((line_min is null) = (line_at is null))
);

-- Lo que el local publicó cada noche (cover, «después de», por día, edad, lista, fila, música, vestimenta). SOLO INSERCIÓN:
-- la Ayuda («el cover que publicó esa noche a esa hora»), la Analítica y el aviso de cover leen de aquí.
create table if not exists night_posts (
  id bigint generated always as identity primary key,
  business_id text not null references businesses (id),
  city_id text not null references cities (id),
  night date not null,
  field text not null check (field in ('cover', 'after', 'by_dow', 'age', 'list', 'line', 'music', 'dress')),
  value jsonb not null,
  at timestamptz not null default now(),
  by uuid references users (id)
);
create index if not exists noche_settings_barrido_idx on noche_settings (derived_night, line_at);
create index if not exists night_posts_noche_idx on night_posts (business_id, night, at);
create or replace function night_posts_inmutable() returns trigger language plpgsql as $$
begin
  raise exception 'night_posts es solo inserción (historial de lo publicado)';
end $$;
drop trigger if exists night_posts_inmutable on night_posts;
create trigger night_posts_inmutable before update or delete on night_posts for each row execute function night_posts_inmutable();

-- Licencia de licor del PLCB: sello que se ve en la ficha (la app no vende alcohol; no bloquea nada). Sin verificar la lista legal
-- (LAUNCH-CHECKLIST: revisar con abogado hookah y after-hours).
insert into license_kinds (key, category_id, title, can, cannot, issuer, registry_site, registry_url, number_label, sort) values
  ('pa_plcb', 'NEG-NOCHE', '{"es":"Licencia de licor (PLCB)","en":"Liquor license (PLCB)"}', '{"es":"Vender y servir alcohol en el local","en":"Sell and serve alcohol on premises"}',
   '{"es":"To''Latino no vende alcohol: se compra en el local con identificación","en":"To''Latino does not sell alcohol: it is bought at the venue with ID"}',
   '{"es":"Junta de Control de Licores de Pennsylvania (PLCB)","en":"Pennsylvania Liquor Control Board (PLCB)"}', 'plcbplus.pa.gov', 'https://plcbplus.pa.gov/pub/Default.aspx?PossePresentation=LicenseSearch', 'Licencia #', 1)
on conflict (key) do nothing;

-- Comisión del depósito de mesa (Preguntas #12): empieza igual que la de boletos para que el fundador la mueva aparte.
alter table fee_rules drop constraint fee_rules_kind_check;
alter table fee_rules add constraint fee_rules_kind_check check (kind = any (array['ped', 'cita', 'bol', 'apt', 'rsv', 'plan', 'renta', 'merc', 'fiesta', 'viaje', 'noche']));
insert into fee_rules (kind, rate_bp, fixed_cents, effective_from, reason)
select 'noche', 500, 100, '2026-01-01', 'Comisión inicial del depósito de mesa de Noche (igual que la de boletos; Super Admin › Planes)'
 where not exists (select 1 from fee_rules where kind = 'noche');
commit;
