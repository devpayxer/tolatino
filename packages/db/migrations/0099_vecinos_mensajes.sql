-- 0099 · Vecinos y Mensajes vecino ↔ vecino (Fase 5 · 5c · docs/diseno/plan/fase5-comunidad.md §2, §3 y §4 5c).
-- · Seguir a una persona: nunca a uno mismo ni con un bloqueo de por medio (la base lo impone aunque alguien inserte directo).
-- · Bloquear es mutuo e invisible: al bloquear se deja de seguir en los dos sentidos y la conversación se cierra sin avisar;
--   Deshacer (removed_at) devuelve lo que ese bloqueo quitó (seguimientos guardados en unfollowed) y reabre la conversación si
--   ya no queda otro bloqueo entre los dos.
-- · dm_threads / dm_messages: conversaciones entre dos vecinos (a < b). Solo texto, sin teléfonos ni datos (com_sin_datos); un
--   mensaje nuevo solo a quien te sigue o a quien ya te escribió en esa conversación; nada con un bloqueo; nada en una
--   conversación cerrada. El último texto, los no leídos y la hora son derivados: solo los escriben los triggers y dm_leido().
--   Un mensaje no se edita ni se borra: el equipo lo oculta con motivo (solo con un reporte abierto, lib/admin-dm.ts).
-- · content_reports admite 'dm'; la cola «Mensajes reportados» (chat) admite 'dm_thread'.
-- · 18+: community_profiles.adult (declaró sí/no) + adult_ok_at (cuándo). Nunca una fecha de nacimiento.
-- · users.interests (paso 4 de 2au: categorías de negocios y lo que le interesa de la Comunidad).
-- · notifications.actor_user_id: quién provocó un aviso de la Comunidad; la bandeja no muestra avisos de alguien con un bloqueo.
-- · Plantillas com_follow, dm_message, dm_hide (sin SMS, guardián avisoComunidadSinSms).
-- Idempotente: if not exists, checks que se reemplazan, triggers que se recrean, plantillas on conflict do nothing. Nada se borra.
begin;

-- ── 18+ e intereses ──
alter table community_profiles add column if not exists adult boolean;
update community_profiles set adult = true where adult is null and adult_ok_at is not null;
alter table users add column if not exists interests jsonb not null default '{}'::jsonb;
alter table users drop constraint if exists users_interests_forma;
alter table users add constraint users_interests_forma check (jsonb_typeof(interests) = 'object' and octet_length(interests::text) <= 2000);

-- ── Seguir ──
create index if not exists follows_seguidor_idx on follows (follower_user_id, target_kind, created_at desc);
create index if not exists follows_seguidos_idx on follows (target_kind, target_id, created_at desc, follower_user_id);
create index if not exists user_blocks_par_idx on user_blocks (target_user_id, user_id) where removed_at is null;

-- ¿Hay un bloqueo vivo entre dos personas (en cualquier sentido)?
create or replace function com_bloqueados(x uuid, y uuid) returns boolean language sql stable as $$
  select exists (select 1 from user_blocks b where b.kind = 'block' and b.removed_at is null
                   and ((b.user_id = x and b.target_user_id = y) or (b.user_id = y and b.target_user_id = x)))
$$;

create or replace function follows_antes() returns trigger language plpgsql as $$
begin
  if new.target_kind = 'user' then
    if new.target_id = new.follower_user_id::text then raise exception 'nadie se sigue a sí mismo'; end if;
    if com_bloqueados(new.follower_user_id, new.target_id::uuid) then raise exception 'hay un bloqueo entre las dos personas'; end if;
  end if;
  return new;
end $$;
drop trigger if exists follows_antes on follows;
create trigger follows_antes before insert on follows for each row execute function follows_antes();

-- ── Bloquear ──
alter table user_blocks add column if not exists unfollowed jsonb;

-- ── Mensajes vecino ↔ vecino ──
create table if not exists dm_threads (
  id          bigint generated always as identity primary key,
  a_user_id   uuid not null references users (id),
  b_user_id   uuid not null references users (id),
  city_id     text not null references cities (id),
  started_by  uuid not null references users (id),
  created_at  timestamptz not null default now(),
  last_at     timestamptz,
  last_text   text check (char_length(last_text) <= 160),
  last_from   uuid,
  a_unread    integer not null default 0 check (a_unread >= 0),
  b_unread    integer not null default 0 check (b_unread >= 0),
  a_read_at   timestamptz,
  b_read_at   timestamptz,
  closed_at   timestamptz,
  check (a_user_id < b_user_id),
  check (started_by = a_user_id or started_by = b_user_id),
  unique (a_user_id, b_user_id)
);
create index if not exists dm_threads_a_idx on dm_threads (a_user_id, last_at desc, id desc) where last_at is not null;
create index if not exists dm_threads_b_idx on dm_threads (b_user_id, last_at desc, id desc) where last_at is not null;
create index if not exists dm_threads_nuevas_idx on dm_threads (started_by, created_at desc);

