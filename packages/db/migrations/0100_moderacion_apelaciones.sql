-- 0100 · Reportar, auto-moderación, antiabuso, sanciones en la Comunidad y apelaciones (Fase 5 · 5d · docs/diseno/plan/fase5-comunidad.md
-- §2 «0100 moderacion_apelaciones», §3 y §4 5d).
-- · mod_rules: las 6 reglas del Super Admin (Contenido › Auto-moderación: phone · pii · spam · hate · rev5 · img) + autohide (umbral de
--   auto-ocultar) con su interruptor y sus parámetros. «phone» no se apaga: lo impone la base (com_sin_datos). Cada cambio deja auditoría
--   (lo escribe la app en la misma transacción).
-- · mod_terms: listas ES/EN por tipo (odio · estafa · migra · autolesion). Nada se borra: un término se apaga.
-- · mod_flags (SOLO INSERCIÓN, trigger): lo que una regla marcó, con su detalle → el caso en la cola.
-- · appeals (AP-101…): apelar lo que To'Latino ocultó o una sanción, una vez por cosa, en 14 días. La decide OTRA persona: la base
--   calcula al insertar quién sancionó (sanctioned_by, de la fuente; la app no lo puede inventar) y rechaza que esa persona (o quien
--   apela) la decida. Una apelación decidida no cambia más; nada se borra.
-- · queue_items: colas «repUsr» (reportes de una persona: reportes, ráfaga de reseñas, red de cuentas) y «apel» (apelaciones, 72 h);
--   la cola «rep» recibe publicaciones y comentarios de la Comunidad.
-- · sanctions.ref_kind / ref_id: qué contenido la motivó. content_reports.device: el dispositivo de quien reporta (auto-ocultar
--   cuenta personas y dispositivos distintos, nunca cuentas del mismo teléfono).
-- · media.status 'review': foto de la Comunidad que espera revisión (el modelo la marcó o no respondió). No se ve hasta que una persona
--   la apruebe en Medios marcados.
-- · platform_config: límites del día (publicaciones, comentarios, votos, conversaciones nuevas, reportes) y días para apelar.
-- · Plantillas mod_* / apel_* / com_* nuevas, todas sin SMS.
-- Idempotente: if not exists, checks que se reemplazan, triggers que se recrean, semillas on conflict do nothing. Nada se borra.
begin;

-- ── Reglas de auto-moderación ──
create table if not exists mod_rules (
  key        text primary key check (key in ('phone', 'pii', 'spam', 'hate', 'rev5', 'img', 'autohide')),
  enabled    boolean not null default true,
  params     jsonb not null default '{}'::jsonb check (jsonb_typeof(params) = 'object' and octet_length(params::text) <= 2000),
  updated_by uuid references users (id),
  updated_at timestamptz not null default now()
);
alter table mod_rules drop constraint if exists mod_rules_telefono_siempre;
alter table mod_rules add constraint mod_rules_telefono_siempre check (key <> 'phone' or enabled);
insert into mod_rules (key, enabled, params) values
  ('phone', true, '{}'),
  ('pii', true, '{}'),
  ('spam', true, '{"n": 3, "horas": 24, "parecido": 0.8}'),
  ('hate', true, '{}'),
  ('rev5', true, '{"n": 5, "min": 10}'),
  ('img', true, '{"umbral": 0.6}'),
  ('autohide', true, '{"reportes": 5, "horas": 24, "edad_h": 72}')
on conflict (key) do nothing;

