-- 0028 · Novedades (bloque 2g-2). Modelo «BusinessPost · Novedad» + Vote / PollVote / Comment con target business_post.
-- Solo Pro. Una publicación: oferta (precio especial en algo que vende: se cobra de verdad mientras está en vivo), hoy hay,
-- aviso de horario, encuesta o novedad; fotos (media owner_kind 'post', hasta 4); botón (algo que vende, menú, llamar,
-- enlace web https); quién la ve (todos o solo seguidores); cuándo sale (ahora o programada) y cuándo vence.
-- Estados: en vivo / programada / terminada se derivan de publish_at, ends_at y status; nada se borra (removed).
begin;

create table if not exists business_posts (
  id               bigint generated always as identity primary key,
  business_id      text not null references businesses (id),
  city_id          text not null references cities (id),
  kind             text not null check (kind in ('oferta', 'hoy', 'aviso', 'encuesta', 'novedad')),
  title            text not null check (char_length(title) between 3 and 60),
  body             text not null default '' check (char_length(body) <= 280),
  link_kind        text not null default 'none' check (link_kind in ('none', 'item', 'menu', 'tel', 'web')),
  item_id          bigint references items (id),
  url              text check (url is null or (url ~ '^https://' and char_length(url) <= 200)),
  price_was_cents  integer check (price_was_cents is null or price_was_cents > 0),
  price_now_cents  integer check (price_now_cents is null or price_now_cents > 0),
  aviso            jsonb,                                   -- {day, hrs: closed|late|early|ext, hrsT}
  poll             text[] check (poll is null or (cardinality(poll) between 2 and 4)),
  audience         text not null default 'all' check (audience in ('all', 'fol')),
  publish_at       timestamptz not null default now(),
  ends_at          timestamptz,
  status           text not null default 'live' check (status in ('live', 'stopped', 'removed')),
  stopped_at       timestamptz,
  pinned           boolean not null default false,
  hidden_reason    text,                                    -- oculta por To'Latino (con motivo)
  hidden_by        uuid references users (id),
  hidden_at        timestamptz,
  created_by       uuid references users (id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (kind <> 'oferta' or (price_now_cents is not null and price_was_cents is not null and price_now_cents < price_was_cents)),
  check (kind <> 'encuesta' or poll is not null)
);
create index if not exists business_posts_negocio_idx on business_posts (business_id, status, publish_at desc);
create index if not exists business_posts_ciudad_idx on business_posts (city_id, publish_at desc) where status = 'live' and hidden_at is null;
create index if not exists business_posts_item_idx on business_posts (item_id) where kind = 'oferta' and status = 'live';
-- Una fijada a la vez por negocio.
create unique index if not exists business_posts_fijada_idx on business_posts (business_id) where pinned and status <> 'removed';

create table if not exists post_votes (
  post_id    bigint not null references business_posts (id),
  user_id    uuid not null references users (id),
  v          smallint not null check (v in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create table if not exists post_poll_votes (
  post_id    bigint not null references business_posts (id),
  user_id    uuid not null references users (id),
  opt        smallint not null check (opt between 0 and 3),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create table if not exists post_saves (
  post_id    bigint not null references business_posts (id),
  user_id    uuid not null references users (id),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
-- Vistas: una por persona (o dispositivo) y día; el conteo es derivado.
create table if not exists post_views (
  post_id    bigint not null references business_posts (id),
  viewer     text not null,
  day        date not null default current_date,
  primary key (post_id, viewer, day)
);
create table if not exists post_comments (
  id         bigint generated always as identity primary key,
  post_id    bigint not null references business_posts (id),
  user_id    uuid not null references users (id),
  body       text not null check (char_length(body) between 1 and 300),
  reply      text check (char_length(reply) between 1 and 280),
  reply_at   timestamptz,
  reply_by   uuid references users (id),
  status     text not null default 'visible' check (status in ('visible', 'hidden', 'removed')),
  created_at timestamptz not null default now()
);
create index if not exists post_comments_post_idx on post_comments (post_id, created_at);
create table if not exists post_comment_votes (
  comment_id bigint not null references post_comments (id),
  user_id    uuid not null references users (id),
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

-- ¿Una publicación sale ahora? (en vivo, ya publicada, sin vencer, no oculta, negocio Pro con Novedades encendido por el
-- dueño y sin pausa de To'Latino).
create or replace function post_en_vivo(p business_posts) returns boolean language sql stable as $$
  select p.status = 'live' and p.hidden_at is null and p.publish_at <= now() and (p.ends_at is null or p.ends_at > now())
     and exists (select 1 from businesses b join business_stats_cache s on s.business_id = b.id
                  where b.id = p.business_id and b.status = 'active' and s.plan = 'pro' and 'nov' = any(b.modules_on) and not (b.modules_off ? 'nov'));
$$;

-- Precio de oferta de un plato para una persona (null = no hay oferta). Lo usan el menú y el pedido: se cobra lo anunciado.
create or replace function oferta_precio(item bigint, usr uuid) returns integer language sql stable as $$
  select min(p.price_now_cents) from business_posts p
   where p.item_id = item and p.kind = 'oferta' and p.link_kind = 'item' and post_en_vivo(p)
     and (p.audience = 'all' or (usr is not null and exists (select 1 from follows f where f.follower_user_id = usr and f.target_kind = 'business' and f.target_id = p.business_id)));
$$;

-- Comentarios reportados (más adelante) y el Super Admin: la cola «Reportes de contenido» también acepta novedades.
alter table content_reports drop constraint if exists content_reports_target_kind_check;
alter table content_reports add constraint content_reports_target_kind_check check (target_kind in ('review', 'post', 'comment'));

commit;
