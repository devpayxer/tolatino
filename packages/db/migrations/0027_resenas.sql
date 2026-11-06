-- 0027 · Reseñas (bloque 2g-1). Modelo de datos «Review · Reseña» y «Report»: una reseña por persona y negocio, se
-- publica al instante; verificada = viene de un pedido o una reservación terminada (operation_id); visitante = sin
-- compra (se marca). El negocio Pro responde (una respuesta, editable) pero no borra ni cambia la reseña; puede pedir
-- revisión a To'Latino. Nada se borra: el autor la «quita» (status = 'removed') y el equipo la oculta con motivo.
begin;

create table if not exists reviews (
  id             bigint generated always as identity primary key,
  business_id    text not null references businesses (id),
  city_id        text not null references cities (id),
  user_id        uuid not null references users (id),
  operation_id   bigint references operations (id),           -- verificada: el pedido o la mesa terminada
  src            text not null check (src in ('dl', 'pk', 'rsv', 'vis')),
  stars          smallint not null check (stars between 1 and 5),
  body           text not null check (char_length(body) between 20 and 1000),
  lang           text not null default 'es' check (lang in ('es', 'en')),
  answers        jsonb not null default '{}'::jsonb,          -- lo que eligió: taste, hot, wait, val (-1|0|1, a|b|c)
  facts          jsonb not null default '{}'::jsonb,          -- del pedido, no se edita: promised, done, late
  rec            text[] not null default '{}',                -- platos que recomienda (ids de items)
  helpful_count  integer not null default 0,                  -- derivado de review_helpful
  reply          text check (char_length(reply) between 5 and 300),
  reply_at       timestamptz,
  reply_by       uuid references users (id),
  review_state   text check (review_state in ('disp', 'kept')),  -- el negocio pidió revisarla → To'Latino la mantuvo
  review_state_at timestamptz,
  status         text not null default 'visible' check (status in ('visible', 'hidden', 'removed')),
  hidden_reason  text,
  hidden_by      uuid references users (id),
  hidden_at      timestamptz,
  created_at     timestamptz not null default now(),
  edited_at      timestamptz
);
-- Una reseña viva por persona y negocio; una sola por pedido.
create unique index if not exists reviews_una_idx on reviews (user_id, business_id) where status <> 'removed';
create unique index if not exists reviews_op_idx on reviews (operation_id) where operation_id is not null and status <> 'removed';
create index if not exists reviews_negocio_idx on reviews (business_id, status, created_at desc);
create index if not exists reviews_usuario_idx on reviews (user_id, created_at desc);

-- «Útil»: una marca por persona; el conteo vive en reviews.helpful_count (se ajusta en la misma transacción).
create table if not exists review_helpful (
  review_id  bigint not null references reviews (id),
  user_id    uuid not null references users (id),
  created_at timestamptz not null default now(),
  primary key (review_id, user_id)
);

-- Reportes de contenido (modelo «Report»): reseñas ahora; novedades y comentarios después. Uno por persona y cosa.
-- by_business = el negocio pidió revisar una reseña suya. Nada se borra: se decide (actioned = se ocultó, dismissed = se queda).
create table if not exists content_reports (
  id               bigint generated always as identity primary key,
  target_kind      text not null check (target_kind in ('review')),
  target_id        text not null,
  business_id      text references businesses (id),
  city_id          text references cities (id),
  reporter_user_id uuid not null references users (id),
  by_business      boolean not null default false,
  reason           text not null check (reason in ('fake', 'off', 'pii', 'spam', 'coi', 'otro', 'negocio')),
  note             text check (char_length(note) <= 300),
  status           text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  decided_by       uuid references users (id),
  decided_at       timestamptz,
  created_at       timestamptz not null default now()
);
create unique index if not exists content_reports_uno_idx on content_reports (target_kind, target_id, reporter_user_id);
create index if not exists content_reports_abiertos_idx on content_reports (target_kind, target_id) where status = 'open';
create index if not exists content_reports_quien_idx on content_reports (reporter_user_id, created_at desc);

-- Fotos de la reseña: media con owner_kind 'review' (hasta 6). Al publicar pasan de la persona a la reseña.

-- Cola «Reportes de contenido» (adm-data QUEUES rep: 24 h).
alter table queue_items drop constraint if exists queue_items_queue_check;
alter table queue_items add constraint queue_items_queue_check check (queue in ('sello', 'nuevo', 'lic', 'medios', 'rec', 'cambio', 'rep'));
alter table queue_items drop constraint if exists queue_items_subject_kind_check;
alter table queue_items add constraint queue_items_subject_kind_check
  check (subject_kind in ('verification_request', 'business', 'license', 'media', 'recommendation', 'claim', 'sensitive_change', 'review'));

-- ★ y conteo de la ficha: derivados de las reseñas visibles (modelo: «De las reseñas visibles»). Lo llama el servidor
-- en la misma transacción que cambia una reseña; nadie los edita a mano.
create or replace function reviews_stats(biz text) returns void language sql as $$
  insert into business_stats_cache (business_id, rating_avg, review_count)
  select biz, round(avg(stars)::numeric, 1), count(*)::int from reviews where business_id = biz and status = 'visible'
  on conflict (business_id) do update set rating_avg = excluded.rating_avg, review_count = excluded.review_count, updated_at = now();
$$;

commit;
