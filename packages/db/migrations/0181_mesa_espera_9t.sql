-- 0181 · 9t · «Avísame si se libera» de una mesa (LAUNCH «Avísame si se libera (lista de espera) y Otros restaurantes con mesa»; prototipo
-- rsvStVals: wAsk / wOn / onWait y offerVals «Se liberó una mesa»). Quien recibió «no pudo» (el restaurante no tenía mesa) o «sin respuesta»
-- se anota para ESA hora, ese día y esas personas. El barrido de cada minuto (lib/mesa-espera.ts) mira con el MISMO motor de disponibilidad
-- (lib/reservas.ts) si se liberó una mesa (una cancelación, un «no hay», una solicitud que venció, un bloqueo quitado, mesas nuevas): al primero
-- de la fila le guarda la mesa rsv_espera_min minutos (una retención a su nombre, como «Elegir hora») y le avisa UNA vez (push primero, SMS de
-- respaldo, horas de silencio como todos los avisos) con el enlace para tomarla. Si no la toma, la retención vence y la mesa pasa al siguiente.
-- Lo que pone la base:
-- · reservation_waitlist: una fila por pedido; nada se borra (estados): waiting → offered → taken, o left (la persona la quitó) / expired (pasó
--   la hora o el restaurante ya no toma reservaciones). Un estado final no vuelve atrás y nadie cambia de dueño (disparador).
-- · Una sola entrada viva por persona, restaurante, hora y personas (índice único parcial).
-- · La plantilla de aviso rsv_libre (Super Admin › Notificaciones la edita) y rsv_espera_min en Configuración › Avisos.
-- Idempotente: se puede aplicar dos veces.
begin;

create table if not exists reservation_waitlist (
  id           bigint generated always as identity primary key,
  city_id      text not null references cities (id),
  business_id  text not null references businesses (id),
  user_id      uuid not null references users (id),
  operation_id bigint references operations (id),          -- la solicitud que no se pudo (de ahí vino)
  day          date not null,                               -- el día en la ciudad del restaurante
  at_min       smallint not null check (at_min between 0 and 1439),
  starts_at    timestamptz not null,                        -- el mismo momento, para vencer y ordenar
  party_size   smallint not null check (party_size between 1 and 40),
  area         text not null default '',                    -- '' = cualquier área
  status       text not null default 'waiting' check (status in ('waiting', 'offered', 'taken', 'left', 'expired')),
  hold_id      uuid,                                        -- la retención que se le guardó al liberarse
  created_at   timestamptz not null default now(),
  offered_at   timestamptz,
  taken_at     timestamptz,
  ended_at     timestamptz
);
create unique index if not exists reservation_waitlist_viva on reservation_waitlist (user_id, business_id, starts_at, party_size) where status in ('waiting', 'offered');
create index if not exists reservation_waitlist_barrido on reservation_waitlist (business_id, starts_at) where status = 'waiting';
create index if not exists reservation_waitlist_op on reservation_waitlist (operation_id);
create index if not exists reservation_waitlist_hold on reservation_waitlist (hold_id) where hold_id is not null;
create index if not exists reservation_waitlist_usuario on reservation_waitlist (user_id, created_at desc) where status in ('waiting', 'offered');
create index if not exists reservation_waitlist_ciudad on reservation_waitlist (city_id, created_at desc);

-- Nada se borra; un estado final no vuelve; la fila nunca cambia de persona, restaurante, hora ni personas. Solo la purga de una cuenta borrada a
-- los 30 días (lib/datos/purgar.ts, tl.purga = 'si'; mapa de datos: reservation_waitlist.user_id → borrar) saca sus filas.
create or replace function reservation_waitlist_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if coalesce(current_setting('tl.purga', true), '') = 'si' then return old; end if;
    raise exception 'reservation_waitlist no se borra: cambia su estado';
  end if;
  if new.user_id <> old.user_id or new.business_id <> old.business_id or new.starts_at <> old.starts_at or new.party_size <> old.party_size or new.city_id <> old.city_id then
    raise exception 'reservation_waitlist: la persona, el restaurante, la hora y las personas no cambian';
  end if;
  if old.status in ('taken', 'left', 'expired') and new.status <> old.status then raise exception 'reservation_waitlist: % es final', old.status; end if;
  if old.status = 'offered' and new.status = 'waiting' then raise exception 'reservation_waitlist: una mesa ofrecida no vuelve a la fila'; end if;
  return new;
end $$;
drop trigger if exists reservation_waitlist_antes on reservation_waitlist;
create trigger reservation_waitlist_antes before update or delete on reservation_waitlist for each row execute function reservation_waitlist_antes();

-- El aviso (push primero; el SMS solo si el push no llega). El enlace lleva a la mesa guardada.
insert into notif_templates (key, grp, pref, sms, sms_mode, push, title, body) values
  ('rsv_libre', 'tx', 'cit', true, 'sin_push', true, '{"es":"Se liberó una mesa","en":"A table opened up"}', '{"es":"Se liberó una mesa en {negocio} el {dia} a las {hora} para {p}. Te la guardamos {min} minutos.","en":"A table opened up at {negocio} on {dia} at {hora} for {p}. We are holding it for {min} minutes."}')
on conflict (key) do nothing;
update notif_templates set sms_enlace = true where key = 'rsv_libre' and not sms_enlace;

insert into config_keys (key, min, max, def, unit, section, label, help, editable, bloqueo, edit_in, sort) values
  ('rsv_espera_min', 5, 30, 10, '{"es":"minutos","en":"minutes"}', 'avisos', '{"es":"Mesa liberada · cuánto se guarda","en":"Table opened up · how long it is held"}',
    '{"es":"Cuando se libera una mesa para alguien de la lista de espera («Avísame si se libera»), se la guardamos a su nombre estos minutos. Si no la toma, pasa al siguiente.","en":"When a table opens up for someone on the waitlist («Notify me if it opens up»), we hold it in their name for these minutes. If they do not take it, it goes to the next person."}',
    true, null, null, 966)
on conflict (key) do nothing;

commit;
