-- 0177 · 9n · El envío del mercado con el repartidor (LAUNCH «Envío del mercado con repartidor propio en /repartidor»).
-- Hasta aquí el Repartidor (2l, 8e, 9n: oferta, ruta en vivo, código de recogida, prueba de entrega; triggers de 0128 y 0144) solo llevaba pedidos de
-- comida (operations kind 'order'). Ahora también el pedido del mercado con envío (kind 'market_order', mode 'delivery') cuando el mercado lo marca
-- «Está listo» después de pesar (4p · 9n-4): se ofrece o se asigna a los repartidores del mercado igual que un pedido de comida, el repartidor lo
-- recoge con el código, el cliente lo ve en el mapa desde «Recogí», y lo real se cobra al «Entregado» del repartidor (lib/mercado.ts liquidarMercado,
-- idempotente: solo toca cobros retenidos). Lo que pone la base:
-- · delivery_codes: el pedido del mercado con envío también recibe sus dos códigos al aceptarse (operations_codigos).
-- · operations_prueba: un pedido del mercado con repartidor no se cierra («done») sin la prueba DE ESE repartidor (foto o el código del cliente),
--   pida o no prueba el mercado: el cobro de lo real pasa en ese momento y es la evidencia si el cliente reclama. El mercado no lo cierra él mismo
--   mientras el repartidor lo tiene (si no puede terminarlo, el mercado le quita el pedido y lo termina como antes).
-- · ruta_activa y operations_ruta: la ruta en vivo vale para los dos tipos (la posición se rechaza igual si la entrega no está activa).
-- · Avisos al cliente del mercado: «Tu repartidor llegó» y «Tu pedido llegó» (con el número M-… sin «#»).
-- Idempotente: se puede aplicar dos veces. Nada se borra.
begin;

-- ── Códigos de recogida y del cliente ──
create or replace function operations_codigos() returns trigger language plpgsql as $$
begin
  if new.kind in ('order', 'market_order') and coalesce(new.mode, 'pickup') = 'delivery' and new.status = 'confirmed' then
    insert into delivery_codes (operation_id, city_id, cliente, recogida) values (new.id, new.city_id, codigo4(), codigo4()) on conflict (operation_id) do nothing;
  end if;
  return null;
end $$;
drop trigger if exists operations_codigos on operations;
create trigger operations_codigos after insert or update of status on operations for each row
  when (new.kind in ('order', 'market_order') and new.status = 'confirmed') execute function operations_codigos();
-- Los envíos del mercado aceptados que ya estaban en curso reciben los suyos.
insert into delivery_codes (operation_id, city_id, cliente, recogida)
select o.id, o.city_id, codigo4(), codigo4() from operations o
 where o.kind = 'market_order' and coalesce(o.mode, 'pickup') = 'delivery' and o.status = 'confirmed'
on conflict (operation_id) do nothing;

-- ── La prueba al cerrar (guardianes entregaConPrueba y mercadoConRepartidor) ──
create or replace function operations_prueba() returns trigger language plpgsql as $$
begin
  if new.kind = 'order' and coalesce(new.mode, 'pickup') = 'delivery' and new.driver_id is not null and new.status = 'done' and old.status is distinct from 'done'
     and coalesce((select s.proof from delivery_settings s where s.business_id = new.business_id), false)
     and not exists (select 1 from delivery_proofs p where p.operation_id = new.id) then
    raise exception 'entrega sin prueba' using errcode = 'P0001', hint = 'sin_prueba';
  end if;
  -- El mercado con repartidor: siempre la prueba del repartidor que lo lleva (foto o el código del cliente); nunca la del panel.
  if new.kind = 'market_order' and coalesce(new.mode, 'pickup') = 'delivery' and new.driver_id is not null and new.status = 'done' and old.status is distinct from 'done'
     and not exists (select 1 from delivery_proofs p where p.operation_id = new.id and p.kind in ('foto', 'codigo') and p.driver_id = new.driver_id) then
    raise exception 'entrega del mercado sin la prueba del repartidor' using errcode = 'P0001', hint = 'sin_prueba_repartidor';
  end if;
  return new;
end $$;
drop trigger if exists operations_prueba on operations;
create trigger operations_prueba before update of status on operations for each row when (new.status = 'done') execute function operations_prueba();

-- ── La ruta en vivo ──
create or replace function ruta_activa(op bigint, rider uuid, ciudad text) returns boolean language sql stable as $$
  select exists (
    select 1 from delivery_tracks t
      join operations o on o.id = t.operation_id
      join delivery_drivers d on d.id = o.driver_id
     where t.operation_id = op and t.sharing_until is null and t.rider_user_id = rider and t.city_id = ciudad
       and o.kind in ('order', 'market_order') and coalesce(o.mode, 'pickup') = 'delivery' and o.status = 'confirmed' and coalesce(o.stage, '') <> 'delivered'
       and o.city_id = ciudad and d.user_id = rider and d.status = 'active' and d.id = t.driver_id)
$$;
drop trigger if exists operations_ruta on operations;
create trigger operations_ruta after update of status, stage, driver_id on operations for each row
  when (new.kind in ('order', 'market_order') and (old.status is distinct from new.status or old.stage is distinct from new.stage or old.driver_id is distinct from new.driver_id))
  execute function operations_ruta();

-- ── Avisos al cliente del mercado ──
insert into notif_templates (key, grp, pref, sms, sms_mode, push, title, body) values
  ('merc_here', 'tx', null, true, 'sin_push', true, '{"es":"Tu repartidor llegó","en":"Your driver is here"}', '{"es":"Tu repartidor de {negocio} llegó con tu pedido {num}.","en":"Your {negocio} driver arrived with your order {num}."}'),
  ('merc_entregado', 'tx', null, true, 'sin_push', true, '{"es":"Tu pedido llegó","en":"Your order was delivered"}', '{"es":"Tu pedido {num} de {negocio} se entregó.","en":"Your order {num} from {negocio} was delivered."}')
on conflict (key) do nothing;

commit;
