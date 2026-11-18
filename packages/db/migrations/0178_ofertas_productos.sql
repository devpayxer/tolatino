-- 0178 · 9n · Ofertas de productos en Mercado y Tienda (LAUNCH «Tachado en Mercado y Tienda»).
-- Hasta aquí una oferta de Novedades solo enlazaba platos de Comida (items.module = 'menu'): el menú y el pedido de comida cobraban
-- oferta_precio() y el tachado salía en la ficha. Ahora el dueño de un mercado o una tienda pone la oferta en un producto de su catálogo
-- (items.module = 'shop') desde el mismo editor, y el pedido del mercado y el apartado cobran el mismo oferta_precio() (lib/mercado.ts y
-- lib/apartados.ts; guardián ofertaProductoDelServidor). Lo que pone la base:
-- · oferta_precio(): solo para un artículo DEL MISMO NEGOCIO de la oferta que no se quitó, y nunca para un producto de 21+ (alcohol, tabaco, vape:
--   se compra en la tienda con ID y no se pide por la app). Lo que va por libra lleva su oferta POR LIBRA: el pedido guarda ese precio por libra y la
--   base cobra peso real × ese precio (operation_lines.final_cents, 0065), igual que sin oferta.
-- · business_posts_oferta_item: una oferta nueva (o una que cambia de artículo) enlaza un artículo de su negocio y nunca un producto de 21+. El
--   editor del panel solo ofrece platos (menu) y productos (shop); la semilla de demos sigue pudiendo enlazar servicios. Las filas que ya existen
--   no se tocan (nada se borra).
-- Idempotente: se puede aplicar dos veces.
begin;

create or replace function oferta_precio(item bigint, usr uuid) returns integer language sql stable as $$
  select min(p.price_now_cents) from business_posts p join items i on i.id = p.item_id
   where p.item_id = item and p.kind = 'oferta' and p.link_kind = 'item' and post_en_vivo(p)
     and i.business_id = p.business_id and i.removed_at is null and not (i.module = 'shop' and i.age_min > 0)
     and (p.audience = 'all' or (usr is not null and exists (select 1 from follows f where f.follower_user_id = usr and f.target_kind = 'business' and f.target_id = p.business_id)));
$$;

create or replace function business_posts_oferta_item() returns trigger language plpgsql as $$
begin
  if new.kind = 'oferta' and new.item_id is not null
     and (tg_op = 'INSERT' or new.item_id is distinct from old.item_id or new.kind is distinct from old.kind)
     and not exists (select 1 from items i where i.id = new.item_id and i.business_id = new.business_id and i.removed_at is null
                       and not (i.module = 'shop' and i.age_min > 0)) then
    raise exception 'oferta_item: una oferta enlaza un artículo de su negocio (nunca un producto de 21+)' using errcode = 'check_violation';
  end if;
  return new;
end $$;
drop trigger if exists business_posts_oferta_item on business_posts;
create trigger business_posts_oferta_item before insert or update of item_id, kind on business_posts for each row execute function business_posts_oferta_item();

commit;
