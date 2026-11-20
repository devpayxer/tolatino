-- 0196 · Revisión automática de las fotos públicas (decisión AJ, 20 nov; docs/diseno/plan/fotos-revision-automatica.md, R1 + R2). Hasta hoy
-- /api/medios publicaba sin mirar. Desde aquí cada foto pública pasa por cuatro capas ANTES de quedar en lo público (n/<uuid>.jpg):
--   capa 1 · el modelo propio (desnudez): limpia (< duda) → visible; clara (≥ rechazo) → rechazada; dudosa o sin respuesta → capa 2
--   capa 2 · la segunda opinión (Claude con visión, por la interfaz de El Compa; pauta fija): publicar · rechazar (con motivo) · no_segura
--   capa 3 · reportes: N cuentas distintas → la foto se oculta sola, su archivo sale de lo público y vuelve a la capa 2
--   capa 4 · confianza ganada: un negocio verificado con fotos limpias publica sus dudosas sin la capa 2; cuenta nueva = tope por hora más bajo
-- Lo que no se publica (retenida o rechazada) vive SOLO bajo una llave privada (privado/rev/<uuid>.jpg; nginx nunca sirve /medios/privado/).
-- Fallo cerrado: un modelo caído, una capa apagada o sin presupuesto RETIENEN; el barrido reintenta por tandas. Nada se borra: estados.
-- · media: sha256 (de la maestra normalizada: memoria por contenido), rev_* (el último veredicto, su capa y motivo, la llave privada mientras no es
--   pública y los reintentos del barrido). Una foto visible nunca tiene llave privada (check).
-- · photo_reviews (SOLO INSERCIÓN): cada veredicto (capa, decisión, puntaje, motivo, modelo y versión, quién si fue una persona, lo que costó la
--   capa 2). Lo escribe la app en la misma transacción que el cambio de estado. Es también el libro del gasto de la capa 2 (sin texto).
-- · photo_review_spend / photo_review_reservations + foto2_reservar / foto2_anotar / foto2_soltar_reservas: el tope mensual de la capa 2, contado
--   como el de El Compa (se reserva el máximo ANTES de llamar, con candado de la fila del mes; se liquida DESPUÉS con los tokens reales; precios de
--   compa_models). El tope vive en la regla foto2 (Contenido › Auto-moderación), no en el de El Compa.
-- · mod_rules: foto1 · foto2 · foto3 · foto4 (interruptor por capa y sus valores, con límites en lib/moderacion-comun.ts PARAMS).
-- · appeals: «Pedir revisión» de una foto retenida o rechazada por la revisión automática (una vez por foto, en com_apelar_dias). La base pone la
--   ciudad y el motivo; nadie la decide por quien la subió (como siempre).
-- · Plantillas foto_* (mod, sin SMS).
-- Idempotente: if not exists, checks que se reemplazan, funciones y triggers que se recrean, semillas on conflict do nothing. Solo expande.
begin;

-- ── media: el veredicto y la llave privada ──
alter table media add column if not exists sha256 text;
alter table media add column if not exists rev_at timestamptz;
alter table media add column if not exists rev_capa text;
alter table media add column if not exists rev_motivo text;
alter table media add column if not exists rev_nota text;
alter table media add column if not exists rev_llave text;
alter table media add column if not exists rev_intentos smallint not null default 0;
alter table media add column if not exists rev_siguiente timestamptz;
alter table media drop constraint if exists media_revision_coherente;
alter table media add constraint media_revision_coherente check (
  (sha256 is null or sha256 ~ '^[0-9a-f]{64}$')
  and (rev_capa is null or rev_capa in ('c1', 'c2', 'c3', 'c4', 'memoria', 'persona'))
  and (rev_motivo is null or rev_motivo in ('desnudez', 'violencia', 'documento', 'captura', 'menores', 'reglas', 'no_segura', 'sin_servicio', 'sin_presupuesto', 'apagada', 'reportes'))
  and (rev_nota is null or char_length(rev_nota) <= 300)
  and (rev_llave is null or rev_llave ~ '^privado/rev/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$')
  and (status <> 'visible' or rev_llave is null)
  and rev_intentos between 0 and 100
) not valid;
alter table media validate constraint media_revision_coherente;
-- El barrido de la revisión: las retenidas con llave privada que tocan (la más vieja primero), sin recorrer todas las fotos.
create index if not exists media_revision_pendiente_idx on media (rev_siguiente) where status = 'review' and rev_llave is not null and purged_at is null;