-- ── Listas de términos (ES/EN) ──
create table if not exists mod_terms (
  id         bigint generated always as identity primary key,
  lang       text not null check (lang in ('es', 'en')),
  term       text not null check (char_length(btrim(term)) between 2 and 60 and term = lower(term)),
  kind       text not null check (kind in ('odio', 'estafa', 'migra', 'autolesion')),
  enabled    boolean not null default true,
  created_by uuid references users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lang, kind, term)
);
create or replace function mod_terms_no_borra() returns trigger language plpgsql as $$
begin raise exception 'un término no se borra: se apaga'; end $$;
drop trigger if exists mod_terms_no_borra on mod_terms;
create trigger mod_terms_no_borra before delete on mod_terms for each row execute function mod_terms_no_borra();
-- Semilla corta y sobria (el fundador la revisa: LAUNCH-CHECKLIST). Frases de varias palabras para no marcar de más.
insert into mod_terms (lang, kind, term) values
  ('es', 'odio', 'sudaca'), ('es', 'odio', 'sudacas'), ('es', 'odio', 'maricón'), ('es', 'odio', 'maricones'), ('es', 'odio', 'que se devuelvan a su país'),
  ('es', 'odio', 'raza inferior'), ('es', 'odio', 'negro de mierda'), ('es', 'odio', 'indio de mierda'), ('es', 'odio', 'mojados de mierda'),
  ('en', 'odio', 'wetback'), ('en', 'odio', 'wetbacks'), ('en', 'odio', 'beaner'), ('en', 'odio', 'beaners'), ('en', 'odio', 'spic'), ('en', 'odio', 'spics'),
  ('en', 'odio', 'go back to your country'), ('en', 'odio', 'go back to mexico'),
  ('es', 'estafa', 'zelle'), ('es', 'estafa', 'cash app'), ('es', 'estafa', 'cashapp'), ('es', 'estafa', 'depósito para apartar'), ('es', 'estafa', 'tarjeta de regalo'),
  ('es', 'estafa', 'gana dinero desde casa'), ('es', 'estafa', 'western union'),
  ('en', 'estafa', 'zelle'), ('en', 'estafa', 'cash app'), ('en', 'estafa', 'cashapp'), ('en', 'estafa', 'deposit to hold'), ('en', 'estafa', 'gift card'),
  ('en', 'estafa', 'make money from home'), ('en', 'estafa', 'western union'),
  ('es', 'migra', 'migra'), ('es', 'migra', 'ice'), ('es', 'migra', 'redada'), ('es', 'migra', 'operativo de inmigración'), ('es', 'migra', 'no tiene papeles'),
  ('es', 'migra', 'es ilegal'), ('es', 'migra', 'indocumentado'), ('es', 'migra', 'indocumentada'),
  ('en', 'migra', 'ice raid'), ('en', 'migra', 'ice agents'), ('en', 'migra', 'immigration raid'), ('en', 'migra', 'undocumented'), ('en', 'migra', 'illegal immigrant'),
  ('en', 'migra', 'no papers'),
  ('es', 'autolesion', 'suicidarme'), ('es', 'autolesion', 'quitarme la vida'), ('es', 'autolesion', 'matarme'), ('es', 'autolesion', 'no quiero vivir'),
  ('es', 'autolesion', 'quiero morirme'), ('es', 'autolesion', 'hacerme daño'), ('es', 'autolesion', 'cortarme'),
  ('en', 'autolesion', 'kill myself'), ('en', 'autolesion', 'suicide'), ('en', 'autolesion', 'end my life'), ('en', 'autolesion', 'want to die'),
  ('en', 'autolesion', 'hurt myself'), ('en', 'autolesion', 'self harm'), ('en', 'autolesion', 'cut myself')
on conflict (lang, kind, term) do nothing;

