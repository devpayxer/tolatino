-- 0174 · C-003 (canvas tolatino-master+, project/entrega/cambios.md, «LISTO PARA CÓDIGO» 10 nov) — Patrocinados de la página de Eventos.
-- Quien publica un evento (el negocio organizador, Free o Pro) compra uno de los puestos de «Patrocinados» de Eventos de su ciudad: 6 puestos por
-- ciudad (patrocinio_evt_puestos), por 1 semana, 1 mes o «hasta el evento» (solo si el evento todavía no llega: el precio de la semana por cada
-- semana o fracción hasta el día del evento; no se renueva). Se paga con la tarjeta guardada de quien compra (cobro directo a To'Latino, como Pro
-- y como el patrocinio de un negocio, 0173). Un evento cancelado o que ya pasó termina su patrocinio solo (el barrido).
-- Lo decide la base:
--   · event_sponsorships: un patrocinio por período (reservado · activo · terminado · cancelado). Nada se borra; lo que define el período (evento,
--     negocio, ciudad, fechas, duración, precio, quién paga) no cambia después de pagar. Una renovación es otra fila (renewed_from).
--   · patrocinio_evt_reglas: nunca más de patrocinio_evt_puestos vivos a la vez en una ciudad (con candado por ciudad), un evento no tiene dos
--     patrocinios que se crucen, el evento es de ese negocio y de esa ciudad y tiene una fecha publicada por delante; los estados solo van hacia
--     adelante; «hasta el evento» no se renueva.
--   · El libro (sponsorship_payments), las entradas, las vistas, las cifras y «Avísame» de 0173 aceptan kind = 'evento' (ref_id = el patrocinio
--     del evento). Las cifras siguen siendo derivadas: «boletos» (sponsorship_stats.orders) = boletos y RSVP de quien antes entró desde la tarjeta.
-- Los precios y los puestos se cambian en Super Admin › Configuración › Crecimiento. Idempotente.
begin;

-- ── Configuración › Crecimiento ──
insert into config_keys (key, min, max, def, unit, section, label, help, editable, bloqueo, edit_in, sort) values
  ('patrocinio_evt_puestos', 1, 12, 6, '{"es":"puestos","en":"slots"}', 'crecimiento', '{"es":"Patrocinados de Eventos · puestos por ciudad","en":"Sponsored events · slots per city"}',
    '{"es":"Cuántos eventos pueden estar en Patrocinados de la página de Eventos a la vez en una ciudad. Bajarlo no quita a nadie: deja de vender puestos hasta que queden menos.","en":"How many events can be in Sponsored on the Events page at once in a city. Lowering it removes nobody: it stops selling slots until fewer remain."}', true, null, null, 1024),
  ('patrocinio_evt_semana_cents', 100, 100000, 1500, '{"es":"centavos","en":"cents"}', 'crecimiento', '{"es":"Patrocinados de Eventos · precio de 1 semana","en":"Sponsored events · price for 1 week"}',
    '{"es":"Lo que paga un organizador por 1 semana en Patrocinados de Eventos. «Hasta el evento» cobra este precio por cada semana o fracción hasta el día del evento. Lo ya pagado no cambia.","en":"What an organizer pays for 1 week in Sponsored on the Events page. «Until the event» charges this price for each week or part of a week until the event day. What was already paid does not change."}', true, null, null, 1025),
  ('patrocinio_evt_mes_cents', 100, 300000, 4500, '{"es":"centavos","en":"cents"}', 'crecimiento', '{"es":"Patrocinados de Eventos · precio de 1 mes","en":"Sponsored events · price for 1 month"}',
    '{"es":"Lo que paga un organizador por 1 mes en Patrocinados de Eventos. Lo ya pagado no cambia.","en":"What an organizer pays for 1 month in Sponsored on the Events page. What was already paid does not change."}', true, null, null, 1026)
on conflict (key) do nothing;

