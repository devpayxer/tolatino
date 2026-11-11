-- 0124 · Fase 7 · 7i · Super Admin completo de El Compa y Soporte, Configuración, avisos, analítica y la purga por retención.
-- (docs/diseno/plan/fase7-compa.md §2 «0124 compa_admin_config» y §4 7i.)
-- · compa_reviews (MD L1562 CompaReview): «Marcar respuesta incorrecta» con motivo (wrong_info · should_hand_off · tone · language · other) y nota;
--   «Quitar la marca» con motivo. Una marca viva por conversación. No se borra: se quita (cleared_*), una vez. Lo escribe solo el equipo con
--   compa:editar (lo revisa la acción).
-- · compa_unknowns: «LO QUE EL COMPA NO SUPO · PARA EL CENTRO DE AYUDA» (hueco #7). El motor la anota cuando contesta «No tengo ese dato» (tipo
--   no_se): la pregunta YA TAPADA, la audiencia (vecino o negocio) y el idioma, sin la persona. El equipo la marca «Anotado» (con motivo) o
--   «Corregido en {artículo}» (un slug de help_articles); el estado solo avanza (open → noted → fixed). La ayuda se corrige en el repo (§6 #12).
-- · compa_reads ya existe (0119: llegó con la ficha de 7d). Se dice en REVISION.
-- · LA PURGA (§3 «Retención», §6 #7, D5). «Nada se borra (estados)»: la purga VACÍA el texto y deja la fila, el estado y las cifras (resultado,
--   motivo, uso, gasto). Una vez, con su fecha (purged_at), en:
--     compa_messages.text · compa_handoffs.summary · compa_unknowns.query_tapada/note · compa_reviews.note · compa_drafts.summary/draft/next_step ·
--     compa_conversations.contact_phone_enc · support_messages.body · support_cases.summary/device.
--   (a) Retención: conversaciones CERRADAS que empezaron hace más de compa_retener_meses (12) → solo cifras.
--   (b) Cuenta borrada (D5): pasado users.delete_at (= el pedido + 30 días) o status 'deleted' → sus casos de Soporte (y el copiloto de esos
--       casos) y sus conversaciones cerradas (las abiertas se cierran solas a compa_conv_cierra_h y se purgan en la pasada siguiente).
--   La base lo impone: cada tabla de solo inserción admite UNA actualización que vacía el texto y pone purged_at sin tocar nada más.
--   compa_purgar(lim) la llama el barrido (lib/compa/purga.ts barrerRetencion, que también borra los archivos de las fotos de esos casos).
-- · Configuración › El Compa: compa_retener_meses pasa a editable (la purga ya corre).
-- · Avisos: grupo `support` (Mi cuenta › Avisos › Soporte): lo del caso (recibido, te respondieron, resuelto, El Compa te pasó con una persona,
--   el caso del negocio) SIN interruptor: siempre llega.
-- · Analítica sin personas: compa_analitica_dia (ciudad, día local, nivel y canal: conversaciones, resolvió solo, acción confirmada, a una persona
--   por motivo, al dueño, sin IA, marcadas, con IA, al tope, apagado, límite, a reglas, gasto, espera promedio y p50/p95 del día) y
--   soporte_analitica_dia (ciudad, día local y tema: casos, de El Compa, de negocios, prioridad alta, primera respuesta promedio y p50/p90 del día,
--   plazo cumplido y vencido, resueltos, «¿Se resolvió?» sí/no, devuelto).
-- Idempotente: se puede aplicar dos veces.
begin;

-- ── «Marcar respuesta incorrecta» ──
create table if not exists compa_reviews (
  id              bigint generated always as identity primary key,
  conversation_id bigint not null references compa_conversations (id),
  city_id         text not null references cities (id),
  staff_id        uuid not null references users (id),
  reason          text not null check (reason in ('wrong_info', 'should_hand_off', 'tone', 'language', 'other')),
  note            text check (char_length(note) between 3 and 300),
  is_test         boolean not null default false,
  at              timestamptz not null default now(),
  cleared_at      timestamptz,
  cleared_by      uuid references users (id),
  clear_reason    text check (char_length(clear_reason) between 3 and 300),
  purged_at       timestamptz,
  check ((cleared_at is null) = (cleared_by is null) and (cleared_at is null) = (clear_reason is null))
);
create unique index if not exists compa_reviews_una_viva on compa_reviews (conversation_id) where cleared_at is null;
create index if not exists compa_reviews_vivas on compa_reviews (at desc, id desc) where cleared_at is null;
create index if not exists compa_reviews_conv on compa_reviews (conversation_id, at desc);
create or replace function compa_reviews_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'una marca de El Compa no se borra (se quita, con motivo)'; end if;
  if tg_op = 'INSERT' then
    if new.cleared_at is not null or new.purged_at is not null then raise exception 'una marca nace viva'; end if;
    if texto_con_secretos(new.note) then raise exception 'compa_sin_secretos: la nota no guarda números de tarjeta ni de seguro social'; end if;
    new.at := now();
    return new;
  end if;
  -- La purga: la nota se vacía, una vez; lo demás (motivo, quién, cuándo) queda.
  if old.purged_at is null and new.purged_at is not null and new.note is null
     and (to_jsonb(new) - array['note', 'purged_at']) = (to_jsonb(old) - array['note', 'purged_at']) then
    return new;
  end if;
  -- Quitar la marca: una vez, con quién y motivo; nada más cambia.
  if old.cleared_at is null and new.cleared_at is not null
     and (to_jsonb(new) - array['cleared_at', 'cleared_by', 'clear_reason']) = (to_jsonb(old) - array['cleared_at', 'cleared_by', 'clear_reason']) then
    if texto_con_secretos(new.clear_reason) then raise exception 'compa_sin_secretos: el motivo no guarda números de tarjeta ni de seguro social'; end if;
    new.cleared_at := now();
    return new;
  end if;
  raise exception 'compa_reviews: de una marca solo se quita la marca, una vez (y la purga vacía la nota)';
end $$;
drop trigger if exists compa_reviews_antes on compa_reviews;
create trigger compa_reviews_antes before insert or update or delete on compa_reviews for each row execute function compa_reviews_antes();

-- ── «Lo que El Compa no supo» ──
create table if not exists compa_unknowns (
  id              bigint generated always as identity primary key,
  conversation_id bigint not null references compa_conversations (id),
  city_id         text not null references cities (id),
  audience        text not null check (audience in ('vecino', 'negocio')),
  lang            text not null default 'es' check (lang in ('es', 'en')),
  query_tapada    text check (char_length(query_tapada) between 2 and 800),   -- TAPADA por el motor; la base rechaza tarjeta y seguro social; la purga la vacía
  status          text not null default 'open' check (status in ('open', 'noted', 'fixed')),
  fixed_slug      text references help_articles (slug),
  note            text check (char_length(note) between 3 and 300),
  decided_by      uuid references users (id),
  decided_at      timestamptz,
  is_test         boolean not null default false,
  at              timestamptz not null default now(),
  purged_at       timestamptz,
  check (query_tapada is not null or purged_at is not null),
  check ((status = 'fixed') = (fixed_slug is not null)),
  check ((status = 'open') = (decided_at is null) and (decided_at is null) = (decided_by is null))
);
create unique index if not exists compa_unknowns_una on compa_unknowns (conversation_id, md5(query_tapada)) where query_tapada is not null;
create index if not exists compa_unknowns_lista on compa_unknowns (status, at desc, id desc);
create index if not exists compa_unknowns_conv on compa_unknowns (conversation_id);
create or replace function compa_unknowns_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'lo que El Compa no supo no se borra (estados)'; end if;
  if tg_op = 'INSERT' then
    if new.status <> 'open' or new.purged_at is not null or new.decided_at is not null then raise exception 'lo que El Compa no supo nace abierto'; end if;
    if texto_con_secretos(new.query_tapada) then raise exception 'compa_sin_secretos: la pregunta no guarda números de tarjeta ni de seguro social'; end if;
    new.at := now();
    return new;
  end if;
  if old.purged_at is null and new.purged_at is not null and new.query_tapada is null and new.note is null
     and (to_jsonb(new) - array['query_tapada', 'note', 'purged_at']) = (to_jsonb(old) - array['query_tapada', 'note', 'purged_at']) then
    return new;
  end if;
  -- El estado solo avanza: abierto → anotado → corregido (o abierto → corregido), con quién y cuándo.
  if not ((old.status = 'open' and new.status in ('noted', 'fixed')) or (old.status = 'noted' and new.status = 'fixed'))
     or (to_jsonb(new) - array['status', 'fixed_slug', 'note', 'decided_by', 'decided_at']) <> (to_jsonb(old) - array['status', 'fixed_slug', 'note', 'decided_by', 'decided_at'])
     or old.purged_at is not null then
    raise exception 'compa_unknowns: el estado solo avanza (abierto → anotado → corregido)';
  end if;
  if texto_con_secretos(new.note) then raise exception 'compa_sin_secretos: la nota no guarda números de tarjeta ni de seguro social'; end if;
  new.decided_at := now();
  return new;
end $$;
drop trigger if exists compa_unknowns_antes on compa_unknowns;
create trigger compa_unknowns_antes before insert or update or delete on compa_unknowns for each row execute function compa_unknowns_antes();

-- ── La purga: columnas y la única actualización que admite cada tabla de solo inserción ──
alter table compa_conversations add column if not exists purged_at timestamptz;
alter table compa_messages add column if not exists purged_at timestamptz;
alter table compa_messages alter column text drop not null;
alter table compa_handoffs add column if not exists purged_at timestamptz;
alter table compa_drafts add column if not exists purged_at timestamptz;
alter table compa_drafts alter column summary drop not null;
alter table compa_drafts alter column draft drop not null;
alter table support_cases add column if not exists purged_at timestamptz;
alter table support_messages add column if not exists purged_at timestamptz;
do $$
declare x text;
begin
  if not exists (select 1 from pg_constraint where conname = 'compa_messages_texto_o_purga') then
    alter table compa_messages add constraint compa_messages_texto_o_purga check (text is not null or purged_at is not null);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'compa_drafts_texto_o_purga') then
    alter table compa_drafts add constraint compa_drafts_texto_o_purga check ((summary is not null and draft is not null) or purged_at is not null);
  end if;
  -- support_messages: «texto, foto o línea del sistema» admite ahora el mensaje purgado (sin texto).
  for x in select conname from pg_constraint where conrelid = 'support_messages'::regclass and contype = 'c'
              and pg_get_constraintdef(oid) ~ 'body IS NOT NULL\) OR \(photo_media_id IS NOT NULL\) OR \(sys_key IS NOT NULL\)\)\)$' loop
    execute format('alter table support_messages drop constraint %I', x);
  end loop;
  if not exists (select 1 from pg_constraint where conname = 'support_messages_contenido') then
    alter table support_messages add constraint support_messages_contenido check (body is not null or photo_media_id is not null or sys_key is not null or purged_at is not null);
  end if;
