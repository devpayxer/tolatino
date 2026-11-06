-- 0021 · Analítica propia (HERRAMIENTAS §1, ADM-ANALIT): eventos de la app y actividad por día. Propio, en nuestra base:
-- nada sale a terceros. Sin datos personales en el evento (ni teléfono, ni nombre, ni IP): quién (cuenta o
-- dispositivo), qué (nombre de una lista cerrada), sobre qué (ref) y dónde (ciudad). Solo se agregan filas.
begin;

create table if not exists app_events (
  id      bigint generated always as identity primary key,
  at      timestamptz not null default now(),
  day     date not null default (now() at time zone 'America/New_York')::date,
  city_id text references cities (id),
  user_id uuid references users (id),
  device  uuid,
  name    text not null check (name in ('ver_categoria', 'ver_ficha', 'buscar', 'contactar', 'entrar', 'registrarse',
                                        'publicar_negocio', 'recomendar', 'reclamar', 'reportar_foto', 'pedir_aviso')),
  ref     text check (char_length(ref) <= 120),
  props   jsonb not null default '{}'::jsonb check (pg_column_size(props) <= 2000)
);
-- Lecturas por rango de fecha (BRIN: tabla que solo crece en orden) y por evento y día.
create index if not exists app_events_at_brin on app_events using brin (at);
create index if not exists app_events_nombre_idx on app_events (name, day);
create index if not exists app_events_user_idx on app_events (user_id, day) where user_id is not null;
create or replace function app_events_inmutable() returns trigger language plpgsql as $$
begin
  raise exception 'app_events es solo de inserción (% no permitido)', tg_op;
end $$;
drop trigger if exists app_events_no_cambia on app_events;
create trigger app_events_no_cambia before update on app_events for each row execute function app_events_inmutable();

-- Actividad por día (una fila por cuenta o dispositivo y día): activos y retención D1 / D7 / D30 sin recorrer eventos.
create table if not exists user_days (
  user_id uuid not null references users (id),
  day     date not null,
  city_id text references cities (id),
  primary key (user_id, day)
);
create index if not exists user_days_day_idx on user_days (day);
create table if not exists device_days (
  device  uuid not null,
  day     date not null,
  city_id text references cities (id),
  primary key (device, day)
);
create index if not exists device_days_day_idx on device_days (day);

commit;
