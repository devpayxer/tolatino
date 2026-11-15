-- 9f-5 · Editar la ayuda desde el Super Admin (fase9-apertura.md §4 9f: «el editor de la ayuda publica una versión nueva sin tocar el repo de
-- inmediato; el repo sigue siendo la fuente»; fase7-compa.md §6 #12; LAUNCH L998 / L1607).
--   · Se edita UNA sección de un artículo (su idioma y su número de sección), con motivo. El cambio sale al instante en el Centro de ayuda y para
--     El Compa (los trozos de esa sección se rehacen) y queda en help_edits (solo inserción salvo su cierre) y en help_article_log ('edited').
--   · El repo manda: help_articles.repo_sha256 es el sha del ARCHIVO desplegado. Mientras el archivo no cambie, el despliegue no pisa lo editado
--     (ayuda_indexar compara contra repo_sha256). Si el archivo cambia, se indexa el repo y cada edición viva se cierra: «en_repo» si el texto nuevo
--     de esa sección ya es el editado (Claude lo pasó al repo) o «reemplazada» si no.
--   · «Deshacer» vuelve la sección al texto que tenía antes de esa edición (solo la última edición viva de la sección).
--   · Lo editado de las audiencias públicas (vecino, negocio, portero; nunca una sección solo-equipo) se puede leer en /api/ayuda/ediciones para
--     llevarlo al repo; de lo del equipo solo sale qué sección cambió y cuándo.
-- Idempotente; nada se borra.

alter table help_articles add column if not exists repo_sha256 text check (repo_sha256 ~ '^[0-9a-f]{64}$');
update help_articles set repo_sha256 = sha256 where repo_sha256 is null;

create table if not exists help_edits (
  id            bigint generated always as identity primary key,
  slug          text not null references help_articles (slug),
  lang          text not null check (lang in ('es', 'en')),
  sec           integer not null check (sec >= 0),
  heading       text not null check (char_length(heading) between 1 and 200),
  equipo        boolean not null default false,             -- la sección es solo-equipo (su texto nunca sale de la base)
  body_old      text not null check (char_length(body_old) <= 40000),
  body_new      text not null check (char_length(body_new) between 1 and 12000),
  repo_sha256   text not null check (repo_sha256 ~ '^[0-9a-f]{64}$'),
  reason        text not null check (char_length(reason) between 3 and 300),
  staff_id      uuid not null references users (id),
  at            timestamptz not null default now(),
  status        text not null default 'viva' check (status in ('viva', 'deshecha', 'reemplazada', 'en_repo')),
  ended_at      timestamptz,
  ended_by      uuid references users (id),               -- null = el despliegue
  ended_reason  text check (ended_reason is null or char_length(ended_reason) between 3 and 300),
  check ((status = 'viva') = (ended_at is null)),
  check (status <> 'deshecha' or (ended_by is not null and ended_reason is not null))
);
create index if not exists help_edits_slug on help_edits (slug, at desc);
create unique index if not exists help_edits_una_viva on help_edits (slug, lang, sec) where status = 'viva';

-- Solo inserción: una edición nunca cambia su texto, su autor ni su motivo; solo se cierra una vez (viva → deshecha / reemplazada / en_repo).
create or replace function help_edits_cierre() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'help_edits es solo de inserción'; end if;
  if old.status <> 'viva' then raise exception 'una edición cerrada (%) no cambia', old.status; end if;
  if new.slug <> old.slug or new.lang <> old.lang or new.sec <> old.sec or new.heading <> old.heading or new.body_old <> old.body_old
     or new.body_new <> old.body_new or new.repo_sha256 <> old.repo_sha256 or new.reason <> old.reason or new.staff_id <> old.staff_id or new.at <> old.at
     or new.equipo <> old.equipo then
    raise exception 'una edición de la ayuda no cambia: solo se cierra';
  end if;
  return new;
end $$;
drop trigger if exists help_edits_cierre on help_edits;
create trigger help_edits_cierre before update or delete on help_edits for each row execute function help_edits_cierre();

alter table help_article_log drop constraint if exists help_article_log_action_check;
alter table help_article_log add constraint help_article_log_action_check check (action in ('indexed', 'paused', 'resumed', 'flagged', 'retired', 'edited', 'reverted'));
alter table help_article_log drop constraint if exists help_article_log_check;
alter table help_article_log add constraint help_article_log_check check (action not in ('paused', 'resumed', 'flagged', 'edited', 'reverted') or (by is not null and reason is not null));

-- El texto de una sección como lo guardan sus trozos (para comparar sin importar cómo se partió).
create or replace function ayuda_normal(t text) returns text language sql immutable parallel safe as $$
  select trim(regexp_replace(coalesce(t, ''), '\s+', ' ', 'g'))
$$;

-- Rehace los trozos de UNA sección (slug, lang, sec) con los nuevos y renumera el artículo entero (unique (slug, ord)). La audiencia de la sección
-- no cambia: la de sus trozos de antes (solo-equipo sigue «equipo»).
create or replace function ayuda_rehacer_seccion(s text, l text, n integer, nuevos jsonb) returns void language plpgsql as $$
declare aud text; tit text; nivel smallint; head text; viejos jsonb;
begin
  select c.audience, c.title, c.nivel, c.heading into aud, tit, nivel, head from help_chunks c where c.slug = s and c.lang = l and c.sec = n order by c.ord limit 1;
  if aud is null then raise exception 'la sección % (%) de % no existe', n, l, s; end if;
  select coalesce(jsonb_agg(jsonb_build_object('lang', c.lang, 'sec', c.sec, 'nivel', c.nivel, 'title', c.title, 'heading', c.heading, 'body', c.body, 'audience', c.audience) order by c.ord), '[]')
    into viejos from help_chunks c where c.slug = s;
  delete from help_chunks where slug = s;
  insert into help_chunks (slug, lang, ord, sec, nivel, title, heading, body, audience)
  select s, x->>'lang', (row_number() over (order by k.grupo, k.i) - 1)::int, (x->>'sec')::int, (x->>'nivel')::smallint, x->>'title', x->>'heading', x->>'body', x->>'audience'
    from (
      -- Lo de antes de la sección, la sección nueva en su lugar y lo de después.
      select v.x, v.i, case when (v.x->>'lang') = l and (v.x->>'sec')::int = n then 1 when v.i < (select min(w.i) from jsonb_array_elements(viejos) with ordinality w(x, i)
                                where (w.x->>'lang') = l and (w.x->>'sec')::int = n) then 0 else 2 end as grupo
        from jsonb_array_elements(viejos) with ordinality v(x, i)
       where not ((v.x->>'lang') = l and (v.x->>'sec')::int = n)
      union all
      select jsonb_build_object('lang', l, 'sec', n, 'nivel', nivel, 'title', tit, 'heading', head, 'body', b.body, 'audience', aud), b.i, 1
        from jsonb_array_elements_text(nuevos) with ordinality b(body, i)
    ) k(x, i, grupo);
end $$;

-- Editar una sección: guarda la edición (con el texto de antes), rehace sus trozos y anota el libro. Devuelve el id de la edición.
-- La sección que ya tenía una edición viva la cierra como «reemplazada» (la nueva parte de lo que se ve hoy).
create or replace function ayuda_editar(s text, l text, n integer, nuevo text, nuevos jsonb, por uuid, motivo text) returns bigint language plpgsql as $$
declare v help_articles; viejo text; head text; eq boolean; id_nuevo bigint;
begin
  select * into v from help_articles where slug = s for update;
  if not found or v.status = 'retired' then raise exception 'ese artículo no está en uso'; end if;
  select string_agg(c.body, E'\n\n' order by c.ord), min(c.heading), bool_or(c.audience = 'equipo' and v.audience <> 'equipo')
    into viejo, head, eq from help_chunks c where c.slug = s and c.lang = l and c.sec = n;
  if head is null then raise exception 'la sección % (%) de % no existe', n, l, s; end if;
  if ayuda_normal(viejo) = ayuda_normal(nuevo) then raise exception 'el texto es el mismo'; end if;
  update help_edits set status = 'reemplazada', ended_at = now(), ended_by = por, ended_reason = 'otra edición de la misma sección'
   where slug = s and lang = l and sec = n and status = 'viva';
  insert into help_edits (slug, lang, sec, heading, equipo, body_old, body_new, repo_sha256, reason, staff_id)
  values (s, l, n, head, coalesce(eq, false), viejo, nuevo, coalesce(v.repo_sha256, v.sha256), motivo, por) returning id into id_nuevo;
  perform ayuda_rehacer_seccion(s, l, n, nuevos);
  update help_articles set sha256 = encode(sha256(convert_to(coalesce(v.repo_sha256, v.sha256) || ':' || id_nuevo, 'UTF8')), 'hex'), updated_at = now() where slug = s;
  insert into help_article_log (slug, sha256_old, sha256_new, action, by, reason)
  values (s, v.sha256, (select sha256 from help_articles where slug = s), 'edited', por, left(motivo || ' · ' || head, 300));
  return id_nuevo;
end $$;

-- Deshacer la edición viva de una sección: vuelve al texto de antes de ESA edición (sus trozos, partidos por el servidor).
create or replace function ayuda_deshacer(e bigint, trozos_viejos jsonb, por uuid, motivo text) returns void language plpgsql as $$
declare x help_edits; v help_articles;
begin
  select * into x from help_edits where id = e for update;
  if not found or x.status <> 'viva' then raise exception 'esa edición ya no está en uso'; end if;
  select * into v from help_articles where slug = x.slug for update;
  update help_edits set status = 'deshecha', ended_at = now(), ended_by = por, ended_reason = motivo where id = e;
  perform ayuda_rehacer_seccion(x.slug, x.lang, x.sec, trozos_viejos);
  update help_articles set sha256 = case when exists (select 1 from help_edits w where w.slug = x.slug and w.status = 'viva')
                                         then encode(sha256(convert_to(coalesce(v.repo_sha256, v.sha256) || ':-' || e, 'UTF8')), 'hex')
                                         else coalesce(v.repo_sha256, v.sha256) end, updated_at = now()
   where slug = x.slug;
  insert into help_article_log (slug, sha256_old, sha256_new, action, by, reason)
  values (x.slug, v.sha256, (select sha256 from help_articles where slug = x.slug), 'reverted', por, left(motivo || ' · ' || x.heading, 300));
end $$;

-- ── Indexar (lo llama el despliegue): igual que 0116, pero compara contra el sha del ARCHIVO (repo_sha256) para no pisar lo editado mientras
-- el repo no cambie; si cambió, el repo manda y las ediciones vivas se cierran («en_repo» si la sección nueva ya dice lo editado).
create or replace function ayuda_indexar(a jsonb) returns text language plpgsql as $$
declare v help_articles; s text := a->>'slug'; h text := a->>'sha256';
begin
  select * into v from help_articles where slug = s for update;
  if found and coalesce(v.repo_sha256, v.sha256) = h and v.status <> 'retired' then return 'igual'; end if;
  insert into help_articles (slug, title, audience, topic, screens, screens_text, version_label, sha256, repo_sha256, status, deployed_at, updated_at)
  values (s, a->'title', a->>'audience', a->>'topic', coalesce((select array_agg(x) from jsonb_array_elements_text(a->'screens') x), '{}'),
          coalesce(a->>'screens_text', ''), a->>'version', h, h, 'live', now(), now())
  on conflict (slug) do update set title = excluded.title, audience = excluded.audience, topic = excluded.topic, screens = excluded.screens,
    screens_text = excluded.screens_text, version_label = excluded.version_label, sha256 = excluded.sha256, repo_sha256 = excluded.repo_sha256,
    deployed_at = now(), updated_at = now(), status = case when help_articles.status = 'retired' then 'live' else help_articles.status end;
  -- Los trozos son derivados del archivo: se rehacen enteros.
  delete from help_chunks where slug = s;
  insert into help_chunks (slug, lang, ord, sec, nivel, title, heading, body, audience)
  select s, c->>'lang', (c->>'ord')::int, (c->>'sec')::int, (c->>'nivel')::smallint, a->'title'->>(c->>'lang'), c->>'heading', c->>'body',
         case when coalesce((c->>'equipo')::boolean, false) then 'equipo' else a->>'audience' end
    from jsonb_array_elements(a->'chunks') c;
  -- Lo editado en el Super Admin: si el repo ya dice lo mismo en esa sección (mismo idioma y encabezado), entró al repo; si no, lo reemplazó el repo.
  update help_edits e set ended_at = now(), ended_reason = 'el archivo cambió en el repo',
         status = case when ayuda_normal((select string_agg(c.body, ' ' order by c.ord) from help_chunks c where c.slug = s and c.lang = e.lang and c.heading = e.heading))
                            = ayuda_normal(e.body_new) then 'en_repo' else 'reemplazada' end
   where e.slug = s and e.status = 'viva';
  insert into help_article_log (slug, sha256_old, sha256_new, action, reason)
  values (s, v.sha256, h, 'indexed', case when v.slug is null then 'nuevo' when v.status = 'retired' then 'volvió al repo' else 'cambió' end);
  return case when v.slug is null then 'nuevo' else 'cambiado' end;
end $$;