end $$;
create index if not exists compa_conv_purga on compa_conversations (started_at) where purged_at is null and closed_at is not null;
create index if not exists compa_conv_caso_copiloto on compa_conversations (support_case_id) where use = 'copilot' and purged_at is null;
create index if not exists users_borrar_fecha on users (delete_at) where delete_at is not null;
create index if not exists users_borradas on users (id) where status = 'deleted';
create index if not exists media_soporte_privada on media (owner_id) where owner_kind = 'support' and private and status = 'visible';

create or replace function compa_messages_antes() returns trigger language plpgsql as $$
begin
  -- La purga (retención o cuenta borrada): el texto se vacía UNA vez; quién, cuándo, la fuente y el motor quedan (las cifras).
  if tg_op = 'UPDATE' and old.purged_at is null and new.purged_at is not null and new.text is null
     and (to_jsonb(new) - array['text', 'purged_at']) = (to_jsonb(old) - array['text', 'purged_at']) then
    return new;
  end if;
  if tg_op <> 'INSERT' then raise exception 'compa_messages es solo de inserción'; end if;
  if new.purged_at is not null or new.text is null then raise exception 'un mensaje de El Compa nace con su texto'; end if;
  if texto_con_secretos(new.text) then raise exception 'compa_sin_secretos: un mensaje no guarda números de tarjeta ni de seguro social'; end if;
  return new;
