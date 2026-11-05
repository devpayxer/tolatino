-- 0007 · Super Admin: equipo, roles y matriz de permisos (modelo de datos §13; plan admin-dashboard.md §5).
-- Una sola cuenta (users) + fila en staff_members = es del equipo. Los permisos se revisan SIEMPRE en el servidor.
begin;

create table if not exists staff_roles (
  key   text primary key,
  name  jsonb not null,
  descr jsonb,
  sort  smallint not null
);

create table if not exists staff_members (
  user_id    uuid primary key references users (id),
  role       text not null references staff_roles (key),
  cities     text[] not null default '{}',          -- vacío = todas
  status     text not null default 'active' check (status in ('active', 'paused', 'removed')),
  added_by   uuid references users (id),
  added_at   timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Secciones del Super Admin (admin-implementacion.md §4) y acciones de la matriz (patrón 2am).
create table if not exists admin_sections (
  key   text primary key,
  name  jsonb not null,
  grp   text not null check (grp in ('operar', 'contenido', 'dinero', 'control')),
  icon  text not null,
  sort  smallint not null
);

create table if not exists role_permissions (
  role    text not null references staff_roles (key),
  section text not null references admin_sections (key),
  action  text not null check (action in ('ver', 'editar', 'aprobar', 'retirar', 'exportar')),
  allowed boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references users (id),
  primary key (role, section, action)
);

insert into staff_roles (key, name, descr, sort) values
  ('admin',       '{"es":"Admin","en":"Admin"}', '{"es":"Ve y hace todo: equipo, planes, ciudades, interruptores.","en":"Sees and does everything."}', 1),
  ('ciudad',      '{"es":"Ciudad manager","en":"City manager"}', '{"es":"Su ciudad: negocios, contenido, eventos, destacados, campañas locales.","en":"Their city."}', 2),
  ('verificador', '{"es":"Verificador","en":"Verifier"}', '{"es":"Cola del sello y negocios nuevos.","en":"Seal queue and new businesses."}', 3),
  ('moderador',   '{"es":"Moderador de contenido","en":"Content moderator"}', '{"es":"Comunidad, reseñas, medios, reportes; sanciona hasta suspender.","en":"Community, reviews, media, reports."}', 4),
  ('soporte',     '{"es":"Soporte","en":"Support"}', '{"es":"Usuarios, negocios, operaciones y tickets; devuelve hasta un monto.","en":"Users, businesses, operations, tickets."}', 5),
  ('finanzas',    '{"es":"Finanzas","en":"Finance"}', '{"es":"Pagos, payouts, suscripciones, comisiones.","en":"Payments, payouts, subscriptions."}', 6),
  ('lectura',     '{"es":"Solo lectura","en":"Read only"}', '{"es":"Analítica y listados; no cambia nada.","en":"Analytics and lists; changes nothing."}', 7)
on conflict (key) do update set name = excluded.name, descr = excluded.descr, sort = excluded.sort;

insert into admin_sections (key, name, grp, icon, sort) values
  ('home',   '{"es":"Inicio","en":"Home"}', 'operar', 'home', 1),
  ('colas',  '{"es":"Colas","en":"Queues"}', 'operar', 'bell', 2),
  ('usr',    '{"es":"Usuarios","en":"Users"}', 'operar', 'users', 3),
  ('neg',    '{"es":"Negocios","en":"Businesses"}', 'operar', 'store', 4),
  ('tx',     '{"es":"Transacciones","en":"Transactions"}', 'operar', 'card', 5),
  ('sop',    '{"es":"Soporte","en":"Support"}', 'operar', 'help', 6),
  ('cat',    '{"es":"Catálogo","en":"Catalog"}', 'contenido', 'grid', 7),
  ('cont',   '{"es":"Contenido","en":"Content"}', 'contenido', 'news', 8),
  ('evt',    '{"es":"Eventos y boletos","en":"Events & tickets"}', 'contenido', 'ticket', 9),
  ('ciud',   '{"es":"Ciudades","en":"Cities"}', 'contenido', 'pin', 10),
  ('plan',   '{"es":"Planes y suscripciones","en":"Plans"}', 'dinero', 'wallet', 11),
  ('mkt',    '{"es":"Crecimiento","en":"Growth"}', 'dinero', 'bolt', 12),
  ('notif',  '{"es":"Notificaciones","en":"Notifications"}', 'dinero', 'bell', 13),
  ('gam',    '{"es":"Gamification","en":"Gamification"}', 'dinero', 'star', 14),
  ('conf',   '{"es":"Confianza y seguridad","en":"Trust & safety"}', 'control', 'shield', 15),
  ('analit', '{"es":"Analítica","en":"Analytics"}', 'control', 'filter', 16),
  ('cms',    '{"es":"Textos y páginas","en":"Copy & pages"}', 'control', 'edit', 17),
  ('sys',    '{"es":"Sistema","en":"System"}', 'control', 'key', 18)
on conflict (key) do update set name = excluded.name, grp = excluded.grp, icon = excluded.icon, sort = excluded.sort;

-- Matriz inicial (plan §5). Solo se siembra lo que falta: lo que el Admin cambió en la matriz se respeta.
with def(role, sections, actions) as (values
  ('admin',       '{home,colas,usr,neg,tx,sop,cat,cont,evt,ciud,plan,mkt,notif,gam,conf,analit,cms,sys}'::text[], '{ver,editar,aprobar,retirar,exportar}'::text[]),
  ('ciudad',      '{home,colas,neg,cont,evt,ciud,mkt}', '{ver,editar,aprobar}'),
  ('ciudad',      '{usr,tx,cat,analit}', '{ver}'),
  ('verificador', '{home,colas,neg}', '{ver,aprobar}'),
  ('verificador', '{usr}', '{ver}'),
  ('moderador',   '{cont,conf}', '{ver,editar,aprobar,retirar}'),
  ('moderador',   '{home,colas}', '{ver,aprobar}'),
  ('moderador',   '{usr,neg}', '{ver}'),
  ('soporte',     '{sop,usr}', '{ver,editar}'),
  ('soporte',     '{home,colas,neg,tx}', '{ver}'),
  ('finanzas',    '{tx,plan}', '{ver,editar,aprobar,exportar}'),
  ('finanzas',    '{home,neg,usr}', '{ver}'),
  ('finanzas',    '{analit}', '{ver,exportar}'),
  ('lectura',     '{home,usr,neg,tx,cat,ciud,analit}', '{ver}')
)
insert into role_permissions (role, section, action, allowed)
select d.role, s, a, true from def d, unnest(d.sections) s, unnest(d.actions) a
on conflict (role, section, action) do nothing;
-- Lo que no está en la tabla de arriba existe como «no permitido» para que la matriz lo muestre.
insert into role_permissions (role, section, action, allowed)
select r.key, s.key, a, false from staff_roles r, admin_sections s, unnest('{ver,editar,aprobar,retirar,exportar}'::text[]) a
on conflict (role, section, action) do nothing;

commit;
