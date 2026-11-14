-- 0137 · Fase 9 · 9g · La Analítica completa, la base de análisis y el reporte diario al fundador (docs/diseno/plan/fase9-apertura.md §2 «0137», §4 9g).
-- · Derivados diarios que llena SOLO el barrido (nunca se editan; guardián derivadoNoEditable): metricas_dinero_dia (lo cobrado por ciudad, día local y
--   tipo de operación: operaciones, bruto, comisión, devoluciones y lo devuelto, y las citas cerradas y las que no llegaron), metricas_pro_dia (Pro por
--   ciudad y día: pruebas que empiezan, con tarjeta, que terminan, primeros cobros, lo cobrado, las que pasaron a Free y la foto del día: MRR, Pro pagando
--   y en prueba) y metricas_retencion (cohortes semanales de vecinos por ciudad: cuántos, y de los que ya tienen la edad, cuántos volvieron el día 1, 7 y
--   30). Sin personas: solo cuántos (guardián analiticaSinPersonas). Un trigger impide escribirlas si no es la función del barrido (tl.metricas_barrido).
-- · Las vistas que agregaban TODA la historia en cada vista de Analítica (evt_analitica_dia, evt_asistencia_dia, evt_ventas_negocio_dia, evp_analitica_dia
--   de 0115; compa_analitica_dia y soporte_analitica_dia de 0124; LAUNCH L948, L1143) pasan a tablas (*_cache) que rehace el barrido: los últimos 40 días
--   cada 10 minutos y toda la historia una vez al día (lo que cambia de estado después, como un caso que se resuelve, entra esa noche). Las vistas siguen
--   (son la definición) y ahora leen solo desde analitica_desde() (tl.analitica_desde; sin ella, toda la historia, como antes): el barrido no recorre
--   años para rehacer 40 días.
-- · Vistas sin repetidos: business_views_daily.unicos (una vez por persona o teléfono y día; business_view_marks guarda solo una huella que cambia cada
--   día y el barrido la suelta a los 2 días).
-- · scheduled_reports: un reporte de Analítica programado por correo (quién, qué pestaña, cada día, semana o mes); se pausa, nunca se borra.
-- · founder_reports (SOLO INSERCIÓN): el reporte diario al fundador (T#31) de cada día y la alerta si a las 8:00 no salió; sus cifras (nunca personas) y a
--   dónde salió (correos y avisos, por número). Uno por día y tipo.
-- · email_outbox suma las plantillas 'report' y 'founder_daily'; las plantillas de aviso reporte_diario y reporte_no_salio; el interruptor reporte.diario.
-- Idempotente: se puede aplicar dos veces. Nada de lo que es de una persona se borra.
begin;

-- ── El límite de la ventana de los derivados: el barrido lo pone (set_config local a la transacción); sin él, toda la historia ──
create or replace function analitica_desde() returns timestamptz language sql stable as $$
  select coalesce(nullif(current_setting('tl.analitica_desde', true), '')::timestamptz, '-infinity'::timestamptz)
$$;

-- ── Ningún derivado se escribe a mano: solo dentro de las funciones del barrido (que encienden tl.metricas_barrido y lo apagan al terminar) ──
create or replace function derivado_no_editable() returns trigger language plpgsql as $$
begin
  if coalesce(current_setting('tl.metricas_barrido', true), '') <> 'on' then
    raise exception 'derivado_no_editable: % solo lo escribe el barrido', tg_table_name;
  end if;
  return coalesce(new, old);
end $$;

-- ── Índices de las ventanas (lo que el barrido lee desde un día) ──
create index if not exists payments_captura_idx on payments (captured_at) where captured_at is not null;
create index if not exists refunds_creado_idx on refunds (created_at) where status = 'done';
create index if not exists subscription_events_tipo_idx on subscription_events (kind, at);
create index if not exists operations_hora_idx on operations (scheduled_at) where kind in ('appointment', 'table', 'night', 'visit');
create index if not exists user_days_ciudad_dia_idx on user_days (city_id, day);
create index if not exists contact_taps_semilla_idx on contact_taps (seed_id, at) where seed_id is not null;
create index if not exists contact_taps_hora_idx on contact_taps (at);
create index if not exists search_logs_cero_hora_idx on search_logs (at) where results = 0;
create index if not exists payments_creado_idx on payments (created_at);
create index if not exists operations_cambio_idx on operations (updated_at);

-- ── metricas_dinero_dia ──
create table if not exists metricas_dinero_dia (
  city_id         text not null references cities (id),
  dia             date not null,
  tipo            text not null check (tipo ~ '^[a-z_]{1,24}$'),        -- operations.kind
  operaciones     integer not null default 0,                         -- operaciones con un cobro capturado ese día
  bruto_cents     bigint not null default 0,                          -- lo capturado (GMV)
  comision_cents  bigint not null default 0,                          -- la comisión de To'Latino de esos cobros
  devoluciones    integer not null default 0,
  devuelto_cents  bigint not null default 0,                          -- devoluciones hechas ese día (de cobros de cualquier día)
  cerradas        integer not null default 0,                         -- citas, mesas, noches y visitas cuya hora pasó: hechas o «no llegó»
  no_llegaron     integer not null default 0,
  refreshed_at    timestamptz not null default now(),
  primary key (city_id, dia, tipo)
);
create index if not exists metricas_dinero_dia_dia_idx on metricas_dinero_dia (dia, city_id);

-- ── metricas_pro_dia ──
create table if not exists metricas_pro_dia (
  city_id             text not null references cities (id),
  dia                 date not null,
  pruebas_iniciadas   integer not null default 0,
  pruebas_con_tarjeta integer not null default 0,                     -- decidieron seguir con Pro (dejaron la tarjeta)
  pruebas_terminadas  integer not null default 0,                     -- su día 30 fue ese día
  primeros_cobros     integer not null default 0,                     -- prueba → pago
  cobros              integer not null default 0,
  cobrado_cents       bigint not null default 0,
  a_free              integer not null default 0,
  mrr_cents           bigint,                                         -- la foto del día (solo el día en que se tomó; los demás la guardan)
  pro_pagando         integer,
  en_prueba           integer,
  refreshed_at        timestamptz not null default now(),
  primary key (city_id, dia)
);

-- ── metricas_retencion ──
create table if not exists metricas_retencion (
  city_id      text not null references cities (id),
  cohorte      date not null,                                          -- el lunes de la semana en que se registraron (hora de la ciudad)
  nuevos       integer not null default 0,
  base_d1      integer not null default 0, d1  integer not null default 0,
  base_d7      integer not null default 0, d7  integer not null default 0,
  base_d30     integer not null default 0, d30 integer not null default 0,
  refreshed_at timestamptz not null default now(),
  primary key (city_id, cohorte),
  check (d1 <= base_d1 and d7 <= base_d7 and d30 <= base_d30 and base_d1 <= nuevos)
);

-- ── Las vistas de 0115 y 0124, las mismas columnas, desde analitica_desde() ──
create or replace view evt_analitica_dia as
with v as (select e.city_id, (a.at at time zone ci.timezone)::date as dia, e.format, count(*) as vistas
             from app_events a join events e on e.id::text = a.ref join cities ci on ci.id = e.city_id where a.name = 'ver_evento' and a.at >= analitica_desde() group by 1, 2, 3),
g as (select e.city_id, (f.created_at at time zone ci.timezone)::date as dia, e.format, count(*) as guardados
        from favorites f join events e on f.kind = 'event' and e.id::text = f.target_id join cities ci on ci.id = e.city_id where f.created_at >= analitica_desde() group by 1, 2, 3),
r as (select x.city_id, (x.created_at at time zone ci.timezone)::date as dia, e.format, count(*) as rsvp, sum(x.party) as rsvp_personas
        from rsvps x join events e on e.id = x.event_id join cities ci on ci.id = x.city_id where x.created_at >= analitica_desde() group by 1, 2, 3),
b as (select t.city_id, (t.created_at at time zone ci.timezone)::date as dia, e.format,
             count(distinct t.operation_id) filter (where t.kind = 'paid') as ordenes, count(*) filter (where t.kind = 'paid') as boletos,
             count(*) filter (where t.kind = 'comp') as cortesias, coalesce(sum(t.fee_cents) filter (where t.kind = 'paid'), 0) as comision
        from tickets t join events e on e.id = t.event_id join cities ci on ci.id = t.city_id
       where t.created_at >= analitica_desde() and not exists (select 1 from ticket_transfers z where z.new_ticket_id = t.id) group by 1, 2, 3),
p as (select o.city_id, (p.captured_at at time zone ci.timezone)::date as dia, e.format, sum(p.amount_cents)::bigint as bruto
        from payments p join operations o on o.id = p.operation_id and o.kind = 'tickets' join events e on e.id = (o.details->>'event_id')::bigint join cities ci on ci.id = o.city_id
       where p.captured_at is not null and p.captured_at >= analitica_desde() group by 1, 2, 3),
dv as (select l.city_id, (l.created_at at time zone ci.timezone)::date as dia, e.format, sum(l.amount_cents)::bigint as devuelto
         from ticket_refund_lines l join operations o on o.id = l.operation_id join events e on e.id = (o.details->>'event_id')::bigint join cities ci on ci.id = l.city_id
        where l.created_at >= analitica_desde() group by 1, 2, 3),
w as (select x.city_id, (x.created_at at time zone ci.timezone)::date as dia, e.format, count(*) as espera, count(*) filter (where x.status = 'converted') as espera_convertidos
        from waitlist x join events e on e.id = x.event_id join cities ci on ci.id = x.city_id where x.created_at >= analitica_desde() group by 1, 2, 3),
i as (select x.city_id, (x.at at time zone ci.timezone)::date as dia, e.format, count(*) as incidencias
        from door_incidents x join events e on e.id = x.event_id join cities ci on ci.id = x.city_id where x.at >= analitica_desde() group by 1, 2, 3),
k as (select city_id, dia, format from v union select city_id, dia, format from g union select city_id, dia, format from r union select city_id, dia, format from b
      union select city_id, dia, format from p union select city_id, dia, format from dv union select city_id, dia, format from w union select city_id, dia, format from i)
select k.city_id, k.dia, k.format,
       coalesce(v.vistas, 0)::int as vistas, coalesce(g.guardados, 0)::int as guardados, coalesce(r.rsvp, 0)::int as rsvp, coalesce(r.rsvp_personas, 0)::int as rsvp_personas,
       coalesce(b.ordenes, 0)::int as ordenes, coalesce(b.boletos, 0)::int as boletos, coalesce(b.cortesias, 0)::int as cortesias,
       coalesce(p.bruto, 0)::bigint as bruto, coalesce(b.comision, 0)::bigint as comision, coalesce(dv.devuelto, 0)::bigint as devuelto,
       coalesce(w.espera, 0)::int as espera, coalesce(w.espera_convertidos, 0)::int as espera_convertidos, coalesce(i.incidencias, 0)::int as incidencias
  from k left join v using (city_id, dia, format) left join g using (city_id, dia, format) left join r using (city_id, dia, format) left join b using (city_id, dia, format)
  left join p using (city_id, dia, format) left join dv using (city_id, dia, format) left join w using (city_id, dia, format) left join i using (city_id, dia, format);

create or replace view evt_asistencia_dia as
select d.city_id, d.local_date as dia, e.format, count(*)::int as fechas,
       coalesce(sum(t.esperados), 0)::int as esperados, coalesce(sum(t.entraron), 0)::int as entraron,
       coalesce(sum(rv.van), 0)::int as rsvp_van, coalesce(sum(rv.llegaron), 0)::int as rsvp_llegaron,
       coalesce(sum((select count(*) from door_incidents z where z.event_date_id = d.id)), 0)::int as incidencias
  from event_dates d join events e on e.id = d.event_id
  left join lateral (select sum(x.admits) as esperados, sum(least(x.admits, coalesce(en.entered_n, 0))) as entraron
                       from tickets x left join ticket_entries en on en.ticket_id = x.id and en.event_date_id = d.id
                      where x.event_date_id = d.id and x.status in ('valid', 'used')) t on true
  left join lateral (select sum(z.party) filter (where z.status in ('going', 'attended', 'expired')) as van, sum(coalesce(z.arrived_n, 0)) as llegaron
                       from rsvps z where z.event_date_id = d.id) rv on true
 where d.ends_at < now() and d.ends_at >= analitica_desde() and d.status in ('scheduled', 'done')
 group by 1, 2, 3;

create or replace view evt_ventas_negocio_dia as
select o.city_id, (p.captured_at at time zone ci.timezone)::date as dia, o.business_id, b.name as negocio, count(distinct o.id)::int as ordenes,
       sum(p.amount_cents)::bigint as bruto, coalesce(sum(p.refunded_cents), 0)::bigint as devuelto,
       coalesce(sum((select sum(t.fee_cents) from tickets t where t.operation_id = o.id and t.kind = 'paid' and not exists (select 1 from ticket_transfers z where z.new_ticket_id = t.id))), 0)::bigint as comision
  from payments p join operations o on o.id = p.operation_id and o.kind = 'tickets' join businesses b on b.id = o.business_id join cities ci on ci.id = o.city_id
 where p.captured_at is not null and p.captured_at >= analitica_desde()
 group by 1, 2, 3, 4;

create or replace view evp_analitica_dia as
with s as (select o.city_id, (o.sent_at at time zone ci.timezone)::date as dia, count(*) as pedidas,
                  count(*) filter (where exists (select 1 from private_event_quotes q where q.operation_id = o.id)) as con_propuesta,
                  count(*) filter (where o.status = 'expired' and o.status_detail = 'sin_respuesta') as sin_respuesta
             from operations o join cities ci on ci.id = o.city_id where o.kind = 'private_event' and o.sent_at is not null and o.sent_at >= analitica_desde() group by 1, 2),
a as (select o.city_id, (a.created_at at time zone ci.timezone)::date as dia, count(*) as aceptadas
        from private_event_acceptances a join operations o on o.id = a.operation_id join cities ci on ci.id = o.city_id where a.payment_id is not null and a.created_at >= analitica_desde() group by 1, 2),
dp as (select o.city_id, (p.captured_at at time zone ci.timezone)::date as dia, sum(p.amount_cents)::bigint as deposito
         from payments p join operations o on o.id = p.operation_id and o.kind = 'private_event' join cities ci on ci.id = o.city_id where p.captured_at is not null and p.captured_at >= analitica_desde() group by 1, 2),
c as (select o.city_id, (o.cancelled_at at time zone ci.timezone)::date as dia,
             count(*) filter (where o.cancelled_by = 'user' and not coalesce((o.details->>'perdio')::boolean, false)) as a_tiempo,
             count(*) filter (where o.cancelled_by = 'user' and coalesce((o.details->>'perdio')::boolean, false)) as tarde,
             count(*) filter (where o.cancelled_by = 'business') as por_negocio
        from operations o join cities ci on ci.id = o.city_id
       where o.kind = 'private_event' and o.status = 'cancelled' and o.cancelled_at is not null and o.cancelled_at >= analitica_desde()
         and exists (select 1 from private_event_acceptances x where x.operation_id = o.id and x.payment_id is not null) group by 1, 2),
k as (select city_id, dia from s union select city_id, dia from a union select city_id, dia from dp union select city_id, dia from c)
select k.city_id, k.dia, coalesce(s.pedidas, 0)::int as pedidas, coalesce(s.con_propuesta, 0)::int as con_propuesta, coalesce(s.sin_respuesta, 0)::int as sin_respuesta,
       coalesce(a.aceptadas, 0)::int as aceptadas, coalesce(dp.deposito, 0)::bigint as deposito,
       coalesce(c.a_tiempo, 0)::int as canceladas_a_tiempo, coalesce(c.tarde, 0)::int as canceladas_tarde, coalesce(c.por_negocio, 0)::int as canceladas_negocio
  from k left join s using (city_id, dia) left join a using (city_id, dia) left join dp using (city_id, dia) left join c using (city_id, dia);

create or replace view compa_analitica_dia as
with c as (
  select cv.city_id, (cv.started_at at time zone ci.timezone)::date as dia, cv.use as uso, case when cv.channel = 'web' then 'app' else cv.channel end as canal,
         count(*) as conversaciones,
         count(*) filter (where cv.outcome = 'open') as abiertas,
         count(*) filter (where cv.outcome = 'self_resolved') as resolvio_solo,
         count(*) filter (where cv.outcome = 'action_done') as accion,
         count(*) filter (where cv.outcome = 'handed_off') as a_persona,
         count(*) filter (where cv.outcome = 'handed_off' and cv.handoff_reason = 'money') as persona_dinero,
         count(*) filter (where cv.outcome = 'handed_off' and cv.handoff_reason = 'account') as persona_cuenta,
         count(*) filter (where cv.outcome = 'handed_off' and cv.handoff_reason = 'safety') as persona_seguridad,
         count(*) filter (where cv.outcome = 'handed_off' and cv.handoff_reason = 'asked_person') as persona_pidio,
         count(*) filter (where cv.outcome = 'handed_off' and cv.handoff_reason = 'unknown') as persona_no_supo,
         count(*) filter (where cv.outcome = 'to_owner') as al_dueno,
         count(*) filter (where not cv.ai) as sin_ia,
         count(*) filter (where exists (select 1 from compa_reviews r where r.conversation_id = cv.id and r.cleared_at is null)) as marcadas,
         count(*) filter (where exists (select 1 from compa_unknowns q where q.conversation_id = cv.id)) as no_supo
    from compa_conversations cv join cities ci on ci.id = cv.city_id
   where cv.started_at >= analitica_desde()
   group by 1, 2, 3, 4),
u as (
  select ci.id as city_id, (g.at at time zone ci.timezone)::date as dia, g.use as uso, coalesce(case when cv.channel = 'web' then 'app' else cv.channel end, 'app') as canal,
         count(*) filter (where g.result = 'ok' and g.model <> 'reglas') as con_ia,
         count(*) filter (where g.result = 'cap') as al_tope,
         count(*) filter (where g.result = 'off') as apagado,
         count(*) filter (where g.result = 'limit') as limite,
         count(*) filter (where g.result in ('timeout', 'error', 'refusal', 'invalid')) as a_reglas,
         coalesce(sum(g.cost_microusd), 0) as gasto_microusd,
         coalesce(sum(g.ms) filter (where g.model <> 'reglas' and g.result in ('ok', 'invalid', 'timeout')), 0) as espera_suma_ms,
         count(*) filter (where g.model <> 'reglas' and g.result in ('ok', 'invalid', 'timeout')) as esperas,
         percentile_cont(0.5) within group (order by g.ms) filter (where g.model <> 'reglas' and g.result in ('ok', 'invalid', 'timeout')) as espera_p50_ms,
         percentile_cont(0.95) within group (order by g.ms) filter (where g.model <> 'reglas' and g.result in ('ok', 'invalid', 'timeout')) as espera_p95_ms
    from compa_usage g left join compa_conversations cv on cv.id = g.conversation_id
    join cities ci on ci.id = coalesce(g.city_id, cv.city_id)
   where g.at >= analitica_desde()
   group by 1, 2, 3, 4),
k as (select city_id, dia, uso, canal from c union select city_id, dia, uso, canal from u)
select k.city_id, k.dia, k.uso, k.canal,
       coalesce(c.conversaciones, 0)::int as conversaciones, coalesce(c.abiertas, 0)::int as abiertas, coalesce(c.resolvio_solo, 0)::int as resolvio_solo,
       coalesce(c.accion, 0)::int as accion, coalesce(c.a_persona, 0)::int as a_persona, coalesce(c.persona_dinero, 0)::int as persona_dinero,
       coalesce(c.persona_cuenta, 0)::int as persona_cuenta, coalesce(c.persona_seguridad, 0)::int as persona_seguridad, coalesce(c.persona_pidio, 0)::int as persona_pidio,
       coalesce(c.persona_no_supo, 0)::int as persona_no_supo, coalesce(c.al_dueno, 0)::int as al_dueno, coalesce(c.sin_ia, 0)::int as sin_ia,
       coalesce(c.marcadas, 0)::int as marcadas, coalesce(c.no_supo, 0)::int as no_supo,
       coalesce(u.con_ia, 0)::int as con_ia, coalesce(u.al_tope, 0)::int as al_tope, coalesce(u.apagado, 0)::int as apagado, coalesce(u.limite, 0)::int as limite,
       coalesce(u.a_reglas, 0)::int as a_reglas, coalesce(u.gasto_microusd, 0)::bigint as gasto_microusd, coalesce(u.espera_suma_ms, 0)::bigint as espera_suma_ms,
       coalesce(u.esperas, 0)::int as esperas, u.espera_p50_ms::int as espera_p50_ms, u.espera_p95_ms::int as espera_p95_ms
  from k left join c using (city_id, dia, uso, canal) left join u using (city_id, dia, uso, canal);

create or replace view soporte_analitica_dia as
select c.city_id, (c.created_at at time zone ci.timezone)::date as dia, c.topic as tema,
       count(*)::int as casos,
       count(*) filter (where c.origin = 'compa')::int as desde_compa,
       count(*) filter (where c.origin = 'panel')::int as de_negocios,
       count(*) filter (where c.priority = 'alta')::int as alta,
       count(*) filter (where c.first_reply_at is not null)::int as con_respuesta,
       count(*) filter (where c.first_reply_at is not null and c.first_reply_at <= c.sla_due_at)::int as plazo_cumplido,
       count(*) filter (where (c.first_reply_at is null and c.sla_due_at < now()) or c.first_reply_at > c.sla_due_at)::int as plazo_vencido,
       coalesce(sum(extract(epoch from c.first_reply_at - c.created_at)) filter (where c.first_reply_at is not null), 0)::bigint as primera_suma_seg,
       (percentile_cont(0.5) within group (order by extract(epoch from c.first_reply_at - c.created_at)) filter (where c.first_reply_at is not null))::int as primera_p50_seg,
       (percentile_cont(0.9) within group (order by extract(epoch from c.first_reply_at - c.created_at)) filter (where c.first_reply_at is not null))::int as primera_p90_seg,
       count(*) filter (where c.status = 'resolved')::int as resueltos,
       count(*) filter (where c.status = 'resolved' and c.resolved_by = 'user')::int as resueltos_por_la_persona,
       count(*) filter (where c.csat = 'yes')::int as csat_si,
       count(*) filter (where c.csat = 'no')::int as csat_no,
       coalesce(sum(c.refunded_cents), 0)::bigint as devuelto_cents
  from support_cases c join cities ci on ci.id = c.city_id
 where c.status <> 'merged' and c.created_at >= analitica_desde()
 group by 1, 2, 3;

-- ── Las tablas de esas vistas (las mismas columnas, más cuándo se rehicieron) ──
do $$
declare v text;
begin
  foreach v in array array['evt_analitica_dia', 'evt_asistencia_dia', 'evt_ventas_negocio_dia', 'evp_analitica_dia', 'compa_analitica_dia', 'soporte_analitica_dia'] loop
    if to_regclass(v || '_cache') is null then
      execute format('create table %I as select * from %I with no data', v || '_cache', v);
      execute format('alter table %I add column refreshed_at timestamptz not null default now()', v || '_cache');
      execute format('create index %I on %I (dia, city_id)', v || '_cache_dia_idx', v || '_cache');
    end if;
  end loop;
end $$;

-- ── El trigger de los derivados (las tres metricas_* y las seis *_cache) ──
do $$
declare t text;
begin
  foreach t in array array['metricas_dinero_dia', 'metricas_pro_dia', 'metricas_retencion', 'evt_analitica_dia_cache', 'evt_asistencia_dia_cache', 'evt_ventas_negocio_dia_cache',
                           'evp_analitica_dia_cache', 'compa_analitica_dia_cache', 'soporte_analitica_dia_cache'] loop
    execute format('drop trigger if exists %I on %I', t || '_no_editable', t);
    execute format('create trigger %I before insert or update or delete on %I for each row execute function derivado_no_editable()', t || '_no_editable', t);
  end loop;
end $$;

-- ── metricas_resumir(desde): rehace desde ese día (hora de cada ciudad) las tres metricas_* y las seis tablas de Analítica. La foto de Pro (MRR, Pro
--    pagando, en prueba) solo se escribe en el día de hoy; los días anteriores guardan la suya. Devuelve cuántas filas escribió. ──
create or replace function metricas_resumir(desde date) returns integer language plpgsql as $$
declare
  n integer := 0; m integer;
  t0 timestamptz := (desde - 1)::timestamp at time zone 'UTC';      -- un día antes: cubre cualquier huso de las ciudades
  hoy date := (now() at time zone 'America/New_York')::date;
  v text;
begin
  perform set_config('tl.metricas_barrido', 'on', true);
  perform set_config('tl.analitica_desde', t0::text, true);

  -- Dinero por tipo de operación
  delete from metricas_dinero_dia where dia >= desde;
  with pg as (select o.city_id, (p.captured_at at time zone ci.timezone)::date as dia, o.kind as tipo, count(distinct o.id) as operaciones,
                     sum(p.amount_cents) as bruto, sum(p.fee_cents) as comision
                from payments p join operations o on o.id = p.operation_id join cities ci on ci.id = o.city_id
               where p.captured_at is not null and p.captured_at >= t0 group by 1, 2, 3),
       dv as (select o.city_id, (r.created_at at time zone ci.timezone)::date as dia, o.kind as tipo, count(*) as devoluciones, sum(r.amount_cents) as devuelto
                from refunds r join payments p on p.id = r.payment_id join operations o on o.id = p.operation_id join cities ci on ci.id = o.city_id
               where r.status = 'done' and r.created_at >= t0 group by 1, 2, 3),
       ce as (select o.city_id, (o.scheduled_at at time zone ci.timezone)::date as dia, o.kind as tipo,
                     count(*) filter (where o.status = 'done' or o.status_detail = 'noshow') as cerradas, count(*) filter (where o.status_detail = 'noshow') as no_llegaron
                from operations o join cities ci on ci.id = o.city_id
               where o.kind in ('appointment', 'table', 'night', 'visit') and o.scheduled_at >= t0 and o.scheduled_at < now() group by 1, 2, 3),
       k as (select city_id, dia, tipo from pg union select city_id, dia, tipo from dv union select city_id, dia, tipo from ce),
       ins as (insert into metricas_dinero_dia (city_id, dia, tipo, operaciones, bruto_cents, comision_cents, devoluciones, devuelto_cents, cerradas, no_llegaron)
               select k.city_id, k.dia, k.tipo, coalesce(pg.operaciones, 0), coalesce(pg.bruto, 0), coalesce(pg.comision, 0), coalesce(dv.devoluciones, 0), coalesce(dv.devuelto, 0),
                      coalesce(ce.cerradas, 0), coalesce(ce.no_llegaron, 0)
                 from k left join pg using (city_id, dia, tipo) left join dv using (city_id, dia, tipo) left join ce using (city_id, dia, tipo)
                where k.dia >= desde and (coalesce(pg.operaciones, 0) + coalesce(dv.devoluciones, 0) + coalesce(ce.cerradas, 0)) > 0
               returning 1)
  select count(*) into m from ins; n := n + m;

  -- Pro: lo que pasó cada día (de la historia de solo inserción) y la foto de hoy
  with ev as (select b.city_id, (e.at at time zone ci.timezone)::date as dia,
                     count(*) filter (where e.kind = 'trial_start') as iniciadas,
                     count(*) filter (where e.kind = 'decided_card') as con_tarjeta,
                     count(*) filter (where e.kind = 'charged') as cobros,
                     coalesce(sum(e.amount_cents) filter (where e.kind = 'charged'), 0) as cobrado,
                     count(*) filter (where e.kind = 'charged' and not exists (select 1 from subscription_events z where z.business_id = e.business_id and z.kind = 'charged' and z.at < e.at)) as primeros,
                     count(*) filter (where e.kind = 'ended') as a_free
                from subscription_events e join businesses b on b.id = e.business_id join cities ci on ci.id = b.city_id
               where e.at >= t0 and e.kind in ('trial_start', 'decided_card', 'charged', 'ended') group by 1, 2),
       tt as (select b.city_id, (s.trial_ends_at at time zone ci.timezone)::date as dia, count(*) as terminadas
                from subscriptions s join businesses b on b.id = s.business_id join cities ci on ci.id = b.city_id
               where s.trial_ends_at >= t0 and s.trial_ends_at <= now() group by 1, 2),
       sn as (select b.city_id, hoy as dia,
                     coalesce(round(sum(case when s.cycle = 'year' then s.price_cents / 12.0 else s.price_cents end) filter (where s.status in ('active', 'past_due', 'canceling'))), 0)::bigint as mrr,
                     count(*) filter (where s.status in ('active', 'past_due', 'canceling'))::int as pagando, count(*) filter (where s.status = 'trial')::int as prueba
                from subscriptions s join businesses b on b.id = s.business_id group by 1),
       k as (select city_id, dia from ev union select city_id, dia from tt union select city_id, dia from sn),
       ins as (insert into metricas_pro_dia (city_id, dia, pruebas_iniciadas, pruebas_con_tarjeta, pruebas_terminadas, primeros_cobros, cobros, cobrado_cents, a_free, mrr_cents, pro_pagando, en_prueba)
               select k.city_id, k.dia, coalesce(ev.iniciadas, 0), coalesce(ev.con_tarjeta, 0), coalesce(tt.terminadas, 0), coalesce(ev.primeros, 0), coalesce(ev.cobros, 0),
                      coalesce(ev.cobrado, 0), coalesce(ev.a_free, 0), sn.mrr, sn.pagando, sn.prueba
                 from k left join ev using (city_id, dia) left join tt using (city_id, dia) left join sn using (city_id, dia)
                where k.dia >= desde
               on conflict (city_id, dia) do update set
                 pruebas_iniciadas = excluded.pruebas_iniciadas, pruebas_con_tarjeta = excluded.pruebas_con_tarjeta, pruebas_terminadas = excluded.pruebas_terminadas,
                 primeros_cobros = excluded.primeros_cobros, cobros = excluded.cobros, cobrado_cents = excluded.cobrado_cents, a_free = excluded.a_free,
                 mrr_cents = case when excluded.dia = hoy then excluded.mrr_cents else metricas_pro_dia.mrr_cents end,
                 pro_pagando = case when excluded.dia = hoy then excluded.pro_pagando else metricas_pro_dia.pro_pagando end,
                 en_prueba = case when excluded.dia = hoy then excluded.en_prueba else metricas_pro_dia.en_prueba end,
                 refreshed_at = now()
               returning 1)
  select count(*) into m from ins; n := n + m;
  -- Un día de la ventana que ya no tiene nada (se corrigió un evento) queda en cero, con su foto.
  update metricas_pro_dia x set pruebas_iniciadas = 0, pruebas_con_tarjeta = 0, pruebas_terminadas = 0, primeros_cobros = 0, cobros = 0, cobrado_cents = 0, a_free = 0, refreshed_at = now()
   where x.dia >= desde and x.refreshed_at < now();

  -- Retención por cohorte semanal: las cohortes cuyos 30 días todavía pueden cambiar (desde − 37 días) se rehacen; sin personas (solo cuántos).
  delete from metricas_retencion where cohorte >= date_trunc('week', (desde - 37)::timestamp)::date;
  with c as (select u.id, u.home_city_id as city_id, (u.created_at at time zone ci.timezone)::date as d0
               from users u join cities ci on ci.id = u.home_city_id
              where not u.is_test and u.created_at >= date_trunc('week', (desde - 37)::timestamp)::date - interval '1 day'),
       ins as (insert into metricas_retencion (city_id, cohorte, nuevos, base_d1, d1, base_d7, d7, base_d30, d30)
               select c.city_id, date_trunc('week', c.d0::timestamp)::date as cohorte, count(*),
                      count(*) filter (where c.d0 + 1 <= hoy), count(*) filter (where c.d0 + 1 <= hoy and exists (select 1 from user_days x where x.user_id = c.id and x.day = c.d0 + 1)),
                      count(*) filter (where c.d0 + 7 <= hoy), count(*) filter (where c.d0 + 7 <= hoy and exists (select 1 from user_days x where x.user_id = c.id and x.day = c.d0 + 7)),
                      count(*) filter (where c.d0 + 30 <= hoy), count(*) filter (where c.d0 + 30 <= hoy and exists (select 1 from user_days x where x.user_id = c.id and x.day = c.d0 + 30))
                 from c where c.d0 >= date_trunc('week', (desde - 37)::timestamp)::date
                group by 1, 2
               returning 1)
  select count(*) into m from ins; n := n + m;

  -- Las seis tablas de Analítica (Eventos, El Compa y Soporte): desde ese día, de sus vistas (que ya leen solo desde analitica_desde()).
  foreach v in array array['evt_analitica_dia', 'evt_asistencia_dia', 'evt_ventas_negocio_dia', 'evp_analitica_dia', 'compa_analitica_dia', 'soporte_analitica_dia'] loop
    execute format('delete from %I where dia >= $1', v || '_cache') using desde;
    execute format('with ins as (insert into %I select v.*, now() from %I v where v.dia >= $1 returning 1) select count(*)::int from ins', v || '_cache', v) using desde into m;
    n := n + m;
  end loop;

  -- Las huellas de «vistas sin repetidos» de hace más de 2 días ya no sirven (solo cuentan el día).
  delete from business_view_marks where day < hoy - 2;

  insert into platform_config (key, value, note, updated_by) values ('metricas_ventana_at', to_jsonb(now()), 'Los derivados de Analítica se rehicieron (barrido).', 'sistema')
  on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = 'sistema';
  if desde <= date '2000-01-02' then
    insert into platform_config (key, value, note, updated_by) values ('metricas_completo_at', to_jsonb(now()), 'Los derivados de Analítica se rehicieron con toda la historia (barrido).', 'sistema')
    on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = 'sistema';
  end if;
  perform set_config('tl.analitica_desde', '', true);
  perform set_config('tl.metricas_barrido', 'off', true);
  return n;
end $$;

-- ── El barrido: los últimos 40 días cada 10 minutos; la historia entera la primera vez y una vez al día (pasadas las 3 AM de Hazleton). Cuándo corrió
--    cada una queda en platform_config (metricas_ventana_at, metricas_completo_at), como el vocabulario de búsqueda (0133). ──
create or replace function metricas_hora(k text) returns timestamptz language plpgsql stable as $$
begin
  return (select (value #>> '{}')::timestamptz from platform_config where key = k);
exception when others then return null;
end $$;
create or replace function metricas_al_dia() returns integer language plpgsql as $$
declare
  hoy date := (now() at time zone 'America/New_York')::date;
  hoy3 timestamptz := (hoy + time '03:00') at time zone 'America/New_York';
  c timestamptz := metricas_hora('metricas_completo_at');
  v timestamptz := metricas_hora('metricas_ventana_at');
begin
  if c is null or (now() >= hoy3 and c < hoy3) then return metricas_resumir('2000-01-01'); end if;
  if v is not null and v > now() - interval '10 minutes' then return 0; end if;
  return metricas_resumir(hoy - 40);
end $$;

-- ── Vistas sin repetidos (LAUNCH L127) ──
alter table business_views_daily add column if not exists unicos integer not null default 0 check (unicos >= 0);
create table if not exists business_view_marks (
  business_id text not null references businesses (id),
  day         date not null,
  mark        text not null check (mark ~ '^[0-9a-f]{64}$'),           -- huella de la cuenta o el teléfono con la sal del día: no se puede volver atrás
  primary key (business_id, day, mark)
);

-- ── Reportes programados por correo ──
create table if not exists scheduled_reports (
  id           bigint generated always as identity primary key,
  by_staff_id  uuid not null references users (id),
  tab          text not null check (tab in ('sum', 'dinero', 'ppl', 'nosup', 'evt', 'cpa', 'biz')),
  cada         text not null check (cada in ('dia', 'semana', 'mes')),
  canal        text not null default 'correo' check (canal in ('correo')),
  status       text not null default 'activo' check (status in ('activo', 'pausado')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  last_sent_at timestamptz,
  unique (by_staff_id, tab)
);
create index if not exists scheduled_reports_activos_idx on scheduled_reports (last_sent_at) where status = 'activo';

-- ── El reporte diario al fundador (T#31): solo inserción ──
create table if not exists founder_reports (
  id         bigint generated always as identity primary key,
  dia        date not null,                                            -- el día de Hazleton en que salió (habla de ayer)
  kind       text not null check (kind in ('diario', 'alerta')),
  cifras     jsonb not null,                                           -- solo cifras, nombres de negocios y lo que le toca al fundador; nunca personas
  destinos   jsonb not null default '[]'::jsonb,                       -- [{canal: correo|push, n, ids}]
  created_at timestamptz not null default now(),
  unique (kind, dia)
);
create or replace function founder_reports_inmutable() returns trigger language plpgsql as $$
begin raise exception 'founder_reports es solo de inserción (% no permitido)', tg_op; end $$;
drop trigger if exists founder_reports_no_cambia on founder_reports;
create trigger founder_reports_no_cambia before update or delete on founder_reports for each row execute function founder_reports_inmutable();

-- ── El correo: las plantillas del reporte programado y del reporte diario ──
alter table email_outbox drop constraint if exists email_outbox_tpl_check;
alter table email_outbox add constraint email_outbox_tpl_check check (tpl in ('verify', 'receipt_order', 'receipt_table', 'receipt_pro', 'receipt_tickets', 'report', 'founder_daily'));

-- ── Los avisos al equipo (push; sin SMS) ──
insert into notif_templates (key, grp, pref, sms, title, body) values
  ('reporte_diario', 'mod', null, false, '{"es":"Tu reporte de hoy","en":"Your report for today"}',
    '{"es":"{resumen} Lo que necesita de ti: {pendientes}.","en":"{resumen} What needs you: {pendientes}."}'),
  ('reporte_no_salio', 'mod', null, false, '{"es":"El reporte diario no salió","en":"The daily report did not go out"}',
    '{"es":"A las 8:00 el reporte de hoy no había salido. Míralo en Analítica › Reportes.","en":"By 8:00 today''s report had not gone out. See Analytics › Reports."}')
on conflict (key) do nothing;

-- ── El interruptor del reporte diario (encendido: en el sandbox el correo queda en el simulador) ──
insert into feature_flags (key, enabled, note, updated_by) values ('reporte.diario', true, 'El reporte diario al fundador a las 7:30 AM de Hazleton (correo y push a los Admins)', 'migración 0137')
on conflict (key) do nothing;

-- ── La primera vez: toda la historia ──
select metricas_resumir('2000-01-01');

commit;
