-- 0098 · El hilo: comentar, responder, recomendar en el comentario, votos ±, mejor respuesta y encuestas (Fase 5 · 5b ·
-- docs/diseno/plan/fase5-comunidad.md §2 «0098 hilo_votos_encuestas» y §3 «Votos honestos»).
-- · com_votes.counted: un voto cuenta solo si no hay otro de otra cuenta del mismo dispositivo en lo mismo (callado: la persona lo
--   ve como suyo, pero no mueve contadores ni da puntos). Lo decide la base; lo propio no se vota (la base lo rechaza).
-- · com_votes_despues: contadores, score y hot por suma atómica en la misma transacción (exacto con votos simultáneos), solo los que cuentan.
-- · com_votar(): el toque de voto en una sola función (candado por persona y destino: el mismo toque quita, el otro signo cambia).
-- · com_thread_recs (derivado): por publicación y negocio recomendado en un comentario, votos (suma de votos + de esos comentarios),
--   cuántos lo recomendaron y el comentario más votado (al que se «Suma mi voto»). Se recalcula bajo candado de su fila.
-- · Mejor respuesta («Me sirvió»): una raíz de la misma publicación, de otra persona; marca RESUELTA (solved_at) y se puede cambiar.
-- · Encuestas: la base rechaza votos fuera de plazo o fuera de las opciones; poll_closed_at = el barrido ya avisó el resultado (una vez).
-- · com_mentions («@Nombre» a quien avisar), plantillas com_comment, com_reply, com_mention, com_best, com_votes_10, com_poll_closed,
--   com_cm_hide, com_cm_restore (todas sin SMS).
-- Idempotente: if not exists, funciones que se reemplazan, triggers que se recrean, backfill de derivados, plantillas on conflict. Nada se borra.
begin;

-- ── Votos honestos ──
alter table com_votes add column if not exists counted boolean not null default true;
create index if not exists com_votes_destino_dispositivo_idx on com_votes (target_kind, target_id, device) where device is not null;

-- Marca de derivados que respeta la de quien llama (anidados: un trigger dentro de otro no la apaga antes de tiempo).
create or replace function com_derivados_entrar() returns text language plpgsql as $$
declare p text := coalesce(current_setting('tl.derivados', true), '');
begin perform set_config('tl.derivados', 'si', true); return p; end $$;
create or replace function com_derivados_salir(prev text) returns void language sql as $$ select set_config('tl.derivados', coalesce(prev, ''), true) $$;

-- Antes de guardar un voto: existe lo votado, no es lo propio, y si cuenta (mismo dispositivo que otra cuenta → no cuenta).
create or replace function com_votes_antes() returns trigger language plpgsql as $$
declare autor uuid; existe boolean;
begin
  if tg_op = 'UPDATE' then
    if (new.target_kind, new.target_id, new.user_id) is distinct from (old.target_kind, old.target_id, old.user_id) or new.device is distinct from old.device then
      raise exception 'un voto no cambia de destino, persona ni dispositivo';
    end if;
    new.counted := old.counted;  -- cambiar de signo no cambia si cuenta
    new.updated_at := now();
    return new;
  end if;
  if new.target_kind = 'post' then
    select p.author_user_id, true into autor, existe from com_posts p where p.id = new.target_id;
  else
    select c.author_user_id, true into autor, existe from com_comments c where c.id = new.target_id;
  end if;
  if not coalesce(existe, false) then raise exception 'lo votado no existe'; end if;
  if autor = new.user_id then raise exception 'lo propio no se vota'; end if;
  if new.device is null then
    new.counted := true;
  else
    -- Dos cuentas del mismo dispositivo votando lo mismo a la vez: una sola cuenta (candado por destino y dispositivo).
    perform pg_advisory_xact_lock(hashtextextended('com_voto:' || new.target_kind || ':' || new.target_id || ':' || new.device::text, 0));
    new.counted := not exists (select 1 from com_votes o where o.target_kind = new.target_kind and o.target_id = new.target_id and o.device = new.device and o.user_id <> new.user_id);
  end if;
  return new;
end $$;
drop trigger if exists com_votes_antes on com_votes;
create trigger com_votes_antes before insert or update on com_votes for each row execute function com_votes_antes();