-- ── El libro de veredictos (solo inserción) ──
create table if not exists photo_reviews (
  id             bigint generated always as identity primary key,
  media_id       uuid not null references media (id),
  sha256         text check (sha256 ~ '^[0-9a-f]{64}$'),
  uploader_id    uuid references users (id),
  city_id        text references cities (id),
  capa           text not null check (capa in ('c1', 'c2', 'c3', 'c4', 'memoria', 'persona')),
  decision       text not null check (decision in ('publicar', 'retener', 'rechazar', 'ocultar')),
  puntaje        real check (puntaje is null or (puntaje >= 0 and puntaje <= 1)),
  motivo         text check (motivo is null or motivo in ('desnudez', 'violencia', 'documento', 'captura', 'menores', 'reglas', 'no_segura', 'sin_servicio', 'sin_presupuesto', 'apagada', 'reportes')),
  modelo         text check (modelo is null or modelo ~ '^[a-z0-9]+([-.][a-z0-9]+)*$'),
  version        text check (version is null or char_length(version) <= 40),
  staff_id       uuid references users (id),
  cost_microusd  bigint not null default 0 check (cost_microusd >= 0),
  input_tokens   integer not null default 0 check (input_tokens >= 0),
  output_tokens  integer not null default 0 check (output_tokens >= 0),
  ms             integer check (ms is null or ms >= 0),
  created_at     timestamptz not null default now(),
  check ((capa = 'persona') = (staff_id is not null))
);
create index if not exists photo_reviews_contenido_idx on photo_reviews (sha256, id desc) where sha256 is not null;
create index if not exists photo_reviews_foto_idx on photo_reviews (media_id, id desc);
create index if not exists photo_reviews_dia_idx on photo_reviews (created_at);
create index if not exists photo_reviews_persona_idx on photo_reviews (uploader_id, created_at desc) where decision in ('rechazar', 'ocultar');
create or replace function photo_reviews_inmutable() returns trigger language plpgsql as $$
begin raise exception 'photo_reviews es solo de inserción'; end $$;
drop trigger if exists photo_reviews_no_cambia on photo_reviews;
create trigger photo_reviews_no_cambia before update or delete on photo_reviews for each row execute function photo_reviews_inmutable();

-- ── El tope mensual de la capa 2 (como el de El Compa: reservar antes, liquidar después) ──
create table if not exists photo_review_spend (
  month             text primary key check (month ~ '^[0-9]{4}-[0-9]{2}$'),
  spent_microusd    bigint not null default 0 check (spent_microusd >= 0),
  reserved_microusd bigint not null default 0 check (reserved_microusd >= 0),
  updated_at        timestamptz not null default now()
);
create table if not exists photo_review_reservations (
  id           uuid primary key default gen_random_uuid(),
  month        text not null references photo_review_spend (month),
  model        text not null references compa_models (id),
  max_microusd bigint not null check (max_microusd > 0),
  status       text not null default 'open' check (status in ('open', 'settled', 'released')),
  created_at   timestamptz not null default now(),
  closed_at    timestamptz
);
create index if not exists photo_review_reservations_abiertas on photo_review_reservations (created_at) where status = 'open';
create or replace function photo_review_reservations_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'una reserva del tope de fotos no se borra'; end if;
  if old.status <> 'open' or new.status = 'open'
     or (new.id, new.month, new.model, new.max_microusd, new.created_at) is distinct from (old.id, old.month, old.model, old.max_microusd, old.created_at) then
    raise exception 'una reserva del tope de fotos se cierra una sola vez';
  end if;
  new.closed_at := now();
  return new;
end $$;
drop trigger if exists photo_review_reservations_antes on photo_review_reservations;
create trigger photo_review_reservations_antes before update or delete on photo_review_reservations for each row execute function photo_review_reservations_antes();
create or replace function photo_review_spend_no_borra() returns trigger language plpgsql as $$
begin raise exception 'el gasto de un mes no se borra'; end $$;
drop trigger if exists photo_review_spend_no_borra on photo_review_spend;
create trigger photo_review_spend_no_borra before delete on photo_review_spend for each row execute function photo_review_spend_no_borra();