-- ── Lo que una regla marcó (solo inserción) ──
create table if not exists mod_flags (
  id            bigint generated always as identity primary key,
  target_kind   text not null check (target_kind in ('com_post', 'com_comment', 'user', 'review', 'media', 'dm_message')),
  target_id     text not null,
  rule_key      text not null check (rule_key in ('phone', 'pii', 'spam', 'hate', 'rev5', 'img', 'autohide', 'red', 'estafa', 'migra', 'autolesion')),
  detail        text not null check (char_length(detail) between 1 and 500),
  user_id       uuid references users (id),
  city_id       text references cities (id),
  queue_item_id bigint references queue_items (id),
  created_at    timestamptz not null default now()
);
create index if not exists mod_flags_target_idx on mod_flags (target_kind, target_id, created_at desc);
create index if not exists mod_flags_regla_idx on mod_flags (rule_key, created_at desc);
create index if not exists mod_flags_persona_idx on mod_flags (user_id, created_at desc);
create index if not exists mod_flags_caso_idx on mod_flags (queue_item_id) where queue_item_id is not null;
create or replace function mod_flags_inmutable() returns trigger language plpgsql as $$
begin raise exception 'mod_flags es solo de inserción'; end $$;
drop trigger if exists mod_flags_no_cambia on mod_flags;
create trigger mod_flags_no_cambia before update or delete on mod_flags for each row execute function mod_flags_inmutable();

-- ── Colas, sanciones, reportes y fotos ──
alter table queue_items drop constraint if exists queue_items_queue_check;
alter table queue_items add constraint queue_items_queue_check check (queue = any (array['sello', 'nuevo', 'lic', 'medios', 'rec', 'cambio', 'rep', 'sop', 'chat', 'disputa', 'renta', 'mesa', 'noid',
  'cuidado', 'salir', 'grupo', 'plantones', 'estafa', 'vivienda', 'repUsr', 'apel']));
alter table queue_items drop constraint if exists queue_items_subject_kind_check;
alter table queue_items add constraint queue_items_subject_kind_check check (subject_kind = any (array['verification_request', 'business', 'license', 'media', 'recommendation', 'claim',
  'sensitive_change', 'review', 'help_request', 'chat_thread', 'dispute', 'rental', 'listing', 'dm_thread', 'user', 'appeal', 'com_post', 'com_comment']));

alter table sanctions add column if not exists ref_kind text;
alter table sanctions add column if not exists ref_id text;
alter table sanctions drop constraint if exists sanctions_ref_check;
alter table sanctions add constraint sanctions_ref_check check ((ref_kind is null) = (ref_id is null) and (ref_kind is null or ref_kind in ('com_post', 'com_comment', 'dm_message', 'review', 'media', 'user')));
create index if not exists sanctions_vivas_idx on sanctions (target_id) where target_kind = 'user' and lifted_at is null;

alter table content_reports add column if not exists device uuid;
create index if not exists content_reports_dispositivo_idx on content_reports (device, created_at desc) where device is not null;

alter table media drop constraint if exists media_status_check;
alter table media add constraint media_status_check check (status in ('visible', 'removed', 'review'));
create index if not exists media_revision_idx on media (owner_kind, owner_id) where status = 'review';

-- ── Apelaciones ──
create sequence if not exists appeal_seq start 101;
create table if not exists appeals (
  id              bigint generated always as identity primary key,
  number          text not null unique default ('AP-' || nextval('appeal_seq')),
  user_id         uuid not null references users (id),
  city_id         text references cities (id),
  target_kind     text not null check (target_kind in ('com_post', 'com_comment', 'dm_message', 'media', 'sanction')),
  target_id       text not null,
  sanction_id     bigint references sanctions (id),
  sanctioned_by   uuid references users (id),
  hidden_reason   text check (char_length(hidden_reason) <= 500),
  text            text not null check (char_length(btrim(text)) between 20 and 500),
  status          text not null default 'open' check (status in ('open', 'upheld', 'lifted')),
  decided_by      uuid references users (id),
  decided_at      timestamptz,
  decision_reason text check (char_length(decision_reason) <= 500),
  created_at      timestamptz not null default now(),
  check ((status = 'open') = (decided_by is null)),
  check (status = 'open' or (decided_at is not null and decision_reason is not null)),
  check (decided_by is null or decided_by <> user_id),
  check (decided_by is null or sanctioned_by is null or decided_by <> sanctioned_by),
  unique (target_kind, target_id, user_id)
);
create index if not exists appeals_abiertas_idx on appeals (created_at) where status = 'open';
create index if not exists appeals_persona_idx on appeals (user_id, created_at desc);

