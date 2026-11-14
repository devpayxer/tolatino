-- 0135 · Fase 9 · 9e · Legales por estado y aceptación de términos (docs/diseno/plan/fase9-apertura.md §2 «0135 legales», §3.6, §4 9e; D-AB).
-- EL REPO ES LA FUENTE, como la ayuda: docs/legal/{jurisdicción}/{clave}.{es,en}.md → scripts/legal/indexar.mjs → legal_indexar(). Estas tablas
-- son el índice con sus versiones; el texto se corrige en el repo. El Super Admin (Textos y páginas › Páginas) marca la revisión del abogado,
-- publica una versión con su motivo (y, si hace falta, pide aceptar otra vez) o la retira. Nada se borra.
-- · legal_pages: una fila por versión de una página (clave + jurisdicción + versión) con su texto ES/EN (title, lead, body_md, summary_md = «lo que
--   cambió», tres líneas como máximo), su sha256 (los dos archivos juntos), de dónde sale (source_path) y su estado: borrador → revisado (con
--   reviewed_by_counsel: el despacho y la fecha) → publicado (con quién, cuándo y por qué; effective_at; force_accept) · retirado. El texto de una
--   versión no cambia nunca: un cambio en el repo es una versión nueva.
--   · jurisdiction: «us» (general) y «us-pa» (la adenda de Pennsylvania); un estado nuevo es una carpeta más (us-nj, us-ny).
--   · force_accept: solo Términos y Privacidad (lo que se acepta); pide aceptar otra vez a quien entra después de effective_at (la hoja de 9e).
--   · EN PRODUCCIÓN, una página no se publica sin reviewed_by_counsel (la base lo impide; guardián legalRevisado). La base sabe que es el sandbox
--     solo si platform_config «entorno» dice «pruebas» (lo pone la semilla del sandbox, que nunca corre en producción): sin esa fila, se comporta
--     como producción (falla cerrada).
-- · legal_page_log (SOLO INSERCIÓN): indexada, revisada, publicada y retirada, con quién y su motivo.
-- · legal_acceptances (SOLO INSERCIÓN): quién aceptó qué versión de qué página, cuándo, desde qué app y por qué camino (la hoja, Publica tu
--   negocio, el primer pedido); para un negocio, también su business_id. Una vez por persona, negocio y versión (aceptar dos veces no anota otra
--   fila). TermsAcceptance de modelo-datos.md L813.
-- · users.legal_state: el estado de residencia declarado (vacío = el de su ciudad; las cinco están en PA). Decide la adenda que se ve.
-- Idempotente: se puede aplicar dos veces.
begin;

