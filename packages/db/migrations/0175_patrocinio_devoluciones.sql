-- 0175 · C-002 / C-003 (LAUNCH «Patrocinio: devolver lo que no se usó», «3-D Secure», «Evento oculto / módulo apagado», «Vistas sin el equipo»).
-- Lo que se decidió (decisión AB, REVISION «Patrocinios: devoluciones y pausa»):
--   · Devolver lo que no se usó: cancelar una reserva que no empezó devuelve todo; un evento cancelado y «Terminar» del Super Admin (con
--     «Devolver lo que no se usó» encendido de entrada) devuelven los días enteros sin usar, en proporción a los días comprados. «Terminar antes»
--     de uno activo (el dueño) no devuelve (lo dice la pantalla). Lo decide la base (patrocinio_devolucion) al terminar y queda escrito una vez en
--     el patrocinio (refund_cents); la devolución en Stripe va después, con su llave (una por patrocinio), y deja UNA fila en el libro
--     (sponsorship_payments, reason 'devolucion', solo inserción). Si la pasarela no responde, el barrido la reintenta con la misma llave.
--   · Evento oculto, en revisión o con Eventos apagado: el patrocinio se pausa (no sale ni cuenta vistas, sigue guardando su puesto); al volver,
--     se alarga lo que duró la pausa (si cabe: los puestos y el fin del evento mandan) y lo que no cupo se devuelve al terminar.
--   · Las vistas no cuentan al dueño ni a su equipo (una consulta por tanda, en la base).
-- Idempotente.
begin;

-- ── Lo que se devuelve, escrito una vez en el patrocinio al terminar ──
alter table sponsorships add column if not exists refund_cents integer, add column if not exists refund_days integer, add column if not exists refund_motive text;
alter table event_sponsorships add column if not exists refund_cents integer, add column if not exists refund_days integer, add column if not exists refund_motive text;
-- La pausa (solo eventos): desde cuándo está en pausa la que sigue abierta, los segundos de las pausas cerradas y lo que ya se devolvió alargando.
alter table event_sponsorships add column if not exists paused_at timestamptz, add column if not exists paused_secs integer not null default 0, add column if not exists extended_secs integer not null default 0;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'sponsorships_devolucion_check') then
    alter table sponsorships add constraint sponsorships_devolucion_check check (
      (refund_cents is null and refund_days is null and refund_motive is null)
      or (refund_cents > 0 and refund_cents <= price_cents and refund_days > 0 and status in ('terminado', 'cancelado')
          and refund_motive in ('reserva_cancelada', 'admin', 'evento_cancelado', 'pausa')));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'event_sponsorships_devolucion_check') then
    alter table event_sponsorships add constraint event_sponsorships_devolucion_check check (
      (refund_cents is null and refund_days is null and refund_motive is null)
      or (refund_cents > 0 and refund_cents <= price_cents and refund_days > 0 and status in ('terminado', 'cancelado')
          and refund_motive in ('reserva_cancelada', 'admin', 'evento_cancelado', 'pausa')));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'event_sponsorships_pausa_check') then
    alter table event_sponsorships add constraint event_sponsorships_pausa_check check (
      paused_secs >= 0 and extended_secs >= 0 and extended_secs <= paused_secs and (paused_at is null or status = 'activo'));
  end if;
end $$;
-- Lo que falta devolver (el barrido lo reintenta) y lo que está en pausa (el barrido lo mira cada minuto).
create index if not exists sponsorships_por_devolver_idx on sponsorships (ended_at) where refund_cents is not null;
create index if not exists event_sponsorships_por_devolver_idx on event_sponsorships (ended_at) where refund_cents is not null;
create index if not exists event_sponsorships_pausa_idx on event_sponsorships (paused_at) where paused_at is not null;

