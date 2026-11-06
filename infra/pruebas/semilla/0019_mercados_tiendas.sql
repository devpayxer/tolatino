-- Generado por scripts/semilla/extraer-mercados-tiendas.cjs desde el prototipo. SOLO SANDBOX. No editar a mano.
begin;
do $$
declare b text := 'supermercado-la-cosecha'; s bigint; i bigint; g bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo) or exists (select 1 from items where business_id = b and module = 'shop' and removed_at is null) then return; end if;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['shop','pedidos']::text[]))) where id = b;
  insert into users (phone, first_name, last_name, lang, home_city_id) values ('+15705550288', 'Héctor', 'Almonte', 'es', 'hzl') on conflict (phone) do nothing;
  insert into business_members (business_id, user_id, kind, display_name, role, status, show_on_page, panel_access, since_year, sort, same_as_business_hours) select b, u.id, 'owner', 'Héctor Almonte', '{"es":"Dueño y carnicero","en":"Owner and butcher"}'::jsonb, 'active', true, '{all}', 2014, 0, true from users u where u.phone = '+15705550288' and not exists (select 1 from business_members m where m.business_id = b and m.kind = 'owner');
  insert into delivery_settings (business_id, pickup, delivery, fee_cents, min_order_cents, pay_card, pay_cash_pickup) values (b, true, true, 499, 2000, true, true)
    on conflict (business_id) do update set delivery = excluded.delivery, fee_cents = excluded.fee_cents, min_order_cents = excluded.min_order_cents;
  insert into retail_settings (business_id, ebt, cash, weighs_front) select b, 'ebt' = any(filter_values), 'efectivo' = any(filter_values), true from businesses where id = b on conflict (business_id) do nothing;
  insert into item_sections (business_id, module, name, sort) values (b, 'shop', '{"es":"Carnicería","en":"Butcher"}'::jsonb, 0) returning id into s;
  insert into option_groups (business_id, name, required, max_pick, options) values (b, '{"es":"Corte","en":"Cut"}'::jsonb, true, 1, '[{"es":"Entero","en":"Whole","on":true,"cents":0},{"es":"En trozos","en":"In pieces","on":true,"cents":0},{"es":"Para guisar","en":"For stew","on":true,"cents":0},{"es":"Molido","en":"Ground","on":true,"cents":0}]'::jsonb) returning id into g;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Pierna de cerdo","en":"Pork shoulder"}'::jsonb, '{"es":"Con cuero o sin cuero.","en":"Skin on or off."}'::jsonb, 249, 'lb', 0, array['https://images.pexels.com/photos/2676932/pexels-photo-2676932.jpeg?auto=compress&cs=tinysrgb&h=600'], 'peso', true, 0, false, null, array[g], false, 0) returning id into i;
  insert into option_groups (business_id, name, required, max_pick, options) values (b, '{"es":"Corte","en":"Cut"}'::jsonb, true, 1, '[{"es":"Entero","en":"Whole","on":true,"cents":0},{"es":"En trozos","en":"In pieces","on":true,"cents":0},{"es":"Para guisar","en":"For stew","on":true,"cents":0}]'::jsonb) returning id into g;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Pollo entero","en":"Whole chicken"}'::jsonb, '{"es":"Oferta hasta el domingo.","en":"On sale through Sunday."}'::jsonb, 129, 'lb', 0, array['https://images.pexels.com/photos/13524831/pexels-photo-13524831.jpeg?auto=compress&cs=tinysrgb&h=600'], 'peso', true, 0, false, null, array[g], false, 1) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Bistec de res","en":"Beef steak"}'::jsonb, '{"es":"Cortado fino para bistec encebollado.","en":"Thin cut for bistec encebollado."}'::jsonb, 699, 'lb', 0, array['https://images.pexels.com/photos/618775/pexels-photo-618775.jpeg?auto=compress&cs=tinysrgb&h=600'], 'peso', true, 0, false, null, '{}', false, 2) returning id into i;
  insert into item_sections (business_id, module, name, sort) values (b, 'shop', '{"es":"Frutas y víveres","en":"Produce"}'::jsonb, 1) returning id into s;
  insert into option_groups (business_id, name, required, max_pick, options) values (b, '{"es":"Punto","en":"Ripeness"}'::jsonb, true, 1, '[{"es":"Verde","en":"Green","on":true,"cents":0},{"es":"Pintón","en":"Half-ripe","on":true,"cents":0},{"es":"Maduro","en":"Ripe","on":true,"cents":0}]'::jsonb) returning id into g;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Plátano verde","en":"Green plantain"}'::jsonb, '{"es":"Por unidad.","en":"Each."}'::jsonb, 45, 'u', 0, array['https://images.pexels.com/photos/12199572/pexels-photo-12199572.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', true, 0, false, null, array[g], false, 0) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Yuca","en":"Cassava"}'::jsonb, '{"es":"Fresca, no congelada.","en":"Fresh, not frozen."}'::jsonb, 129, 'lb', 0, array['https://images.pexels.com/photos/30893342/pexels-photo-30893342.jpeg?auto=compress&cs=tinysrgb&h=600'], 'peso', true, 0, false, null, '{}', false, 1) returning id into i;
  insert into option_groups (business_id, name, required, max_pick, options) values (b, '{"es":"Punto","en":"Ripeness"}'::jsonb, true, 1, '[{"es":"Para hoy","en":"For today","on":true,"cents":0},{"es":"Para 2 días","en":"For 2 days","on":true,"cents":0}]'::jsonb) returning id into g;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Aguacate","en":"Avocado"}'::jsonb, '{"es":"Grande, de Santo Domingo.","en":"Large, Dominican."}'::jsonb, 199, 'u', 0, array['https://images.pexels.com/photos/27462724/pexels-photo-27462724.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', true, 0, false, null, array[g], false, 2) returning id into i;
  insert into item_sections (business_id, module, name, sort) values (b, 'shop', '{"es":"Despensa","en":"Pantry"}'::jsonb, 2) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Arroz 10 lb","en":"Rice 10 lb"}'::jsonb, '{"es":"Grano largo.","en":"Long grain."}'::jsonb, 899, 'u', 0, array['https://images.pexels.com/photos/14238105/pexels-photo-14238105.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', true, 0, false, null, '{}', false, 0) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Habichuelas rojas","en":"Red beans"}'::jsonb, '{"es":"Lata de 15 oz.","en":"15 oz can."}'::jsonb, 119, 'u', 0, array['https://images.pexels.com/photos/7717469/pexels-photo-7717469.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', true, 0, false, null, '{}', false, 1) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Café Santo Domingo","en":"Santo Domingo coffee"}'::jsonb, '{"es":"1 lb molido.","en":"1 lb ground."}'::jsonb, 749, 'u', 0, array['https://images.pexels.com/photos/33757156/pexels-photo-33757156.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', true, 0, false, null, '{}', false, 2) returning id into i;
end $$;
do $$
declare b text := 'carniceria-el-cibao'; s bigint; i bigint; g bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo) or exists (select 1 from items where business_id = b and module = 'shop' and removed_at is null) then return; end if;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['shop','pedidos']::text[]))) where id = b;
  insert into delivery_settings (business_id, pickup, delivery, fee_cents, min_order_cents, pay_card, pay_cash_pickup) values (b, true, true, 499, 2500, true, true)
    on conflict (business_id) do update set delivery = excluded.delivery, fee_cents = excluded.fee_cents, min_order_cents = excluded.min_order_cents;
  insert into retail_settings (business_id, ebt, cash, weighs_front) select b, 'ebt' = any(filter_values), 'efectivo' = any(filter_values), true from businesses where id = b on conflict (business_id) do nothing;
  insert into item_sections (business_id, module, name, sort) values (b, 'shop', '{"es":"Carnes","en":"Meats"}'::jsonb, 0) returning id into s;
  insert into option_groups (business_id, name, required, max_pick, options) values (b, '{"es":"Corte","en":"Cut"}'::jsonb, true, 1, '[{"es":"En trozos","en":"In pieces","on":true,"cents":0},{"es":"Para guisar","en":"For stew","on":true,"cents":0}]'::jsonb) returning id into g;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Chivo","en":"Goat"}'::jsonb, '{"es":"Cortado para guisar, con hueso.","en":"Cut for stew, bone-in."}'::jsonb, 699, 'lb', 0, array['https://images.pexels.com/photos/6733517/pexels-photo-6733517.jpeg?auto=compress&cs=tinysrgb&h=600'], 'peso', true, 0, false, null, array[g], false, 0) returning id into i;
  insert into option_groups (business_id, name, required, max_pick, options) values (b, '{"es":"Corte","en":"Cut"}'::jsonb, true, 1, '[{"es":"Entero","en":"Whole","on":true,"cents":0},{"es":"En trozos","en":"In pieces","on":true,"cents":0},{"es":"Para guisar","en":"For stew","on":true,"cents":0},{"es":"Molido","en":"Ground","on":true,"cents":0}]'::jsonb) returning id into g;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Pierna de cerdo","en":"Pork shoulder"}'::jsonb, '{"es":"Para pernil.","en":"For pernil."}'::jsonb, 229, 'lb', 0, array['https://images.pexels.com/photos/2676932/pexels-photo-2676932.jpeg?auto=compress&cs=tinysrgb&h=600'], 'peso', true, 0, false, null, array[g], false, 1) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Pollo en piezas","en":"Chicken pieces"}'::jsonb, '{"es":"Muslo y encuentro.","en":"Thighs and legs."}'::jsonb, 189, 'lb', 0, array['https://images.pexels.com/photos/13524831/pexels-photo-13524831.jpeg?auto=compress&cs=tinysrgb&h=600'], 'peso', true, 0, false, null, '{}', false, 2) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Longaniza dominicana","en":"Dominican longaniza"}'::jsonb, '{"es":"Hecha aquí.","en":"Made in-house."}'::jsonb, 549, 'lb', 0, array['https://images.pexels.com/photos/1927385/pexels-photo-1927385.jpeg?auto=compress&cs=tinysrgb&h=600'], 'peso', true, 0, false, null, '{}', false, 3) returning id into i;
  insert into item_sections (business_id, module, name, sort) values (b, 'shop', '{"es":"Quesos y salami","en":"Cheese & salami"}'::jsonb, 1) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Salami dominicano","en":"Dominican salami"}'::jsonb, '{"es":"Induveca o Campesino.","en":"Induveca or Campesino."}'::jsonb, 499, 'u', 0, array['https://images.pexels.com/photos/1927385/pexels-photo-1927385.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', true, 0, false, null, '{}', false, 0) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Queso de freír","en":"Frying cheese"}'::jsonb, '{"es":"Por libra.","en":"By the pound."}'::jsonb, 599, 'lb', 0, array['https://images.pexels.com/photos/26699217/pexels-photo-26699217.jpeg?auto=compress&cs=tinysrgb&h=600'], 'peso', true, 0, false, null, '{}', false, 1) returning id into i;
