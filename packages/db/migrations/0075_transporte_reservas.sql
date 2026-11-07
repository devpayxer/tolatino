-- 0075 · Transporte: reservar viaje (por asiento o vehículo completo), retener el total, confirmar y cobrar, otra salida, no hay
-- cupo, vence, cancelar (24 h; después la mitad), el negocio cancela una salida (devolución a todos), va tarde, salió, llegó
-- (Fase 4 · 4y-1). Plan: docs/diseno/plan/fase4-fiestas-transporte.md §3 y §4y. Diseño: neg-trans-flow.js (APP-NEG-TRANS-RESERVA →
-- APP-NEG-TRANS-ESTADO). Un viaje es una operación `trip` (V-9101…). Los asientos de una salida van en run_seats; trip_runs.seats_booked
-- es su suma (derivado: lo mantiene el servidor en la misma transacción, con el candado de la salida). Idempotente.
begin;

create sequence if not exists trip_seq start 9101;

create table if not exists run_seats (
  id bigint generated always as identity primary key,
  operation_id bigint not null references operations (id),
  run_id bigint not null references trip_runs (id),
  seats smallint not null check (seats between 1 and 56),
  status text not null default 'held' check (status in ('held', 'boarded', 'noshow', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (operation_id, run_id)
);
create index if not exists run_seats_run_idx on run_seats (run_id) where status <> 'cancelled';
create index if not exists operations_viaje_idx on operations (business_id, scheduled_at) where kind = 'trip';
create index if not exists operations_viaje_cliente_idx on operations (user_id, sent_at desc) where kind = 'trip';

insert into notif_templates (key, grp, pref, sms, title, body) values
  ('biz_viaje', 'biz', null, true, '{"es":"Nueva reserva","en":"New booking"}', '{"es":"{cliente} reservó {servicio} para el {dia} a las {hora} ({personas}). Confirma en la app.","en":"{cliente} booked {servicio} for {dia} at {hora} ({personas}). Confirm in the app."}'),
  ('viaje_ok', 'tx', 'cit', true, '{"es":"Viaje confirmado","en":"Trip confirmed"}', '{"es":"{negocio} confirmó tu viaje: {dia} a las {hora}. Se cobraron {total}, precio cerrado.","en":"{negocio} confirmed your trip: {dia} at {hora}. {total} was charged, fixed price."}'),
  ('viaje_alt', 'tx', 'cit', true, '{"es":"Te proponen otra salida","en":"Another departure proposed"}', '{"es":"{negocio} no tiene cupo a esa hora y te propone {alt}. Acéptala o no en la app; si no te sirve, se libera lo retenido.","en":"{negocio} has no room at that time and proposes {alt}. Accept it or not in the app; if it does not work, the hold is released."}'),
  ('viaje_no', 'tx', 'cit', true, '{"es":"No hay cupo","en":"No room"}', '{"es":"{negocio} no tiene cupo para el {dia} a las {hora}. Liberamos lo retenido.","en":"{negocio} has no room on {dia} at {hora}. We released the hold."}'),
  ('viaje_exp', 'tx', 'cit', true, '{"es":"Sin respuesta","en":"No reply"}', '{"es":"{negocio} no contestó tu reserva del {dia}. Liberamos lo retenido.","en":"{negocio} did not reply to your booking for {dia}. We released the hold."}'),
  ('viaje_tarde', 'tx', 'cit', true, '{"es":"Tu salida va tarde","en":"Your departure is late"}', '{"es":"{negocio}: la salida de las {hora} va tarde. Sale a las {nueva}.","en":"{negocio}: the {hora} departure is late. It now leaves at {nueva}."}'),
  ('viaje_salio', 'tx', 'cit', false, '{"es":"Salió tu viaje","en":"Your trip left"}', '{"es":"Salió tu viaje con {negocio} a las {hora}.","en":"Your trip with {negocio} left at {hora}."}'),
  ('viaje_cancelada', 'tx', 'cit', true, '{"es":"Cancelaron tu salida","en":"Your departure was cancelled"}', '{"es":"{negocio} canceló la salida del {dia} a las {hora}: {motivo}. Te devolvemos todo.","en":"{negocio} cancelled the {dia} {hora} departure: {motivo}. You get everything back."}'),
  ('viaje_cx', 'tx', 'cit', false, '{"es":"Cancelaste tu viaje","en":"You cancelled your trip"}', '{"es":"Cancelaste tu viaje del {dia} con {negocio}.{dev}","en":"You cancelled your trip on {dia} with {negocio}.{dev}"}'),
  ('viaje_llego', 'tx', 'cit', false, '{"es":"¿Cómo estuvo tu viaje?","en":"How was your trip?"}', '{"es":"Llegaste con {negocio}. Cuéntale a los vecinos si salió a la hora.","en":"You arrived with {negocio}. Tell your neighbors if it left on time."}'),
  ('biz_viaje_cx', 'biz', null, false, '{"es":"Cancelaron un viaje","en":"Trip cancelled"}', '{"es":"{cliente} canceló su viaje del {dia} a las {hora}.{dep}","en":"{cliente} cancelled their trip on {dia} at {hora}.{dep}"}'),
  ('biz_viaje_alt_ok', 'biz', null, false, '{"es":"Aceptaron la otra salida","en":"Other departure accepted"}', '{"es":"{cliente} aceptó la salida del {dia} a las {hora}.","en":"{cliente} accepted the {dia} {hora} departure."}')
on conflict (key) do nothing;

commit;