-- Cuánto se devuelve (centavos y días enteros), siempre aquí: `modo` 'todo' (una reserva que no empezó), 'sin_usar' (terminar antes de tiempo:
-- los días enteros que faltaban, sin contar lo que estuvo en pausa como usado), 'pausa' (lo que estuvo en pausa y no se pudo devolver alargando)
-- o 'nada'. Los días comprados: el período pagado redondeado al día (un día de cambio de horario no suma ni quita uno); el día empezado cuenta
-- como usado. Todos los días = el precio entero (sin redondeo).
create or replace function patrocinio_devolucion(modo text, precio integer, a timestamptz, b timestamptz, ext integer, pausa_s integer, pausa_desde timestamptz, t timestamptz)
returns table (cents integer, dias integer) language sql immutable as $$
  with x as (select greatest(1, ceil((extract(epoch from b - a) - ext) / 86400.0 - 1 / 24.0))::int as total,
                    extract(epoch from b - a) - ext as comprado,
                    pausa_s + coalesce(greatest(0, extract(epoch from t - pausa_desde)), 0) as pausado),
       d as (select total, (case modo
                when 'todo' then total
                when 'sin_usar' then case when t <= a then total
                  else least(total, greatest(0, floor((comprado - greatest(0, extract(epoch from t - a) - pausado)) / 86400.0 + 1 / 24.0)))::int end
                when 'pausa' then least(total, greatest(0, floor((pausado - ext) / 86400.0 + 1 / 24.0)))::int
                else 0 end)::int as dias from x)
  select (case when d.dias >= d.total then precio else floor(precio::numeric * d.dias / d.total) end)::int, d.dias from d
$$;

-- Lo que se devuelve se decide una sola vez (al terminar) y nunca cambia después.
create or replace function patrocinio_devolucion_una_vez() returns trigger language plpgsql as $$
begin
  if old.refund_cents is not null and (new.refund_cents is distinct from old.refund_cents or new.refund_days is distinct from old.refund_days
     or new.refund_motive is distinct from old.refund_motive) then
    raise exception 'patrocinio_devolucion: lo que se devuelve se decide una vez y no cambia';
  end if;
  if old.refund_cents is null and new.refund_cents is not null and old.status in ('terminado', 'cancelado') then
    raise exception 'patrocinio_devolucion: se decide al terminar, no después';
  end if;
  return new;
end $$;
drop trigger if exists sponsorships_devolucion on sponsorships;
create trigger sponsorships_devolucion before update on sponsorships for each row execute function patrocinio_devolucion_una_vez();
drop trigger if exists event_sponsorships_devolucion on event_sponsorships;
create trigger event_sponsorships_devolucion before update on event_sponsorships for each row execute function patrocinio_devolucion_una_vez();

-- Las reglas del patrocinio de un evento (0174) + la pausa: el fin solo se mueve hacia adelante para devolver lo que estuvo en pausa (alargar), lo
-- que se alarga nunca pasa de lo pausado, y alargar vuelve a pasar por los puestos (con candado) y por los otros patrocinios del mismo evento.
-- Al terminar en pausa, la pausa se cierra (cuenta hasta ese momento).
create or replace function patrocinio_evt_reglas() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'event_sponsorships: un patrocinio no se borra (estados)'; end if;
  if tg_op = 'UPDATE' then
    if new.event_id <> old.event_id or new.business_id <> old.business_id or new.city_id <> old.city_id or new.starts_at <> old.starts_at
       or new.duration <> old.duration or new.price_cents <> old.price_cents or new.payer_user_id <> old.payer_user_id
       or new.renewed_from is distinct from old.renewed_from then
      raise exception 'event_sponsorships: lo pagado no cambia (evento, negocio, ciudad, fechas, duración, precio, quién paga)';
    end if;
    if old.status in ('terminado', 'cancelado') and new.status is distinct from old.status then
      raise exception 'patrocinio_estado: de % no se pasa a %', old.status, new.status;
    end if;
    if old.status = 'activo' and new.status = 'reservado' then raise exception 'patrocinio_estado: de activo no se vuelve a reservado'; end if;
    if new.paused_secs < old.paused_secs or new.extended_secs < old.extended_secs then raise exception 'patrocinio_pausa: lo pausado y lo alargado solo suman'; end if;
    if new.status in ('terminado', 'cancelado') and old.paused_at is not null then
      new.paused_secs := old.paused_secs + greatest(0, floor(extract(epoch from now() - old.paused_at)))::int;
      new.paused_at := null;
    end if;
    -- El fin (lo pagado) no cambia, salvo para devolver la pausa alargando: exactamente lo alargado, nunca más que lo pausado, solo lo activo.
    if new.ends_at <> old.ends_at then
      if new.status <> 'activo' or new.extended_secs <= old.extended_secs or new.ends_at <> old.ends_at + make_interval(secs => new.extended_secs - old.extended_secs)
         or new.extended_secs > new.paused_secs then
        raise exception 'event_sponsorships: lo pagado no cambia (el fin solo se alarga lo que estuvo en pausa)';
      end if;
      perform pg_advisory_xact_lock(hashtextextended('patevt:' || new.city_id, 0));
      if exists (select 1 from public.event_sponsorships s where s.event_id = new.event_id and s.status in ('reservado', 'activo') and s.id <> new.id
                   and s.starts_at < new.ends_at and s.ends_at > old.ends_at) then
        raise exception 'patrocinio_cruza: ese evento ya tiene un patrocinio en esas fechas';
      end if;
      if public.patrocinio_evt_a_la_vez(new.city_id, old.ends_at, new.ends_at, new.id) >= public.cfg_int('patrocinio_evt_puestos') then
        raise exception 'patrocinio_sin_puestos: no quedan puestos en esas fechas';
      end if;
    elsif new.extended_secs <> old.extended_secs then
      raise exception 'patrocinio_pausa: lo alargado es lo que se movió el fin';
    end if;
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
    if new.paused_at is not null or new.paused_secs <> 0 or new.extended_secs <> 0 then raise exception 'patrocinio_pausa: un patrocinio nuevo empieza sin pausa'; end if;
  end if;
  return new;