end $$;
do $$
declare b text := 'bodega-don-pepe'; s bigint; i bigint; g bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo) or exists (select 1 from items where business_id = b and module = 'shop' and removed_at is null) then return; end if;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['shop','pedidos']::text[]))) where id = b;
  insert into delivery_settings (business_id, pickup, delivery, fee_cents, min_order_cents, pay_card, pay_cash_pickup) values (b, true, false, 0, 0, true, true)
    on conflict (business_id) do update set delivery = excluded.delivery, fee_cents = excluded.fee_cents, min_order_cents = excluded.min_order_cents;
  insert into retail_settings (business_id, ebt, cash, weighs_front) select b, 'ebt' = any(filter_values), 'efectivo' = any(filter_values), true from businesses where id = b on conflict (business_id) do nothing;
  insert into item_sections (business_id, module, name, sort) values (b, 'shop', '{"es":"Del mostrador","en":"From the counter"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Sándwich de salami y queso","en":"Salami and cheese sandwich"}'::jsonb, '{"es":"En pan de agua.","en":"On water bread."}'::jsonb, 550, 'u', 6, array['https://images.pexels.com/photos/1927385/pexels-photo-1927385.jpeg?auto=compress&cs=tinysrgb&h=600'], 'plato', false, 0, false, null, '{}', false, 0) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Café con leche","en":"Coffee with milk"}'::jsonb, '{"es":"Grande.","en":"Large."}'::jsonb, 100, 'u', 0, array['https://images.pexels.com/photos/33757156/pexels-photo-33757156.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', true, 0, false, null, '{}', false, 1) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Pastelito de pollo","en":"Chicken pastelito"}'::jsonb, '{"es":"Hechos en la mañana.","en":"Made this morning."}'::jsonb, 150, 'u', 0, array['https://images.pexels.com/photos/36905236/pexels-photo-36905236.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', true, 0, false, null, '{}', false, 2) returning id into i;
  insert into item_sections (business_id, module, name, sort) values (b, 'shop', '{"es":"Bodega","en":"Bodega"}'::jsonb, 1) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Salami Induveca","en":"Induveca salami"}'::jsonb, '{"es":"Pieza de 1 lb.","en":"1 lb piece."}'::jsonb, 549, 'u', 0, array['https://images.pexels.com/photos/1927385/pexels-photo-1927385.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', true, 0, false, null, '{}', false, 0) returning id into i;
  insert into option_groups (business_id, name, required, max_pick, options) values (b, '{"es":"Punto","en":"Ripeness"}'::jsonb, true, 1, '[{"es":"Verde","en":"Green","on":true,"cents":0},{"es":"Pintón","en":"Half-ripe","on":true,"cents":0},{"es":"Maduro","en":"Ripe","on":true,"cents":0}]'::jsonb) returning id into g;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Plátano verde","en":"Green plantain"}'::jsonb, '{"es":"Por unidad.","en":"Each."}'::jsonb, 50, 'u', 0, array['https://images.pexels.com/photos/12199572/pexels-photo-12199572.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', true, 0, false, null, array[g], false, 1) returning id into i;
end $$;
do $$
declare b text := 'pescaderia-del-mar'; s bigint; i bigint; g bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo) or exists (select 1 from items where business_id = b and module = 'shop' and removed_at is null) then return; end if;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['shop','pedidos']::text[]))) where id = b;
  insert into delivery_settings (business_id, pickup, delivery, fee_cents, min_order_cents, pay_card, pay_cash_pickup) values (b, true, false, 0, 0, true, true)
    on conflict (business_id) do update set delivery = excluded.delivery, fee_cents = excluded.fee_cents, min_order_cents = excluded.min_order_cents;
  insert into retail_settings (business_id, ebt, cash, weighs_front) select b, 'ebt' = any(filter_values), 'efectivo' = any(filter_values), true from businesses where id = b on conflict (business_id) do nothing;
  insert into item_sections (business_id, module, name, sort) values (b, 'shop', '{"es":"Pescado","en":"Fish"}'::jsonb, 0) returning id into s;
  insert into option_groups (business_id, name, required, max_pick, options) values (b, '{"es":"Corte","en":"Cut"}'::jsonb, true, 1, '[{"es":"Entero","en":"Whole","on":true,"cents":0},{"es":"Limpio y escamado","en":"Cleaned and scaled","on":true,"cents":0},{"es":"En filete","en":"Filleted","on":true,"cents":0}]'::jsonb) returning id into g;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Chillo","en":"Red snapper"}'::jsonb, '{"es":"Entero; limpiarlo es gratis.","en":"Whole; cleaning is free."}'::jsonb, 799, 'lb', 0, array['https://images.pexels.com/photos/8352778/pexels-photo-8352778.jpeg?auto=compress&cs=tinysrgb&h=600'], 'peso', true, 0, false, null, array[g], false, 0) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Camarón grande","en":"Large shrimp"}'::jsonb, '{"es":"Con cáscara.","en":"Shell-on."}'::jsonb, 999, 'lb', 0, array['https://images.pexels.com/photos/21771249/pexels-photo-21771249.jpeg?auto=compress&cs=tinysrgb&h=600'], 'peso', true, 0, false, null, '{}', false, 1) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Bacalao salado","en":"Salt cod"}'::jsonb, '{"es":"Sin espinas.","en":"Boneless."}'::jsonb, 1199, 'lb', 0, array['https://images.pexels.com/photos/8352778/pexels-photo-8352778.jpeg?auto=compress&cs=tinysrgb&h=600'], 'peso', true, 0, false, null, '{}', false, 2) returning id into i;
end $$;
do $$
declare b text := 'mercado-quisqueyano'; s bigint; i bigint; g bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo) or exists (select 1 from items where business_id = b and module = 'shop' and removed_at is null) then return; end if;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['shop','pedidos']::text[]))) where id = b;
  insert into delivery_settings (business_id, pickup, delivery, fee_cents, min_order_cents, pay_card, pay_cash_pickup) values (b, true, true, 399, 1500, true, true)
    on conflict (business_id) do update set delivery = excluded.delivery, fee_cents = excluded.fee_cents, min_order_cents = excluded.min_order_cents;
  insert into retail_settings (business_id, ebt, cash, weighs_front) select b, 'ebt' = any(filter_values), 'efectivo' = any(filter_values), true from businesses where id = b on conflict (business_id) do nothing;
  insert into item_sections (business_id, module, name, sort) values (b, 'shop', '{"es":"Víveres","en":"Root vegetables"}'::jsonb, 0) returning id into s;
  insert into option_groups (business_id, name, required, max_pick, options) values (b, '{"es":"Punto","en":"Ripeness"}'::jsonb, true, 1, '[{"es":"Verde","en":"Green","on":true,"cents":0},{"es":"Pintón","en":"Half-ripe","on":true,"cents":0},{"es":"Maduro","en":"Ripe","on":true,"cents":0}]'::jsonb) returning id into g;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Plátano verde","en":"Green plantain"}'::jsonb, '{"es":"3 por $1.","en":"3 for $1."}'::jsonb, 34, 'u', 0, array['https://images.pexels.com/photos/12199572/pexels-photo-12199572.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', true, 0, false, null, array[g], false, 0) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Yuca","en":"Cassava"}'::jsonb, '{"es":"Fresca.","en":"Fresh."}'::jsonb, 129, 'lb', 0, array['https://images.pexels.com/photos/30893342/pexels-photo-30893342.jpeg?auto=compress&cs=tinysrgb&h=600'], 'peso', true, 0, false, null, '{}', false, 1) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Guineíto verde","en":"Green bananas"}'::jsonb, '{"es":"Por libra.","en":"By the pound."}'::jsonb, 89, 'lb', 0, array['https://images.pexels.com/photos/7194965/pexels-photo-7194965.jpeg?auto=compress&cs=tinysrgb&h=600'], 'peso', true, 0, false, null, '{}', false, 2) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Ají cubanela","en":"Cubanelle peppers"}'::jsonb, '{"es":"Por libra.","en":"By the pound."}'::jsonb, 249, 'lb', 0, array['https://images.pexels.com/photos/10847032/pexels-photo-10847032.jpeg?auto=compress&cs=tinysrgb&h=600'], 'peso', true, 0, false, null, '{}', false, 3) returning id into i;
  insert into item_sections (business_id, module, name, sort) values (b, 'shop', '{"es":"Despensa","en":"Pantry"}'::jsonb, 1) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Habichuelas rojas","en":"Red beans"}'::jsonb, '{"es":"Lata de 15 oz.","en":"15 oz can."}'::jsonb, 109, 'u', 0, array['https://images.pexels.com/photos/7717469/pexels-photo-7717469.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', true, 0, false, null, '{}', false, 0) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Café Santo Domingo","en":"Santo Domingo coffee"}'::jsonb, '{"es":"1 lb molido.","en":"1 lb ground."}'::jsonb, 699, 'u', 0, array['https://images.pexels.com/photos/33757156/pexels-photo-33757156.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', true, 0, false, null, '{}', false, 1) returning id into i;