-- Votos ± → contadores, score y hot por suma (exacto con votos simultáneos: la fila se bloquea y la suma se hace sobre la última versión).
create or replace function com_votes_despues() returns trigger language plpgsql as $$
declare k text; t bigint; du int := 0; dd int := 0; prev text;
begin
  if tg_op in ('UPDATE', 'DELETE') and old.counted then
    k := old.target_kind; t := old.target_id;
    if old.v = 1 then du := du - 1; else dd := dd - 1; end if;
  end if;
  if tg_op in ('INSERT', 'UPDATE') and new.counted then
    k := new.target_kind; t := new.target_id;
    if new.v = 1 then du := du + 1; else dd := dd + 1; end if;
  end if;
  if du = 0 and dd = 0 then return null; end if;
  prev := com_derivados_entrar();
  if k = 'post' then
    update com_posts set up_n = up_n + du, down_n = down_n + dd, score = score + du - dd where id = t;
  else
    update com_comments set up_n = up_n + du, down_n = down_n + dd, score = score + du - dd where id = t;
  end if;
  perform com_derivados_salir(prev);
  return null;
end $$;
drop trigger if exists com_votes_despues on com_votes;
create trigger com_votes_despues after insert or update or delete on com_votes for each row execute function com_votes_despues();

-- El toque de voto (lo único que escribe com_votes desde la app): mismo signo → lo quita; otro signo → lo cambia; sin voto → vota.
-- Candado por persona y destino: dos toques a la vez de la misma persona se ordenan. Devuelve el voto que queda (−1, 0, 1).
-- La visibilidad, el bloqueo y lo propio los revisa antes lib/comunidad-hilo.ts; la base vuelve a rechazar lo propio.
create or replace function com_votar(k text, t bigint, u uuid, v smallint, dev uuid) returns smallint language plpgsql as $$
declare ya smallint;
begin
  if k not in ('post', 'comment') or v not in (-1, 1) then raise exception 'voto no válido'; end if;
  perform pg_advisory_xact_lock(hashtextextended('com_toque:' || k || ':' || t || ':' || u::text, 0));
  select x.v into ya from com_votes x where x.target_kind = k and x.target_id = t and x.user_id = u;
  if ya = v then
    delete from com_votes where target_kind = k and target_id = t and user_id = u;
    return 0;
  elsif ya is not null then
    update com_votes set v = com_votar.v where target_kind = k and target_id = t and user_id = u;
  else
    insert into com_votes (target_kind, target_id, user_id, v, device) values (k, t, u, v, dev);
  end if;
  return v;
end $$;

-- ── Recomendados en este hilo (derivado) ──
create table if not exists com_thread_recs (
  post_id        bigint not null references com_posts (id),
  business_id    text not null references businesses (id),
  city_id        text not null references cities (id),
  votes_n        integer not null default 0 check (votes_n >= 0),
  recs_n         integer not null default 0 check (recs_n >= 0),
  top_comment_id bigint references com_comments (id),
  updated_at     timestamptz not null default now(),
  primary key (post_id, business_id)
);
create index if not exists com_thread_recs_orden_idx on com_thread_recs (post_id, votes_n desc, business_id) where recs_n > 0;

-- Solo sus funciones lo escriben (guardián saldoDerivado).
create or replace function com_thread_recs_guardia() returns trigger language plpgsql as $$
begin
  if not com_derivados_ok() then raise exception 'com_thread_recs es derivado: solo lo escribe com_recs_recalcular()'; end if;
  if tg_op = 'DELETE' then raise exception 'com_thread_recs no se borra: queda en cero'; end if;
  return new;
end $$;
drop trigger if exists com_thread_recs_guardia on com_thread_recs;
create trigger com_thread_recs_guardia before insert or update or delete on com_thread_recs for each row execute function com_thread_recs_guardia();

-- Recalcula una fila desde los comentarios visibles, bajo el candado de esa fila (la lectura va después del candado: ve lo último).
create or replace function com_recs_recalcular(p bigint, b text) returns void language plpgsql as $$
declare prev text;
begin
  if p is null or b is null then return; end if;
  prev := com_derivados_entrar();
  insert into com_thread_recs (post_id, business_id, city_id) select p, b, x.city_id from com_posts x where x.id = p on conflict (post_id, business_id) do nothing;
  perform 1 from com_thread_recs where post_id = p and business_id = b for update;
  update com_thread_recs r set
      votes_n = s.votos, recs_n = s.n,
      top_comment_id = (select c.id from com_comments c where c.post_id = p and c.business_id = b and c.status = 'visible' order by c.up_n desc, c.id limit 1),
      updated_at = now()
    from (select coalesce(sum(c.up_n), 0)::int as votos, count(*)::int as n from com_comments c where c.post_id = p and c.business_id = b and c.status = 'visible') s
   where r.post_id = p and r.business_id = b;
  perform com_derivados_salir(prev);