create table if not exists dm_messages (
  id             bigint generated always as identity primary key,
  thread_id      bigint not null references dm_threads (id),
  sender_user_id uuid not null references users (id),
  city_id        text not null references cities (id),
  body           text not null check (char_length(btrim(body)) between 1 and 1000),
  hidden_at      timestamptz,
  hidden_reason  text check (char_length(hidden_reason) <= 300),
  hidden_by      uuid references users (id),
  created_at     timestamptz not null default now()
);
alter table dm_messages drop constraint if exists dm_messages_body_datos;
alter table dm_messages add constraint dm_messages_body_datos check (com_sin_datos(body));
create index if not exists dm_messages_hilo_idx on dm_messages (thread_id, id);
create index if not exists dm_messages_autor_idx on dm_messages (sender_user_id, created_at desc);

-- Los derivados de una conversación solo los escriben los triggers y dm_leido() (marca tl.derivados).
create or replace function dm_threads_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if not com_derivados_ok() then
      new.last_at := null; new.last_text := null; new.last_from := null; new.a_unread := 0; new.b_unread := 0; new.a_read_at := null; new.b_read_at := null;
    end if;
  elsif not com_derivados_ok() and (new.last_at, new.last_text, new.last_from, new.a_unread, new.b_unread, new.a_read_at, new.b_read_at)
        is distinct from (old.last_at, old.last_text, old.last_from, old.a_unread, old.b_unread, old.a_read_at, old.b_read_at) then
    raise exception 'los contadores de una conversación son derivados';
  elsif (new.a_user_id, new.b_user_id, new.started_by, new.city_id) is distinct from (old.a_user_id, old.b_user_id, old.started_by, old.city_id) then
    raise exception 'una conversación no cambia de personas';
  end if;
  return new;
end $$;
drop trigger if exists dm_threads_antes on dm_threads;
create trigger dm_threads_antes before insert or update on dm_threads for each row execute function dm_threads_antes();
create or replace function dm_no_se_borra() returns trigger language plpgsql as $$
begin raise exception 'en Mensajes nada se borra: se oculta con motivo'; end $$;
drop trigger if exists dm_threads_no_borra on dm_threads;
create trigger dm_threads_no_borra before delete on dm_threads for each row execute function dm_no_se_borra();

-- Antes de guardar un mensaje: es de una de las dos personas, la conversación está abierta, no hay bloqueo y la otra persona
-- sigue a quien escribe (o ya le escribió en esta conversación). Un mensaje no se edita: solo se oculta (hidden_*).
create or replace function dm_messages_antes() returns trigger language plpgsql as $$
declare t record; otro uuid;
begin
  if tg_op = 'DELETE' then raise exception 'en Mensajes nada se borra: se oculta con motivo'; end if;
  if tg_op = 'UPDATE' then
    if (new.thread_id, new.sender_user_id, new.body, new.created_at, new.city_id) is distinct from (old.thread_id, old.sender_user_id, old.body, old.created_at, old.city_id) then
      raise exception 'un mensaje no se edita';
    end if;
    return new;
  end if;
  select * into t from dm_threads where id = new.thread_id for update;
  if new.sender_user_id <> t.a_user_id and new.sender_user_id <> t.b_user_id then raise exception 'solo escriben las dos personas de la conversación'; end if;
  if t.closed_at is not null then raise exception 'la conversación está cerrada'; end if;
  otro := case when new.sender_user_id = t.a_user_id then t.b_user_id else t.a_user_id end;
  if com_bloqueados(new.sender_user_id, otro) then raise exception 'hay un bloqueo entre las dos personas'; end if;
  if not exists (select 1 from follows f where f.follower_user_id = otro and f.target_kind = 'user' and f.target_id = new.sender_user_id::text)
     and not exists (select 1 from dm_messages m where m.thread_id = new.thread_id and m.sender_user_id = otro) then
    raise exception 'solo le escribes a quien te sigue';
  end if;
  new.city_id := t.city_id;
  return new;
end $$;
drop trigger if exists dm_messages_antes on dm_messages;
create trigger dm_messages_antes before insert or update or delete on dm_messages for each row execute function dm_messages_antes();

-- Después: el último texto (≤ 160), la hora y los no leídos de la otra persona; quien escribe queda al día.
create or replace function dm_messages_despues() returns trigger language plpgsql as $$
declare ult record;
begin
  perform com_derivados_on();
  if tg_op = 'INSERT' then
    update dm_threads t set last_at = new.created_at, last_from = new.sender_user_id,
           last_text = case when char_length(new.body) > 160 then left(new.body, 157) || '…' else new.body end,
           a_unread = case when new.sender_user_id = t.b_user_id then t.a_unread + 1 else 0 end,
           b_unread = case when new.sender_user_id = t.a_user_id then t.b_unread + 1 else 0 end,
           a_read_at = case when new.sender_user_id = t.a_user_id then now() else t.a_read_at end,
           b_read_at = case when new.sender_user_id = t.b_user_id then now() else t.b_read_at end
     where t.id = new.thread_id;
  elsif new.hidden_at is distinct from old.hidden_at then
    select m.body, m.hidden_at into ult from dm_messages m where m.thread_id = new.thread_id order by m.id desc limit 1;
    update dm_threads t set last_text = case when ult.hidden_at is not null then '' when char_length(ult.body) > 160 then left(ult.body, 157) || '…' else ult.body end
     where t.id = new.thread_id;
  end if;
  perform com_derivados_off();
  return null;