-- ── El entorno de la base (falla cerrada: sin la fila de la semilla del sandbox, es producción) ──
create or replace function legal_entorno() returns text language sql stable as $$
  select coalesce((select value #>> '{}' from platform_config where key = 'entorno'), 'produccion')
$$;

-- ── Las versiones ──
create table if not exists legal_pages (
  id                  bigint generated always as identity primary key,
  key                 text not null check (key in ('terminos', 'privacidad', 'cookies', 'reglas', 'verificamos', 'votos', 'seguridad', 'ia', 'dmca', 'vivienda-justa', 'accesibilidad')),
  jurisdiction        text not null check (jurisdiction ~ '^us(-[a-z]{2})?$'),
  version             integer not null check (version >= 1),
  title               jsonb not null check (title ? 'es' and title ? 'en'),
  lead                jsonb not null check (lead ? 'es' and lead ? 'en'),
  body_md             jsonb not null check (body_md ? 'es' and body_md ? 'en'),
  summary_md          jsonb not null check (summary_md ? 'es' and summary_md ? 'en'),
  text_date           text not null check (text_date ~ '^\d{1,2} (ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic) \d{4}$'),
  sha256              text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  source_path         text not null check (source_path ~ '^docs/legal/us(-[a-z]{2})?/[a-z-]+\.\{es,en\}\.md$'),
  status              text not null default 'borrador' check (status in ('borrador', 'revisado', 'publicado', 'retirado')),
  reviewed_by_counsel text check (char_length(reviewed_by_counsel) between 3 and 200),
  reviewed_at         date,
  reviewed_by         uuid references users (id),
  effective_at        timestamptz,
  force_accept        boolean not null default false,
  published_by        uuid references users (id),
  published_at        timestamptz,
  publish_reason      text check (char_length(publish_reason) between 3 and 500),
  retired_at          timestamptz,
  created_at          timestamptz not null default now(),
  unique (key, jurisdiction, version),
  check (status <> 'revisado' or (reviewed_by_counsel is not null and reviewed_at is not null)),
  check (status <> 'publicado' or (published_by is not null and published_at is not null and publish_reason is not null and effective_at is not null)),
  check (not force_accept or key in ('terminos', 'privacidad')),
  check (status <> 'retirado' or retired_at is not null)
);
create index if not exists legal_pages_vigente_idx on legal_pages (key, jurisdiction, version desc) where status <> 'retirado';
create index if not exists legal_pages_forzar_idx on legal_pages (key, jurisdiction, version desc) where status = 'publicado' and force_accept;

create or replace function legal_pages_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'una página legal no se borra: se retira (estados)'; end if;
  if tg_op = 'INSERT' then
    -- Una versión nace borrador: la revisión y la publicación las hace el equipo después, en el Super Admin.
    new.status := 'borrador'; new.reviewed_by_counsel := null; new.reviewed_at := null; new.reviewed_by := null; new.effective_at := null;
    new.force_accept := false; new.published_by := null; new.published_at := null; new.publish_reason := null; new.retired_at := null;
    new.created_at := now();
    return new;
  end if;
  if (new.key, new.jurisdiction, new.version, new.title, new.lead, new.body_md, new.summary_md, new.text_date, new.sha256, new.source_path, new.created_at)
     is distinct from (old.key, old.jurisdiction, old.version, old.title, old.lead, old.body_md, old.summary_md, old.text_date, old.sha256, old.source_path, old.created_at) then
    raise exception 'el texto de una versión legal no cambia: un cambio en el repo es una versión nueva';
  end if;
  if old.status = 'retirado' and new.status is distinct from old.status then raise exception 'una versión retirada no vuelve'; end if;
  if old.status = 'publicado' and new.status not in ('publicado', 'retirado') then raise exception 'una versión publicada solo se retira'; end if;
  if old.status = 'publicado' and (new.effective_at, new.force_accept, new.published_by, new.published_at, new.publish_reason)
     is distinct from (old.effective_at, old.force_accept, old.published_by, old.published_at, old.publish_reason) then
    raise exception 'lo publicado (fecha, quién, motivo, aceptar otra vez) no cambia';
  end if;
  if old.reviewed_by_counsel is not null and (new.reviewed_by_counsel, new.reviewed_at) is distinct from (old.reviewed_by_counsel, old.reviewed_at) then
    raise exception 'la revisión del abogado de una versión no cambia';
  end if;
  if new.status = 'publicado' and old.status <> 'publicado' then
    -- legalRevisado: en producción, nada se publica sin la revisión del abogado.
    if new.reviewed_by_counsel is null and legal_entorno() <> 'pruebas' then
      raise exception 'legal_revisado: en producción una página legal no se publica sin reviewed_by_counsel';
    end if;
    if new.effective_at is null then new.effective_at := now(); end if;
  end if;
  if new.force_accept and not old.force_accept and new.status <> 'publicado' then raise exception 'pedir aceptar otra vez es parte de publicar'; end if;
  if new.status = 'retirado' and old.status <> 'retirado' then new.retired_at := now(); end if;
  return new;
end $$;
drop trigger if exists legal_pages_antes on legal_pages;
create trigger legal_pages_antes before insert or update or delete on legal_pages for each row execute function legal_pages_antes();

-- ── El libro (solo inserción) ──
create table if not exists legal_page_log (
  id      bigint generated always as identity primary key,
  page_id bigint not null references legal_pages (id),
  action  text not null check (action in ('indexada', 'revisada', 'publicada', 'retirada')),
  by      uuid references users (id),                    -- null = el despliegue
  reason  text check (char_length(reason) <= 500),
  at      timestamptz not null default now(),
  check (action = 'indexada' or (by is not null and reason is not null))
);
create index if not exists legal_page_log_pagina_idx on legal_page_log (page_id, at desc);
create or replace function legal_solo_insercion() returns trigger language plpgsql as $$
begin raise exception '% es solo de inserción', tg_table_name; end $$;
drop trigger if exists legal_page_log_no_cambia on legal_page_log;
create trigger legal_page_log_no_cambia before update or delete on legal_page_log for each row execute function legal_solo_insercion();

-- ── Las aceptaciones (solo inserción) ──
create table if not exists legal_acceptances (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references users (id),           -- quién aceptó (siempre una persona)
  business_id  text references businesses (id),              -- y, si aceptó por su negocio, cuál
  page_key     text not null,
  jurisdiction text not null,
  version      integer not null,
  city_id      text references cities (id),
  via          text not null check (via in ('hoja', 'publica', 'primer_pedido')),
  app          text not null default 'web' check (app in ('web', 'cliente', 'negocio', 'delivery', 'checkin')),
  ip_hash      text check (ip_hash ~ '^[0-9a-f]{64}$'),
  accepted_at  timestamptz not null default now(),
  foreign key (page_key, jurisdiction, version) references legal_pages (key, jurisdiction, version)
);
create unique index if not exists legal_acceptances_una_vez on legal_acceptances (user_id, coalesce(business_id, ''), page_key, jurisdiction, version);
create index if not exists legal_acceptances_version_idx on legal_acceptances (page_key, jurisdiction, version);

create or replace function legal_acceptances_antes() returns trigger language plpgsql as $$
declare st text;
begin
  if tg_op <> 'INSERT' then raise exception 'legal_acceptances es solo de inserción'; end if;
  select status into st from legal_pages where key = new.page_key and jurisdiction = new.jurisdiction and version = new.version;
  -- Se acepta lo que se ve: lo publicado; en el sandbox, también el borrador o la versión revisada que se muestra mientras nada está publicado.
  if st is null or st = 'retirado' or (st <> 'publicado' and legal_entorno() <> 'pruebas') then
    raise exception 'esa versión no se puede aceptar (%)', coalesce(st, 'no existe');
  end if;
  new.accepted_at := now();
  new.city_id := coalesce(new.city_id, (select home_city_id from users where id = new.user_id));
  return new;
end $$;
drop trigger if exists legal_acceptances_antes on legal_acceptances;
create trigger legal_acceptances_antes before insert or update or delete on legal_acceptances for each row execute function legal_acceptances_antes();

-- ── El estado de residencia (vacío = el de su ciudad) ──
alter table users add column if not exists legal_state text;
alter table users drop constraint if exists users_legal_state_check;
alter table users add constraint users_legal_state_check check (legal_state is null or legal_state ~ '^[A-Z]{2}$');

-- ── Indexar (lo llama el despliegue) ──
-- a = { key, jurisdiction, title {es,en}, lead {es,en}, body {es,en}, summary {es,en}, text_date, sha256, source_path }
-- Igual a la última versión viva (mismo sha256) → 'igual'. Si no, una versión NUEVA (borrador): el texto de una versión nunca cambia.
create or replace function legal_indexar(a jsonb) returns text language plpgsql as $$
declare v legal_pages; n integer; nid bigint;
begin
  perform pg_advisory_xact_lock(hashtext('legal:' || (a->>'key') || ':' || (a->>'jurisdiction')));
  select * into v from legal_pages where key = a->>'key' and jurisdiction = a->>'jurisdiction' and status <> 'retirado' order by version desc limit 1;
  if found and v.sha256 = a->>'sha256' then return 'igual'; end if;
  select coalesce(max(version), 0) + 1 into n from legal_pages where key = a->>'key' and jurisdiction = a->>'jurisdiction';
  insert into legal_pages (key, jurisdiction, version, title, lead, body_md, summary_md, text_date, sha256, source_path)
  values (a->>'key', a->>'jurisdiction', n, a->'title', a->'lead', a->'body', a->'summary', a->>'text_date', a->>'sha256', a->>'source_path')
  returning id into nid;
  insert into legal_page_log (page_id, action, reason) values (nid, 'indexada', case when v.id is null then 'nueva' else 'cambió en el repo (antes v' || v.version || ')' end);
  return case when v.id is null then 'nueva' else 'cambiada' end;
end $$;

-- Lo que ya no está en el repo: sus borradores y versiones revisadas sin publicar quedan retirados. Lo publicado sigue (lo retira el equipo).
create or replace function legal_retirar(vivas text[]) returns integer language plpgsql as $$
declare n integer := 0; r record;
begin
  for r in select id from legal_pages where status in ('borrador', 'revisado') and (key || '|' || jurisdiction) <> all(vivas) for update loop
    update legal_pages set status = 'retirado' where id = r.id;
    insert into legal_page_log (page_id, action, reason) values (r.id, 'indexada', 'ya no está en docs/legal: retirada');
    n := n + 1;
  end loop;
  return n;
end $$;

-- ── La versión vigente (la que se ve y la que se acepta) ──
-- Lo publicado y en vigor; en el sandbox, si nada se publicó todavía, la última versión viva (borrador o revisada).
create or replace function legal_vigente(k text, j text) returns legal_pages language sql stable as $$
  select p.* from legal_pages p
   where p.key = k and p.jurisdiction = j
     and ((p.status = 'publicado' and p.effective_at <= now())
          or (p.status in ('borrador', 'revisado') and legal_entorno() = 'pruebas'
              and not exists (select 1 from legal_pages x where x.key = k and x.jurisdiction = j and x.status = 'publicado' and x.effective_at <= now())))
   order by (p.status = 'publicado') desc, p.version desc
   limit 1
$$;

commit;