-- ── Patrocinios de eventos ──
create table if not exists event_sponsorships (
  id            bigint generated always as identity primary key,
  event_id      bigint not null references events (id),
  business_id   text not null references businesses (id),
  city_id       text not null references cities (id),
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  duration      text not null check (duration in ('week', 'month', 'until_event')),
  status        text not null check (status in ('reservado', 'activo', 'terminado', 'cancelado')),
  price_cents   integer not null check (price_cents > 0),
  payer_user_id uuid not null references users (id),
  card_pm       text,
  auto_renew    boolean not null default false,
  renewed_from  bigint references event_sponsorships (id),
  end_kind      text check (end_kind in ('vencio', 'dueno', 'admin', 'evento_cancelado', 'evento_paso')),
  end_reason    text check (end_reason is null or length(end_reason) between 3 and 300),
  ended_at      timestamptz,
  ended_by      uuid references users (id),
  renew_note    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (ends_at > starts_at),
  check ((status in ('terminado', 'cancelado')) = (ended_at is not null)),
  check (end_kind <> 'admin' or end_reason is not null),
  check (duration <> 'until_event' or not auto_renew)
);
-- Lo vivo de una ciudad (la vitrina y los puestos), lo de cada evento y negocio (el panel), la lista del Super Admin y el barrido.
create index if not exists event_sponsorships_vivos_idx on event_sponsorships (city_id, starts_at, ends_at) where status in ('reservado', 'activo');
create index if not exists event_sponsorships_evento_idx on event_sponsorships (event_id, created_at desc);
create index if not exists event_sponsorships_negocio_idx on event_sponsorships (business_id, created_at desc);
create index if not exists event_sponsorships_ciudad_idx on event_sponsorships (city_id, created_at desc, id desc);
create index if not exists event_sponsorships_vencen_idx on event_sponsorships (ends_at) where status = 'activo';
create index if not exists event_sponsorships_empiezan_idx on event_sponsorships (starts_at) where status = 'reservado';
create unique index if not exists event_sponsorships_una_renovacion on event_sponsorships (renewed_from) where renewed_from is not null;

-- Cuántos patrocinios de eventos vivos se cruzan con [a, b) en una ciudad en el peor momento (el máximo a la vez). `fuera` = la fila que se revisa.
create or replace function patrocinio_evt_a_la_vez(ciudad text, a timestamptz, b timestamptz, fuera bigint) returns integer language sql stable as $$
  select coalesce(max((select count(*) from public.event_sponsorships s2 where s2.city_id = ciudad and s2.status in ('reservado', 'activo')
                         and s2.id is distinct from fuera and s2.starts_at <= p.t and s2.ends_at > p.t)), 0)::int
    from (select a as t union select s.starts_at from public.event_sponsorships s where s.city_id = ciudad and s.status in ('reservado', 'activo')
            and s.id is distinct from fuera and s.starts_at > a and s.starts_at < b) p
$$;

create or replace function patrocinio_evt_reglas() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'event_sponsorships: un patrocinio no se borra (estados)'; end if;
  if tg_op = 'UPDATE' then
    if new.event_id <> old.event_id or new.business_id <> old.business_id or new.city_id <> old.city_id or new.starts_at <> old.starts_at
       or new.ends_at <> old.ends_at or new.duration <> old.duration or new.price_cents <> old.price_cents or new.payer_user_id <> old.payer_user_id
       or new.renewed_from is distinct from old.renewed_from then
      raise exception 'event_sponsorships: lo pagado no cambia (evento, negocio, ciudad, fechas, duración, precio, quién paga)';
    end if;
    if old.status in ('terminado', 'cancelado') and new.status is distinct from old.status then
      raise exception 'patrocinio_estado: de % no se pasa a %', old.status, new.status;
    end if;
    if old.status = 'activo' and new.status = 'reservado' then raise exception 'patrocinio_estado: de activo no se vuelve a reservado'; end if;
    new.updated_at := now();
    return new;
  end if;
  if new.status in ('reservado', 'activo') then
    perform pg_advisory_xact_lock(hashtextextended('patevt:' || new.city_id, 0));
    -- El evento es de ese negocio y de esa ciudad, no está cancelado y tiene una fecha publicada que todavía no termina.
    if not exists (select 1 from public.events e where e.id = new.event_id and e.business_id = new.business_id and e.city_id = new.city_id and e.status <> 'cancelled'
                     and exists (select 1 from public.event_dates d where d.event_id = e.id and d.listable and d.ends_at > now())) then
      raise exception 'patrocinio_evt_evento: el evento no está publicado o ya pasó';
    end if;
    if exists (select 1 from public.event_sponsorships s where s.event_id = new.event_id and s.status in ('reservado', 'activo') and s.id is distinct from new.id
                 and s.starts_at < new.ends_at and s.ends_at > new.starts_at) then
      raise exception 'patrocinio_cruza: ese evento ya tiene un patrocinio en esas fechas';
    end if;
    if public.patrocinio_evt_a_la_vez(new.city_id, new.starts_at, new.ends_at, new.id) >= public.cfg_int('patrocinio_evt_puestos') then
      raise exception 'patrocinio_sin_puestos: no quedan puestos en esas fechas';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists event_sponsorships_reglas on event_sponsorships;