end $$;

-- ── El libro: una fila de devolución por patrocinio (solo inserción, como todo el libro) ──
alter table sponsorship_payments add column if not exists refund_id text, add column if not exists refund_of bigint references sponsorship_payments (id),
  add column if not exists refund_days integer, add column if not exists refund_motive text;
alter table sponsorship_payments drop constraint if exists sponsorship_payments_reason_check;
alter table sponsorship_payments add constraint sponsorship_payments_reason_check check (reason in ('compra', 'renovacion', 'devolucion'));
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'sponsorship_payments_devolucion_check') then
    alter table sponsorship_payments add constraint sponsorship_payments_devolucion_check check (
      (reason = 'devolucion') = (refund_id is not null and refund_of is not null and refund_days > 0
                                 and refund_motive in ('reserva_cancelada', 'admin', 'evento_cancelado', 'pausa')));
  end if;
end $$;
-- El mismo PaymentIntent tiene su cobro y (si toca) su devolución: el pi es único entre los cobros; una devolución por patrocinio.
alter table sponsorship_payments drop constraint if exists sponsorship_payments_pi_key;
create unique index if not exists sponsorship_payments_pi_cobro on sponsorship_payments (pi) where reason <> 'devolucion';
create unique index if not exists sponsorship_payments_una_devolucion on sponsorship_payments (kind, ref_id) where reason = 'devolucion';
create unique index if not exists sponsorship_payments_refund_id on sponsorship_payments (refund_id) where refund_id is not null;
create index if not exists sponsorship_payments_devoluciones_idx on sponsorship_payments (created_at) where reason = 'devolucion';
-- Una devolución es de un cobro de ESE patrocinio (el mismo pi), nunca de más que lo cobrado y nunca de más que lo que el patrocinio decidió.
create or replace function patrocinio_devolucion_del_libro() returns trigger language plpgsql as $$
declare c sponsorship_payments; tope integer;
begin
  if new.reason <> 'devolucion' then return new; end if;
  select * into c from sponsorship_payments where id = new.refund_of;
  if c.id is null or c.reason = 'devolucion' or c.kind <> new.kind or c.ref_id <> new.ref_id or c.pi <> new.pi then
    raise exception 'patrocinio_devolucion: la devolución es del cobro de ese patrocinio';
  end if;
  if new.amount_cents > c.amount_cents then raise exception 'patrocinio_devolucion: nunca más que lo cobrado'; end if;
  if new.kind = 'negocio' then select refund_cents into tope from sponsorships where id = new.ref_id;
  else select refund_cents into tope from event_sponsorships where id = new.ref_id; end if;
  if tope is null or new.amount_cents > tope then raise exception 'patrocinio_devolucion: nunca más que lo que se decidió al terminar'; end if;
  return new;
end $$;
drop trigger if exists sponsorship_payments_devolucion on sponsorship_payments;
create trigger sponsorship_payments_devolucion before insert on sponsorship_payments for each row execute function patrocinio_devolucion_del_libro();