end $$;
do $$
declare b text := 'la-guadalupana'; s bigint; i bigint; g bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo) or exists (select 1 from items where business_id = b and module = 'shop' and removed_at is null) then return; end if;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['shop','pedidos']::text[]))) where id = b;
  insert into delivery_settings (business_id, pickup, delivery, fee_cents, min_order_cents, pay_card, pay_cash_pickup) values (b, true, false, 0, 0, true, true)
    on conflict (business_id) do update set delivery = excluded.delivery, fee_cents = excluded.fee_cents, min_order_cents = excluded.min_order_cents;
  insert into retail_settings (business_id, ebt, cash, weighs_front) select b, 'ebt' = any(filter_values), 'efectivo' = any(filter_values), true from businesses where id = b on conflict (business_id) do nothing;
  insert into item_sections (business_id, module, name, sort) values (b, 'shop', '{"es":"Tortillería","en":"Tortillas"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Tortillas de maíz","en":"Corn tortillas"}'::jsonb, '{"es":"Calientes, cada hora.","en":"Hot, every hour."}'::jsonb, 250, 'u', 0, array['https://images.pexels.com/photos/8364557/pexels-photo-8364557.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', true, 0, false, null, '{}', false, 0) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Carne para asar","en":"Carne asada"}'::jsonb, '{"es":"Marinada.","en":"Marinated."}'::jsonb, 649, 'lb', 0, array['https://images.pexels.com/photos/618775/pexels-photo-618775.jpeg?auto=compress&cs=tinysrgb&h=600'], 'peso', true, 0, false, null, '{}', false, 1) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Queso fresco","en":"Queso fresco"}'::jsonb, '{"es":"Por libra.","en":"By the pound."}'::jsonb, 499, 'lb', 0, array['https://images.pexels.com/photos/26699217/pexels-photo-26699217.jpeg?auto=compress&cs=tinysrgb&h=600'], 'peso', true, 0, false, null, '{}', false, 2) returning id into i;
end $$;
do $$
declare b text := 'frutas-el-conuco'; s bigint; i bigint; g bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo) or exists (select 1 from items where business_id = b and module = 'shop' and removed_at is null) then return; end if;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['shop','pedidos']::text[]))) where id = b;
  insert into delivery_settings (business_id, pickup, delivery, fee_cents, min_order_cents, pay_card, pay_cash_pickup) values (b, true, false, 0, 0, true, true)
    on conflict (business_id) do update set delivery = excluded.delivery, fee_cents = excluded.fee_cents, min_order_cents = excluded.min_order_cents;
  insert into retail_settings (business_id, ebt, cash, weighs_front) select b, 'ebt' = any(filter_values), 'efectivo' = any(filter_values), true from businesses where id = b on conflict (business_id) do nothing;
  insert into item_sections (business_id, module, name, sort) values (b, 'shop', '{"es":"Frutas","en":"Fruit"}'::jsonb, 0) returning id into s;
  insert into option_groups (business_id, name, required, max_pick, options) values (b, '{"es":"Punto","en":"Ripeness"}'::jsonb, true, 1, '[{"es":"Para hoy","en":"For today","on":true,"cents":0},{"es":"Para 2 días","en":"For 2 days","on":true,"cents":0}]'::jsonb) returning id into g;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Aguacate grande","en":"Large avocado"}'::jsonb, '{"es":"Para hoy o para 2 días.","en":"For today or 2 days."}'::jsonb, 150, 'u', 0, array['https://images.pexels.com/photos/27462724/pexels-photo-27462724.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', true, 0, false, null, array[g], false, 0) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Chinola","en":"Passion fruit"}'::jsonb, '{"es":"Para jugo.","en":"For juice."}'::jsonb, 299, 'lb', 0, array['https://images.pexels.com/photos/6332803/pexels-photo-6332803.jpeg?auto=compress&cs=tinysrgb&h=600'], 'peso', true, 0, false, null, '{}', false, 1) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Mango","en":"Mango"}'::jsonb, '{"es":"Banilejo cuando hay.","en":"Banilejo when available."}'::jsonb, 125, 'u', 0, array['https://images.pexels.com/photos/30893290/pexels-photo-30893290.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', true, 0, false, null, '{}', false, 2) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Cebolla roja","en":"Red onion"}'::jsonb, '{"es":"Por libra.","en":"By the pound."}'::jsonb, 119, 'lb', 0, array['https://images.pexels.com/photos/6316541/pexels-photo-6316541.jpeg?auto=compress&cs=tinysrgb&h=600'], 'peso', true, 0, false, null, '{}', false, 3) returning id into i;
end $$;
do $$
declare b text := 'mayorista-caribe'; s bigint; i bigint; g bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo) or exists (select 1 from items where business_id = b and module = 'shop' and removed_at is null) then return; end if;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['shop','pedidos']::text[]))) where id = b;
  insert into delivery_settings (business_id, pickup, delivery, fee_cents, min_order_cents, pay_card, pay_cash_pickup) values (b, true, true, 1500, 10000, true, true)
    on conflict (business_id) do update set delivery = excluded.delivery, fee_cents = excluded.fee_cents, min_order_cents = excluded.min_order_cents;
  insert into retail_settings (business_id, ebt, cash, weighs_front) select b, 'ebt' = any(filter_values), 'efectivo' = any(filter_values), true from businesses where id = b on conflict (business_id) do nothing;
  insert into item_sections (business_id, module, name, sort) values (b, 'shop', '{"es":"Al por mayor","en":"Wholesale"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Saco de arroz 50 lb","en":"50 lb rice sack"}'::jsonb, '{"es":"Grano largo.","en":"Long grain."}'::jsonb, 3200, 'u', 0, array['https://images.pexels.com/photos/14238105/pexels-photo-14238105.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', true, 0, false, null, '{}', false, 0) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Caja de habichuelas (24)","en":"Case of beans (24)"}'::jsonb, '{"es":"Latas de 15 oz.","en":"15 oz cans."}'::jsonb, 2200, 'u', 0, array['https://images.pexels.com/photos/7717469/pexels-photo-7717469.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', true, 0, false, null, '{}', false, 1) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Caja de plátanos (50 lb)","en":"Plantain case (50 lb)"}'::jsonb, '{"es":"Verde.","en":"Green."}'::jsonb, 2800, 'u', 0, array['https://images.pexels.com/photos/12199572/pexels-photo-12199572.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', true, 0, false, null, '{}', false, 2) returning id into i;
end $$;
do $$
declare b text := 'la-esquinita-deli'; s bigint; i bigint; g bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo) or exists (select 1 from items where business_id = b and module = 'shop' and removed_at is null) then return; end if;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['shop','pedidos']::text[]))) where id = b;
  insert into delivery_settings (business_id, pickup, delivery, fee_cents, min_order_cents, pay_card, pay_cash_pickup) values (b, true, true, 299, 1000, true, true)
    on conflict (business_id) do update set delivery = excluded.delivery, fee_cents = excluded.fee_cents, min_order_cents = excluded.min_order_cents;
  insert into retail_settings (business_id, ebt, cash, weighs_front) select b, 'ebt' = any(filter_values), 'efectivo' = any(filter_values), true from businesses where id = b on conflict (business_id) do nothing;
  insert into item_sections (business_id, module, name, sort) values (b, 'shop', '{"es":"Comida del día","en":"Daily plates"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Plato del día","en":"Daily plate"}'::jsonb, '{"es":"Arroz, habichuelas, carne del día y ensalada. Hasta las 3 PM.","en":"Rice, beans, meat of the day and salad. Until 3 PM."}'::jsonb, 900, 'u', 6, array['https://images.pexels.com/photos/1633668/pexels-photo-1633668.jpeg?auto=compress&cs=tinysrgb&h=600'], 'plato', false, 0, false, null, '{}', false, 0) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Pastelito","en":"Pastelito"}'::jsonb, '{"es":"Pollo, res o queso.","en":"Chicken, beef or cheese."}'::jsonb, 150, 'u', 0, array['https://images.pexels.com/photos/36905236/pexels-photo-36905236.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', true, 0, false, null, '{}', false, 1) returning id into i;
  insert into item_sections (business_id, module, name, sort) values (b, 'shop', '{"es":"Panadería","en":"Bakery"}'::jsonb, 1) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Pan de agua","en":"Water bread"}'::jsonb, '{"es":"Caliente en la mañana.","en":"Hot in the morning."}'::jsonb, 50, 'u', 0, array['https://images.pexels.com/photos/30767689/pexels-photo-30767689.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', true, 0, false, null, '{}', false, 0) returning id into i;
end $$;
do $$
declare b text := 'los-catrachos'; s bigint; i bigint; g bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo) or exists (select 1 from items where business_id = b and module = 'shop' and removed_at is null) then return; end if;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['shop','pedidos']::text[]))) where id = b;
  insert into delivery_settings (business_id, pickup, delivery, fee_cents, min_order_cents, pay_card, pay_cash_pickup) values (b, true, false, 0, 0, true, true)
    on conflict (business_id) do update set delivery = excluded.delivery, fee_cents = excluded.fee_cents, min_order_cents = excluded.min_order_cents;
  insert into retail_settings (business_id, ebt, cash, weighs_front) select b, 'ebt' = any(filter_values), 'efectivo' = any(filter_values), true from businesses where id = b on conflict (business_id) do nothing;
  insert into item_sections (business_id, module, name, sort) values (b, 'shop', '{"es":"Lácteos","en":"Dairy"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Quesillo","en":"Quesillo"}'::jsonb, '{"es":"Hondureño, por libra.","en":"Honduran, by the pound."}'::jsonb, 599, 'lb', 0, array['https://images.pexels.com/photos/26699217/pexels-photo-26699217.jpeg?auto=compress&cs=tinysrgb&h=600'], 'peso', true, 0, false, null, '{}', false, 0) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Crema","en":"Crema"}'::jsonb, '{"es":"Frasco de 15 oz.","en":"15 oz jar."}'::jsonb, 349, 'u', 0, array['https://images.pexels.com/photos/26699217/pexels-photo-26699217.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', true, 0, false, null, '{}', false, 1) returning id into i;
  insert into item_sections (business_id, module, name, sort) values (b, 'shop', '{"es":"Carnes","en":"Meats"}'::jsonb, 1) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Chorizo catracho","en":"Honduran chorizo"}'::jsonb, '{"es":"Por libra.","en":"By the pound."}'::jsonb, 499, 'lb', 0, array['https://images.pexels.com/photos/1927385/pexels-photo-1927385.jpeg?auto=compress&cs=tinysrgb&h=600'], 'peso', true, 0, false, null, '{}', false, 0) returning id into i;