-- El tope de la capa 2 en microdólares: el de la regla foto2 (centavos, 0 a 100 000), leído en el momento.
create or replace function foto2_tope_microusd() returns bigint language sql stable as $$
  select greatest(0, least(100000, coalesce((select (params->>'tope_cents')::bigint from mod_rules where key = 'foto2'), 1000))) * 10000
$$;
-- Reservar ANTES de llamar: el máximo de la llamada contra el tope; atómico (con 20 a la vez la suma nunca pasa). null = al tope o modelo apagado.
create or replace function foto2_reservar(p_model text, p_in_max bigint, p_out_max bigint) returns uuid language plpgsql as $$
declare m text := compa_mes(); maxi bigint; tope bigint := foto2_tope_microusd(); r uuid;
begin
  if not exists (select 1 from compa_models where id = p_model and status = 'on') then return null; end if;
  maxi := greatest(1, compa_costo(p_model, p_in_max, 0, 0, p_out_max));
  insert into photo_review_spend (month) values (m) on conflict (month) do nothing;
  update photo_review_spend set reserved_microusd = reserved_microusd + maxi, updated_at = now()
   where month = m and spent_microusd + reserved_microusd + maxi <= tope;
  if not found then return null; end if;
  insert into photo_review_reservations (month, model, max_microusd) values (m, p_model, maxi) returning id into r;
  return r;
end $$;
-- Liquidar DESPUÉS: suelta la reserva y suma el costo real (tokens del proveedor; con un tiempo agotado, lo reservado). Devuelve el costo.
create or replace function foto2_anotar(p_reserva uuid, p_model text, p_in integer, p_out integer, p_cobrar_reservado boolean default false) returns bigint language plpgsql as $$
declare v photo_review_reservations; costo bigint;
begin
  select * into v from photo_review_reservations where id = p_reserva for update;
  if not found or v.status <> 'open' then raise exception 'foto2_reserva_cerrada: esa reserva no existe o ya se cerró'; end if;
  costo := case when p_cobrar_reservado then v.max_microusd else coalesce(compa_costo(p_model, greatest(p_in, 0), 0, 0, greatest(p_out, 0)), 0) end;
  update photo_review_reservations set status = 'settled' where id = p_reserva;
  update photo_review_spend set reserved_microusd = greatest(0, reserved_microusd - v.max_microusd), spent_microusd = spent_microusd + costo, updated_at = now()
   where month = v.month;
  return costo;
end $$;
-- El barrido suelta las reservas de llamadas que nunca volvieron (proceso caído): no se cobra lo que no se anotó.
create or replace function foto2_soltar_reservas(p_min integer default 10) returns integer language plpgsql as $$
declare v photo_review_reservations; n integer := 0;
begin
  for v in select * from photo_review_reservations where status = 'open' and created_at < now() - make_interval(mins => p_min) order by created_at limit 500 for update skip locked loop
    update photo_review_reservations set status = 'released' where id = v.id;
    update photo_review_spend set reserved_microusd = greatest(0, reserved_microusd - v.max_microusd), updated_at = now() where month = v.month;
    n := n + 1;
  end loop;
  return n;
end $$;

-- ── Las cuatro capas en Contenido › Auto-moderación ──
create or replace function pg_temp.ampliar_check(t regclass, nombre text, valores text[]) returns void language plpgsql as $$
declare d text; v text; nuevo text := '';
begin
  select pg_get_constraintdef(oid) into d from pg_constraint where conname = nombre and conrelid = t;
  if d is null then return; end if;
  foreach v in array valores loop
    if position(quote_literal(v) in d) = 0 then nuevo := nuevo || quote_literal(v) || '::text, '; end if;
  end loop;
  if nuevo = '' then return; end if;
  execute format('alter table %s drop constraint %I', t, nombre);
  execute format('alter table %s add constraint %I %s', t, nombre, replace(d, 'ARRAY[', 'ARRAY[' || nuevo));
end $$;
do $$ begin perform pg_temp.ampliar_check('mod_rules', 'mod_rules_key_check', array['foto1', 'foto2', 'foto3', 'foto4']); end $$;
insert into mod_rules (key, enabled, params) values
  ('foto1', true, '{"duda_pct": 60, "rechazo_pct": 85}'),
  ('foto2', true, '{"tope_cents": 1000, "espera_s": 8, "intentos": 5}'),
  ('foto3', true, '{"reportes": 3, "edad_h": 72}'),
  ('foto4', true, '{"fotos": 10, "dias": 90, "nueva_dias": 7, "nueva_hora": 10}')
