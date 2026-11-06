-- 0031 · Ayuda con el pedido (bloque 2i). Diseño «To'Latino Mi cuenta» (hoja help) y Super Admin (secSop): la persona
-- abre una solicitud sobre un pedido terminado (hasta 7 días después); el negocio responde en 24 h; si no responde, o si la
-- persona pide que To'Latino la revise, pasa a la cola «Ayuda con pedidos» y To'Latino la resuelve con un mensaje.
-- Hoy no hay devoluciones con tarjeta (todo se paga en el local): la resolución es un mensaje y lo que acuerden.
begin;

create sequence if not exists help_request_number_seq start 5001;
create table if not exists help_requests (
  id            bigint generated always as identity primary key,
  number        text not null unique,                                   -- H-5001…
  operation_id  bigint not null references operations (id),
  business_id   text not null references businesses (id),
  city_id       text not null references cities (id),
  user_id       uuid not null references users (id),
  reason        text not null check (reason in ('falta', 'equivocado', 'frio', 'danado', 'tarde', 'nollego', 'pago', 'otro')),
  items         jsonb not null default '[]'::jsonb,                      -- [{n: nombre, q}] los platos afectados
  wants         text not null default 'avisar' check (wants in ('reponer', 'devolver', 'avisar')),
  body          text check (char_length(body) <= 300),
  status        text not null default 'open' check (status in ('open', 'answered', 'escalated', 'resolved')),
  reply         text check (char_length(reply) <= 500),
  reply_at      timestamptz,
  reply_by      uuid references users (id),
  escalated_at  timestamptz,
  escalated_by  text check (escalated_by in ('user', 'system')),
  resolution    text check (char_length(resolution) <= 500),
  resolved_at   timestamptz,
  resolved_by   uuid references users (id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
-- Una solicitud por pedido (la persona la sigue en el mismo hilo).
create unique index if not exists help_requests_op_idx on help_requests (operation_id);
create index if not exists help_requests_negocio_idx on help_requests (business_id, status, created_at desc);
create index if not exists help_requests_user_idx on help_requests (user_id, created_at desc);
create index if not exists help_requests_vence_idx on help_requests (created_at) where status = 'open';

alter table queue_items drop constraint if exists queue_items_queue_check;
alter table queue_items add constraint queue_items_queue_check check (queue in ('sello', 'nuevo', 'lic', 'medios', 'rec', 'cambio', 'rep', 'sop'));
alter table queue_items drop constraint if exists queue_items_subject_kind_check;
alter table queue_items add constraint queue_items_subject_kind_check check (subject_kind in ('verification_request', 'business', 'license', 'media', 'recommendation', 'claim', 'sensitive_change', 'review', 'help_request'));

commit;