create trigger event_sponsorships_reglas before insert or update or delete on event_sponsorships for each row execute function patrocinio_evt_reglas();

-- ── El libro, las entradas, las vistas, las cifras y «Avísame» de 0173 aceptan eventos ──
alter table sponsorship_payments drop constraint if exists sponsorship_payments_kind_check;
alter table sponsorship_payments add constraint sponsorship_payments_kind_check check (kind in ('negocio', 'evento'));
alter table sponsorship_entries drop constraint if exists sponsorship_entries_kind_check;
alter table sponsorship_entries add constraint sponsorship_entries_kind_check check (kind in ('negocio', 'evento'));
alter table sponsorship_stats drop constraint if exists sponsorship_stats_kind_check;
alter table sponsorship_stats add constraint sponsorship_stats_kind_check check (kind in ('negocio', 'evento'));
alter table sponsorship_views drop constraint if exists sponsorship_views_kind_check;
alter table sponsorship_views add constraint sponsorship_views_kind_check check (kind in ('negocio', 'evento'));
alter table sponsorship_waits drop constraint if exists sponsorship_waits_kind_check;
alter table sponsorship_waits add constraint sponsorship_waits_kind_check check (kind in ('negocio', 'evento'));

-- Vistas: una por persona (o dispositivo) y día por patrocinio, solo de lo activo (de un negocio o de un evento).
create or replace function patrocinio_vistas(k text, ids bigint[], quien uuid, dev uuid) returns integer language plpgsql as $$
declare n int;
begin
  if quien is null and dev is null then return 0; end if;
  if k not in ('negocio', 'evento') then return 0; end if;
  perform set_config('tl.patrocinio_cifras', 'on', true);
  with vivos as (
    select s.id from sponsorships s where k = 'negocio' and s.id = any(ids) and s.status = 'activo'
    union all
    select s.id from event_sponsorships s where k = 'evento' and s.id = any(ids) and s.status = 'activo'),
       nuevas as (
    insert into sponsorship_views (kind, ref_id, who)
      select k, v.id, coalesce('u:' || quien::text, 'd:' || dev::text) from vivos v
      on conflict do nothing returning ref_id),
       sumadas as (
    insert into sponsorship_stats (kind, ref_id, views) select k, ref_id, 1 from nuevas
      on conflict (kind, ref_id) do update set views = sponsorship_stats.views + 1, updated_at = now() returning 1)
  select count(*) into n from sumadas;
  perform set_config('tl.patrocinio_cifras', 'off', true);
  return n;
end $$;

-- Entró: alguien tocó la tarjeta patrocinada (de un negocio o de un evento). Una vez por persona (o dispositivo) y día; solo lo activo.
create or replace function patrocinio_entro(k text, id bigint, quien uuid, dev uuid) returns boolean language plpgsql as $$
declare nuevo bigint;
begin
  if quien is null and dev is null then return false; end if;
  if k = 'negocio' then
    if not exists (select 1 from sponsorships s where s.id = patrocinio_entro.id and s.status = 'activo') then return false; end if;
  elsif k = 'evento' then
    if not exists (select 1 from event_sponsorships s where s.id = patrocinio_entro.id and s.status = 'activo') then return false; end if;
  else
    return false;
  end if;
  insert into sponsorship_entries (kind, ref_id, user_id, device) values (k, id, quien, dev) on conflict do nothing returning sponsorship_entries.id into nuevo;
  if nuevo is null then return false; end if;
  perform set_config('tl.patrocinio_cifras', 'on', true);
  insert into sponsorship_stats (kind, ref_id, entries) values (k, id, 1)
    on conflict (kind, ref_id) do update set entries = sponsorship_stats.entries + 1, updated_at = now();
  perform set_config('tl.patrocinio_cifras', 'off', true);
  return true;
end $$;