-- ── Vistas: una por persona (o dispositivo) y día por patrocinio, solo de lo activo y SIN PAUSA, y nunca del dueño ni de su equipo ──
-- (una consulta por tanda: la gente del negocio sale con un solo «not exists» sobre business_members, sin una consulta por fila).
create or replace function patrocinio_vistas(k text, ids bigint[], quien uuid, dev uuid) returns integer language plpgsql as $$
declare n int;
begin
  if quien is null and dev is null then return 0; end if;
  if k not in ('negocio', 'evento') then return 0; end if;
  perform set_config('tl.patrocinio_cifras', 'on', true);
  with vivos as (
    select s.id, s.business_id from sponsorships s where k = 'negocio' and s.id = any(ids) and s.status = 'activo'
    union all
    select s.id, s.business_id from event_sponsorships s where k = 'evento' and s.id = any(ids) and s.status = 'activo' and s.paused_at is null),
       ajenos as (
    select v.id from vivos v
     where quien is null or not exists (select 1 from business_members m where m.business_id = v.business_id and m.user_id = quien and m.status = 'active')),
       nuevas as (
    insert into sponsorship_views (kind, ref_id, who)
      select k, a.id, coalesce('u:' || quien::text, 'd:' || dev::text) from ajenos a
      on conflict do nothing returning ref_id),
       sumadas as (
    insert into sponsorship_stats (kind, ref_id, views) select k, ref_id, 1 from nuevas
      on conflict (kind, ref_id) do update set views = sponsorship_stats.views + 1, updated_at = now() returning 1)
  select count(*) into n from sumadas;
  perform set_config('tl.patrocinio_cifras', 'off', true);
  return n;
end $$;

-- Entró: tampoco cuenta lo que está en pausa (no se muestra).
create or replace function patrocinio_entro(k text, id bigint, quien uuid, dev uuid) returns boolean language plpgsql as $$
declare nuevo bigint;
begin
  if quien is null and dev is null then return false; end if;
  if k = 'negocio' then
    if not exists (select 1 from sponsorships s where s.id = patrocinio_entro.id and s.status = 'activo') then return false; end if;
  elsif k = 'evento' then
    if not exists (select 1 from event_sponsorships s where s.id = patrocinio_entro.id and s.status = 'activo' and s.paused_at is null) then return false; end if;
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

-- ── Avisos (bandeja y push; sin SMS) ──
insert into notif_templates (key, grp, pref, sms, sms_mode, push, push_private, app, title, body) values
  ('biz_patrocinio_devuelto', 'biz', null, false, 'nunca', true, false, 'negocio', '{"es":"Te devolvimos lo que no se usó","en":"We refunded what was not used"}',
    '{"es":"Te devolvimos {monto} a {tarjeta} por lo que no se usó del patrocinio de {negocio} en {donde} ({n} de {total} días). Tu banco lo muestra en 5 a 10 días hábiles.","en":"We refunded {monto} to {tarjeta} for the unused part of the {negocio} sponsorship in {donde} ({n} of {total} days). Your bank shows it in 5 to 10 business days."}'),
  ('biz_patevt_devuelto', 'biz', null, false, 'nunca', true, false, 'negocio', '{"es":"Te devolvimos lo que no se usó","en":"We refunded what was not used"}',
    '{"es":"Te devolvimos {monto} a {tarjeta} por lo que no se usó del patrocinio de {evento} ({n} de {total} días). Tu banco lo muestra en 5 a 10 días hábiles.","en":"We refunded {monto} to {tarjeta} for the unused part of the {evento} sponsorship ({n} of {total} days). Your bank shows it in 5 to 10 business days."}'),
  ('biz_patevt_pausa', 'biz', null, false, 'nunca', true, false, 'negocio', '{"es":"El patrocinio de tu evento está en pausa","en":"Your event sponsorship is paused"}',
    '{"es":"{evento} no se ve en Eventos (oculto, en revisión o con Eventos apagado), así que su patrocinio está en pausa. Cuando vuelva a verse, sigue y se alarga lo que duró la pausa.","en":"{evento} is not showing on Events (hidden, under review or with Events turned off), so its sponsorship is paused. When it shows again, it continues and is extended by however long the pause lasted."}'),
  ('biz_patevt_sigue', 'biz', null, false, 'nunca', true, false, 'negocio', '{"es":"El patrocinio de tu evento siguió","en":"Your event sponsorship resumed"}',
    '{"es":"{evento} volvió a Patrocinados de Eventos · {ciudad} hasta el {hasta}.","en":"{evento} is back in Sponsored on Events · {ciudad} until {hasta}."}')
on conflict (key) do nothing;
-- El aviso de un evento cancelado ya no manda a Soporte por lo pagado: lo que no se usó se devuelve solo (y llega su propio aviso). Solo si nadie
-- lo cambió en el Super Admin.
update notif_templates set body = '{"es":"{evento} se canceló, así que dejó de salir en Patrocinados de Eventos. Te devolvemos los días que no se usaron a tu tarjeta.","en":"{evento} was cancelled, so it no longer shows in Sponsored on Events. We refund the unused days to your card."}'::jsonb
 where key = 'biz_patevt_cancelado' and body->>'es' = '{evento} se canceló, así que dejó de salir en Patrocinados de Eventos. Si tienes dudas sobre lo pagado, escribe a Soporte.';

commit;
