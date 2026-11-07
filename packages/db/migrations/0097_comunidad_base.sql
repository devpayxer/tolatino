-- 0097 · Comunidad base (Fase 5 · 5a · docs/diseno/plan/fase5-comunidad.md §2 y §3). Muro, publicar y la publicación.
-- · city_official_accounts: la cuenta oficial «To'Latino {Ciudad}» de las 5 ciudades. No es una persona: no hay fila en users.
-- · community_profiles: lo de la persona en la Comunidad. Los contadores son derivados (triggers); nadie los escribe a mano.
-- · com_posts: pregunta · recomendacion · encuesta · publicacion. La ubicación es SIEMPRE el centro del barrio del autor (o de la
--   ciudad si no tiene barrio ahí): la pone la base al insertar, nunca el GPS ni la dirección de nadie (guardián ubicacionDeBarrio).
--   Votos, comentarios, encuesta y «hot» (orden «Más votados») son derivados en la misma transacción del voto.
-- · com_comments, com_votes, com_poll_votes, com_saves: el hilo llega en 5b; los votos y la encuesta ya cuentan aquí.
-- · user_blocks (bloquear mutuo / silenciar, con Deshacer): va aquí para que el muro excluya bloqueos desde el primer día (5c los crea).
-- · com_hidden_for («ya no lo ves» de quien reporta), com_edits (versión anterior al editar; solo inserción).
-- · content_reports admite publicaciones, comentarios y personas de la Comunidad, motivos de REP y prioridad.
-- · com_sin_datos(): teléfonos, correos, SSN/ITIN, tarjetas, A-number y casos de USCIS nunca se guardan (la app filtra antes con
--   lib/comunidad-filtro.ts; la base lo impone aunque alguien inserte directo — guardián comunidadSinTelefonos).
-- Idempotente: create if not exists, checks que se reemplazan, triggers que se recrean, plantillas on conflict do nothing. Nada se borra.
begin;

-- Lo que nunca se guarda en lo que escribe un vecino (mismo patrón que lib/resenas-filtro.ts PII/PRIVADO y lib/mensajes.ts TEL).
create or replace function com_sin_datos(t text) returns boolean language sql immutable as $$
  select t is null or not (
       t ~ '(\d[\s().-]*){10}'          -- teléfono de 10 dígitos con o sin separadores (y tarjetas de 13–19)
    or t ~* 'wa\.me/'                     -- WhatsApp
    or t ~ '\S+@\S+\.\S+'                 -- correo
    or t ~ '\m\d{3}-\d{2}-\d{4}\M'        -- número de seguro social o ITIN
    or t ~ '\m\d{9}\M'                    -- número de seguro social o ITIN sin guiones
    or t ~ '\mA[\s-]?\d{8,9}\M'           -- A-number
    or t ~ '\m[A-Z]{3}\d{10}\M'           -- número de caso de USCIS
  )
$$;
-- Lista corta de textos (looking_for, opciones de encuesta): cuántos y de qué largo.
create or replace function com_lista_ok(a text[], n int, largo int) returns boolean language sql immutable as $$
  select a is null or (cardinality(a) <= n and not exists (select 1 from unnest(a) x where char_length(btrim(x)) = 0 or char_length(x) > largo))
$$;
-- Orden «Más votados» (hot): signo × log10(max(|score|, 1)) + época / 45 000. Solo lo calcula la base.
create or replace function com_hot(score int, publicada timestamptz) returns double precision language sql immutable as $$
  select sign(score)::double precision * log(greatest(abs(score), 1)::numeric)::double precision + extract(epoch from publicada) / 45000.0
$$;