end $$;

create or replace function com_comments_recs() returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' and old.business_id is not null and old.business_id is distinct from new.business_id then perform com_recs_recalcular(old.post_id, old.business_id); end if;
  if new.business_id is not null then perform com_recs_recalcular(new.post_id, new.business_id); end if;
  return null;
end $$;
drop trigger if exists com_comments_recs on com_comments;
create trigger com_comments_recs after insert or update of status, up_n, business_id on com_comments for each row execute function com_comments_recs();

-- Backfill (comentarios que ya existían): una vez por par publicación-negocio.
do $$ declare r record; begin
  for r in select distinct post_id, business_id from com_comments where business_id is not null loop perform com_recs_recalcular(r.post_id, r.business_id); end loop;
end $$;

-- ── Un comentario: texto de hasta 600 letras o solo el negocio que recomienda; oculto con motivo, borrado con fecha ──
alter table com_comments drop constraint if exists com_comments_body_check;
alter table com_comments drop constraint if exists com_comments_texto;
alter table com_comments add constraint com_comments_texto check (char_length(body) <= 600 and (char_length(btrim(body)) >= 1 or business_id is not null));
alter table com_comments drop constraint if exists com_comments_estado;
alter table com_comments add constraint com_comments_estado check ((status <> 'hidden' or (hidden_by is not null and hidden_reason is not null and hidden_at is not null)) and (status <> 'deleted' or deleted_at is not null));

-- ── El hilo: raíces por votos o recientes, con «Comentario eliminado» si tiene respuestas ──
create index if not exists com_comments_hilo_idx on com_comments (post_id, score desc, id) where parent_id is null and (status = 'visible' or replies_n > 0);
create index if not exists com_comments_hilo_new_idx on com_comments (post_id, id desc) where parent_id is null and (status = 'visible' or replies_n > 0);
create index if not exists com_comments_respuestas_vivas_idx on com_comments (parent_id, id) where status = 'visible';

-- Un comentario no se muda: la publicación, la raíz, a quién responde y el autor no cambian; responder es a una raíz de la misma publicación.
create or replace function com_comments_forma() returns trigger language plpgsql as $$
declare r record;
begin
  if tg_op = 'UPDATE' then
    if (new.post_id, new.parent_id, new.reply_to_id, new.author_user_id) is distinct from (old.post_id, old.parent_id, old.reply_to_id, old.author_user_id) then
      raise exception 'un comentario no cambia de publicación, de hilo ni de autor';
    end if;
    return new;
  end if;
  if new.parent_id is not null then
    select c.post_id, c.parent_id into r from com_comments c where c.id = new.parent_id;
    if r.post_id is distinct from new.post_id or r.parent_id is not null then raise exception 'se responde a un comentario raíz de la misma publicación'; end if;
  end if;
  if new.reply_to_id is not null then
    if new.parent_id is null then raise exception 'reply_to_id va con parent_id'; end if;
    if not exists (select 1 from com_comments c where c.id = new.reply_to_id and c.post_id = new.post_id and (c.id = new.parent_id or c.parent_id = new.parent_id)) then
      raise exception 'se contesta a alguien del mismo hilo';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists com_comments_forma on com_comments;
create trigger com_comments_forma before insert or update on com_comments for each row execute function com_comments_forma();

-- ── Mejor respuesta («Me sirvió») ──
create or replace function com_posts_mejor() returns trigger language plpgsql as $$
declare r record;
begin
  if new.best_comment_id is not distinct from old.best_comment_id then return new; end if;
  if new.best_comment_id is null then
    new.solved_at := null;
    return new;
  end if;
  select c.post_id, c.parent_id, c.author_user_id, c.status into r from com_comments c where c.id = new.best_comment_id;
  if r.post_id is distinct from new.id or r.parent_id is not null or r.status <> 'visible' then raise exception 'la mejor respuesta es un comentario raíz visible de la misma publicación'; end if;
  if r.author_user_id is not distinct from new.author_user_id then raise exception 'la mejor respuesta es de otra persona'; end if;
  new.solved_at := coalesce(old.solved_at, new.solved_at, now());
  return new;
