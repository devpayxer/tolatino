-- 9n-21 · Cupón para seguidores (LAUNCH L311; diseño: Novedades «Cupón para seguidores», el código se ve solo si sigues; demo SABOR3 −$3 desde $15;
-- el pago trae «Código de cupón» / «Aplicar» / «Quitar» y la línea «Cupón SABOR3 −$3.00»; modelo-datos «Coupon» kind code).
--   · Es una novedad del negocio (business_posts.kind = 'cupon') con código, descuento fijo, compra mínima y cuántos usos tiene en total. Vale mientras
--     la novedad está en vivo (publicada, sin terminar, sin ocultar).
--   · Solo para pedidos en línea de ESE negocio, solo para quien lo sigue, una vez por persona. Lo decide el servidor al crear el pedido (lib/cupones.ts):
--     el descuento lo pone el negocio (la comisión se calcula sobre lo que paga el cliente) y el impuesto se calcula sobre lo que queda.
--   · Cada uso queda en follower_coupon_uses (aparte de coupon_redemptions, los canjes con monedas de 5g) (solo inserción salvo su vuelta): si el pedido no sigue (rechazado, vencido o cancelado), el uso vuelve solo
--     (trigger en operations) y la persona lo puede usar otra vez.
-- Idempotente; nada se borra.

alter table business_posts drop constraint if exists business_posts_kind_check;
alter table business_posts add constraint business_posts_kind_check check (kind in ('oferta', 'hoy', 'aviso', 'encuesta', 'novedad', 'cupon'));
alter table business_posts add column if not exists coupon_code text check (coupon_code is null or coupon_code ~ '^[A-Z0-9]{4,12}$');
alter table business_posts add column if not exists coupon_off_cents integer check (coupon_off_cents is null or coupon_off_cents between 100 and 5000);
alter table business_posts add column if not exists coupon_min_cents integer check (coupon_min_cents is null or coupon_min_cents between 0 and 20000);
alter table business_posts add column if not exists coupon_uses integer check (coupon_uses is null or coupon_uses between 1 and 500);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'business_posts_cupon_completo') then
    alter table business_posts add constraint business_posts_cupon_completo check (kind <> 'cupon' or (coupon_code is not null and coupon_off_cents is not null
      and coupon_min_cents is not null and coupon_uses is not null and coupon_min_cents >= coupon_off_cents + 100 and ends_at is not null));
  end if;
end $$;
-- Un código vivo por negocio (el mismo código no puede valer dos descuentos a la vez).
create unique index if not exists business_posts_cupon_codigo on business_posts (business_id, coupon_code) where kind = 'cupon' and status <> 'removed';

alter table operations add column if not exists discount_cents integer not null default 0 check (discount_cents >= 0);
alter table operations add column if not exists coupon_post_id bigint references business_posts (id);

create table if not exists follower_coupon_uses (
  id            bigint generated always as identity primary key,
  post_id       bigint not null references business_posts (id),
  business_id   text not null references businesses (id),
  city_id       text not null references cities (id),
  user_id       uuid not null references users (id),
  operation_id  bigint not null unique references operations (id),
  code          text not null,
  off_cents     integer not null check (off_cents > 0),
  status        text not null default 'usado' check (status in ('usado', 'devuelto')),
  at            timestamptz not null default now(),
  returned_at   timestamptz,
  check ((status = 'devuelto') = (returned_at is not null))
);
create index if not exists follower_coupon_uses_post on follower_coupon_uses (post_id, status);
-- Una vez por persona (los devueltos no cuentan).
create unique index if not exists follower_coupon_uses_una_vez on follower_coupon_uses (post_id, user_id) where status = 'usado';

create or replace function follower_coupon_uses_solo_vuelta() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'follower_coupon_uses es solo de inserción'; end if;
  if old.status <> 'usado' or new.status <> 'devuelto' or new.post_id <> old.post_id or new.user_id <> old.user_id or new.operation_id <> old.operation_id
     or new.off_cents <> old.off_cents or new.code <> old.code then
    raise exception 'un uso de cupón solo puede volver (usado → devuelto)';
  end if;
  return new;
end $$;
drop trigger if exists follower_coupon_uses_solo_vuelta on follower_coupon_uses;
create trigger follower_coupon_uses_solo_vuelta before update or delete on follower_coupon_uses for each row execute function follower_coupon_uses_solo_vuelta();

-- El pedido que no sigue devuelve el uso (una sola vez): rechazado, vencido sin respuesta o cancelado.
create or replace function operations_cupon_vuelve() returns trigger language plpgsql as $$
begin
  if new.coupon_post_id is not null and new.status in ('declined', 'expired', 'cancelled') and old.status is distinct from new.status then
    update follower_coupon_uses set status = 'devuelto', returned_at = now() where operation_id = new.id and status = 'usado';
  end if;
  return new;
end $$;
drop trigger if exists operations_cupon_vuelve on operations;
create trigger operations_cupon_vuelve after update of status on operations for each row execute function operations_cupon_vuelve();