end $$;
drop trigger if exists dm_messages_despues on dm_messages;
create trigger dm_messages_despues after insert or update of hidden_at on dm_messages for each row execute function dm_messages_despues();

-- Leído: la persona deja su lado en cero (lo único que la app pide sobre los derivados).
create or replace function dm_leido(t_id bigint, uid uuid) returns void language plpgsql as $$
begin
  perform com_derivados_on();
  update dm_threads set a_unread = 0, a_read_at = now() where id = t_id and a_user_id = uid and a_unread > 0;
  update dm_threads set b_unread = 0, b_read_at = now() where id = t_id and b_user_id = uid and b_unread > 0;
  perform com_derivados_off();
end $$;

-- Bloquear: deja de seguirse en los dos sentidos (guarda qué quitó) y cierra la conversación sin avisar.
-- Deshacer: devuelve lo que ese bloqueo quitó y reabre la conversación, si ya no queda otro bloqueo entre los dos.
create or replace function user_blocks_despues() returns trigger language plpgsql as $$
declare ida int; vuelta int; x uuid; y uuid;
begin
  if new.kind <> 'block' then return null; end if;
  x := least(new.user_id, new.target_user_id); y := greatest(new.user_id, new.target_user_id);
  if tg_op = 'INSERT' and new.removed_at is null then
    with q as (delete from follows where follower_user_id = new.user_id and target_kind = 'user' and target_id = new.target_user_id::text returning 1) select count(*) into ida from q;
    with q as (delete from follows where follower_user_id = new.target_user_id and target_kind = 'user' and target_id = new.user_id::text returning 1) select count(*) into vuelta from q;
    update user_blocks set unfollowed = jsonb_build_object('ida', ida > 0, 'vuelta', vuelta > 0) where id = new.id;
    update dm_threads set closed_at = now() where a_user_id = x and b_user_id = y and closed_at is null;
  elsif tg_op = 'UPDATE' and old.removed_at is null and new.removed_at is not null and not com_bloqueados(new.user_id, new.target_user_id) then
    if coalesce((new.unfollowed ->> 'ida')::boolean, false) then
      insert into follows (follower_user_id, target_kind, target_id) values (new.user_id, 'user', new.target_user_id::text) on conflict do nothing;
    end if;
    if coalesce((new.unfollowed ->> 'vuelta')::boolean, false) then
      insert into follows (follower_user_id, target_kind, target_id) values (new.target_user_id, 'user', new.user_id::text) on conflict do nothing;
    end if;
    update dm_threads set closed_at = null where a_user_id = x and b_user_id = y and closed_at is not null;
  end if;
  return null;
end $$;
drop trigger if exists user_blocks_despues on user_blocks;
create trigger user_blocks_despues after insert or update of removed_at on user_blocks for each row execute function user_blocks_despues();
-- Un bloqueo o silencio no se borra: Deshacer = removed_at.
drop trigger if exists user_blocks_no_borra on user_blocks;
create trigger user_blocks_no_borra before delete on user_blocks for each row execute function dm_no_se_borra();

-- ── Reportes y cola ──
alter table content_reports drop constraint if exists content_reports_target_kind_check;
alter table content_reports add constraint content_reports_target_kind_check check (target_kind in ('review', 'post', 'comment', 'chat', 'com_post', 'com_comment', 'user', 'dm'));
alter table queue_items drop constraint if exists queue_items_subject_kind_check;
alter table queue_items add constraint queue_items_subject_kind_check check (subject_kind = any (array['verification_request', 'business', 'license', 'media', 'recommendation', 'claim',
  'sensitive_change', 'review', 'help_request', 'chat_thread', 'dispute', 'rental', 'listing', 'dm_thread']));

-- ── Avisos: quién los provocó (la bandeja no muestra los de alguien con un bloqueo de por medio) ──
alter table notifications add column if not exists actor_user_id uuid references users (id);

insert into notif_templates (key, grp, pref, sms, title, body) values
  ('com_follow', 'tx', null, false, '{"es":"Tienes un seguidor nuevo","en":"You have a new follower"}', '{"es":"{nombre} te empezó a seguir. Ya le puedes escribir.","en":"{nombre} started following you. You can now message them."}'),
  ('dm_message', 'tx', null, false, '{"es":"Mensaje de un vecino","en":"Message from a neighbor"}', '{"es":"{nombre}: «{texto}»","en":"{nombre}: «{texto}»"}'),
  ('dm_hide', 'mod', null, false, '{"es":"Ocultamos tu mensaje","en":"We hid your message"}', '{"es":"Ocultamos un mensaje tuyo a un vecino: {motivo}","en":"We hid one of your messages to a neighbor: {motivo}"}')
on conflict (key) do nothing;

commit;