on conflict (key) do nothing;

-- ── «Pedir revisión» de una foto que la revisión automática no publicó (o que ocultaron los reportes) ──
-- Igual que 0106 (Eventos) y una rama más en «media»: además de la foto de la Comunidad que quitó el equipo, la foto retenida o rechazada por la
-- revisión automática, de quien la subió. sanctioned_by queda vacío (la decidió un modelo): la decide cualquier persona del equipo que no sea ella.
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
    if not found then
      -- AJ · La foto que la revisión automática retuvo, rechazó u ocultó por reportes (con su archivo en la llave privada).
      select null::uuid as por, m.rev_nota as motivo, coalesce(b.city_id, u.home_city_id) as ciudad into x
        from media m join users u on u.id = m.uploaded_by left join businesses b on m.owner_kind = 'business' and b.id = m.owner_id
       where m.id::text = new.target_id and m.uploaded_by = new.user_id and m.purged_at is null and m.rev_at is not null and m.rev_llave is not null
         and (m.status = 'review' or (m.status = 'removed' and m.removed_reason = 'revision'));
    end if;
  elsif new.target_kind = 'event' then
    -- 6a · lo apela el dueño del negocio organizador: un evento oculto por To'Latino o no aprobado.
    select case when e.hidden_at is not null then e.hidden_by else e.reviewed_by end as por, coalesce(e.hidden_reason, e.review_note) as motivo, e.city_id as ciudad into x
      from events e join business_members m on m.business_id = e.business_id and m.kind = 'owner' and m.status = 'active' and m.user_id = new.user_id
     where e.id::text = new.target_id and (e.hidden_at is not null or e.status = 'rejected');
  elsif new.target_kind = 'evt_org' then
    select o.blocked_by as por, o.blocked_reason as motivo, o.city_id as ciudad into x
      from event_organizers o join business_members m on m.business_id = o.business_id and m.kind = 'owner' and m.status = 'active' and m.user_id = new.user_id
     where o.business_id = new.target_id and o.blocked_at is not null;
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

-- ── Avisos a quien subió la foto (bandeja y push; sin SMS: no es urgente) ──
insert into notif_templates (key, grp, pref, sms, sms_mode, push, push_private, title, body) values
  ('foto_rechazada', 'mod', null, false, 'nunca', true, false, '{"es":"No publicamos tu foto","en":"We did not publish your photo"}', '{"es":"No podemos publicarla: {motivo}. Si crees que es un error, pide que la revise una persona.","en":"We can''t publish it: {motivo}. If you think it''s a mistake, ask a person to review it."}'),
  ('foto_revision', 'mod', null, false, 'nunca', true, false, '{"es":"Tu foto está en revisión","en":"Your photo is under review"}', '{"es":"La revisamos antes de publicarla y te avisamos en cuanto esté lista. También puedes pedir que la revise una persona.","en":"We are reviewing it before it is published and will let you know as soon as it is ready. You can also ask a person to review it."}'),
  ('foto_aprobada', 'mod', null, false, 'nunca', true, false, '{"es":"Tu foto ya se puede publicar","en":"Your photo can be published"}', '{"es":"Revisamos tu foto y está bien. Si no la ves donde la pusiste, súbela otra vez: entra directo.","en":"We reviewed your photo and it is fine. If you don''t see it where you added it, upload it again: it goes straight in."}'),
  ('foto_oculta', 'mod', null, false, 'nunca', true, false, '{"es":"Una foto tuya está en revisión","en":"One of your photos is under review"}', '{"es":"Varias personas la reportaron y la ocultamos mientras la revisamos. Te avisamos el resultado; también puedes pedir que la revise una persona.","en":"Several people reported it and we hid it while we review it. We will let you know the result; you can also ask a person to review it."}'),
  ('foto_vuelve', 'mod', null, false, 'nunca', true, false, '{"es":"Tu foto se ve otra vez","en":"Your photo is visible again"}', '{"es":"La revisamos y está bien: ya se ve otra vez donde estaba.","en":"We reviewed it and it is fine: it shows again where it was."}')
on conflict (key) do nothing;

commit;
