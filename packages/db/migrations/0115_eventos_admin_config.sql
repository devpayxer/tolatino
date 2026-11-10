-- 0115 · eventos_admin_config (6j · docs/diseno/plan/fase6-eventos.md §2 0115 y §4 6j). Cierra la Fase 6.
-- · Configuración › Eventos: las claves de 6a–6i ya viven en config_keys (sección 'eventos'); aquí se suman las que faltaban (la hora del
--   recordatorio del día antes, el aviso de vendido al organizador y los umbrales de las señales de Confianza), cada una con unidad,
--   límites y etiqueta ES/EN, y evt_pago_dia pasa a SOLO LECTURA: el panel y Publica tu evento dicen «el martes» (como 5i con los plazos
--   de la Fase 4: se abre cuando esos textos lean el valor; LAUNCH-CHECKLIST).
-- · Avisos: grupo `events` (Mi cuenta › Avisos › Eventos). pref 'evt' = «Boletos y cambios» (lo que no es crítico: avisos del organizador,
--   cambio de artista, RSVP, transferencias recibidas…), 'evtR' = «Recordatorios» (el día antes y «¡Es hoy!»), 'evtG' = «Eventos que
--   guardas». Sin pref = SIEMPRE llega (boleto comprado, devuelto, anulado, boleto que te mandan, cortesía, lugar de la lista de espera,
--   la propuesta y la confirmación del evento privado…); evt_cancelado, evt_fecha_cancelada, evt_movido y evt_hora_cambio siguen en 'crit'
--   (salen también de noche). Apagado = no llega ni a la campana (como la Comunidad). Las plantillas evp_* salen del grupo de citas.
--   Plantillas nuevas (sin SMS): bol_recordatorio («Mañana: …»), bol_es_hoy («¡Es hoy!»), evt_aforo90 (al organizador: vendió el 90 %
--   de una fecha) y evt_ajuste_admin (al organizador: To'Latino ajustó el cupo o extendió la venta).
-- · evt_avisos_enviados (SOLO INSERCIÓN): un aviso automático de Eventos se manda una vez (pk kind + ref): el recordatorio de cada orden
--   por fecha y el 90 % de cada fecha. Correr el barrido otra vez no manda otro.
-- · Super Admin › Eventos › la ficha: «Extender ventas» (event_dates.sales_extended_until: la venta en línea de esa fecha cierra más tarde,
--   nunca después de que empieza: en la puerta no se vende, D1; bol_venta_hasta lo lee) y «Ajustar cupo» (event_stock_overrides, SOLO
--   INSERCIÓN: el último ajuste de un tipo, una mesa o el aforo del día de una fecha manda sobre lo que guarde el organizador — un trigger
--   lo vuelve a poner en ticket_stock / table_stock / event_day_stock — y la base no deja bajarlo de lo vendido y apartado). event_changes
--   suma 'capacity_adjusted' y 'sales_extended'.
-- · Catálogo de formatos y géneros (hueco #8): event_format_categories gana `enabled` (apagar un formato para una categoría sin borrar).
-- · Confianza › Fraude: mod_flags suma la regla 'evt' (caso de Eventos en Reportes de usuario) y la vista evt_senales (ráfaga de órdenes
--   desde un mismo dispositivo, boletos recibidos y pasados a otro, entradas duplicadas en la puerta y
--   contracargos de boletos), 30 días, por persona (es Confianza, no Analítica). La misma tarjeta en varias cuentas necesita la huella
--   de Stripe (card.fingerprint; LAUNCH-CHECKLIST 6c): un pm_… es de una sola cuenta y no se usa como señal.
-- · Alerta viva «evento con sobreventa» (admin-dashboard L74): la vista evt_sobreventa compara los boletos vivos de cada tipo y mesa de una
--   fecha con su existencia. Con los checks de 0108 no debería salir nunca: si sale, algo se saltó la regla.
-- · Analítica › Eventos: vistas por ciudad, día local y formato SIN personas: evt_analitica_dia (vistas, guardados, RSVP, órdenes,
--   boletos, cortesías, bruto, comisión, devuelto, lista de espera y convertidos, incidencias), evt_asistencia_dia (por fecha que ya pasó:
--   esperados, entraron, no vinieron), evt_ventas_negocio_dia (por organizador: un negocio no es una persona) y evp_analitica_dia (evento
--   privado: pedidas, con propuesta, aceptadas, depósito, canceladas a tiempo y tarde).
-- Idempotente: se puede aplicar dos veces. Nada se borra.
begin;

-- ── Configuración › Eventos ──
insert into config_keys (key, min, max, def, unit, section, label, help, editable, bloqueo, edit_in, sort) values
  ('evt_recordatorio_hora', 6, 20, 10, '{"es":"h (hora local)","en":"h (local time)"}', 'eventos', '{"es":"Hora del recordatorio del día antes","en":"Time of the day-before reminder"}',
    '{"es":"Desde esta hora de la ciudad sale «Mañana: …» a quien tiene boletos o RSVP y a quien guardó el evento; «¡Es hoy!» sale a la misma hora el día del evento si todavía no empezó. 10 = 10 AM.","en":"From this local time «Tomorrow: …» goes out to ticket holders, RSVPs and people who saved the event; «It''s today!» goes out at the same time on the day if it has not started. 10 = 10 AM."}', true, null, null, 103),
  ('evt_aforo_aviso_pct', 50, 100, 90, '{"es":"%","en":"%"}', 'eventos', '{"es":"Aviso al organizador: vendido","en":"Organizer notice: sold"}',
    '{"es":"Cuando los boletos vendidos de una fecha (cortesías incluidas) llegan a este porcentaje de los que están a la venta, el organizador recibe un aviso (una vez por fecha).","en":"When tickets sold for a date (comps included) reach this percent of those on sale, the organizer gets a notice (once per date)."}', true, null, null, 104),
  ('evt_senal_ordenes_n', 2, 50, 4, '{"es":"órdenes","en":"orders"}', 'eventos', '{"es":"Señal: órdenes desde un mismo dispositivo","en":"Signal: orders from one device"}',
    '{"es":"Confianza › Fraude marca a quien compra boletos desde un dispositivo que hizo tantas órdenes en los minutos de abajo (posible reventa o bot).","en":"Trust › Fraud flags whoever buys from a device that placed this many orders within the minutes below (possible resale or bot)."}', true, null, null, 140),
  ('evt_senal_ordenes_min', 1, 240, 10, '{"es":"min","en":"min"}', 'eventos', '{"es":"Señal: en cuántos minutos","en":"Signal: within how many minutes"}',
    '{"es":"La ventana de la señal de arriba.","en":"The window for the signal above."}', true, null, null, 141),
  ('evt_senal_cadena_n', 1, 20, 2, '{"es":"boletos","en":"tickets"}', 'eventos', '{"es":"Señal: boletos recibidos y pasados a otro","en":"Signal: tickets received and passed on"}',
    '{"es":"En 30 días, quien recibe boletos por transferencia y los vuelve a transferir tantas veces sale en Confianza › Fraude (transferencias en cadena: posible reventa).","en":"Within 30 days, whoever receives tickets by transfer and transfers them again this many times shows in Trust › Fraud (chain transfers: possible resale)."}', true, null, null, 142)
on conflict (key) do update set min = excluded.min, max = excluded.max, def = excluded.def, unit = excluded.unit, section = excluded.section, label = excluded.label,
  help = excluded.help, editable = excluded.editable, bloqueo = excluded.bloqueo, edit_in = excluded.edit_in, sort = excluded.sort;

-- El día de pago lo dicen textos fijos («el martes después del evento»): SOLO LECTURA hasta que lean el valor.
update config_keys set editable = false,
       bloqueo = '{"es":"El panel (Eventos y Cobros), Publica tu evento y la ayuda dicen «el martes después del evento».","en":"The dashboard (Events and Payouts), Publish your event and help say «the Tuesday after the event»."}'::jsonb
 where key = 'evt_pago_dia' and (editable or bloqueo is null);

-- ── Avisos: grupo `events` ──
alter table notif_templates drop constraint if exists notif_templates_grp_check;
alter table notif_templates add constraint notif_templates_grp_check check (grp in ('crit', 'tx', 'mod', 'biz', 'mkt', 'community', 'events'));

insert into notif_templates (key, grp, pref, sms, title, body) values
  ('bol_recordatorio', 'events', 'evtR', false, '{"es":"Mañana: {evento}","en":"Tomorrow: {evento}"}',
    '{"es":"{cuando} · {lugar}. Tu QR está en Mi cuenta › Boletos y funciona sin señal. Sube el brillo en la puerta.","en":"{cuando} · {lugar}. Your QR is in My account › Tickets and works without signal. Turn up the brightness at the door."}'),
  ('bol_es_hoy', 'events', 'evtR', false, '{"es":"¡Es hoy!: {evento}","en":"It''s today!: {evento}"}',
    '{"es":"{cuando} · {lugar}. Ten tu QR a mano: Mi cuenta › Boletos. Funciona sin señal.","en":"{cuando} · {lugar}. Have your QR ready: My account › Tickets. It works without signal."}'),
  ('evt_aforo90', 'biz', null, false, '{"es":"Tu evento casi se agota","en":"Your event is almost sold out"}',
    '{"es":"{evento} · {cuando}: vendiste el {pct} % ({vendidos} de {total}). Lo ves en Panel › Eventos.","en":"{evento} · {cuando}: you sold {pct}% ({vendidos} of {total}). See it in Dashboard › Events."}'),
  ('evt_ajuste_admin', 'biz', null, false, '{"es":"To''Latino ajustó tu evento","en":"To''Latino adjusted your event"}',
    '{"es":"{evento} · {cuando}: {que}. Motivo: {motivo}","en":"{evento} · {cuando}: {que}. Reason: {motivo}"}')
on conflict (key) do nothing;

-- Lo que no es crítico se apaga en «Boletos y cambios»; los recordatorios y los guardados, en lo suyo; lo demás (sin pref) siempre llega.
update notif_templates set grp = 'events', pref = 'evt'
 where key in ('rsvp_ok', 'rsvp_vence', 'bol_reenviado', 'bol_transfer_ok', 'bol_transfer_vuelve', 'espera_vence', 'evt_aviso', 'evt_artista', 'evp_cambio', 'evp_cambio_no', 'evp_done')
   and (grp, coalesce(pref, '')) is distinct from ('events', 'evt');
update notif_templates set grp = 'events', pref = 'evtR'
 where key in ('rsvp_recordatorio', 'bol_recordatorio', 'bol_es_hoy', 'evp_recordatorio') and (grp, coalesce(pref, '')) is distinct from ('events', 'evtR');
update notif_templates set grp = 'events', pref = 'evtG' where key = 'evt_guardado_cerca' and (grp, coalesce(pref, '')) is distinct from ('events', 'evtG');
update notif_templates set grp = 'events', pref = null
 where key in ('bol_comprado', 'bol_reemitido', 'bol_anulado', 'bol_transfer_in', 'bol_cortesia', 'espera_lugar', 'bol_cancelado', 'bol_devuelto', 'evt_devolucion_total',
               'evp_propuesta', 'evp_otra_fecha', 'evp_no', 'evp_vence', 'evp_ok', 'evp_cancelado', 'evp_cancelado_negocio')
   and (grp <> 'events' or pref is not null);

-- Un aviso automático de Eventos se manda una vez (solo inserción).
create table if not exists evt_avisos_enviados (
  kind       text not null check (kind in ('bol_manana', 'bol_hoy', 'aforo')),
  ref        text not null check (char_length(ref) between 1 and 80),
  city_id    text references cities (id),
  at         timestamptz not null default now(),
  primary key (kind, ref)
);
create or replace function evt_avisos_enviados_inmutable() returns trigger language plpgsql as $$
begin raise exception 'evt_avisos_enviados es solo de inserción'; end $$;
drop trigger if exists evt_avisos_enviados_no_cambia on evt_avisos_enviados;
create trigger evt_avisos_enviados_no_cambia before update or delete on evt_avisos_enviados for each row execute function evt_avisos_enviados_inmutable();

-- ── Super Admin: extender ventas y ajustar cupo ──
alter table event_changes drop constraint if exists event_changes_kind_check;
alter table event_changes add constraint event_changes_kind_check check (kind in ('paused', 'resumed', 'moved', 'time_changed', 'venue_changed', 'cancelled', 'date_cancelled',
  'date_skipped', 'lineup_changed', 'frozen', 'unfrozen', 'capacity_adjusted', 'sales_extended'));

alter table event_dates add column if not exists sales_extended_until timestamptz;
alter table event_dates drop constraint if exists event_dates_venta_extendida;
alter table event_dates add constraint event_dates_venta_extendida check (sales_extended_until is null or sales_extended_until <= starts_at);

-- La venta en línea de una fecha cierra según el organizador (inicio · puertas · un día antes); si To'Latino la extendió, a esa hora (nunca
-- después de que empieza: en la puerta no se vende, D1).
create or replace function bol_venta_hasta(e events, d event_dates) returns timestamptz language sql stable as $$
  select case when d.sales_extended_until is not null
              then least(d.starts_at, greatest(d.sales_extended_until, case e.sales_until when 'doors' then d.doors_at
                                                                                       when 'day_before' then (d.local_date::timestamp) at time zone (select timezone from cities where id = d.city_id)
                                                                                       else d.starts_at end))
              else case e.sales_until when 'doors' then d.doors_at
                                      when 'day_before' then (d.local_date::timestamp) at time zone (select timezone from cities where id = d.city_id)
                                      else d.starts_at end end
$$;

create table if not exists event_stock_overrides (
  id            bigint generated always as identity primary key,
  event_id      bigint not null references events (id),
  event_date_id bigint not null references event_dates (id),
  city_id       text not null references cities (id),
  kind          text not null check (kind in ('tipo', 'mesa', 'dia')),
  ref_id        bigint,                                         -- ticket_types.id · event_tables.id · null (aforo del día)
  quantity      integer not null check (quantity between 0 and 100000),
  before_qty    integer,
  reason        text not null check (char_length(reason) between 3 and 500),
  by_user       uuid not null references users (id),
  at            timestamptz not null default now(),
  check ((kind = 'dia') = (ref_id is null))
);
create index if not exists event_stock_overrides_idx on event_stock_overrides (event_date_id, kind, ref_id, id desc);
create or replace function event_stock_overrides_inmutable() returns trigger language plpgsql as $$
begin raise exception 'event_stock_overrides es solo de inserción'; end $$;
drop trigger if exists event_stock_overrides_no_cambia on event_stock_overrides;
create trigger event_stock_overrides_no_cambia before update or delete on event_stock_overrides for each row execute function event_stock_overrides_inmutable();

-- El último ajuste de To'Latino manda sobre la cantidad que vuelva a poner el editor del organizador (evt_sincronizar_venta). El check de
-- cada tabla (vendido + apartado <= cantidad) sigue siendo la última barrera: un ajuste por debajo de lo vendido no se puede guardar.
create or replace function evt_cupo_admin() returns trigger language plpgsql as $$
declare q integer;
begin
  if tg_table_name = 'ticket_stock' then
    select o.quantity into q from event_stock_overrides o where o.event_date_id = new.event_date_id and o.kind = 'tipo' and o.ref_id = new.ticket_type_id order by o.id desc limit 1;
    if found and new.quantity is distinct from q then new.quantity := q; end if;
  elsif tg_table_name = 'table_stock' then
    select o.quantity into q from event_stock_overrides o where o.event_date_id = new.event_date_id and o.kind = 'mesa' and o.ref_id = new.table_id order by o.id desc limit 1;
    if found and new.quantity is distinct from q then new.quantity := q; end if;
  else
    select o.quantity into q from event_stock_overrides o where o.event_date_id = new.event_date_id and o.kind = 'dia' order by o.id desc limit 1;
    if found and new.capacity is distinct from q then new.capacity := q; end if;
  end if;
  return new;
end $$;
drop trigger if exists ticket_stock_cupo_admin on ticket_stock;
create trigger ticket_stock_cupo_admin before insert or update on ticket_stock for each row execute function evt_cupo_admin();
drop trigger if exists table_stock_cupo_admin on table_stock;
create trigger table_stock_cupo_admin before insert or update on table_stock for each row execute function evt_cupo_admin();
drop trigger if exists event_day_stock_cupo_admin on event_day_stock;
create trigger event_day_stock_cupo_admin before insert or update on event_day_stock for each row execute function evt_cupo_admin();

-- ── Catálogo de formatos y géneros ──
alter table event_format_categories add column if not exists enabled boolean not null default true;

-- ── Confianza › Fraude: señales de Eventos ──
alter table mod_flags drop constraint if exists mod_flags_rule_key_check;
alter table mod_flags add constraint mod_flags_rule_key_check check (rule_key in ('phone', 'pii', 'spam', 'hate', 'rev5', 'img', 'autohide', 'red', 'estafa', 'migra', 'autolesion', 'evt'));

create index if not exists ticket_holds_dispositivo_idx on ticket_holds (device, created_at) where status = 'converted' and device is not null;

create or replace view evt_senales as
with r as (   -- ráfaga: el dispositivo de esta orden hizo N órdenes o más en la ventana
  select h.user_id, h.city_id, count(*)::int as n, max(h.created_at) as at
    from ticket_holds h
   where h.status = 'converted' and h.device is not null and h.created_at > now() - interval '30 days'
     and (select count(*) from ticket_holds x where x.device = h.device and x.status = 'converted'
           and x.created_at between h.created_at - make_interval(mins => cfg_int('evt_senal_ordenes_min')) and h.created_at) >= cfg_int('evt_senal_ordenes_n')
   group by 1, 2),
c as (        -- boletos recibidos por transferencia y pasados a otro
  select t.from_user_id as user_id, t.city_id, count(*)::int as n, max(t.created_at) as at
    from ticket_transfers t
   where t.kind = 'transfer' and t.created_at > now() - interval '30 days' and t.status in ('pending', 'claimed')
     and exists (select 1 from ticket_transfers z where z.new_ticket_id = t.ticket_id and z.status = 'claimed')
   group by 1, 2),
d as (        -- el mismo boleto entró dos veces (sin conexión) o intentó entrar otra vez por otra puerta
  select coalesce(tk.holder_user_id, op.user_id) as user_id, s.city_id, count(*)::int as n, max(s.created_at) as at
    from ticket_scans s join tickets tk on tk.id = s.ticket_id left join operations op on op.id = tk.operation_id
   where s.resolution = 'duplicate' and s.created_at > now() - interval '30 days'
   group by 1, 2),
x as (        -- contracargos de órdenes de boletos
  select o.user_id, o.city_id, count(*)::int as n, max(dp.created_at) as at
    from disputes dp join operations o on o.id = dp.operation_id
   where o.kind = 'tickets' and dp.created_at > now() - interval '90 days'
   group by 1, 2)
select 'rafaga'::text as kind, user_id, city_id, n, at from r where user_id is not null
union all select 'cadena', user_id, city_id, n, at from c where n >= cfg_int('evt_senal_cadena_n') and user_id is not null
union all select 'duplicado', user_id, city_id, n, at from d where user_id is not null
union all select 'contracargo', user_id, city_id, n, at from x where user_id is not null;

-- ── Alerta viva: evento con sobreventa ──
create or replace view evt_sobreventa as
select 'tipo'::text as kind, s.event_date_id, d.event_id, s.city_id, s.ticket_type_id as ref_id, s.quantity, v.n as vivos
  from ticket_stock s join event_dates d on d.id = s.event_date_id
  join lateral (select count(*)::int as n from tickets t where t.ticket_type_id = s.ticket_type_id and t.event_date_id = s.event_date_id and t.table_id is null and t.status in ('valid', 'used')) v on true
 where v.n > s.quantity or s.sold_n + s.held_n > s.quantity
union all
select 'mesa', s.event_date_id, d.event_id, s.city_id, s.table_id, s.quantity, v.n
  from table_stock s join event_dates d on d.id = s.event_date_id
  join lateral (select count(*)::int as n from tickets t where t.table_id = s.table_id and t.event_date_id = s.event_date_id and t.status in ('valid', 'used')) v on true
 where v.n > s.quantity or s.sold_n + s.held_n > s.quantity;

-- ── Analítica › Eventos: por ciudad, día local y formato; sin personas ──
create index if not exists tickets_dia_idx on tickets (city_id, created_at);
create index if not exists rsvps_dia_idx on rsvps (city_id, created_at);
create index if not exists app_events_ver_evento_idx on app_events (at) where name = 'ver_evento';

create or replace view evt_analitica_dia as
with v as (select e.city_id, (a.at at time zone ci.timezone)::date as dia, e.format, count(*) as vistas
             from app_events a join events e on e.id::text = a.ref join cities ci on ci.id = e.city_id where a.name = 'ver_evento' group by 1, 2, 3),
g as (select e.city_id, (f.created_at at time zone ci.timezone)::date as dia, e.format, count(*) as guardados
        from favorites f join events e on f.kind = 'event' and e.id::text = f.target_id join cities ci on ci.id = e.city_id group by 1, 2, 3),
r as (select x.city_id, (x.created_at at time zone ci.timezone)::date as dia, e.format, count(*) as rsvp, sum(x.party) as rsvp_personas
        from rsvps x join events e on e.id = x.event_id join cities ci on ci.id = x.city_id group by 1, 2, 3),
-- Lo vendido: los boletos que salen de una compra (no los que nacen de una transferencia: son el mismo boleto con otro dueño).
b as (select t.city_id, (t.created_at at time zone ci.timezone)::date as dia, e.format,
             count(distinct t.operation_id) filter (where t.kind = 'paid') as ordenes, count(*) filter (where t.kind = 'paid') as boletos,
             count(*) filter (where t.kind = 'comp') as cortesias, coalesce(sum(t.fee_cents) filter (where t.kind = 'paid'), 0) as comision
        from tickets t join events e on e.id = t.event_id join cities ci on ci.id = t.city_id
       where not exists (select 1 from ticket_transfers z where z.new_ticket_id = t.id) group by 1, 2, 3),
-- El bruto: lo cobrado de cada orden de boletos (boletos, mesa y extras; cargos incluidos), el día que se pagó.
p as (select o.city_id, (p.captured_at at time zone ci.timezone)::date as dia, e.format, sum(p.amount_cents)::bigint as bruto
        from payments p join operations o on o.id = p.operation_id and o.kind = 'tickets' join events e on e.id = (o.details->>'event_id')::bigint join cities ci on ci.id = o.city_id
       where p.captured_at is not null group by 1, 2, 3),
dv as (select l.city_id, (l.created_at at time zone ci.timezone)::date as dia, e.format, sum(l.amount_cents)::bigint as devuelto
         from ticket_refund_lines l join operations o on o.id = l.operation_id join events e on e.id = (o.details->>'event_id')::bigint join cities ci on ci.id = l.city_id group by 1, 2, 3),
w as (select x.city_id, (x.created_at at time zone ci.timezone)::date as dia, e.format, count(*) as espera, count(*) filter (where x.status = 'converted') as espera_convertidos
        from waitlist x join events e on e.id = x.event_id join cities ci on ci.id = x.city_id group by 1, 2, 3),
i as (select x.city_id, (x.at at time zone ci.timezone)::date as dia, e.format, count(*) as incidencias
        from door_incidents x join events e on e.id = x.event_id join cities ci on ci.id = x.city_id group by 1, 2, 3),
k as (select city_id, dia, format from v union select city_id, dia, format from g union select city_id, dia, format from r union select city_id, dia, format from b
      union select city_id, dia, format from p union select city_id, dia, format from dv union select city_id, dia, format from w union select city_id, dia, format from i)
select k.city_id, k.dia, k.format,
       coalesce(v.vistas, 0)::int as vistas, coalesce(g.guardados, 0)::int as guardados, coalesce(r.rsvp, 0)::int as rsvp, coalesce(r.rsvp_personas, 0)::int as rsvp_personas,
       coalesce(b.ordenes, 0)::int as ordenes, coalesce(b.boletos, 0)::int as boletos, coalesce(b.cortesias, 0)::int as cortesias,
       coalesce(p.bruto, 0)::bigint as bruto, coalesce(b.comision, 0)::bigint as comision, coalesce(dv.devuelto, 0)::bigint as devuelto,
       coalesce(w.espera, 0)::int as espera, coalesce(w.espera_convertidos, 0)::int as espera_convertidos, coalesce(i.incidencias, 0)::int as incidencias
  from k left join v using (city_id, dia, format) left join g using (city_id, dia, format) left join r using (city_id, dia, format) left join b using (city_id, dia, format)
  left join p using (city_id, dia, format) left join dv using (city_id, dia, format) left join w using (city_id, dia, format) left join i using (city_id, dia, format);

-- Asistencia por fecha que ya terminó (el día local de la fecha): los que tenían boleto vivo (con mesa, las personas de la mesa) y cuántos
-- entraron; RSVP: cuántos dijeron que iban y cuántos llegaron; las incidencias de la puerta de esas mismas fechas. Un pase de varios días cuenta en la fecha de su boleto.
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
 where d.ends_at < now() and d.status in ('scheduled', 'done')
 group by 1, 2, 3;

-- Ventas por organizador (un negocio no es una persona), por ciudad y día local.
create or replace view evt_ventas_negocio_dia as
select o.city_id, (p.captured_at at time zone ci.timezone)::date as dia, o.business_id, b.name as negocio, count(distinct o.id)::int as ordenes,
       sum(p.amount_cents)::bigint as bruto, coalesce(sum(p.refunded_cents), 0)::bigint as devuelto,
       coalesce(sum((select sum(t.fee_cents) from tickets t where t.operation_id = o.id and t.kind = 'paid' and not exists (select 1 from ticket_transfers z where z.new_ticket_id = t.id))), 0)::bigint as comision
  from payments p join operations o on o.id = p.operation_id and o.kind = 'tickets' join businesses b on b.id = o.business_id join cities ci on ci.id = o.city_id
 where p.captured_at is not null
 group by 1, 2, 3, 4;

-- Evento privado: pedidas → con propuesta → aceptadas, el depósito y las cancelaciones a tiempo (devuelto) o tarde (se queda el restaurante).
create or replace view evp_analitica_dia as
with s as (select o.city_id, (o.sent_at at time zone ci.timezone)::date as dia, count(*) as pedidas,
                  count(*) filter (where exists (select 1 from private_event_quotes q where q.operation_id = o.id)) as con_propuesta,
                  count(*) filter (where o.status = 'expired' and o.status_detail = 'sin_respuesta') as sin_respuesta
             from operations o join cities ci on ci.id = o.city_id where o.kind = 'private_event' and o.sent_at is not null group by 1, 2),
a as (select o.city_id, (a.created_at at time zone ci.timezone)::date as dia, count(*) as aceptadas
        from private_event_acceptances a join operations o on o.id = a.operation_id join cities ci on ci.id = o.city_id where a.payment_id is not null group by 1, 2),
dp as (select o.city_id, (p.captured_at at time zone ci.timezone)::date as dia, sum(p.amount_cents)::bigint as deposito
         from payments p join operations o on o.id = p.operation_id and o.kind = 'private_event' join cities ci on ci.id = o.city_id where p.captured_at is not null group by 1, 2),
c as (select o.city_id, (o.cancelled_at at time zone ci.timezone)::date as dia,
             count(*) filter (where o.cancelled_by = 'user' and not coalesce((o.details->>'perdio')::boolean, false)) as a_tiempo,
             count(*) filter (where o.cancelled_by = 'user' and coalesce((o.details->>'perdio')::boolean, false)) as tarde,
             count(*) filter (where o.cancelled_by = 'business') as por_negocio
        from operations o join cities ci on ci.id = o.city_id
       where o.kind = 'private_event' and o.status = 'cancelled' and o.cancelled_at is not null
         and exists (select 1 from private_event_acceptances x where x.operation_id = o.id and x.payment_id is not null) group by 1, 2),
k as (select city_id, dia from s union select city_id, dia from a union select city_id, dia from dp union select city_id, dia from c)
select k.city_id, k.dia, coalesce(s.pedidas, 0)::int as pedidas, coalesce(s.con_propuesta, 0)::int as con_propuesta, coalesce(s.sin_respuesta, 0)::int as sin_respuesta,
       coalesce(a.aceptadas, 0)::int as aceptadas, coalesce(dp.deposito, 0)::bigint as deposito,
       coalesce(c.a_tiempo, 0)::int as canceladas_a_tiempo, coalesce(c.tarde, 0)::int as canceladas_tarde, coalesce(c.por_negocio, 0)::int as canceladas_negocio
  from k left join s using (city_id, dia) left join a using (city_id, dia) left join dp using (city_id, dia) left join c using (city_id, dia);

commit;