end $$;
do $$
declare b text := 'agua-hielo-cristal'; s bigint; i bigint; g bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo) or exists (select 1 from items where business_id = b and module = 'shop' and removed_at is null) then return; end if;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['shop','pedidos']::text[]))) where id = b;
  insert into delivery_settings (business_id, pickup, delivery, fee_cents, min_order_cents, pay_card, pay_cash_pickup) values (b, true, true, 0, 750, true, true)
    on conflict (business_id) do update set delivery = excluded.delivery, fee_cents = excluded.fee_cents, min_order_cents = excluded.min_order_cents;
  insert into retail_settings (business_id, ebt, cash, weighs_front) select b, 'ebt' = any(filter_values), 'efectivo' = any(filter_values), true from businesses where id = b on conflict (business_id) do nothing;
  insert into item_sections (business_id, module, name, sort) values (b, 'shop', '{"es":"Agua e hielo","en":"Water & ice"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Botellón 5 galones","en":"5-gallon jug"}'::jsonb, '{"es":"Cambias el vacío.","en":"Swap your empty."}'::jsonb, 250, 'u', 0, array['https://images.pexels.com/photos/32797009/pexels-photo-32797009.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', true, 0, false, null, '{}', false, 0) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Hielo 20 lb","en":"20 lb ice"}'::jsonb, '{"es":"Para fiestas.","en":"For parties."}'::jsonb, 400, 'u', 0, array['https://images.pexels.com/photos/38934819/pexels-photo-38934819.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', true, 0, false, null, '{}', false, 1) returning id into i;
end $$;
do $$
declare b text := 'mercado-el-condor'; s bigint; i bigint; g bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo) or exists (select 1 from items where business_id = b and module = 'shop' and removed_at is null) then return; end if;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['shop','pedidos']::text[]))) where id = b;
  insert into delivery_settings (business_id, pickup, delivery, fee_cents, min_order_cents, pay_card, pay_cash_pickup) values (b, true, true, 399, 2000, true, true)
    on conflict (business_id) do update set delivery = excluded.delivery, fee_cents = excluded.fee_cents, min_order_cents = excluded.min_order_cents;
  insert into retail_settings (business_id, ebt, cash, weighs_front) select b, 'ebt' = any(filter_values), 'efectivo' = any(filter_values), true from businesses where id = b on conflict (business_id) do nothing;
  insert into item_sections (business_id, module, name, sort) values (b, 'shop', '{"es":"Despensa de tu país","en":"Pantry from home"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Harina P.A.N.","en":"P.A.N. flour"}'::jsonb, '{"es":"Blanca, 2.2 lb. Para arepas.","en":"White, 2.2 lb. For arepas."}'::jsonb, 429, 'u', 0, array['https://images.pexels.com/photos/14238105/pexels-photo-14238105.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', true, 0, false, null, '{}', false, 0) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Ají amarillo en pasta","en":"Ají amarillo paste"}'::jsonb, '{"es":"De Perú, frasco de 7.5 oz.","en":"From Peru, 7.5 oz jar."}'::jsonb, 349, 'u', 0, array['https://images.pexels.com/photos/10847032/pexels-photo-10847032.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', true, 0, false, null, '{}', false, 1) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Café colombiano","en":"Colombian coffee"}'::jsonb, '{"es":"1 lb molido.","en":"1 lb ground."}'::jsonb, 949, 'u', 0, array['https://images.pexels.com/photos/33757156/pexels-photo-33757156.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', true, 0, false, null, '{}', false, 2) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Yerba mate 1 kg","en":"Yerba mate 1 kg"}'::jsonb, '{"es":"Con palo.","en":"With stems."}'::jsonb, 899, 'u', 0, array['https://images.pexels.com/photos/33757156/pexels-photo-33757156.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', true, 0, false, null, '{}', false, 3) returning id into i;
  insert into item_sections (business_id, module, name, sort) values (b, 'shop', '{"es":"Congelados","en":"Frozen"}'::jsonb, 1) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Pulpa de lulo","en":"Lulo pulp"}'::jsonb, '{"es":"Para jugo, 14 oz.","en":"For juice, 14 oz."}'::jsonb, 299, 'u', 0, array['https://images.pexels.com/photos/6332803/pexels-photo-6332803.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', true, 0, false, null, '{}', false, 0) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Empanadas colombianas (12)","en":"Colombian empanadas (12)"}'::jsonb, '{"es":"Listas para freír.","en":"Ready to fry."}'::jsonb, 1199, 'u', 0, array['https://images.pexels.com/photos/36905236/pexels-photo-36905236.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', true, 0, false, null, '{}', false, 1) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Choclo peruano","en":"Peruvian corn"}'::jsonb, '{"es":"Grano gigante, 1 lb.","en":"Giant kernel, 1 lb."}'::jsonb, 449, 'u', 0, array['https://images.pexels.com/photos/6316541/pexels-photo-6316541.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', true, 0, false, null, '{}', false, 2) returning id into i;
end $$;
do $$
declare b text := 'licores-la-cumbre'; s bigint; i bigint; g bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo) or exists (select 1 from items where business_id = b and module = 'shop' and removed_at is null) then return; end if;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['shop','pedidos']::text[]))) where id = b;
  insert into delivery_settings (business_id, pickup, delivery, fee_cents, min_order_cents, pay_card, pay_cash_pickup) values (b, true, false, 0, 0, true, true)
    on conflict (business_id) do update set delivery = excluded.delivery, fee_cents = excluded.fee_cents, min_order_cents = excluded.min_order_cents;
  insert into retail_settings (business_id, ebt, cash, weighs_front) select b, 'ebt' = any(filter_values), 'efectivo' = any(filter_values), true from businesses where id = b on conflict (business_id) do nothing;
  insert into item_sections (business_id, module, name, sort) values (b, 'shop', '{"es":"Ron y licores","en":"Rum & spirits"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Brugal Añejo","en":"Brugal Añejo"}'::jsonb, '{"es":"750 ml.","en":"750 ml."}'::jsonb, 2499, 'u', 6, '{}', 'unid', false, 21, true, null, '{}', false, 0) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Barceló Imperial","en":"Barceló Imperial"}'::jsonb, '{"es":"750 ml.","en":"750 ml."}'::jsonb, 3499, 'u', 6, '{}', 'unid', false, 21, true, null, '{}', false, 1) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Mamajuana preparada","en":"Prepared mamajuana"}'::jsonb, '{"es":"Botella lista, de la casa.","en":"Ready bottle, house-made."}'::jsonb, 1999, 'u', 6, '{}', 'unid', false, 21, true, null, '{}', false, 2) returning id into i;
  insert into item_sections (business_id, module, name, sort) values (b, 'shop', '{"es":"Cerveza y vino","en":"Beer & wine"}'::jsonb, 1) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Presidente · caja de 24","en":"Presidente · case of 24"}'::jsonb, '{"es":"Fría si la pides antes.","en":"Cold if you order ahead."}'::jsonb, 3200, 'u', 6, '{}', 'unid', false, 21, true, null, '{}', false, 0) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Vino tinto chileno","en":"Chilean red wine"}'::jsonb, '{"es":"750 ml.","en":"750 ml."}'::jsonb, 1299, 'u', 6, '{}', 'unid', false, 21, true, null, '{}', false, 1) returning id into i;
  insert into item_sections (business_id, module, name, sort) values (b, 'shop', '{"es":"Cigarros","en":"Cigars"}'::jsonb, 2) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Cigarro dominicano hecho a mano","en":"Handmade Dominican cigar"}'::jsonb, '{"es":"Por unidad.","en":"Each."}'::jsonb, 650, 'u', 6, '{}', 'unid', false, 21, true, null, '{}', false, 0) returning id into i;
end $$;
do $$
declare b text := 'botanica-siete-potencias'; s bigint; i bigint; g bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo) or exists (select 1 from items where business_id = b and module = 'shop' and removed_at is null) then return; end if;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['shop','pedidos']::text[]))) where id = b;
  insert into delivery_settings (business_id, pickup, delivery, fee_cents, min_order_cents, pay_card, pay_cash_pickup) values (b, true, false, 0, 0, true, true)
    on conflict (business_id) do update set delivery = excluded.delivery, fee_cents = excluded.fee_cents, min_order_cents = excluded.min_order_cents;
  insert into retail_settings (business_id, ebt, cash, weighs_front) select b, 'ebt' = any(filter_values), 'efectivo' = any(filter_values), true from businesses where id = b on conflict (business_id) do nothing;
  insert into item_sections (business_id, module, name, sort) values (b, 'shop', '{"es":"Hierbas y té","en":"Herbs & tea"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Manzanilla seca","en":"Dried chamomile"}'::jsonb, '{"es":"Bolsa de 2 oz.","en":"2 oz bag."}'::jsonb, 250, 'u', 6, '{}', 'unid', false, 0, false, null, '{}', false, 0) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Ruda fresca","en":"Fresh rue"}'::jsonb, '{"es":"Manojo, llega martes y viernes.","en":"Bunch, arrives Tue and Fri."}'::jsonb, 300, 'u', 6, '{}', 'unid', false, 0, false, null, '{}', false, 1) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Té de jengibre y canela","en":"Ginger and cinnamon tea"}'::jsonb, '{"es":"Mezcla de la casa, 4 oz.","en":"House blend, 4 oz."}'::jsonb, 450, 'u', 6, '{}', 'unid', false, 0, false, null, '{}', false, 2) returning id into i;
  insert into item_sections (business_id, module, name, sort) values (b, 'shop', '{"es":"Velas y aceites","en":"Candles & oils"}'::jsonb, 1) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Vela de 7 días","en":"7-day candle"}'::jsonb, '{"es":"Varios colores.","en":"Several colors."}'::jsonb, 399, 'u', 6, '{}', 'unid', false, 0, false, null, '{}', false, 0) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Agua de Florida","en":"Florida water"}'::jsonb, '{"es":"7.5 oz.","en":"7.5 oz."}'::jsonb, 599, 'u', 6, '{}', 'unid', false, 0, false, null, '{}', false, 1) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Aceite de coco","en":"Coconut oil"}'::jsonb, '{"es":"8 oz, sin perfume.","en":"8 oz, unscented."}'::jsonb, 650, 'u', 6, '{}', 'unid', false, 0, false, null, '{}', false, 2) returning id into i;