-- Boletos (sponsorship_stats.orders de kind 'evento'): los boletos pagados y los RSVP de ese evento que hizo, durante el patrocinio, alguien que
-- antes entró desde la tarjeta patrocinada. La corre el barrido para lo vivo y lo que terminó hace menos de 2 días.
create or replace function patrocinio_evt_cifras_al_dia() returns integer language plpgsql as $$
declare n int := 0;
begin
  perform set_config('tl.patrocinio_cifras', 'on', true);
  with s as (select id, event_id, starts_at, ends_at from event_sponsorships where status = 'activo' or (status = 'terminado' and ended_at > now() - interval '2 days')),
       c as (select s.id,
                    ((select count(*) from tickets t join operations o on o.id = t.operation_id
                       where t.event_id = s.event_id and t.kind = 'paid' and t.status in ('valid', 'used') and not o.is_test and t.created_at >= s.starts_at and t.created_at < s.ends_at
                         and exists (select 1 from sponsorship_entries e where e.kind = 'evento' and e.ref_id = s.id and e.user_id = o.user_id and e.at <= t.created_at))
                   + (select count(*) from rsvps r
                       where r.event_id = s.event_id and r.status in ('going', 'attended') and r.created_at >= s.starts_at and r.created_at < s.ends_at
                         and exists (select 1 from sponsorship_entries e where e.kind = 'evento' and e.ref_id = s.id and e.user_id = r.user_id and e.at <= r.created_at)))::int as n
               from s),
       puestas as (
    insert into sponsorship_stats (kind, ref_id, orders) select 'evento', c.id, c.n from c
      on conflict (kind, ref_id) do update set orders = excluded.orders, updated_at = now() where sponsorship_stats.orders is distinct from excluded.orders returning 1)
  select count(*) into n from puestas;
  perform set_config('tl.patrocinio_cifras', 'off', true);
  return n;
end $$;

-- ── Avisos al organizador (bandeja y push; sin SMS: no es urgente) ──
insert into notif_templates (key, grp, pref, sms, sms_mode, push, push_private, app, title, body) values
  ('biz_patevt_activo', 'biz', null, false, 'nunca', true, false, 'negocio', '{"es":"Tu evento ya sale en Patrocinados","en":"Your event now shows in Sponsored"}', '{"es":"{evento} sale en Patrocinados de Eventos · {ciudad} hasta el {hasta}. Pagaste {monto}.","en":"{evento} shows in Sponsored on Events · {ciudad} until {hasta}. You paid {monto}."}'),
  ('biz_patevt_renovado', 'biz', null, false, 'nunca', true, false, 'negocio', '{"es":"El patrocinio de tu evento se renovó","en":"Your event sponsorship renewed"}', '{"es":"{evento} sigue en Patrocinados de Eventos hasta el {hasta}. Cobramos {monto} a {tarjeta}.","en":"{evento} stays in Sponsored on Events until {hasta}. We charged {monto} to {tarjeta}."}'),
  ('biz_patevt_no_renovo', 'biz', null, false, 'nunca', true, false, 'negocio', '{"es":"El patrocinio de tu evento no se renovó","en":"Your event sponsorship did not renew"}', '{"es":"El patrocinio de {evento} terminó y no se renovó: {motivo}. Puedes comprar otro desde tu panel.","en":"The {evento} sponsorship ended and did not renew: {motivo}. You can buy another from your dashboard."}'),
  ('biz_patevt_termino', 'biz', null, false, 'nunca', true, false, 'negocio', '{"es":"El patrocinio de tu evento terminó","en":"Your event sponsorship ended"}', '{"es":"{evento} ya no sale en Patrocinados de Eventos · {ciudad}.","en":"{evento} no longer shows in Sponsored on Events · {ciudad}."}'),
  ('biz_patevt_cancelado', 'biz', null, false, 'nunca', true, false, 'negocio', '{"es":"El patrocinio terminó con el evento","en":"The sponsorship ended with the event"}', '{"es":"{evento} se canceló, así que dejó de salir en Patrocinados de Eventos. Si tienes dudas sobre lo pagado, escribe a Soporte.","en":"{evento} was cancelled, so it no longer shows in Sponsored on Events. If you have questions about what you paid, contact Support."}'),
  ('biz_patevt_admin', 'biz', null, false, 'nunca', true, false, 'negocio', '{"es":"To’Latino terminó el patrocinio de tu evento","en":"To’Latino ended your event sponsorship"}', '{"es":"El patrocinio de {evento} terminó: {motivo}. Si tienes dudas, escribe a Soporte.","en":"The {evento} sponsorship ended: {motivo}. If you have questions, contact Support."}'),
  ('biz_patevt_libre', 'biz', null, false, 'nunca', true, false, 'negocio', '{"es":"Se liberó un puesto en Eventos","en":"A slot opened on Events"}', '{"es":"Hay un puesto libre en Patrocinados de Eventos · {ciudad}. Patrocina tu evento desde tu panel antes de que lo tome otro.","en":"There is an open slot in Sponsored on Events · {ciudad}. Sponsor your event from your dashboard before someone else takes it."}')
on conflict (key) do nothing;

commit;
