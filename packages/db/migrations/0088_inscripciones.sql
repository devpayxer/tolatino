-- 0088 · Inscribirse en un curso, programa o membresía (Fase 4 · 4ee). Plan: docs/diseno/plan/fase4-edu-ninos-deporte.md §2 (0088),
-- §3 (dinero y datos de los niños) y §4ee.
--   · Una inscripción es una operación `enrollment` (I-4101…). Lo que importa se COPIA al enviar en `details` (precio, matrícula, plan,
--     certificado, contrato y lo que cuesta salirse, inicio): si el negocio cambia la herramienta después, lo enviado no cambia.
--   · En la app SOLO pasa la matrícula de un `curso`: se RETIENE al enviar y se COBRA al confirmar. Mensualidad, semana, clase y hora
--     se pagan en el lugar ($0, sin tarjeta).
--   · El cupo: `class_groups.seats_booked` (grupo) o `care_openings.openings` (banda de edad) lo mueve el servidor con el candado
--     `insc:{negocio}`; la base garantiza que nunca se pasa (checks de 0085 / 0086).
--   · «En curso» = confirmed + status_detail 'started'; «Cancelación pedida» de una membresía = confirmed + status_detail 'cancel_req'.
--   · Lista de espera: `waitlist_entries` (posición = orden de llegada); una oferta aparta el cupo 48 h.
--   · Plan de pagos: acuerdo por escrito inmutable (`plan_terms`, solo inserción) y las cuotas que la escuela marca (`plan_marks`, solo
--     inserción). Nunca un cobro fuera de sesión: el plan se paga en la escuela.
-- Idempotente.
begin;

create sequence if not exists insc_seq start 4101;

create index if not exists operations_insc_grupo_idx on operations (business_id, (details->>'group_id'), status) where kind = 'enrollment';
create index if not exists operations_insc_cliente_idx on operations (user_id, sent_at desc) where kind = 'enrollment';
create index if not exists operations_insc_negocio_idx on operations (business_id, status, sent_at desc) where kind = 'enrollment';

create table if not exists waitlist_entries (
  id bigint generated always as identity primary key,
  business_id text not null references businesses (id),
  city_id text not null references cities (id),
  item_id bigint not null references items (id),
  group_id bigint references class_groups (id),
  band_id bigint references care_openings (id),
  user_id uuid not null references users (id),
  operation_id bigint references operations (id),           -- la inscripción que salió de la oferta
  status text not null default 'waiting' check (status in ('waiting', 'offered', 'accepted', 'expired', 'left')),
  offered_until timestamptz,
  offered_by uuid references users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'offered' or offered_until is not null)
);
-- Una entrada viva por persona y lugar en la lista (grupo o banda; sin grupo = el servicio).
create unique index if not exists waitlist_viva_uq on waitlist_entries (user_id, item_id, coalesce(group_id, 0), coalesce(band_id, 0)) where status in ('waiting', 'offered');
create index if not exists waitlist_cola_idx on waitlist_entries (item_id, group_id, band_id, created_at) where status in ('waiting', 'offered');
create index if not exists waitlist_negocio_idx on waitlist_entries (business_id, status, created_at);

-- El plan de pagos por escrito (como written_totals): solo inserción, con versión, hora e IP.
create table if not exists plan_terms (
  id bigint generated always as identity primary key,
  operation_id bigint not null references operations (id),
  version smallint not null default 1,
  text jsonb not null,
  schedule jsonb not null,                                  -- [{n, cents, due}] — la suma es el resto del curso (lo garantiza el servidor)
  total_cents integer not null check (total_cents >= 0),
  accepted_at timestamptz not null default now(),
  ip text,
  unique (operation_id, version)
);
create table if not exists plan_marks (
  id bigint generated always as identity primary key,
  operation_id bigint not null references operations (id),
  n smallint not null check (n between 1 and 12),
  cents integer not null check (cents >= 0),
  marked_by uuid references users (id),
  marked_at timestamptz not null default now(),
  unique (operation_id, n)
);
create or replace function insc_solo_insercion() returns trigger language plpgsql as $$
begin raise exception 'solo inserción'; end $$;
drop trigger if exists plan_terms_inmutable on plan_terms;
create trigger plan_terms_inmutable before update or delete on plan_terms for each row execute function insc_solo_insercion();
drop trigger if exists plan_marks_inmutable on plan_marks;
create trigger plan_marks_inmutable before update or delete on plan_marks for each row execute function insc_solo_insercion();

-- La comisión de las inscripciones (sobre la matrícula capturada) ya está sembrada en 0085 ('insc', 800 bp).

