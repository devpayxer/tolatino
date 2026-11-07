-- 0082 · Noche: la lista de la noche y la mesa / VIP (Fase 4 · 4nc). Plan: docs/diseno/plan/fase4-noche.md §2 (0082), §3 y §4nc.
-- Una lista o una mesa es una operación `night` (N-7101…). La lista es $0 y queda al instante (status confirmed); la mesa espera al
-- local (pending → confirmed / change_proposed / declined / expired) con el depósito RETENIDO al enviar y COBRADO al confirmar.
-- El código de la puerta (4 cifras) va en su columna, único por local y noche mientras la reserva está viva; nunca en vistas públicas,
-- registros ni avisos por SMS (guardián codigoPuerta). La noche = la fecha de la tarde en que abre (corte 6 AM). Idempotente.
begin;

create sequence if not exists night_seq start 7101;

alter table operations add column if not exists night_date date;
alter table operations add column if not exists door_code text;
alter table operations drop constraint if exists operations_door_code_check;
alter table operations add constraint operations_door_code_check check (door_code is null or door_code ~ '^[0-9]{4}$');

create unique index if not exists operations_door_code_uq on operations (business_id, night_date, door_code)
  where kind = 'night' and door_code is not null and status in ('pending', 'change_proposed', 'confirmed');
create index if not exists operations_noche_idx on operations (business_id, night_date, status) where kind = 'night';
create index if not exists operations_noche_cliente_idx on operations (user_id, sent_at desc) where kind = 'night';

insert into notif_templates (key, grp, pref, sms, title, body) values
  ('noche_lista', 'tx', 'cit', true, '{"es":"Estás en la lista","en":"You are on the list"}', '{"es":"Estás en la lista de {negocio} para {noche}. {puerta} Tu código está en To''Latino.","en":"You are on {negocio}''s list for {noche}. {puerta} Your code is in To''Latino."}'),
  ('biz_noche_mesa', 'biz', null, true, '{"es":"Nueva solicitud de mesa","en":"New table request"}', '{"es":"{cliente} pide {servicio} para {personas} · {noche} a las {hora}.{dep} Responde en {min} min.","en":"{cliente} requests {servicio} for {personas} · {noche} at {hora}.{dep} Reply within {min} min."}'),
  ('noche_ok', 'tx', 'cit', true, '{"es":"Mesa confirmada","en":"Table confirmed"}', '{"es":"{negocio} confirmó tu mesa para {noche} a las {hora}. Te la guardan {guarda} min.{dep} Tu código está en To''Latino.","en":"{negocio} confirmed your table for {noche} at {hora}. They hold it {guarda} min.{dep} Your code is in To''Latino."}'),
  ('noche_alt', 'tx', 'cit', true, '{"es":"Te proponen otra hora","en":"They propose another time"}', '{"es":"{negocio} no tiene mesa a tu hora; te proponen las {alt}. Acéptala o elige «No me sirve» y se libera tu depósito.","en":"{negocio} has no table at your time; they propose {alt}. Accept it or choose “Doesn’t work” and your deposit is released."}'),
  ('noche_no', 'tx', 'cit', true, '{"es":"No hay mesa","en":"No table"}', '{"es":"{negocio} no tiene mesa para {noche}.{dev}","en":"{negocio} has no table for {noche}.{dev}"}'),
  ('noche_exp', 'tx', 'cit', true, '{"es":"Sin respuesta","en":"No reply"}', '{"es":"{negocio} no contestó a tiempo tu solicitud de mesa.{dev}","en":"{negocio} did not reply to your table request in time.{dev}"}'),
  ('noche_cx', 'tx', 'cit', false, '{"es":"Cancelada","en":"Cancelled"}', '{"es":"Cancelaste en {negocio} para {noche}.{dev}","en":"You cancelled at {negocio} for {noche}.{dev}"}'),
  ('noche_biz_cx', 'tx', 'cit', true, '{"es":"El local canceló tu mesa","en":"The venue cancelled your table"}', '{"es":"{negocio} canceló tu mesa de {noche}: {motivo}. Te devolvemos todo.","en":"{negocio} cancelled your table for {noche}: {motivo}. Full refund."}'),
  ('noche_cover', 'tx', 'cit', true, '{"es":"Cambió el cover","en":"The cover changed"}', '{"es":"Esta noche el cover de {negocio} es {cover}. Lo que ya mandaste no cambia: {puerta}","en":"Tonight {negocio}''s cover is {cover}. What you already sent does not change: {puerta}"}'),
  ('noche_done', 'tx', 'cit', false, '{"es":"Buena noche","en":"Good night"}', '{"es":"¿Qué tal {negocio}? Tu reseña ayuda a otros a salir.","en":"How was {negocio}? Your review helps others go out."}'),
  ('biz_noche_alt_ok', 'biz', null, false, '{"es":"Aceptó la otra hora","en":"Accepted the new time"}', '{"es":"{cliente} aceptó las {hora}. Mesa confirmada.","en":"{cliente} accepted {hora}. Table confirmed."}'),
  ('biz_noche_alt_no', 'biz', null, false, '{"es":"No le sirvió la otra hora","en":"The new time did not work"}', '{"es":"{cliente} no aceptó la otra hora. Se liberó su depósito.","en":"{cliente} did not accept the new time. Their deposit was released."}'),
  ('biz_noche_cx', 'biz', null, false, '{"es":"Canceló una mesa","en":"A table was cancelled"}', '{"es":"{cliente} canceló su {servicio} de {noche}.{dep}","en":"{cliente} cancelled their {servicio} for {noche}.{dep}"}')
on conflict (key) do nothing;
commit;