-- Al insertar: la cosa es de quien apela y sigue oculta o sancionada; la base pone quién la ocultó o sancionó (la segunda revisión la
-- hace otra persona) y el motivo que se le dio. Al decidir: una sola vez, nunca quien sancionó ni quien apela; nada más cambia.
create or replace function appeals_antes() returns trigger language plpgsql as $$
declare x record;
begin
  if tg_op = 'DELETE' then raise exception 'una apelación no se borra'; end if;
  if tg_op = 'UPDATE' then
    if old.status <> 'open' then raise exception 'una apelación decidida no cambia'; end if;
    if (new.user_id, new.city_id, new.target_kind, new.target_id, new.sanction_id, new.sanctioned_by, new.hidden_reason, new.text, new.created_at, new.number)
       is distinct from (old.user_id, old.city_id, old.target_kind, old.target_id, old.sanction_id, old.sanctioned_by, old.hidden_reason, old.text, old.created_at, old.number) then
      raise exception 'de una apelación solo cambia la decisión';
    end if;
    if new.status = 'open' then raise exception 'decidir una apelación es mantener (upheld) o levantar (lifted)'; end if;
    if new.decided_by is null then raise exception 'la decisión dice quién la tomó'; end if;
    if new.decided_by = old.user_id then raise exception 'nadie decide su propia apelación'; end if;
    if old.sanctioned_by is not null and new.decided_by = old.sanctioned_by then raise exception 'la apelación la decide otra persona, no quien sancionó'; end if;
    new.decided_at := coalesce(new.decided_at, now());
    return new;
  end if;
  new.status := 'open'; new.decided_by := null; new.decided_at := null; new.decision_reason := null;
  if new.target_kind = 'com_post' then
    select p.hidden_staff_id as por, p.hidden_reason as motivo, p.city_id as ciudad into x from com_posts p
     where p.id::text = new.target_id and p.author_user_id = new.user_id and p.status = 'hidden';
  elsif new.target_kind = 'com_comment' then
    select c.hidden_staff_id as por, c.hidden_reason as motivo, c.city_id as ciudad into x from com_comments c
     where c.id::text = new.target_id and c.author_user_id = new.user_id and c.status = 'hidden';
  elsif new.target_kind = 'dm_message' then
    select m.hidden_by as por, m.hidden_reason as motivo, m.city_id as ciudad into x from dm_messages m
     where m.id::text = new.target_id and m.sender_user_id = new.user_id and m.hidden_at is not null;
  elsif new.target_kind = 'media' then
    select m.removed_by as por, m.removed_note as motivo, p.city_id as ciudad into x from media m join com_posts p on m.owner_kind = 'com_post' and p.id::text = m.owner_id
     where m.id::text = new.target_id and m.uploaded_by = new.user_id and m.status = 'removed' and m.removed_reason = 'admin';
  else
    select s.by_staff as por, s.reason as motivo, s.city_id as ciudad, s.id as sid into x from sanctions s
     where s.id::text = new.target_id and s.target_kind = 'user' and s.target_id = new.user_id::text and s.lifted_at is null and (s.ends_at is null or s.ends_at > now());
    if not found then raise exception 'no hay nada oculto ni sanción vigente que apelar'; end if;
    new.sanction_id := x.sid;
  end if;
  if not found then raise exception 'no hay nada oculto ni sanción vigente que apelar'; end if;
  new.sanctioned_by := x.por; new.hidden_reason := left(x.motivo, 500); new.city_id := coalesce(x.ciudad, new.city_id);
  return new;
end $$;
drop trigger if exists appeals_antes on appeals;
create trigger appeals_antes before insert or update or delete on appeals for each row execute function appeals_antes();