insert into notif_templates (key, grp, pref, sms, title, body) values
  ('biz_insc', 'biz', null, true, '{"es":"Nueva inscripción","en":"New enrollment"}', '{"es":"{cliente} pide {servicio}{grupo}.{mat} Responde antes de {vence}.","en":"{cliente} requests {servicio}{grupo}.{mat} Reply before {vence}."}'),
  ('insc_ok', 'tx', 'cit', true, '{"es":"Inscripción confirmada","en":"Enrollment confirmed"}', '{"es":"{negocio} confirmó tu inscripción{cuando}.{mat}","en":"{negocio} confirmed your enrollment{cuando}.{mat}"}'),
  ('insc_alt', 'tx', 'cit', true, '{"es":"Te proponen otro grupo","en":"They propose another group"}', '{"es":"{negocio} te propone otro grupo: {grupo}. Acéptalo o elige «No me sirve».{mat}","en":"{negocio} proposes another group: {grupo}. Accept it or choose “Doesn’t work”.{mat}"}'),
  ('insc_no', 'tx', 'cit', true, '{"es":"No hay cupo","en":"No openings"}', '{"es":"{negocio} no tiene cupo para tu inscripción.{dev}","en":"{negocio} has no opening for your enrollment.{dev}"}'),
  ('insc_exp', 'tx', 'cit', true, '{"es":"Sin respuesta","en":"No reply"}', '{"es":"{negocio} no contestó a tiempo tu inscripción.{dev}","en":"{negocio} did not reply to your enrollment in time.{dev}"}'),
  ('insc_cx', 'tx', 'cit', false, '{"es":"Inscripción cancelada","en":"Enrollment cancelled"}', '{"es":"Cancelaste tu inscripción en {negocio}.{dev}","en":"You cancelled your enrollment at {negocio}.{dev}"}'),
  ('insc_grupo_cx', 'tx', 'cit', true, '{"es":"El grupo no abre","en":"The group will not open"}', '{"es":"{negocio} canceló el grupo: {motivo}. Te devolvemos todo.","en":"{negocio} cancelled the group: {motivo}. Full refund."}'),
  ('insc_biz_cx', 'tx', 'cit', true, '{"es":"Cancelaron tu inscripción","en":"Your enrollment was cancelled"}', '{"es":"{negocio} canceló tu inscripción: {motivo}. Te devolvemos todo.","en":"{negocio} cancelled your enrollment: {motivo}. Full refund."}'),
  ('insc_oferta', 'tx', 'cit', true, '{"es":"Se abrió un cupo","en":"A spot opened"}', '{"es":"Se abrió un cupo en {negocio}. Te lo guardan hasta {vence}: entra a To''Latino para tomarlo.","en":"A spot opened at {negocio}. It is held for you until {vence}: open To''Latino to take it."}'),
  ('insc_empieza', 'tx', 'cit', true, '{"es":"Empiezas mañana","en":"You start tomorrow"}', '{"es":"Mañana empiezas en {negocio}{cuando}. Trae una identificación el primer día.","en":"You start at {negocio} tomorrow{cuando}. Bring an ID the first day."}'),
  ('insc_cancelada', 'tx', 'cit', true, '{"es":"Membresía cancelada","en":"Membership cancelled"}', '{"es":"Tu membresía en {negocio} quedó cancelada el {fecha}. Guarda este aviso como constancia.","en":"Your membership at {negocio} was cancelled on {fecha}. Keep this notice as proof."}'),
  ('insc_done', 'tx', 'cit', false, '{"es":"Terminaste","en":"You finished"}', '{"es":"Terminaste en {negocio}.{cert} Tu reseña ayuda a otros a elegir.","en":"You finished at {negocio}.{cert} Your review helps others choose."}'),
  ('biz_insc_cx', 'biz', null, false, '{"es":"Cancelaron una inscripción","en":"An enrollment was cancelled"}', '{"es":"{cliente} canceló su inscripción en {servicio}.{mat}","en":"{cliente} cancelled their enrollment in {servicio}.{mat}"}'),
  ('biz_insc_cancel_req', 'biz', null, true, '{"es":"Piden cancelar una membresía","en":"Membership cancellation requested"}', '{"es":"{cliente} pidió cancelar su membresía. Confírmala en To''Latino; a las 72 h queda cancelada sola.","en":"{cliente} asked to cancel their membership. Confirm it in To''Latino; after 72 h it is cancelled automatically."}'),
  ('biz_insc_alt_ok', 'biz', null, false, '{"es":"Aceptó el otro grupo","en":"Accepted the other group"}', '{"es":"{cliente} aceptó {grupo}. Inscripción confirmada.","en":"{cliente} accepted {grupo}. Enrollment confirmed."}'),
  ('biz_insc_alt_no', 'biz', null, false, '{"es":"No le sirvió el otro grupo","en":"The other group did not work"}', '{"es":"{cliente} no aceptó el otro grupo.","en":"{cliente} did not accept the other group."}')
on conflict (key) do nothing;
commit;