-- Cuenta oficial de cada ciudad (configuración real, también en producción; la escribe el equipo en 5e).
create table if not exists city_official_accounts (
  city_id        text primary key references cities (id),
  name           jsonb not null,
  bio            jsonb not null,
  photo_media_id uuid,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
insert into city_official_accounts (city_id, name, bio)
select c.id, jsonb_build_object('es', 'To''Latino ' || c.name, 'en', 'To''Latino ' || c.name),
       '{"es":"La cuenta de la ciudad: pregunta de la semana, encuestas y avisos.","en":"The city account: question of the week, polls and notices."}'::jsonb
  from cities c where c.id in ('hzl', 'alw', 'wbr', 'scr', 'rdg')
on conflict (city_id) do nothing;

-- Perfil de la Comunidad. rank_level: lo escribe solo recalcularRango (5f); hasta entonces vale 1 (la semilla pone el de los vecinos de prueba).
create table if not exists community_profiles (
  user_id        uuid primary key references users (id),
  bio            text check (char_length(bio) <= 160),
  bio_lang       text check (bio_lang in ('es', 'en')),
  since_year     smallint check (since_year between 1900 and 2100),
  hide_counts    boolean not null default false,
  rules_version  smallint,
  rules_ok_at    timestamptz,
  adult_ok_at    timestamptz,
  welcome_at     timestamptz,
  rank_level     smallint not null default 1 check (rank_level between 1 and 10),
  followers_n    integer not null default 0 check (followers_n >= 0),
  following_n    integer not null default 0 check (following_n >= 0),
  posts_n        integer not null default 0 check (posts_n >= 0),
  answers_best_n integer not null default 0 check (answers_best_n >= 0),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
alter table community_profiles drop constraint if exists community_profiles_bio_datos;
alter table community_profiles add constraint community_profiles_bio_datos check (com_sin_datos(bio));

create table if not exists com_posts (
  id                 bigint generated always as identity primary key,
  city_id            text not null references cities (id),
  author_kind        text not null check (author_kind in ('user', 'official')),
  author_user_id     uuid references users (id),
  staff_id           uuid references users (id),
  guest_from_city_id text references cities (id),
  zone_id            text,
  geom               geography(point, 4326) not null,
  kind               text not null check (kind in ('pregunta', 'recomendacion', 'encuesta', 'publicacion')),
  topic              text check (topic in ('comida', 'belleza', 'autos', 'hogar', 'salud', 'tramites', 'fiestas', 'ninos', 'otro')),
  body               text not null check (char_length(body) between 10 and 1000),
  lang               text not null default 'es' check (lang in ('es', 'en')),
  business_id        text references businesses (id),
  looking_for        text[] not null default '{}',
  poll_options       text[],
  poll_ends_at       timestamptz,
  health_notice      boolean not null default false,
  pinned_until       timestamptz,
  best_comment_id    bigint,
  solved_at          timestamptz,
  publish_at         timestamptz not null default now(),
  comments_locked_at timestamptz,
  status             text not null default 'visible' check (status in ('visible', 'hidden', 'deleted')),
  hidden_by          text check (hidden_by in ('admin', 'auto')),
  hidden_staff_id    uuid references users (id),
  hidden_reason      text check (char_length(hidden_reason) <= 500),
  hidden_at          timestamptz,
  deleted_at         timestamptz,
  edited_at          timestamptz,
  tsv                tsvector,
  up_n               integer not null default 0,
  down_n             integer not null default 0,
  score              integer not null default 0,
  comments_n         integer not null default 0,
  poll_counts        integer[] not null default '{}',
  hot                double precision not null default 0,
  last_activity_at   timestamptz not null default now(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check ((author_kind = 'official') = (author_user_id is null)),
  check (kind <> 'recomendacion' or business_id is not null),
  check (kind <> 'pregunta' or topic is not null),
  check ((kind = 'encuesta') = (poll_options is not null)),
  check (kind <> 'encuesta' or (cardinality(poll_options) between 2 and 4 and poll_ends_at is not null)),
  check (status <> 'hidden' or (hidden_by is not null and hidden_reason is not null and hidden_at is not null)),
  check (status <> 'deleted' or deleted_at is not null)
);
alter table com_posts drop constraint if exists com_posts_datos;
alter table com_posts add constraint com_posts_datos check (com_sin_datos(body) and com_sin_datos(array_to_string(looking_for, ' ')) and com_sin_datos(array_to_string(poll_options, ' '))
  and com_lista_ok(looking_for, 3, 40) and com_lista_ok(poll_options, 4, 60));
create index if not exists com_posts_hot_idx on com_posts (city_id, hot desc, id desc) where status = 'visible';
create index if not exists com_posts_recientes_idx on com_posts (city_id, publish_at desc, id desc) where status = 'visible';
create index if not exists com_posts_tipo_hot_idx on com_posts (city_id, kind, hot desc, id desc) where status = 'visible';
create index if not exists com_posts_tipo_recientes_idx on com_posts (city_id, kind, publish_at desc, id desc) where status = 'visible';
create index if not exists com_posts_geom_gix on com_posts using gist (geom) where status = 'visible';
create index if not exists com_posts_tsv_gin on com_posts using gin (tsv);
create index if not exists com_posts_autor_idx on com_posts (author_user_id, created_at desc);
create index if not exists com_posts_negocio_idx on com_posts (business_id, created_at desc) where kind = 'recomendacion';
create index if not exists com_posts_fijadas_idx on com_posts (city_id) where pinned_until is not null;
create index if not exists com_posts_admin_idx on com_posts (city_id, created_at desc, id desc);

create table if not exists com_comments (
  id             bigint generated always as identity primary key,
  post_id        bigint not null references com_posts (id),
  city_id        text not null references cities (id),
  parent_id      bigint references com_comments (id),
  reply_to_id    bigint references com_comments (id),
  author_user_id uuid not null references users (id),
  body           text not null check (char_length(body) between 1 and 600),
  lang           text not null default 'es' check (lang in ('es', 'en')),
  business_id    text references businesses (id),
  status         text not null default 'visible' check (status in ('visible', 'hidden', 'deleted')),
  hidden_by      text check (hidden_by in ('admin', 'auto')),
  hidden_staff_id uuid references users (id),
  hidden_reason  text check (char_length(hidden_reason) <= 500),
  hidden_at      timestamptz,
  deleted_at     timestamptz,
  edited_at      timestamptz,
  up_n           integer not null default 0,
  down_n         integer not null default 0,
  score          integer not null default 0,
  replies_n      integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
alter table com_comments drop constraint if exists com_comments_datos;
alter table com_comments add constraint com_comments_datos check (com_sin_datos(body));
create index if not exists com_comments_raices_idx on com_comments (post_id, score desc, id) where status = 'visible' and parent_id is null;
create index if not exists com_comments_respuestas_idx on com_comments (parent_id, id);
create index if not exists com_comments_negocio_idx on com_comments (post_id, business_id) where business_id is not null;
create index if not exists com_comments_autor_idx on com_comments (author_user_id, created_at desc);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'com_posts_best_fk') then
    alter table com_posts add constraint com_posts_best_fk foreign key (best_comment_id) references com_comments (id);
  end if;
end $$;

create table if not exists com_votes (
  target_kind text not null check (target_kind in ('post', 'comment')),
  target_id   bigint not null,
  user_id     uuid not null references users (id),
  v           smallint not null check (v in (-1, 1)),
  device      uuid,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (target_kind, target_id, user_id)
);
create index if not exists com_votes_persona_idx on com_votes (user_id, created_at desc);
create index if not exists com_votes_dispositivo_idx on com_votes (device, created_at desc) where device is not null;

create table if not exists com_poll_votes (
  post_id    bigint not null references com_posts (id),
  user_id    uuid not null references users (id),
  opt        smallint not null check (opt between 0 and 3),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists com_saves (
  post_id    bigint not null references com_posts (id),
  user_id    uuid not null references users (id),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index if not exists com_saves_persona_idx on com_saves (user_id, created_at desc);

create table if not exists user_blocks (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references users (id),
  target_user_id uuid not null references users (id),
  kind           text not null check (kind in ('block', 'mute')),
  created_at     timestamptz not null default now(),
  removed_at     timestamptz,
  check (user_id <> target_user_id)
);
create unique index if not exists user_blocks_vivo_idx on user_blocks (user_id, target_user_id, kind) where removed_at is null;
create index if not exists user_blocks_destino_idx on user_blocks (target_user_id) where kind = 'block' and removed_at is null;

create table if not exists com_hidden_for (
  user_id     uuid not null references users (id),
  target_kind text not null check (target_kind in ('post', 'comment')),
  target_id   bigint not null,
  created_at  timestamptz not null default now(),
  primary key (user_id, target_kind, target_id)
);

create table if not exists com_edits (
  id          bigint generated always as identity primary key,
  target_kind text not null check (target_kind in ('post', 'comment')),
  target_id   bigint not null,
  old_body    text not null,
  at          timestamptz not null default now()
);
create index if not exists com_edits_target_idx on com_edits (target_kind, target_id, at desc);
create or replace function com_edits_inmutable() returns trigger language plpgsql as $$
begin raise exception 'com_edits es solo de inserción'; end $$;
drop trigger if exists com_edits_no_cambia on com_edits;
create trigger com_edits_no_cambia before update or delete on com_edits for each row execute function com_edits_inmutable();

-- Reportes: la Comunidad entra a la misma tabla (y a la cola rep en 5d).
alter table content_reports drop constraint if exists content_reports_target_kind_check;
alter table content_reports add constraint content_reports_target_kind_check check (target_kind in ('review', 'post', 'comment', 'chat', 'com_post', 'com_comment', 'user'));
alter table content_reports drop constraint if exists content_reports_reason_check;
alter table content_reports add constraint content_reports_reason_check check (reason in ('fake', 'off', 'pii', 'spam', 'coi', 'otro', 'negocio', 'priv', 'acoso', 'falso', 'propio'));
alter table content_reports add column if not exists priority smallint not null default 0;

-- Fotos de una publicación de la Comunidad (hasta 4): media con owner_kind 'com_post'.
alter table media drop constraint if exists media_owner_kind_check;
alter table media add constraint media_owner_kind_check check (owner_kind = any (array['business', 'logo', 'item', 'member', 'review', 'post', 'event', 'user', 'help', 'support', 'claim',
  'appointment', 'estimate_line', 'request', 'line', 'trip', 'com_post']));

-- ── Derivados: solo los triggers escriben contadores, score y hot (marca de transacción tl.derivados). ──
create or replace function com_derivados_on() returns void language sql as $$ select set_config('tl.derivados', 'si', true) $$;
create or replace function com_derivados_off() returns void language sql as $$ select set_config('tl.derivados', '', true) $$;
create or replace function com_derivados_ok() returns boolean language sql stable as $$ select coalesce(current_setting('tl.derivados', true), '') = 'si' $$;

-- Antes de guardar una publicación: ubicación del barrio (nunca la de la persona), invitado, aviso de salud, hot, búsqueda, contadores.
create or replace function com_posts_antes() returns trigger language plpgsql as $$
declare u record; c record;
begin
  if tg_op = 'INSERT' or new.city_id is distinct from old.city_id or new.author_user_id is distinct from old.author_user_id then
    select center into c from cities where id = new.city_id;
    if new.author_user_id is null then
      new.zone_id := null; new.guest_from_city_id := null; new.geom := c.center;
    else
      select x.home_city_id, x.zone_id into u from users x where x.id = new.author_user_id;
      new.guest_from_city_id := case when u.home_city_id is not null and u.home_city_id <> new.city_id then u.home_city_id end;
      new.zone_id := (select z.id from zones z where u.home_city_id = new.city_id and z.city_id = new.city_id and z.id = u.zone_id and z.center is not null);
      new.geom := coalesce((select z.center from zones z where z.city_id = new.city_id and z.id = new.zone_id), c.center);
    end if;
  elsif new.geom is distinct from old.geom or new.zone_id is distinct from old.zone_id then
    raise exception 'la ubicación de una publicación la pone la base (centro del barrio)';
  end if;
  if tg_op = 'INSERT' then
    if not com_derivados_ok() then
      new.up_n := 0; new.down_n := 0; new.score := 0; new.comments_n := 0;
    end if;
    new.poll_counts := case when new.poll_options is null then '{}'::int[] else array_fill(0, array[cardinality(new.poll_options)]) end;
  elsif not com_derivados_ok() and (new.up_n, new.down_n, new.score, new.comments_n, new.poll_counts) is distinct from (old.up_n, old.down_n, old.score, old.comments_n, old.poll_counts) then
    raise exception 'los contadores de una publicación son derivados';
  end if;
  new.health_notice := coalesce(new.health_notice, false) or coalesce(new.topic = 'salud', false);
  new.hot := com_hot(new.score, new.publish_at);
  new.tsv := to_tsvector('simple', unaccent(coalesce(new.body, '') || ' ' || array_to_string(new.looking_for, ' ')));
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists com_posts_antes on com_posts;
create trigger com_posts_antes before insert or update on com_posts for each row execute function com_posts_antes();

create or replace function com_comments_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if not com_derivados_ok() then new.up_n := 0; new.down_n := 0; new.score := 0; new.replies_n := 0; end if;
    new.city_id := (select p.city_id from com_posts p where p.id = new.post_id);
  elsif not com_derivados_ok() and (new.up_n, new.down_n, new.score, new.replies_n) is distinct from (old.up_n, old.down_n, old.score, old.replies_n) then
    raise exception 'los contadores de un comentario son derivados';
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists com_comments_antes on com_comments;
create trigger com_comments_antes before insert or update on com_comments for each row execute function com_comments_antes();

create or replace function community_profiles_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if not com_derivados_ok() then new.followers_n := 0; new.following_n := 0; new.posts_n := 0; new.answers_best_n := 0; end if;
  elsif not com_derivados_ok() and (new.followers_n, new.following_n, new.posts_n, new.answers_best_n) is distinct from (old.followers_n, old.following_n, old.posts_n, old.answers_best_n) then
    raise exception 'los contadores del perfil son derivados';
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists community_profiles_antes on community_profiles;
create trigger community_profiles_antes before insert or update on community_profiles for each row execute function community_profiles_antes();

-- Suma (o resta) a un contador del perfil; crea el perfil si no existe.
create or replace function com_perfil_suma(uid uuid, col text, d int) returns void language plpgsql as $$
begin
  if uid is null or d = 0 then return; end if;
  perform com_derivados_on();
  insert into community_profiles (user_id) values (uid) on conflict (user_id) do nothing;
  execute format('update community_profiles set %I = greatest(%I + $2, 0) where user_id = $1', col, col) using uid, d;
  perform com_derivados_off();
end $$;

-- Votos ± (publicación o comentario): contadores, score y hot en la misma transacción, por suma (exacto con votos simultáneos).
create or replace function com_votes_despues() returns trigger language plpgsql as $$
declare k text; t bigint; du int := 0; dd int := 0;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    k := old.target_kind; t := old.target_id;
    if old.v = 1 then du := du - 1; else dd := dd - 1; end if;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    k := new.target_kind; t := new.target_id;
    if new.v = 1 then du := du + 1; else dd := dd + 1; end if;
  end if;
  if du = 0 and dd = 0 then return null; end if;
  perform com_derivados_on();
  if k = 'post' then
    update com_posts set up_n = up_n + du, down_n = down_n + dd, score = score + du - dd where id = t;
  else
    update com_comments set up_n = up_n + du, down_n = down_n + dd, score = score + du - dd where id = t;
  end if;
  perform com_derivados_off();
  return null;
end $$;
drop trigger if exists com_votes_despues on com_votes;
create trigger com_votes_despues after insert or update or delete on com_votes for each row execute function com_votes_despues();

-- Encuesta: un voto por persona, no se cambia; suma a su opción.
create or replace function com_poll_votes_despues() returns trigger language plpgsql as $$
begin
  if tg_op <> 'INSERT' then raise exception 'un voto de encuesta no se cambia'; end if;
  perform com_derivados_on();
  update com_posts set poll_counts[new.opt + 1] = poll_counts[new.opt + 1] + 1, last_activity_at = now() where id = new.post_id;
  perform com_derivados_off();
  return null;
end $$;
drop trigger if exists com_poll_votes_despues on com_poll_votes;
create trigger com_poll_votes_despues after insert or update or delete on com_poll_votes for each row execute function com_poll_votes_despues();

-- Comentarios visibles → comments_n de la publicación y replies_n de la raíz.
create or replace function com_comments_despues() returns trigger language plpgsql as $$
declare d int := 0;
begin
  if tg_op = 'INSERT' then d := case when new.status = 'visible' then 1 else 0 end;
  elsif (old.status = 'visible') <> (new.status = 'visible') then d := case when new.status = 'visible' then 1 else -1 end;
  end if;
  if d = 0 then return null; end if;
  perform com_derivados_on();
  update com_posts set comments_n = greatest(comments_n + d, 0), last_activity_at = case when d > 0 then now() else last_activity_at end where id = new.post_id;
  if new.parent_id is not null then update com_comments set replies_n = greatest(replies_n + d, 0) where id = new.parent_id; end if;
  perform com_derivados_off();
  return null;
end $$;
drop trigger if exists com_comments_despues on com_comments;
create trigger com_comments_despues after insert or update of status on com_comments for each row execute function com_comments_despues();

-- Publicaciones visibles → posts_n del autor; mejor respuesta → answers_best_n de quien respondió.
create or replace function com_posts_despues() returns trigger language plpgsql as $$
declare d int := 0;
begin
  if tg_op = 'INSERT' then d := case when new.status = 'visible' then 1 else 0 end;
  elsif (old.status = 'visible') <> (new.status = 'visible') then d := case when new.status = 'visible' then 1 else -1 end;
  end if;
  perform com_perfil_suma(new.author_user_id, 'posts_n', d);
  if tg_op = 'UPDATE' and new.best_comment_id is distinct from old.best_comment_id then
    if old.best_comment_id is not null then perform com_perfil_suma((select author_user_id from com_comments where id = old.best_comment_id), 'answers_best_n', -1); end if;
    if new.best_comment_id is not null then perform com_perfil_suma((select author_user_id from com_comments where id = new.best_comment_id), 'answers_best_n', 1); end if;
  elsif tg_op = 'INSERT' and new.best_comment_id is not null then
    perform com_perfil_suma((select author_user_id from com_comments where id = new.best_comment_id), 'answers_best_n', 1);
  end if;
  return null;
end $$;
drop trigger if exists com_posts_despues on com_posts;
create trigger com_posts_despues after insert or update of status, best_comment_id on com_posts for each row execute function com_posts_despues();

-- Seguir a una persona → followers_n / following_n (seguir a un negocio no cuenta aquí).
create or replace function follows_comunidad() returns trigger language plpgsql as $$
declare r record; d int;
begin
  if tg_op = 'INSERT' then r := new; d := 1; else r := old; d := -1; end if;
  if r.target_kind <> 'user' then return null; end if;
  perform com_perfil_suma(r.follower_user_id, 'following_n', d);
  perform com_perfil_suma(r.target_id::uuid, 'followers_n', d);
  return null;
end $$;
drop trigger if exists follows_comunidad on follows;
create trigger follows_comunidad after insert or delete on follows for each row execute function follows_comunidad();

-- Aviso al autor cuando To'Latino oculta su publicación (ES/EN, sin SMS: guardián avisoComunidadSinSms de §3).
insert into notif_templates (key, grp, pref, sms, title, body) values
  ('com_hide', 'mod', null, false, '{"es":"Ocultamos tu publicación","en":"We hid your post"}', '{"es":"Tu publicación de la Comunidad quedó oculta: {motivo}","en":"Your Community post was hidden: {motivo}"}'),
  ('com_restore', 'mod', null, false, '{"es":"Tu publicación se ve otra vez","en":"Your post is visible again"}', '{"es":"Revisamos tu publicación de la Comunidad y se ve otra vez.","en":"We reviewed your Community post and it is visible again."}')
on conflict (key) do nothing;

commit;