end $$;
do $$
declare b text := 'la-economica'; s bigint; i bigint; g bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo) or exists (select 1 from items where business_id = b and module = 'shop' and removed_at is null) then return; end if;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['shop','pedidos']::text[]))) where id = b;
  insert into delivery_settings (business_id, pickup, delivery, fee_cents, min_order_cents, pay_card, pay_cash_pickup) values (b, true, true, 599, 2500, true, true)
    on conflict (business_id) do update set delivery = excluded.delivery, fee_cents = excluded.fee_cents, min_order_cents = excluded.min_order_cents;
  insert into retail_settings (business_id, ebt, cash, weighs_front) select b, 'ebt' = any(filter_values), 'efectivo' = any(filter_values), true from businesses where id = b on conflict (business_id) do nothing;
  insert into item_sections (business_id, module, name, sort) values (b, 'shop', '{"es":"Para la casa","en":"For the home"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Detergente líquido","en":"Liquid detergent"}'::jsonb, '{"es":"40 oz.","en":"40 oz."}'::jsonb, 125, 'u', 0, '{}', 'unid', true, 0, false, null, '{}', false, 0) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Esponjas (3)","en":"Sponges (3)"}'::jsonb, '{"es":"Para fregar.","en":"For dishes."}'::jsonb, 125, 'u', 0, '{}', 'unid', true, 0, false, null, '{}', false, 1) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Bolsas de basura (10)","en":"Trash bags (10)"}'::jsonb, '{"es":"13 galones.","en":"13 gallons."}'::jsonb, 125, 'u', 0, '{}', 'unid', true, 0, false, null, '{}', false, 2) returning id into i;
  insert into item_sections (business_id, module, name, sort) values (b, 'shop', '{"es":"Mascotas","en":"Pets"}'::jsonb, 1) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Comida de perro 15 lb","en":"15 lb dog food"}'::jsonb, '{"es":"Adulto, pollo y arroz.","en":"Adult, chicken and rice."}'::jsonb, 1699, 'u', 0, '{}', 'unid', true, 0, false, null, '{}', false, 0) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Comida de gato 7 lb","en":"7 lb cat food"}'::jsonb, '{"es":"Adulto.","en":"Adult."}'::jsonb, 999, 'u', 0, '{}', 'unid', true, 0, false, null, '{}', false, 1) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Arena para gato 20 lb","en":"20 lb cat litter"}'::jsonb, '{"es":"Sin olor.","en":"Unscented."}'::jsonb, 849, 'u', 0, '{}', 'unid', true, 0, false, null, '{}', false, 2) returning id into i;
end $$;
do $$
declare b text := 'boutique-yaritza'; s bigint; i bigint; g bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo) or exists (select 1 from items where business_id = b and module = 'shop' and removed_at is null) then return; end if;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['shop','pedidos']::text[]))) where id = b;
  insert into users (phone, first_name, last_name, lang, home_city_id) values ('+15705550299', 'Yaritza', 'Almonte', 'es', 'hzl') on conflict (phone) do nothing;
  insert into business_members (business_id, user_id, kind, display_name, role, status, show_on_page, panel_access, since_year, sort, same_as_business_hours) select b, u.id, 'owner', 'Yaritza Almonte', '{"es":"Dueña","en":"Owner"}'::jsonb, 'active', true, '{all}', 2016, 0, true from users u where u.phone = '+15705550299' and not exists (select 1 from business_members m where m.business_id = b and m.kind = 'owner');
  insert into retail_settings (business_id, cash, hold_hours, returns_days, layaway, lay_down_pct, lay_payments, lay_cancel_pct) select b, 'efectivo' = any(filter_values), 48, 15, false, 20, 4, 10 from businesses where id = b on conflict (business_id) do nothing;
  insert into item_sections (business_id, module, name, sort) values (b, 'shop', '{"es":"Ropa","en":"Clothing"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Blusa de encaje","en":"Lace blouse"}'::jsonb, '{"es":"Blanca o negra.","en":"White or black."}'::jsonb, 2400, 'u', 0, array['https://images.pexels.com/photos/8387807/pexels-photo-8387807.jpeg?auto=compress&cs=tinysrgb&h=600'], 'talla', false, 0, false, '{"es":"Talla","en":"Size"}'::jsonb, '{}', false, 0) returning id into i;
  insert into item_variants (item_id, business_id, label, sort, stock_left) values (i, b, 'S', 0, 3);
  insert into item_variants (item_id, business_id, label, sort, stock_left) values (i, b, 'M', 1, 2);
  insert into item_variants (item_id, business_id, label, sort, stock_left) values (i, b, 'L', 2, 4);
  insert into item_variants (item_id, business_id, label, sort, stock_left) values (i, b, 'XL', 3, 1);
  insert into item_variants (item_id, business_id, label, sort, stock_left) values (i, b, '2X', 4, 0);
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Jeans de tiro alto","en":"High-rise jeans"}'::jsonb, '{"es":"2 × $50 hasta el domingo.","en":"2 for $50 through Sunday."}'::jsonb, 2900, 'u', 0, array['https://images.pexels.com/photos/6068971/pexels-photo-6068971.jpeg?auto=compress&cs=tinysrgb&h=600'], 'talla', false, 0, false, '{"es":"Talla","en":"Size"}'::jsonb, '{}', false, 1) returning id into i;
  insert into item_variants (item_id, business_id, label, sort, stock_left) values (i, b, '2', 0, 1);
  insert into item_variants (item_id, business_id, label, sort, stock_left) values (i, b, '4', 1, 3);
  insert into item_variants (item_id, business_id, label, sort, stock_left) values (i, b, '6', 2, 2);
  insert into item_variants (item_id, business_id, label, sort, stock_left) values (i, b, '8', 3, 0);
  insert into item_variants (item_id, business_id, label, sort, stock_left) values (i, b, '10', 4, 2);
  insert into item_variants (item_id, business_id, label, sort, stock_left) values (i, b, '14', 5, 1);
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Vestido de fiesta","en":"Party dress"}'::jsonb, '{"es":"Largo, varios colores.","en":"Long, several colors."}'::jsonb, 5900, 'u', 0, array['https://images.pexels.com/photos/8459366/pexels-photo-8459366.jpeg?auto=compress&cs=tinysrgb&h=600'], 'talla', false, 0, false, '{"es":"Talla","en":"Size"}'::jsonb, '{}', false, 2) returning id into i;
  insert into item_variants (item_id, business_id, label, sort, stock_left) values (i, b, 'S', 0, 1);
  insert into item_variants (item_id, business_id, label, sort, stock_left) values (i, b, 'M', 1, 2);
  insert into item_variants (item_id, business_id, label, sort, stock_left) values (i, b, 'L', 2, 1);
  insert into item_variants (item_id, business_id, label, sort, stock_left) values (i, b, 'XL', 3, 1);
  insert into item_variants (item_id, business_id, label, sort, stock_left) values (i, b, '2X', 4, 0);
  insert into item_sections (business_id, module, name, sort) values (b, 'shop', '{"es":"Accesorios","en":"Accessories"}'::jsonb, 1) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Cartera","en":"Handbag"}'::jsonb, '{"es":"Imitación cuero.","en":"Faux leather."}'::jsonb, 3200, 'u', 6, array['https://images.pexels.com/photos/8201205/pexels-photo-8201205.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', false, 0, false, null, '{}', false, 0) returning id into i;
