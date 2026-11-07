-- 0094 · Pedir visita, prueba de manejo y fecha (Fase 4 · 4ie). Plan: docs/diseno/plan/fase4-iglesias-inmuebles-autos.md §2 «0094
-- visitas_ver», §3 (dinero y datos personales), §4ie y §6 #2, #3, #6 y #15. Diseño: neg-edu-flow.js (VOCS inm · dealer con visit, todayOf,
-- cobro, citaVals L66–71), neg-inm-kind.js btnOf L90, neg-dealer-kind.js btnOf L106, neg-fe-kind.js btnOf L104.
--   · Una visita (Bienes Raíces) o una prueba de manejo (Venta de Autos) es una operación `visit` (D-8101…; «P-» es de los pre-estimados de Auto y Hogar). También la cita, la
--     precalificación y la oferta en efectivo de esos dos rubros (solo día y hora para que llamen: ningún dato de dinero).
--     details: rubro (inm | dealer), item_id, group_id (la hora apartada), what (visita | prueba | cita | precal | oferta) y la COPIA al
--     enviar de lo que importa (renta, depósito y lo de mudarse; precio, total en la puerta, cargo del dealer y el pago de ejemplo con tasa,
--     meses y enganche; título y millas). Si el negocio cambia la herramienta después, lo enviado no cambia.
--   · NADA SE COBRA: ni por ver, ni por la prueba, ni por apartar (guardián sinDineroEnVisitas). Ningún payment, ninguna retención.
--   · La dirección del cliente (prueba de manejo en casa) va CIFRADA en op_private (motivo 'casa') y el dealer la lee solo con la visita
--     confirmada, con auditoría de cada vista. La dirección exacta de un cuarto (addr_public = false) le llega al cliente al confirmarse.
--   · La nota pasa por el filtro del servidor (seguro social / ITIN de 9 cifras, tarjetas y cuentas de 13 a 19 cifras se tapan); la base
--     lo vuelve a comprobar (check operations_nota_sin_numeros). Nunca se pide licencia de conducir: solo «Sí, tengo licencia vigente».
--   · Horas de prueba de manejo = class_groups purpose 'prueba' de un día; «cualquier carro» del lote = sin item_id (por negocio), desde el
--     patrón semanal de dealer_settings.test_pattern (14 días adelante, el barrido las rehace).
--   · Iglesias usa `enrollment` (0088) con rubro 'fe' (I-41xx): avisos insc_fe_* y, en consejería, capellanía, oración y recuperación,
--     insc_fen_* NEUTROS (sin el lugar ni el servicio: el teléfono bloqueado no lo dice; guardián avisoFeNeutro). La nota de consejería va
--     cifrada en op_private (motivo 'fe') y se borra a los 30 días.
--   · Cola «Plantones»: un negocio que marca 3 «No vino» en 30 días (revisar que no los use para frenar reseñas).
-- Idempotente; nada se borra.
begin;

create sequence if not exists visit_seq start 8101;

create index if not exists operations_vis_negocio_idx on operations (business_id, status, sent_at desc) where kind = 'visit';
create index if not exists operations_vis_cliente_idx on operations (user_id, sent_at desc) where kind = 'visit';
create index if not exists operations_vis_grupo_idx on operations ((details->>'group_id')) where kind = 'visit';
create index if not exists operations_vis_item_idx on operations (business_id, (details->>'item_id'), status) where kind = 'visit';

-- La nota de una visita (y de una fecha de Iglesias) nunca guarda un seguro social / ITIN ni un número de tarjeta o de cuenta (§3).
-- «not valid»: solo vale para lo nuevo (lo viejo de otros rubros no se toca).
alter table operations drop constraint if exists operations_nota_sin_numeros;
alter table operations add constraint operations_nota_sin_numeros check (
  customer_note is null
  or not (kind = 'visit' or (kind = 'enrollment' and details->>'rubro' = 'fe'))
  or (customer_note !~ '(^|[^0-9])[0-9]{3}[ -]?[0-9]{2}[ -]?[0-9]{4}([^0-9]|$)' and customer_note !~ '([0-9][ -]?){12,18}[0-9]')
) not valid;

