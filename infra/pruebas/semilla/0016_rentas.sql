-- Fase 4 · 4f-2 (renta de herramienta). SOLO SANDBOX. Las 4 herramientas que renta Hermanos Díaz Multiservicios, como en el
-- prototipo (neg-hogar-listing.js › SHOP): precio por día, depósito y cuántas tiene para rentar. Enciende su módulo Renta.
begin;
do $$
declare b text := 'hermanos-diaz-multiservicios';
  r record;
begin
  if not exists (select 1 from businesses where id = b and is_demo) then return; end if;
  for r in select * from (values
    (0, 'Culebra de drenaje 25 pies', '25 ft drain snake', 'Renta por día · depósito $50', 'Daily rental · $50 deposit', 2500, 5000, 6419128, 2),
    (1, 'Escalera de extensión 24 pies', '24 ft extension ladder', 'Renta por día · depósito $80', 'Daily rental · $80 deposit', 3000, 8000, 10402935, 1),
    (2, 'Lavadora a presión', 'Pressure washer', 'Renta por día · depósito $100', 'Daily rental · $100 deposit', 5500, 10000, 6873175, 1),
    (3, 'Máquina de lavar alfombras', 'Carpet cleaner', 'Renta por día · incluye champú', 'Daily rental · shampoo included', 4000, 6000, 38325, 2)
  ) as t(s, n, ne, d, de, p, dep, ph, qty) loop
    if not exists (select 1 from items where business_id = b and module = 'renta' and name->>'es' = r.n) then
      insert into items (business_id, module, name, descr, price_cents, unit, tax_pct, photos, channels, stock_mode, stock_left, stock_par, deposit_cents, sort)
      values (b, 'renta', jsonb_build_object('es', r.n, 'en', r.ne), jsonb_build_object('es', r.d, 'en', r.de), r.p, 'dia', 6,
              array['https://images.pexels.com/photos/' || r.ph || '/pexels-photo-' || r.ph || '.jpeg?auto=compress&cs=tinysrgb&h=600'], '{pick}', 'qty', r.qty, r.qty, r.dep, r.s);
    end if;
  end loop;
  update businesses set modules_on = array(select distinct x from unnest(modules_on || array['renta']) x) where id = b and not ('renta' = any(modules_on));
end $$;
commit;