end $$;
do $$
declare b text := 'zapateria-el-paso'; s bigint; i bigint; g bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo) or exists (select 1 from items where business_id = b and module = 'shop' and removed_at is null) then return; end if;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['shop','pedidos']::text[]))) where id = b;
  insert into retail_settings (business_id, cash, hold_hours, returns_days, layaway, lay_down_pct, lay_payments, lay_cancel_pct) select b, 'efectivo' = any(filter_values), 48, 30, false, 20, 4, 10 from businesses where id = b on conflict (business_id) do nothing;
  insert into item_sections (business_id, module, name, sort) values (b, 'shop', '{"es":"Trabajo","en":"Work"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Botas punta de acero","en":"Steel-toe boots"}'::jsonb, '{"es":"Para almacén; aprobadas OSHA.","en":"Warehouse-ready; OSHA approved."}'::jsonb, 6900, 'u', 0, array['https://images.pexels.com/photos/29274508/pexels-photo-29274508.jpeg?auto=compress&cs=tinysrgb&h=600'], 'talla', false, 0, false, '{"es":"Número","en":"Size"}'::jsonb, '{}', false, 0) returning id into i;
  insert into item_variants (item_id, business_id, label, sort, stock_left) values (i, b, '8', 0, 2);
  insert into item_variants (item_id, business_id, label, sort, stock_left) values (i, b, '9', 1, 3);
  insert into item_variants (item_id, business_id, label, sort, stock_left) values (i, b, '10', 2, 4);
  insert into item_variants (item_id, business_id, label, sort, stock_left) values (i, b, '11', 3, 1);
  insert into item_variants (item_id, business_id, label, sort, stock_left) values (i, b, '12', 4, 0);
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Botas vaqueras","en":"Cowboy boots"}'::jsonb, '{"es":"Piel de res.","en":"Cowhide."}'::jsonb, 12900, 'u', 0, array['https://images.pexels.com/photos/29524726/pexels-photo-29524726.jpeg?auto=compress&cs=tinysrgb&h=600'], 'talla', false, 0, false, '{"es":"Número","en":"Size"}'::jsonb, '{}', false, 1) returning id into i;
  insert into item_variants (item_id, business_id, label, sort, stock_left) values (i, b, '8', 0, 1);
  insert into item_variants (item_id, business_id, label, sort, stock_left) values (i, b, '9', 1, 2);
  insert into item_variants (item_id, business_id, label, sort, stock_left) values (i, b, '10', 2, 1);
  insert into item_variants (item_id, business_id, label, sort, stock_left) values (i, b, '11', 3, 0);
  insert into item_sections (business_id, module, name, sort) values (b, 'shop', '{"es":"Vestir","en":"Dress"}'::jsonb, 1) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Zapatos de vestir","en":"Dress shoes"}'::jsonb, '{"es":"Negro o marrón.","en":"Black or brown."}'::jsonb, 4900, 'u', 0, array['https://images.pexels.com/photos/18726333/pexels-photo-18726333.jpeg?auto=compress&cs=tinysrgb&h=600'], 'talla', false, 0, false, '{"es":"Número","en":"Size"}'::jsonb, '{}', false, 0) returning id into i;
  insert into item_variants (item_id, business_id, label, sort, stock_left) values (i, b, '8', 0, 2);
  insert into item_variants (item_id, business_id, label, sort, stock_left) values (i, b, '9', 1, 2);
  insert into item_variants (item_id, business_id, label, sort, stock_left) values (i, b, '10', 2, 3);
  insert into item_variants (item_id, business_id, label, sort, stock_left) values (i, b, '11', 3, 1);
end $$;
do $$
declare b text := 'fresh-kicks-hzl'; s bigint; i bigint; g bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo) or exists (select 1 from items where business_id = b and module = 'shop' and removed_at is null) then return; end if;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['shop','pedidos']::text[]))) where id = b;
  insert into delivery_settings (business_id, pickup, delivery, ship, ship_fee_cents, pay_card) values (b, true, false, true, 699, true) on conflict (business_id) do update set ship = true, ship_fee_cents = excluded.ship_fee_cents;
  insert into retail_settings (business_id, cash, hold_hours, returns_days, layaway, lay_down_pct, lay_payments, lay_cancel_pct) select b, 'efectivo' = any(filter_values), 48, 14, false, 20, 4, 10 from businesses where id = b on conflict (business_id) do nothing;
  insert into item_sections (business_id, module, name, sort) values (b, 'shop', '{"es":"Tenis","en":"Sneakers"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Tenis blancos","en":"White sneakers"}'::jsonb, '{"es":"Originales con recibo.","en":"Authentic with receipt."}'::jsonb, 8900, 'u', 0, array['https://images.pexels.com/photos/28271086/pexels-photo-28271086.jpeg?auto=compress&cs=tinysrgb&h=600'], 'talla', false, 0, false, '{"es":"Número","en":"Size"}'::jsonb, '{}', false, 0) returning id into i;
  insert into item_variants (item_id, business_id, label, sort, stock_left) values (i, b, '7', 0, 1);
  insert into item_variants (item_id, business_id, label, sort, stock_left) values (i, b, '8', 1, 3);
  insert into item_variants (item_id, business_id, label, sort, stock_left) values (i, b, '9', 2, 2);
  insert into item_variants (item_id, business_id, label, sort, stock_left) values (i, b, '10', 3, 0);
  insert into item_variants (item_id, business_id, label, sort, stock_left) values (i, b, '11', 4, 1);
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Sudadera","en":"Hoodie"}'::jsonb, '{"es":"Algodón pesado.","en":"Heavyweight cotton."}'::jsonb, 4500, 'u', 0, array['https://images.pexels.com/photos/1020372/pexels-photo-1020372.jpeg?auto=compress&cs=tinysrgb&h=600'], 'talla', false, 0, false, '{"es":"Talla","en":"Size"}'::jsonb, '{}', false, 1) returning id into i;
  insert into item_variants (item_id, business_id, label, sort, stock_left) values (i, b, 'S', 0, 2);
  insert into item_variants (item_id, business_id, label, sort, stock_left) values (i, b, 'M', 1, 4);
  insert into item_variants (item_id, business_id, label, sort, stock_left) values (i, b, 'L', 2, 3);
  insert into item_variants (item_id, business_id, label, sort, stock_left) values (i, b, 'XL', 3, 1);
  insert into item_variants (item_id, business_id, label, sort, stock_left) values (i, b, '2X', 4, 0);
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Gorra","en":"Cap"}'::jsonb, '{"es":"Ajustable.","en":"Adjustable."}'::jsonb, 2500, 'u', 6, array['https://images.pexels.com/photos/701771/pexels-photo-701771.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', false, 0, false, null, '{}', false, 2) returning id into i;
end $$;
do $$
declare b text := 'novias-y-quinces-ana'; s bigint; i bigint; g bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo) or exists (select 1 from items where business_id = b and module = 'shop' and removed_at is null) then return; end if;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['shop','pedidos']::text[]))) where id = b;
  insert into retail_settings (business_id, cash, hold_hours, returns_days, layaway, lay_down_pct, lay_payments, lay_cancel_pct) select b, 'efectivo' = any(filter_values), 48, 0, true, 20, 4, 10 from businesses where id = b on conflict (business_id) do nothing;
  insert into item_sections (business_id, module, name, sort) values (b, 'shop', '{"es":"Quince y novia","en":"Quince & bridal"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Vestido de quince","en":"Quince dress"}'::jsonb, '{"es":"Con corsé y cola. Ajustes incluidos.","en":"Corset and train. Alterations included."}'::jsonb, 45000, 'u', 6, array['https://images.pexels.com/photos/8459404/pexels-photo-8459404.jpeg?auto=compress&cs=tinysrgb&h=600'], 'plan', false, 0, false, null, '{}', false, 0) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Vestido de novia","en":"Wedding dress"}'::jsonb, '{"es":"Sirena o princesa.","en":"Mermaid or ball gown."}'::jsonb, 65000, 'u', 6, array['https://images.pexels.com/photos/8459366/pexels-photo-8459366.jpeg?auto=compress&cs=tinysrgb&h=600'], 'plan', false, 0, false, null, '{}', false, 1) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Ajustes","en":"Alterations"}'::jsonb, '{"es":"Largo y cintura.","en":"Hem and waist."}'::jsonb, 4000, 'u', 6, array['https://images.pexels.com/photos/36883230/pexels-photo-36883230.jpeg?auto=compress&cs=tinysrgb&h=600'], 'serv', false, 0, true, null, '{}', true, 2) returning id into i;
end $$;
do $$
declare b text := 'celulares-y-mas'; s bigint; i bigint; g bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo) or exists (select 1 from items where business_id = b and module = 'shop' and removed_at is null) then return; end if;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['shop','pedidos']::text[]))) where id = b;
  insert into retail_settings (business_id, cash, hold_hours, returns_days, layaway, lay_down_pct, lay_payments, lay_cancel_pct) select b, 'efectivo' = any(filter_values), 48, 14, false, 20, 4, 10 from businesses where id = b on conflict (business_id) do nothing;
  insert into item_sections (business_id, module, name, sort) values (b, 'shop', '{"es":"Teléfonos","en":"Phones"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Samsung Galaxy A15","en":"Samsung Galaxy A15"}'::jsonb, '{"es":"Desbloqueado, 128 GB.","en":"Unlocked, 128 GB."}'::jsonb, 17900, 'u', 6, array['https://images.pexels.com/photos/8734409/pexels-photo-8734409.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', false, 0, false, null, '{}', false, 0) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"iPhone 13 reacondicionado","en":"Refurbished iPhone 13"}'::jsonb, '{"es":"Batería 90 % o más. Garantía 90 días.","en":"Battery 90%+. 90-day warranty."}'::jsonb, 34900, 'u', 6, array['https://images.pexels.com/photos/6755075/pexels-photo-6755075.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', false, 0, false, null, '{}', false, 1) returning id into i;
  insert into item_sections (business_id, module, name, sort) values (b, 'shop', '{"es":"Accesorios y planes","en":"Accessories & plans"}'::jsonb, 1) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Funda y protector","en":"Case and screen protector"}'::jsonb, '{"es":"Te lo ponen gratis.","en":"Installed free."}'::jsonb, 2000, 'u', 6, array['https://images.pexels.com/photos/37605911/pexels-photo-37605911.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', false, 0, false, null, '{}', false, 0) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Plan sin contrato","en":"No-contract plan"}'::jsonb, '{"es":"Llamadas a República Dominicana incluidas.","en":"Calls to the Dominican Republic included."}'::jsonb, 2500, 'u', 6, array['https://images.pexels.com/photos/8734409/pexels-photo-8734409.jpeg?auto=compress&cs=tinysrgb&h=600'], 'serv', false, 0, true, null, '{}', false, 1) returning id into i;
