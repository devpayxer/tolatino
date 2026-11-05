-- 0010 · PhotoReport (modelo de datos §3): un vecino reporta una foto de un negocio. La foto sigue visible mientras
-- una persona de To'Latino la revisa (cola «Medios marcados», 4 h, Super Admin bloque 1i). Nada se borra: estados.
begin;

create table if not exists photo_reports (
  id               bigint generated always as identity primary key,
  media_id         uuid not null references media (id),
  reporter_user_id uuid not null references users (id),
  reason           text not null check (reason in ('no_es', 'inapropiado', 'datos', 'spam', 'otro')),
  note             text check (char_length(note) <= 200),
  status           text not null default 'open' check (status in ('open', 'removed', 'kept')),
  decided_by       uuid references users (id),
  decided_at       timestamptz,
  created_at       timestamptz not null default now(),
  unique (media_id, reporter_user_id)             -- una persona reporta una foto una sola vez
);
create index if not exists photo_reports_queue_idx on photo_reports (status, created_at);

commit;