-- Horas de prueba de manejo «cualquier carro»: un grupo de un día del negocio, sin carro.
alter table class_groups alter column item_id drop not null;
alter table class_groups drop constraint if exists class_groups_item_check;
alter table class_groups add constraint class_groups_item_check check (item_id is not null or purpose = 'prueba');
create unique index if not exists class_groups_prueba_uno_idx on class_groups (business_id, coalesce(item_id, 0), starts_on, start_min) where purpose = 'prueba' and status <> 'cancelled';
create index if not exists class_groups_prueba_idx on class_groups (business_id, starts_on) where purpose = 'prueba' and status in ('open', 'started');

alter table dealer_settings add column if not exists test_pattern jsonb not null default '[]'::jsonb;
alter table dealer_settings add column if not exists test_cupo smallint not null default 1;
alter table dealer_settings drop constraint if exists dealer_settings_test_check;
alter table dealer_settings add constraint dealer_settings_test_check check (jsonb_typeof(test_pattern) = 'array' and jsonb_array_length(test_pattern) <= 21 and test_cupo between 1 and 5);

-- Lo privado de una operación: la dirección de la prueba en casa ('casa') y la nota de consejería o capellanía ('fe'), cifradas.
alter table op_private drop constraint if exists op_private_reason_check;
alter table op_private add constraint op_private_reason_check
  check (reason in ('nuevo', 'seguimiento', 'receta', 'papeles', 'chequeo', 'primera', 'caso', 'carta', 'fecha', 'destinatario', 'nino', 'casa', 'fe'));

-- Cola «Plantones» (3 «No vino» en 30 días).
alter table queue_items drop constraint if exists queue_items_queue_check;
alter table queue_items add constraint queue_items_queue_check check (queue = any (array['sello', 'nuevo', 'lic', 'medios', 'rec', 'cambio', 'rep', 'sop', 'chat', 'disputa', 'renta', 'mesa', 'noid',
  'cuidado', 'salir', 'grupo', 'plantones']));