end $$;
do $$
declare b text := 'muebleria-la-familia'; s bigint; i bigint; g bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo) or exists (select 1 from items where business_id = b and module = 'shop' and removed_at is null) then return; end if;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['shop','pedidos']::text[]))) where id = b;
  insert into delivery_settings (business_id, pickup, delivery, ship, ship_fee_cents, pay_card) values (b, true, false, true, 4900, true) on conflict (business_id) do update set ship = true, ship_fee_cents = excluded.ship_fee_cents;
  insert into retail_settings (business_id, cash, hold_hours, returns_days, layaway, lay_down_pct, lay_payments, lay_cancel_pct) select b, 'efectivo' = any(filter_values), 48, 7, true, 20, 4, 10 from businesses where id = b on conflict (business_id) do nothing;
  insert into item_sections (business_id, module, name, sort) values (b, 'shop', '{"es":"Muebles","en":"Furniture"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Juego de sala 3 piezas","en":"3-piece living room set"}'::jsonb, '{"es":"Sofá, loveseat y butaca.","en":"Sofa, loveseat and armchair."}'::jsonb, 89900, 'u', 6, array['https://images.pexels.com/photos/276528/pexels-photo-276528.jpeg?auto=compress&cs=tinysrgb&h=600'], 'plan', false, 0, false, null, '{}', false, 0) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Colchón queen","en":"Queen mattress"}'::jsonb, '{"es":"Oferta esta semana.","en":"On sale this week."}'::jsonb, 29900, 'u', 6, array['https://images.pexels.com/photos/7598137/pexels-photo-7598137.jpeg?auto=compress&cs=tinysrgb&h=600'], 'plan', false, 0, false, null, '{}', false, 1) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Comedor 6 sillas","en":"Dining set, 6 chairs"}'::jsonb, '{"es":"Madera.","en":"Wood."}'::jsonb, 69900, 'u', 6, array['https://images.pexels.com/photos/8135275/pexels-photo-8135275.jpeg?auto=compress&cs=tinysrgb&h=600'], 'plan', false, 0, false, null, '{}', false, 2) returning id into i;
end $$;
do $$
declare b text := 'ferreteria-central'; s bigint; i bigint; g bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo) or exists (select 1 from items where business_id = b and module = 'shop' and removed_at is null) then return; end if;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['shop','pedidos']::text[]))) where id = b;
  insert into retail_settings (business_id, cash, hold_hours, returns_days, layaway, lay_down_pct, lay_payments, lay_cancel_pct) select b, 'efectivo' = any(filter_values), 48, 30, false, 20, 4, 10 from businesses where id = b on conflict (business_id) do nothing;
  insert into item_sections (business_id, module, name, sort) values (b, 'shop', '{"es":"Ferretería","en":"Hardware"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Taladro inalámbrico","en":"Cordless drill"}'::jsonb, '{"es":"Con 2 baterías.","en":"With 2 batteries."}'::jsonb, 8900, 'u', 6, array['https://images.pexels.com/photos/38575493/pexels-photo-38575493.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', false, 0, false, null, '{}', false, 0) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Pintura interior (galón)","en":"Interior paint (gallon)"}'::jsonb, '{"es":"La mezclan al color que traigas.","en":"Mixed to the color you bring."}'::jsonb, 2400, 'u', 6, array['https://images.pexels.com/photos/34462180/pexels-photo-34462180.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', false, 0, false, null, '{}', false, 1) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Copia de llave","en":"Key copy"}'::jsonb, '{"es":"Mientras esperas.","en":"While you wait."}'::jsonb, 300, 'u', 6, array['https://images.pexels.com/photos/7484795/pexels-photo-7484795.jpeg?auto=compress&cs=tinysrgb&h=600'], 'serv', false, 0, true, null, '{}', false, 2) returning id into i;
end $$;
do $$
declare b text := 'belleza-latina-supply'; s bigint; i bigint; g bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo) or exists (select 1 from items where business_id = b and module = 'shop' and removed_at is null) then return; end if;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['shop','pedidos']::text[]))) where id = b;
  insert into retail_settings (business_id, cash, hold_hours, returns_days, layaway, lay_down_pct, lay_payments, lay_cancel_pct) select b, 'efectivo' = any(filter_values), 48, 7, false, 20, 4, 10 from businesses where id = b on conflict (business_id) do nothing;
  insert into item_sections (business_id, module, name, sort) values (b, 'shop', '{"es":"Pelo","en":"Hair"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Plancha profesional","en":"Pro flat iron"}'::jsonb, '{"es":"Titanio, 1 pulgada.","en":"Titanium, 1 inch."}'::jsonb, 4900, 'u', 6, array['https://images.pexels.com/photos/14615063/pexels-photo-14615063.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', false, 0, false, null, '{}', false, 0) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Tratamiento dominicano","en":"Dominican treatment"}'::jsonb, '{"es":"Mascarilla de aguacate.","en":"Avocado mask."}'::jsonb, 1200, 'u', 6, array['https://images.pexels.com/photos/14853183/pexels-photo-14853183.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', false, 0, false, null, '{}', false, 1) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Peluca de cabello natural","en":"Human hair wig"}'::jsonb, '{"es":"18 pulgadas.","en":"18 inches."}'::jsonb, 18900, 'u', 6, array['https://images.pexels.com/photos/14615063/pexels-photo-14615063.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', false, 0, false, null, '{}', false, 2) returning id into i;
end $$;
do $$
declare b text := 'joyeria-oro-fino'; s bigint; i bigint; g bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo) or exists (select 1 from items where business_id = b and module = 'shop' and removed_at is null) then return; end if;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['shop','pedidos']::text[]))) where id = b;
  insert into retail_settings (business_id, cash, hold_hours, returns_days, layaway, lay_down_pct, lay_payments, lay_cancel_pct) select b, 'efectivo' = any(filter_values), 48, 30, true, 25, 3, 10 from businesses where id = b on conflict (business_id) do nothing;
  insert into item_sections (business_id, module, name, sort) values (b, 'shop', '{"es":"Oro","en":"Gold"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Cadena 14k","en":"14k chain"}'::jsonb, '{"es":"20 pulgadas, con certificado.","en":"20 inches, with certificate."}'::jsonb, 18000, 'u', 6, array['https://images.pexels.com/photos/16063740/pexels-photo-16063740.jpeg?auto=compress&cs=tinysrgb&h=600'], 'plan', false, 0, false, null, '{}', false, 0) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Aretes de oro 10k","en":"10k gold earrings"}'::jsonb, '{"es":"Argolla pequeña.","en":"Small hoop."}'::jsonb, 6500, 'u', 6, array['https://images.pexels.com/photos/8201205/pexels-photo-8201205.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', false, 0, false, null, '{}', false, 1) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Cambio de pila de reloj","en":"Watch battery"}'::jsonb, '{"es":"En 10 minutos.","en":"In 10 minutes."}'::jsonb, 1000, 'u', 6, array['https://images.pexels.com/photos/4705626/pexels-photo-4705626.jpeg?auto=compress&cs=tinysrgb&h=600'], 'serv', false, 0, true, null, '{}', false, 2) returning id into i;
end $$;
do $$
declare b text := 'jugueteria-arcoiris'; s bigint; i bigint; g bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo) or exists (select 1 from items where business_id = b and module = 'shop' and removed_at is null) then return; end if;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['shop','pedidos']::text[]))) where id = b;
  insert into retail_settings (business_id, cash, hold_hours, returns_days, layaway, lay_down_pct, lay_payments, lay_cancel_pct) select b, 'efectivo' = any(filter_values), 48, 30, true, 20, 3, 10 from businesses where id = b on conflict (business_id) do nothing;
  insert into item_sections (business_id, module, name, sort) values (b, 'shop', '{"es":"Juguetes","en":"Toys"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Carro de control","en":"RC car"}'::jsonb, '{"es":"Con batería recargable.","en":"Rechargeable battery."}'::jsonb, 3500, 'u', 6, array['https://images.pexels.com/photos/691125/pexels-photo-691125.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', false, 0, false, null, '{}', false, 0) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Muñeca","en":"Doll"}'::jsonb, '{"es":"Con ropa para cambiar.","en":"With spare outfits."}'::jsonb, 2200, 'u', 6, array['https://images.pexels.com/photos/18026389/pexels-photo-18026389.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', false, 0, false, null, '{}', false, 1) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Coche para bebé","en":"Stroller"}'::jsonb, '{"es":"Plegable.","en":"Foldable."}'::jsonb, 12900, 'u', 6, array['https://images.pexels.com/photos/1682462/pexels-photo-1682462.jpeg?auto=compress&cs=tinysrgb&h=600'], 'plan', false, 0, false, null, '{}', false, 2) returning id into i;
end $$;
do $$
declare b text := 'electro-hogar-caribe'; s bigint; i bigint; g bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo) or exists (select 1 from items where business_id = b and module = 'shop' and removed_at is null) then return; end if;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['shop','pedidos']::text[]))) where id = b;
  insert into delivery_settings (business_id, pickup, delivery, ship, ship_fee_cents, pay_card) values (b, true, false, true, 0, true) on conflict (business_id) do update set ship = true, ship_fee_cents = excluded.ship_fee_cents;
  insert into retail_settings (business_id, cash, hold_hours, returns_days, layaway, lay_down_pct, lay_payments, lay_cancel_pct) select b, 'efectivo' = any(filter_values), 48, 14, true, 20, 6, 10 from businesses where id = b on conflict (business_id) do nothing;
  insert into item_sections (business_id, module, name, sort) values (b, 'shop', '{"es":"Electrodomésticos","en":"Appliances"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Nevera 18 pies","en":"18 cu ft fridge"}'::jsonb, '{"es":"Envío e instalación el mismo día.","en":"Same-day delivery and install."}'::jsonb, 69900, 'u', 6, array['https://images.pexels.com/photos/6835090/pexels-photo-6835090.jpeg?auto=compress&cs=tinysrgb&h=600'], 'plan', false, 0, false, null, '{}', false, 0) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Lavadora","en":"Washer"}'::jsonb, '{"es":"Carga superior.","en":"Top load."}'::jsonb, 54900, 'u', 6, array['https://images.pexels.com/photos/8774643/pexels-photo-8774643.jpeg?auto=compress&cs=tinysrgb&h=600'], 'plan', false, 0, false, null, '{}', false, 1) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Televisor 55\"","en":"55\" TV"}'::jsonb, '{"es":"4K.","en":"4K."}'::jsonb, 39900, 'u', 6, array['https://images.pexels.com/photos/37605911/pexels-photo-37605911.jpeg?auto=compress&cs=tinysrgb&h=600'], 'plan', false, 0, false, null, '{}', false, 2) returning id into i;