end $$;

create or replace function compa_handoffs_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' and old.purged_at is null and new.purged_at is not null and new.summary is null
     and (to_jsonb(new) - array['summary', 'purged_at']) = (to_jsonb(old) - array['summary', 'purged_at']) then
    return new;
  end if;
  if tg_op <> 'INSERT' then raise exception 'compa_handoffs es solo de inserción'; end if;
  if new.purged_at is not null then raise exception 'un paso a una persona nace con su resumen'; end if;
  if texto_con_secretos(new.summary) then raise exception 'compa_sin_secretos: el resumen no guarda números de tarjeta ni de seguro social'; end if;
  return new;
end $$;

create or replace function compa_drafts_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'compa_drafts es solo de inserción (un borrador no se borra)'; end if;
  if tg_op = 'INSERT' then
    if new.used is not null or new.message_id is not null then raise exception 'un borrador nace sin usar'; end if;
    if new.purged_at is not null or new.summary is null or new.draft is null then raise exception 'un borrador nace con su texto'; end if;
    if texto_con_secretos(new.summary) or texto_con_secretos(new.draft) or texto_con_secretos(new.next_step) then
      raise exception 'compa_sin_secretos: un borrador no guarda números de tarjeta ni de seguro social';
    end if;
    return new;
  end if;
  -- 7i · La purga: el resumen, el borrador y el siguiente paso se vacían UNA vez (usado o no); lo demás (si se usó, cuándo, el motor) queda.
  if old.purged_at is null and new.purged_at is not null and new.summary is null and new.draft is null and new.next_step is null
     and (to_jsonb(new) - array['summary', 'draft', 'next_step', 'purged_at']) = (to_jsonb(old) - array['summary', 'draft', 'next_step', 'purged_at']) then
    return new;
  end if;
  if old.purged_at is not null then raise exception 'compa_drafts es solo de inserción (un borrador purgado no cambia)'; end if;
  -- Lo único que se anota, UNA vez: si se envió tal cual, editado o se descartó (y en un caso, el mensaje que salió).
  if old.used is not null then raise exception 'compa_borrador_usado: ese borrador ya se usó o se descartó'; end if;
  if new.used is null
     or (new.id, new.conversation_id, new.case_id, new.help_request_id, new.staff_id, new.city_id, new.lang, new.summary, new.draft, new.next_step,
         new.macro_key, new.source_slug, new.suggest_refund, new.engine, new.is_test, new.at, new.purged_at)
        is distinct from (old.id, old.conversation_id, old.case_id, old.help_request_id, old.staff_id, old.city_id, old.lang, old.summary, old.draft, old.next_step,
         old.macro_key, old.source_slug, old.suggest_refund, old.engine, old.is_test, old.at, old.purged_at) then
    raise exception 'compa_drafts es solo de inserción (solo se anota una vez si se usó)';
  end if;
  -- El mensaje que salió tiene que ser de ESE caso, de ESA persona del equipo, para la persona (no una nota interna) y marcado from_draft.
  if new.message_id is not null and not exists (
       select 1 from support_messages m where m.id = new.message_id and m.case_id = new.case_id and m.staff_id = new.staff_id
          and m.sender = 'staff' and not m.internal and m.from_draft) then
    raise exception 'compa_borrador_mensaje: ese mensaje no salió de este borrador';
  end if;
  new.used_at := now();
  return new;
