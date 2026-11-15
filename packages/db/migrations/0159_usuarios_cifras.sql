-- 0159 · Fase 9 · 9n-9 — Super Admin › Usuarios: las cifras de cada persona (LAUNCH «Pestañas Actividad, Dinero y Comunidad y los KPI del
-- encabezado … la columna RANGO/ACTIVIDAD de la lista y los filtros «Con reportes», rango y «Promotores»»).
--
-- `user_stats_cache` es un DERIVADO (nunca se edita a mano): cuántos pedidos y citas mandó la persona y cuántos reportes recibió (a ella o a lo
-- que escribió en la Comunidad). Lo recalcula la base, por persona, cuando entra o cambia una operación suya o un reporte sobre ella: así la
-- lista ordena por «Más compras» o «Más reportes» con un índice, sin contar el millón de filas en cada vista. Más los índices que el 360°
-- necesita para su pestaña Dinero (los cobros de una persona) y para «Promotores» y «Rango». Idempotente.
begin;

create table if not exists user_stats_cache (
  user_id     uuid primary key references users (id),
  pedidos     integer not null default 0 check (pedidos >= 0),
  citas       integer not null default 0 check (citas >= 0),
  reportes    integer not null default 0 check (reportes >= 0),
  updated_at  timestamptz not null default now()
);
create index if not exists user_stats_pedidos_idx on user_stats_cache (pedidos desc, user_id) where pedidos > 0;
create index if not exists user_stats_reportes_idx on user_stats_cache (reportes desc, user_id) where reportes > 0;

-- Citas = lo que se agenda (cita, visita, inscripción); pedidos = lo demás que se compra o reserva. No cuentan los borradores. Las de una cuenta de
-- prueba sí cuentan aquí (son SUS cifras); los números de la plataforma (Analítica) las siguen dejando fuera.
create or replace function user_stats_refresh(uid uuid) returns void language sql as $$
  insert into user_stats_cache (user_id, pedidos, citas, reportes, updated_at)
  select uid,
         (select count(*)::int from operations o where o.user_id = uid and o.sent_at is not null
             and o.kind in ('order', 'market_order', 'hold', 'party', 'private_event', 'table', 'night', 'trip', 'tickets', 'rental', 'plan')),
         (select count(*)::int from operations o where o.user_id = uid and o.sent_at is not null and o.kind in ('appointment', 'visit', 'enrollment')),
         (select count(*)::int from content_reports x where (x.target_kind = 'user' and x.target_id = uid::text)
             or (x.target_kind = 'com_post' and x.target_id in (select p.id::text from com_posts p where p.author_user_id = uid))
             or (x.target_kind = 'com_comment' and x.target_id in (select c.id::text from com_comments c where c.author_user_id = uid))),
         now()
  on conflict (user_id) do update set pedidos = excluded.pedidos, citas = excluded.citas, reportes = excluded.reportes, updated_at = now();
$$;

create or replace function operations_user_stats() returns trigger language plpgsql as $$
begin
  if new.user_id is not null and new.sent_at is not null then perform user_stats_refresh(new.user_id); end if;
  if tg_op = 'UPDATE' and old.user_id is distinct from new.user_id and old.user_id is not null then perform user_stats_refresh(old.user_id); end if;
  return null;
end $$;
drop trigger if exists operations_user_stats on operations;
create trigger operations_user_stats after insert or update of sent_at, user_id, kind on operations
  for each row execute function operations_user_stats();

-- El dueño de lo reportado (la persona, o quien escribió la publicación o el comentario).
create or replace function content_reports_user_stats() returns trigger language plpgsql as $$
declare uid uuid;
begin
  uid := case new.target_kind
    when 'user' then (case when new.target_id ~ '^[0-9a-f-]{36}$' then new.target_id::uuid end)
    when 'com_post' then (select p.author_user_id from com_posts p where p.id::text = new.target_id)
    when 'com_comment' then (select c.author_user_id from com_comments c where c.id::text = new.target_id)
    else null end;
  if uid is not null then perform user_stats_refresh(uid); end if;
  return null;
end $$;
drop trigger if exists content_reports_user_stats on content_reports;
create trigger content_reports_user_stats after insert on content_reports for each row execute function content_reports_user_stats();

-- Al empezar: las personas con alguna operación o algún reporte.
select user_stats_refresh(u) from (select distinct user_id as u from operations where user_id is not null and sent_at is not null) z;
select user_stats_refresh(u) from (
  select (case when target_id ~ '^[0-9a-f-]{36}$' then target_id::uuid end) as u from content_reports where target_kind = 'user'
  union select p.author_user_id from content_reports x join com_posts p on p.id::text = x.target_id where x.target_kind = 'com_post'
  union select c.author_user_id from content_reports x join com_comments c on c.id::text = x.target_id where x.target_kind = 'com_comment') z
 where u is not null and exists (select 1 from users where id = z.u);

-- La pestaña Dinero del 360° (los cobros de una persona), «Promotores» y «Rango».
create index if not exists payments_usuario_idx on payments (user_id, created_at desc);
create index if not exists users_promotores_idx on users (created_at desc) where is_promoter;
create index if not exists community_profiles_rango_idx on community_profiles (rank_level desc, user_id);

commit;