-- Avisos. Las variables son las mismas en los dos idiomas (como insc_*): {cuando} y {que} van en español.
insert into notif_templates (key, grp, pref, sms, title, body) values
  ('vis_ok', 'tx', 'cit', true, '{"es":"Confirmada","en":"Confirmed"}', '{"es":"{negocio} confirmó tu solicitud {num} para el {cuando}.{dir} No pagas nada.","en":"{negocio} confirmed your request {num} for {cuando}.{dir} You pay nothing."}'),
  ('vis_alt', 'tx', 'cit', true, '{"es":"Te proponen otra hora","en":"They propose another time"}', '{"es":"{negocio} te propone el {cuando} para tu solicitud {num}. Acéptala o elige «No me sirve».","en":"{negocio} proposes {cuando} for your request {num}. Accept it or choose “Doesn’t work”."}'),
  ('vis_no', 'tx', 'cit', true, '{"es":"No hay visita a esa hora","en":"No visit at that time"}', '{"es":"{negocio} no puede a esa hora ({num}). No se cobró nada: pide otra hora cuando quieras.","en":"{negocio} cannot at that time ({num}). Nothing was charged: request another time whenever you want."}'),
  ('vis_exp', 'tx', 'cit', true, '{"es":"Sin respuesta","en":"No reply"}', '{"es":"{negocio} no contestó a tiempo tu solicitud {num}. No se cobró nada.","en":"{negocio} did not reply in time to your request {num}. Nothing was charged."}'),
  ('vis_cx', 'tx', 'cit', false, '{"es":"Cancelada","en":"Cancelled"}', '{"es":"Cancelaste tu solicitud {num} con {negocio}. No se cobró nada.","en":"You cancelled your request {num} with {negocio}. Nothing was charged."}'),
  ('vis_biz_cx', 'tx', 'cit', true, '{"es":"Cancelaron tu visita","en":"Your visit was cancelled"}', '{"es":"{negocio} canceló tu solicitud {num}: {motivo}. No se cobró nada.","en":"{negocio} cancelled your request {num}: {motivo}. Nothing was charged."}'),
  ('vis_vendido', 'tx', 'cit', true, '{"es":"Ya no está disponible","en":"No longer available"}', '{"es":"«{item}» ya no está disponible. Tu solicitud {num} quedó cancelada y no es culpa tuya. No se cobró nada.","en":"“{item}” is no longer available. Your request {num} was cancelled through no fault of yours. Nothing was charged."}'),
  ('vis_recordatorio', 'tx', 'cit', true, '{"es":"Es hoy","en":"It is today"}', '{"es":"Hoy a las {hora}: tu solicitud {num} con {negocio}.{dir}","en":"Today at {hora}: your request {num} with {negocio}.{dir}"}'),
  ('vis_resena', 'tx', 'cit', false, '{"es":"¿Cómo te fue?","en":"How did it go?"}', '{"es":"Cuéntale a otros cómo te fue con {negocio}. Tu reseña sale verificada.","en":"Tell others how it went with {negocio}. Your review shows as verified."}'),
  ('biz_vis', 'biz', null, true, '{"es":"Nueva solicitud","en":"New request"}', '{"es":"{cliente} pide {que} el {cuando}: {item}.{extra} Responde antes de {vence}.","en":"{cliente} requests {que} on {cuando}: {item}.{extra} Reply before {vence}."}'),
  ('biz_vis_cx', 'biz', null, false, '{"es":"Cancelaron una solicitud","en":"A request was cancelled"}', '{"es":"{cliente} canceló su solicitud {num} ({cuando}).","en":"{cliente} cancelled their request {num} ({cuando})."}'),
  ('biz_vis_alt_ok', 'biz', null, false, '{"es":"Aceptó la otra hora","en":"Accepted the other time"}', '{"es":"{cliente} aceptó el {cuando} ({num}). Quedó confirmada.","en":"{cliente} accepted {cuando} ({num}). It is confirmed."}'),
  ('biz_vis_alt_no', 'biz', null, false, '{"es":"No le sirvió la otra hora","en":"The other time did not work"}', '{"es":"{cliente} no aceptó la otra hora ({num}).","en":"{cliente} did not accept the other time ({num})."}'),
  -- Iglesias: las mismas inscripciones con el habla de la iglesia (fecha, tu lugar).
  ('insc_fe_ok', 'tx', 'cit', true, '{"es":"Fecha confirmada","en":"Date confirmed"}', '{"es":"{negocio} confirmó tu fecha{cuando}. Te esperamos.","en":"{negocio} confirmed your date{cuando}. See you there."}'),
  ('insc_fe_alt', 'tx', 'cit', true, '{"es":"Te proponen otra fecha","en":"They propose another date"}', '{"es":"{negocio} te propone otra fecha: {grupo}. Acéptala o elige «No me sirve».","en":"{negocio} proposes another date: {grupo}. Accept it or choose “Doesn’t work”."}'),
  ('insc_fe_no', 'tx', 'cit', true, '{"es":"No hay esa fecha","en":"That date is not available"}', '{"es":"{negocio} no tiene esa fecha. Pide otra cuando quieras: no se cobra nada.","en":"{negocio} does not have that date. Ask for another whenever you want: nothing is charged."}'),
  ('insc_fe_exp', 'tx', 'cit', true, '{"es":"Sin respuesta","en":"No reply"}', '{"es":"{negocio} no contestó a tiempo. Pide otra fecha cuando quieras.","en":"{negocio} did not reply in time. Ask for another date whenever you want."}'),
  ('insc_fe_cx', 'tx', 'cit', false, '{"es":"Cancelada","en":"Cancelled"}', '{"es":"Cancelaste tu fecha en {negocio}.","en":"You cancelled your date at {negocio}."}'),
  ('insc_fe_biz_cx', 'tx', 'cit', true, '{"es":"Cancelaron tu fecha","en":"Your date was cancelled"}', '{"es":"{negocio} canceló tu fecha: {motivo}.","en":"{negocio} cancelled your date: {motivo}."}'),
  ('insc_fe_grupo_cx', 'tx', 'cit', true, '{"es":"El grupo no abre","en":"The group will not open"}', '{"es":"{negocio} canceló el grupo: {motivo}.","en":"{negocio} cancelled the group: {motivo}."}'),
  ('insc_fe_empieza', 'tx', 'cit', true, '{"es":"Es mañana","en":"It is tomorrow"}', '{"es":"Mañana es tu fecha en {negocio}{cuando}.","en":"Your date at {negocio} is tomorrow{cuando}."}'),
  ('insc_fe_done', 'tx', 'cit', false, '{"es":"Gracias por ir","en":"Thanks for going"}', '{"es":"Gracias por ir a {negocio}. Tu reseña ayuda a otros.","en":"Thanks for going to {negocio}. Your review helps others."}'),
  -- Consejería, capellanía, oración y recuperación: NEUTROS (ni el lugar, ni el servicio, ni el motivo en la pantalla bloqueada).
  ('insc_fen_ok', 'tx', 'cit', true, '{"es":"Tienes una cita confirmada","en":"You have a confirmed appointment"}', '{"es":"Tienes una cita confirmada{cuando}. Mira los detalles en To''Latino.","en":"You have a confirmed appointment{cuando}. See the details in To''Latino."}'),
  ('insc_fen_alt', 'tx', 'cit', true, '{"es":"Te proponen otra fecha","en":"They propose another date"}', '{"es":"Te proponen otra fecha: {grupo}. Mírala en To''Latino.","en":"They propose another date: {grupo}. See it in To''Latino."}'),
  ('insc_fen_no', 'tx', 'cit', true, '{"es":"Tu solicitud","en":"Your request"}', '{"es":"Tu solicitud no se pudo esta vez. Mira los detalles en To''Latino.","en":"Your request could not be met this time. See the details in To''Latino."}'),
  ('insc_fen_exp', 'tx', 'cit', true, '{"es":"Tu solicitud","en":"Your request"}', '{"es":"Tu solicitud no tuvo respuesta a tiempo. Mira los detalles en To''Latino.","en":"Your request had no reply in time. See the details in To''Latino."}'),
  ('insc_fen_cx', 'tx', 'cit', false, '{"es":"Cancelada","en":"Cancelled"}', '{"es":"Cancelaste tu solicitud.","en":"You cancelled your request."}'),
  ('insc_fen_biz_cx', 'tx', 'cit', true, '{"es":"Tu cita cambió","en":"Your appointment changed"}', '{"es":"Cancelaron tu cita. Mira los detalles en To''Latino.","en":"Your appointment was cancelled. See the details in To''Latino."}'),
  ('insc_fen_grupo_cx', 'tx', 'cit', true, '{"es":"Tu cita cambió","en":"Your appointment changed"}', '{"es":"Cancelaron tu cita. Mira los detalles en To''Latino.","en":"Your appointment was cancelled. See the details in To''Latino."}'),
  ('insc_fen_empieza', 'tx', 'cit', true, '{"es":"Es mañana","en":"It is tomorrow"}', '{"es":"Mañana tienes tu cita{cuando}.","en":"You have your appointment tomorrow{cuando}."}'),
  ('insc_fen_done', 'tx', 'cit', false, '{"es":"Gracias","en":"Thank you"}', '{"es":"Gracias. Si quieres, deja tu reseña en To''Latino.","en":"Thank you. If you want, leave your review in To''Latino."}')
on conflict (key) do nothing;
commit;