-- ── Límites del día (día local de la ciudad; la mitad las primeras 24 h de la cuenta) y días para apelar ──
insert into platform_config (key, value, note) values
  ('com_lim_publicaciones', '10', 'Comunidad: publicaciones al día por persona (la mitad las primeras 24 h de la cuenta)'),
  ('com_lim_comentarios', '100', 'Comunidad: comentarios al día por persona (la mitad las primeras 24 h)'),
  ('com_lim_votos', '500', 'Comunidad: votos al día por persona (la mitad las primeras 24 h)'),
  ('com_lim_conversaciones', '10', 'Comunidad: conversaciones nuevas al día por persona (la mitad las primeras 24 h)'),
  ('com_lim_reportes', '20', 'Comunidad: reportes al día por persona (la mitad las primeras 24 h)'),
  ('com_apelar_dias', '14', 'Días para apelar algo que To''Latino ocultó o una sanción')
on conflict (key) do nothing;

-- ── Avisos (todos sin SMS: guardián avisoComunidadSinSms) ──
insert into notif_templates (key, grp, pref, sms, title, body) values
  ('com_autohide', 'mod', null, false, '{"es":"Tu publicación está en revisión","en":"Your post is under review"}', '{"es":"Varios vecinos la reportaron y quedó oculta mientras la revisamos: {motivo}. Puedes apelar.","en":"Several neighbors reported it and it is hidden while we review it: {motivo}. You can appeal."}'),
  ('com_cm_autohide', 'mod', null, false, '{"es":"Tu comentario está en revisión","en":"Your comment is under review"}', '{"es":"Varios vecinos lo reportaron y quedó oculto mientras lo revisamos: {motivo}. Puedes apelar.","en":"Several neighbors reported it and it is hidden while we review it: {motivo}. You can appeal."}'),
  ('mod_foto', 'mod', null, false, '{"es":"Quitamos una foto tuya","en":"We removed one of your photos"}', '{"es":"Quitamos una foto de tu publicación de la Comunidad: {motivo}. Puedes apelar.","en":"We removed a photo from your Community post: {motivo}. You can appeal."}'),
  ('mod_sancion', 'mod', null, false, '{"es":"Recibiste una sanción","en":"You received a sanction"}', '{"es":"{sancion}: {motivo}. Puedes apelar.","en":"{sancion}: {motivo}. You can appeal."}'),
  ('apel_recibida', 'mod', null, false, '{"es":"Recibimos tu apelación","en":"We received your appeal"}', '{"es":"Recibimos tu apelación {numero}. Te respondemos en 72 h.","en":"We received your appeal {numero}. We will answer within 72 h."}'),
  ('apel_lifted', 'mod', null, false, '{"es":"Revisamos tu apelación","en":"We reviewed your appeal"}', '{"es":"Tenías razón ({numero}): {que}. {motivo}","en":"You were right ({numero}): {que}. {motivo}"}'),
  ('apel_upheld', 'mod', null, false, '{"es":"Revisamos tu apelación","en":"We reviewed your appeal"}', '{"es":"Se mantiene la decisión ({numero}): {motivo}. Esta revisión es final.","en":"The decision stands ({numero}): {motivo}. This review is final."}'),
  ('com_rep_ok', 'mod', null, false, '{"es":"Revisamos tu reporte","en":"We reviewed your report"}', '{"es":"Rompía las reglas y lo quitamos para todos. Gracias por cuidar el barrio.","en":"It broke the rules and we removed it for everyone. Thanks for looking out."}'),
  ('com_rep_no', 'mod', null, false, '{"es":"Revisamos tu reporte","en":"We reviewed your report"}', '{"es":"No rompe las reglas y sigue visible para los demás. Tú ya no lo ves.","en":"It does not break the rules and stays visible to others. You no longer see it."}')
on conflict (key) do nothing;

commit;