end $$;
drop trigger if exists com_posts_mejor on com_posts;
create trigger com_posts_mejor before update of best_comment_id on com_posts for each row execute function com_posts_mejor();

-- ── Encuestas ──
alter table com_posts add column if not exists poll_closed_at timestamptz;
create index if not exists com_posts_encuestas_por_cerrar_idx on com_posts (poll_ends_at) where kind = 'encuesta' and poll_closed_at is null;

-- La base rechaza un voto de encuesta cerrada, de algo que no es encuesta o fuera de sus opciones.
create or replace function com_poll_votes_antes() returns trigger language plpgsql as $$
declare p record;
begin
  -- Ya votó: que lo resuelva la llave (on conflict do nothing / un voto por persona).
  if exists (select 1 from com_poll_votes v where v.post_id = new.post_id and v.user_id = new.user_id) then return new; end if;
  select x.kind, x.poll_ends_at, coalesce(cardinality(x.poll_options), 0) as n, x.author_user_id, x.status into p from com_posts x where x.id = new.post_id;
  if p.kind is distinct from 'encuesta' or p.status <> 'visible' then raise exception 'eso no es una encuesta abierta'; end if;
  if p.poll_ends_at <= now() then raise exception 'esta encuesta ya cerró'; end if;
  if new.opt >= p.n then raise exception 'esa opción no existe'; end if;
  return new;
end $$;
drop trigger if exists com_poll_votes_antes on com_poll_votes;
create trigger com_poll_votes_antes before insert on com_poll_votes for each row execute function com_poll_votes_antes();

-- ── Menciones («@Nombre»): a quién se avisó por un comentario ──
create table if not exists com_mentions (
  comment_id bigint not null references com_comments (id),
  user_id    uuid not null references users (id),
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);
create index if not exists com_mentions_persona_idx on com_mentions (user_id, created_at desc);

-- ── Avisos del hilo (ES/EN, sin SMS: guardián avisoComunidadSinSms) ──
insert into notif_templates (key, grp, pref, sms, title, body) values
  ('com_comment', 'tx', null, false, '{"es":"Comentaron tu publicación","en":"New comment on your post"}', '{"es":"{nombre} comentó: «{texto}»","en":"{nombre} commented: «{texto}»"}'),
  ('com_reply', 'tx', null, false, '{"es":"Te respondieron","en":"New reply"}', '{"es":"{nombre} respondió tu comentario: «{texto}»","en":"{nombre} replied to your comment: «{texto}»"}'),
  ('com_mention', 'tx', null, false, '{"es":"Te mencionaron","en":"You were mentioned"}', '{"es":"{nombre} te mencionó: «{texto}»","en":"{nombre} mentioned you: «{texto}»"}'),
  ('com_best', 'tx', null, false, '{"es":"Tu respuesta le sirvió","en":"Your answer helped"}', '{"es":"A {nombre} le sirvió tu respuesta en «{texto}».","en":"Your answer helped {nombre} in «{texto}»."}'),
  ('com_votes_10', 'tx', null, false, '{"es":"Llegaste a 10 votos","en":"You reached 10 votes"}', '{"es":"Tu {que} «{texto}» ya tiene 10 votos a favor de tus vecinos.","en":"Your {que} «{texto}» now has 10 upvotes from your neighbors."}'),
  ('com_poll_closed', 'tx', null, false, '{"es":"Cerró la encuesta","en":"The poll closed"}', '{"es":"«{texto}» cerró. {resultado}","en":"«{texto}» closed. {resultado}"}'),
  ('com_cm_hide', 'mod', null, false, '{"es":"Ocultamos tu comentario","en":"We hid your comment"}', '{"es":"Tu comentario de la Comunidad quedó oculto: {motivo}","en":"Your Community comment was hidden: {motivo}"}'),
  ('com_cm_restore', 'mod', null, false, '{"es":"Tu comentario se ve otra vez","en":"Your comment is visible again"}', '{"es":"Revisamos tu comentario de la Comunidad y se ve otra vez.","en":"We reviewed your Community comment and it is visible again."}')
on conflict (key) do nothing;

commit;