end $$;

create or replace function support_messages_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'support_messages es solo de inserción'; end if;
  if tg_op = 'UPDATE' then
    -- 7i · La purga de una cuenta borrada (D5): el texto se vacía UNA vez; quién, cuándo, la foto (su archivo lo borra el barrido) y lo interno quedan.
    if old.purged_at is null and new.purged_at is not null and new.body is null
       and (to_jsonb(new) - array['body', 'purged_at']) = (to_jsonb(old) - array['body', 'purged_at']) then
      return new;
    end if;
    -- Lo único que cambia, una vez: ocultar el texto con motivo (nada se borra).
    if old.hidden_at is not null or new.hidden_at is null or new.purged_at is distinct from old.purged_at
       or (new.case_id, new.sender, new.user_id, new.staff_id, new.body, new.photo_media_id, new.internal, new.macro_key, new.sys_key, new.vars, new.at, new.from_draft)
          is distinct from (old.case_id, old.sender, old.user_id, old.staff_id, old.body, old.photo_media_id, old.internal, old.macro_key, old.sys_key, old.vars, old.at, old.from_draft) then
      raise exception 'support_messages es solo de inserción (solo se oculta, con motivo, una vez)';
    end if;
    return new;
  end if;
  if new.purged_at is not null then raise exception 'un mensaje de Soporte nace sin purgar'; end if;
  if texto_con_secretos(new.body) then raise exception 'support_sin_secretos: un mensaje no guarda números de tarjeta ni de seguro social'; end if;
  return new;
end $$;