end $$;
do $$
declare b text := 'moda-para-el-y-los-ninos'; s bigint; i bigint; g bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo) or exists (select 1 from items where business_id = b and module = 'shop' and removed_at is null) then return; end if;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['shop','pedidos']::text[]))) where id = b;
  insert into retail_settings (business_id, cash, hold_hours, returns_days, layaway, lay_down_pct, lay_payments, lay_cancel_pct) select b, 'efectivo' = any(filter_values), 48, 30, false, 20, 4, 10 from businesses where id = b on conflict (business_id) do nothing;
  insert into item_sections (business_id, module, name, sort) values (b, 'shop', '{"es":"Ropa","en":"Clothing"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Camisa de vestir","en":"Dress shirt"}'::jsonb, '{"es":"Blanca, azul o negra. Tallas S a 3XL.","en":"White, blue or black. Sizes S to 3XL."}'::jsonb, 1800, 'u', 6, array['https://images.pexels.com/photos/29765480/pexels-photo-29765480.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', false, 0, false, null, '{}', false, 0) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Conjunto de niño","en":"Kids set"}'::jsonb, '{"es":"Camiseta y pantalón, de 2 a 14 años.","en":"T-shirt and pants, ages 2 to 14."}'::jsonb, 2200, 'u', 6, array['https://images.pexels.com/photos/5560083/pexels-photo-5560083.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', false, 0, false, null, '{}', false, 1) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Camiseta con tu logo","en":"Logo T-shirt"}'::jsonb, '{"es":"Desde 12 piezas; te mandan la prueba antes.","en":"From 12 pieces; you get a proof first."}'::jsonb, 900, 'u', 6, array['https://images.pexels.com/photos/701771/pexels-photo-701771.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', false, 0, false, null, '{}', false, 2) returning id into i;
end $$;
do $$
declare b text := 'casa-linda-decoracion'; s bigint; i bigint; g bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo) or exists (select 1 from items where business_id = b and module = 'shop' and removed_at is null) then return; end if;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['shop','pedidos']::text[]))) where id = b;
  insert into delivery_settings (business_id, pickup, delivery, ship, ship_fee_cents, pay_card) values (b, true, false, true, 999, true) on conflict (business_id) do update set ship = true, ship_fee_cents = excluded.ship_fee_cents;
  insert into retail_settings (business_id, cash, hold_hours, returns_days, layaway, lay_down_pct, lay_payments, lay_cancel_pct) select b, 'efectivo' = any(filter_values), 48, 30, false, 20, 4, 10 from businesses where id = b on conflict (business_id) do nothing;
  insert into item_sections (business_id, module, name, sort) values (b, 'shop', '{"es":"Casa","en":"Home"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Juego de calderos","en":"Pot set"}'::jsonb, '{"es":"Aluminio, 3 tamaños.","en":"Aluminum, 3 sizes."}'::jsonb, 2900, 'u', 6, array['https://images.pexels.com/photos/4437148/pexels-photo-4437148.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', false, 0, false, null, '{}', false, 0) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Cortinas","en":"Curtains"}'::jsonb, '{"es":"Par, varios colores.","en":"Pair, several colors."}'::jsonb, 2500, 'u', 6, array['https://images.pexels.com/photos/8135275/pexels-photo-8135275.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', false, 0, false, null, '{}', false, 1) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Juego de vasos","en":"Glass set"}'::jsonb, '{"es":"12 piezas.","en":"12 pieces."}'::jsonb, 1500, 'u', 6, array['https://images.pexels.com/photos/4437148/pexels-photo-4437148.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', false, 0, false, null, '{}', false, 2) returning id into i;
end $$;
do $$
declare b text := 'materiales-vivero-garcia'; s bigint; i bigint; g bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo) or exists (select 1 from items where business_id = b and module = 'shop' and removed_at is null) then return; end if;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['shop','pedidos']::text[]))) where id = b;
  insert into delivery_settings (business_id, pickup, delivery, ship, ship_fee_cents, pay_card) values (b, true, false, true, 4500, true) on conflict (business_id) do update set ship = true, ship_fee_cents = excluded.ship_fee_cents;
  insert into retail_settings (business_id, cash, hold_hours, returns_days, layaway, lay_down_pct, lay_payments, lay_cancel_pct) select b, 'efectivo' = any(filter_values), 48, 14, false, 20, 4, 10 from businesses where id = b on conflict (business_id) do nothing;
  insert into item_sections (business_id, module, name, sort) values (b, 'shop', '{"es":"Materiales","en":"Materials"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Bloque de concreto","en":"Concrete block"}'::jsonb, '{"es":"8 × 8 × 16, por unidad.","en":"8 × 8 × 16, each."}'::jsonb, 200, 'u', 6, array['https://images.pexels.com/photos/7640990/pexels-photo-7640990.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', false, 0, false, null, '{}', false, 0) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Saco de cemento","en":"Cement bag"}'::jsonb, '{"es":"94 lb.","en":"94 lb."}'::jsonb, 1600, 'u', 6, array['https://images.pexels.com/photos/7640990/pexels-photo-7640990.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', false, 0, false, null, '{}', false, 1) returning id into i;
  insert into item_sections (business_id, module, name, sort) values (b, 'shop', '{"es":"Vivero","en":"Garden"}'::jsonb, 1) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Planta de jardín","en":"Garden plant"}'::jsonb, '{"es":"Flores de temporada.","en":"Seasonal flowers."}'::jsonb, 600, 'u', 6, array['https://images.pexels.com/photos/32759035/pexels-photo-32759035.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', false, 0, false, null, '{}', false, 0) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Tierra para sembrar","en":"Potting soil"}'::jsonb, '{"es":"Saco de 40 lb.","en":"40 lb bag."}'::jsonb, 800, 'u', 6, array['https://images.pexels.com/photos/32759035/pexels-photo-32759035.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', false, 0, false, null, '{}', false, 1) returning id into i;
end $$;
do $$
declare b text := 'pc-gamer-hazleton'; s bigint; i bigint; g bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo) or exists (select 1 from items where business_id = b and module = 'shop' and removed_at is null) then return; end if;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['shop','pedidos']::text[]))) where id = b;
  insert into retail_settings (business_id, cash, hold_hours, returns_days, layaway, lay_down_pct, lay_payments, lay_cancel_pct) select b, 'efectivo' = any(filter_values), 48, 14, true, 20, 3, 10 from businesses where id = b on conflict (business_id) do nothing;
  insert into item_sections (business_id, module, name, sort) values (b, 'shop', '{"es":"Tecnología","en":"Tech"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Laptop para la escuela","en":"School laptop"}'::jsonb, '{"es":"8 GB, 256 GB. Con plan de pagos.","en":"8 GB, 256 GB. With layaway."}'::jsonb, 39900, 'u', 6, array['https://images.pexels.com/photos/4705634/pexels-photo-4705634.jpeg?auto=compress&cs=tinysrgb&h=600'], 'plan', false, 0, false, null, '{}', false, 0) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Juego usado","en":"Used game"}'::jsonb, '{"es":"Probado; 30 días para cambiarlo.","en":"Tested; 30 days to exchange."}'::jsonb, 1500, 'u', 6, array['https://images.pexels.com/photos/845451/pexels-photo-845451.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', false, 0, false, null, '{}', false, 1) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Control nuevo","en":"New controller"}'::jsonb, '{"es":"PlayStation o Xbox.","en":"PlayStation or Xbox."}'::jsonb, 5900, 'u', 6, array['https://images.pexels.com/photos/845451/pexels-photo-845451.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', false, 0, false, null, '{}', false, 2) returning id into i;
end $$;
do $$
declare b text := 'libreria-el-saber'; s bigint; i bigint; g bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo) or exists (select 1 from items where business_id = b and module = 'shop' and removed_at is null) then return; end if;
  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['shop','pedidos']::text[]))) where id = b;
  insert into retail_settings (business_id, cash, hold_hours, returns_days, layaway, lay_down_pct, lay_payments, lay_cancel_pct) select b, 'efectivo' = any(filter_values), 48, 7, false, 20, 4, 10 from businesses where id = b on conflict (business_id) do nothing;
  insert into item_sections (business_id, module, name, sort) values (b, 'shop', '{"es":"Librería","en":"Books"}'::jsonb, 0) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Lista de útiles","en":"School supply list"}'::jsonb, '{"es":"Te la preparan; la recoges al otro día.","en":"They pack your list; pick up the next day."}'::jsonb, 3500, 'u', 6, array['https://images.pexels.com/photos/164686/pexels-photo-164686.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', false, 0, false, null, '{}', false, 0) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Biblia en español","en":"Spanish Bible"}'::jsonb, '{"es":"Reina-Valera, letra grande.","en":"Reina-Valera, large print."}'::jsonb, 1800, 'u', 6, array['https://images.pexels.com/photos/164686/pexels-photo-164686.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', false, 0, false, null, '{}', false, 1) returning id into i;
  insert into item_sections (business_id, module, name, sort) values (b, 'shop', '{"es":"Trofeos","en":"Trophies"}'::jsonb, 1) returning id into s;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Trofeo grabado","en":"Engraved trophy"}'::jsonb, '{"es":"Con nombre y fecha, en 3 días.","en":"With name and date, in 3 days."}'::jsonb, 1200, 'u', 6, array['https://images.pexels.com/photos/34491716/pexels-photo-34491716.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', false, 0, false, null, '{}', false, 0) returning id into i;
  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, '{"es":"Placa de reconocimiento","en":"Recognition plaque"}'::jsonb, '{"es":"Madera y metal.","en":"Wood and metal."}'::jsonb, 3500, 'u', 6, array['https://images.pexels.com/photos/34491716/pexels-photo-34491716.jpeg?auto=compress&cs=tinysrgb&h=600'], 'unid', false, 0, false, null, '{}', false, 1) returning id into i;
end $$;
commit;
