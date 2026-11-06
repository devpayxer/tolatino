-- 0041 · Correo (bloque 2q; PLAN §8: plantillas e historial propios, envío por SES). Todo correo pasa por la bandeja de
-- salida `email_outbox` (historial: nada se borra). En el sandbox no sale: queda «en modo pruebas» y se ve en el Super
-- Admin. Verificar el correo: un enlace de un solo uso (se guarda solo el hash), válido 24 horas.
begin;

create table if not exists email_outbox (
  id           bigint generated always as identity primary key,
  user_id      uuid references users (id),
  city_id      text references cities (id),
  to_email     citext not null,
  tpl          text not null check (tpl in ('verify', 'receipt_order', 'receipt_table', 'receipt_pro')),
  subject      text not null check (char_length(subject) <= 200),
  html         text not null,
  text_body    text not null,
  ref_kind     text,
  ref_id       text,
  idem_key     text unique,                                         -- un recibo por pedido: no se manda dos veces
  status       text not null default 'pendiente' check (status in ('pruebas', 'pendiente', 'enviado', 'fallo', 'sin_proveedor')),
  provider_id  text,
  error        text check (char_length(error) <= 300),
  attempts     integer not null default 0,
  created_at   timestamptz not null default now(),
  sent_at      timestamptz
);
create index if not exists email_outbox_user_idx on email_outbox (user_id, id desc);
create index if not exists email_outbox_status_idx on email_outbox (status, id) where status in ('pendiente', 'fallo');
create index if not exists email_outbox_dia_idx on email_outbox (created_at desc);

create table if not exists email_verifications (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references users (id),
  email       citext not null,
  token_hash  text not null unique,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists email_verifications_user_idx on email_verifications (user_id, created_at desc);

commit;