-- Vaciar el texto de unas conversaciones (y lo que cuelga de ellas). Deja filas, estados y cifras.
create or replace function compa_purgar_conversaciones(ids bigint[]) returns integer language plpgsql as $$
declare n integer;
begin
  if coalesce(cardinality(ids), 0) = 0 then return 0; end if;
  update compa_messages set text = null, purged_at = now() where conversation_id = any (ids) and purged_at is null;
  update compa_handoffs set summary = null, purged_at = now() where conversation_id = any (ids) and purged_at is null;
  update compa_unknowns set query_tapada = null, note = null, purged_at = now() where conversation_id = any (ids) and purged_at is null;
  update compa_reviews set note = null, purged_at = now() where conversation_id = any (ids) and purged_at is null;
  update compa_drafts set summary = null, draft = null, next_step = null, purged_at = now() where conversation_id = any (ids) and purged_at is null;
  with p as (update compa_conversations set contact_phone_enc = null, purged_at = now() where id = any (ids) and purged_at is null returning 1) select count(*) into n from p;
  return n;
end $$;

-- Vaciar el texto de unos casos de Soporte (D5): mensajes, resumen, dispositivo y los borradores del copiloto de esos casos.
create or replace function soporte_purgar_casos(ids bigint[]) returns integer language plpgsql as $$
declare n integer;
begin
  if coalesce(cardinality(ids), 0) = 0 then return 0; end if;
  update support_messages set body = null, purged_at = now() where case_id = any (ids) and purged_at is null;
  update compa_drafts set summary = null, draft = null, next_step = null, purged_at = now() where case_id = any (ids) and purged_at is null;
  with p as (update support_cases set summary = null, device = null, purged_at = now() where id = any (ids) and purged_at is null returning 1) select count(*) into n from p;
  return n;
end $$;

-- La pasada del barrido: (a) retención de El Compa; (b) cuentas borradas (D5): sus casos de Soporte, sus conversaciones cerradas y el copiloto de
-- esos casos. Hasta `lim` de cada una por pasada (el barrido corre cada minuto).
create or replace function compa_purgar(lim integer default 500) returns jsonb language plpgsql as $$
declare meses integer := cfg_int('compa_retener_meses'); a bigint[]; k bigint[]; b bigint[]; ra integer; rk integer; rb integer;
begin
  select coalesce(array_agg(x.id), '{}') into a from (
    select id from compa_conversations where purged_at is null and closed_at is not null and started_at < now() - make_interval(months => meses)
     order by started_at limit lim) x;
  ra := compa_purgar_conversaciones(a);
  select coalesce(array_agg(x.id), '{}') into k from (
    select c.id from users u join support_cases c on c.user_id = u.id
     where c.purged_at is null and ((u.delete_at is not null and u.delete_at <= now()) or u.status = 'deleted')
     order by c.id limit lim) x;
  rk := soporte_purgar_casos(k);
  select coalesce(array_agg(x.id), '{}') into b from (
    select cv.id from users u join compa_conversations cv on cv.user_id = u.id
     where cv.purged_at is null and cv.closed_at is not null and ((u.delete_at is not null and u.delete_at <= now()) or u.status = 'deleted')
    union
    select cv.id from compa_conversations cv join support_cases c on c.id = cv.support_case_id
     where cv.use = 'copilot' and cv.purged_at is null and cv.closed_at is not null and c.purged_at is not null
    limit lim) x;
  rb := compa_purgar_conversaciones(b);
  return jsonb_build_object('retencion', ra, 'casos', rk, 'borradas', rb);
end $$;

-- ── Configuración › El Compa: la retención ya corre ──
update config_keys set editable = true, bloqueo = null,
       help = '{"es":"Pasado este tiempo, el barrido vacía el texto de la conversación (lo que dijo la persona y lo que contestó El Compa) y deja solo las cifras: resultado, motivo, uso y gasto. Una cuenta borrada se purga a los 30 días del pedido.","en":"After this time, the sweep empties the conversation text (what the person said and what El Compa answered) and keeps only the numbers: outcome, reason, usage and spend. A deleted account is purged 30 days after the request."}'
 where key = 'compa_retener_meses' and (not editable or bloqueo is not null or help->>'es' not like 'Pasado este tiempo%');

-- ── Avisos: grupo «support» (lo del caso no se apaga) ──
alter table notif_templates drop constraint if exists notif_templates_grp_check;
alter table notif_templates add constraint notif_templates_grp_check check (grp in ('crit', 'tx', 'mod', 'biz', 'mkt', 'community', 'events', 'support'));
update notif_templates set grp = 'support', pref = null
 where key in ('sop_recibido', 'sop_respuesta', 'sop_resuelto', 'compa_caso', 'compa_caso_negocio') and (grp <> 'support' or pref is not null);

-- ── Analítica › El Compa y Soporte (sin personas) ──
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
 where c.status <> 'merged'
 group by 1, 2, 3;

commit;
