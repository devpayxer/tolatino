-- Barbería El Primo (prototipo neg-bell-listing.js · neg-bell-book.js PROS): 4 sillas rentadas, servicios con su precio por
-- silla, extras y las reglas de cada silla. SOLO SANDBOX: corre solo sobre el negocio de ejemplo (is_demo) y una vez.
-- Dueño de prueba: Luis Batista «El Primo», teléfono +1 570 555 0166 (silla 1).
begin;
do $$
declare b text := 'barberia-el-primo'; dueno uuid; m1 uuid; m2 uuid; m3 uuid; m4 uuid; sc bigint; sb bigint; se bigint;
  i_cc bigint; i_fd bigint; i_cb bigint; i_cn bigint; i_ab bigint; i_af bigint; i_ds bigint; i_cj bigint;
begin
  if not exists (select 1 from businesses where id = b and is_demo) or exists (select 1 from items where business_id = b and module = 'svc') then return; end if;
  insert into users (phone, first_name, last_name, lang, home_city_id) values ('+15705550166', 'Luis', 'Batista', 'es', 'hzl')
    on conflict (phone) do update set first_name = coalesce(users.first_name, 'Luis') returning id into dueno;
  update businesses set modules_on = array['svc', 'citas', 'staff']::text[], svc_model = 'chair', svc_rent_cents = 15000 where id = b;
  insert into business_members (business_id, user_id, kind, display_name, nickname, role, status, show_on_page, panel_access, chair_seat, chair_response_min, chair_deposit_cents, since_year, sort, same_as_business_hours)
    values (b, dueno, 'owner', 'Luis Batista', 'El Primo', '{"es":"Barbero · dueño","en":"Barber · owner"}'::jsonb, 'active', true, '{all}', 1, 15, 1000, 2014, 0, true) returning id into m1;
  insert into business_members (business_id, kind, display_name, role, status, show_on_page, chair_seat, chair_auto, chair_deposit_cents, since_year, sort, same_as_business_hours)
    values (b, 'renter', 'Kelvin Rosario', '{"es":"Barbero · renta su silla","en":"Barber · rents his chair"}'::jsonb, 'active', true, 2, true, 500, 2019, 1, true) returning id into m2;
  insert into business_members (business_id, kind, display_name, role, status, show_on_page, chair_seat, chair_response_min, chair_deposit_cents, since_year, sort, same_as_business_hours)
    values (b, 'renter', 'Andy Mejía', '{"es":"Barbero · renta su silla","en":"Barber · rents his chair"}'::jsonb, 'active', true, 3, 30, 0, 2021, 2, true) returning id into m3;
  insert into business_members (business_id, kind, display_name, role, status, show_on_page, chair_seat, chair_response_min, chair_deposit_cents, since_year, sort, same_as_business_hours)
    values (b, 'renter', 'Johan Peralta', '{"es":"Barbero · renta su silla","en":"Barber · rents his chair"}'::jsonb, 'active', true, 4, 60, 0, 2024, 3, true) returning id into m4;
  insert into booking_policies (business_id, cancel_free_h, staff_pick) values (b, 4, true) on conflict (business_id) do nothing;

  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Cortes","en":"Cuts"}', 0) returning id into sc;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Barba","en":"Beard"}', 1) returning id into sb;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', '{"es":"Extras","en":"Extras"}', 2) returning id into se;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, buffer_min, price_from, sort) values
    (b, 'svc', sc, '{"es":"Corte clásico","en":"Classic cut"}', '{"es":"Máquina y tijera, con lavado","en":"Clippers and scissors, with wash"}', 2000, 30, 5, true, 0) returning id into i_cc;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, buffer_min, price_from, sort) values
    (b, 'svc', sc, '{"es":"Fade","en":"Fade"}', '{"es":"Low, mid o high, con navaja","en":"Low, mid or high, with razor"}', 2500, 40, 5, true, 1) returning id into i_fd;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, buffer_min, price_from, sort) values
    (b, 'svc', sc, '{"es":"Corte + barba","en":"Cut + beard"}', '{"es":"Fade y barba perfilada con toalla caliente","en":"Fade and shaped beard with hot towel"}', 3500, 55, 5, true, 2) returning id into i_cb;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, buffer_min, price_from, sort) values
    (b, 'svc', sc, '{"es":"Corte de niño","en":"Kids cut"}', '{"es":"Hasta 12 años","en":"Up to 12 years old"}', 1500, 25, 5, true, 3) returning id into i_cn;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, buffer_min, price_from, sort) values
    (b, 'svc', sb, '{"es":"Arreglo de barba","en":"Beard trim"}', '{"es":"Perfilado con navaja","en":"Shaped with a razor"}', 1200, 20, 5, true, 0) returning id into i_ab;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, buffer_min, price_from, sort) values
    (b, 'svc', sb, '{"es":"Afeitado clásico","en":"Classic shave"}', '{"es":"Toalla caliente y navaja","en":"Hot towel and razor"}', 2000, 30, 5, true, 1) returning id into i_af;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, is_extra, sort) values
    (b, 'svc', se, '{"es":"Diseño","en":"Design"}', '{"es":"Líneas o diseño en la nuca","en":"Lines or a design at the nape"}', 500, 10, true, 0) returning id into i_ds;
  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, is_extra, sort) values
    (b, 'svc', se, '{"es":"Cejas con navaja","en":"Razor brows"}', '{"es":"Con navaja","en":"With a razor"}', 500, 5, true, 1) returning id into i_cj;

  -- Precio de cada silla (pr del prototipo). Sin fila = no lo hace.
  insert into staff_services (member_id, item_id, price_cents) values
    (m1, i_cc, 2200), (m1, i_fd, 2800), (m1, i_cb, 3800), (m1, i_cn, 1500), (m1, i_ab, 1400), (m1, i_af, 2200), (m1, i_ds, null), (m1, i_cj, null),
    (m2, i_cc, 2000), (m2, i_fd, 2500), (m2, i_cb, 3500), (m2, i_cn, 1500), (m2, i_ab, 1200), (m2, i_af, 2000), (m2, i_ds, null), (m2, i_cj, null),
    (m3, i_cc, 1800), (m3, i_fd, 2200), (m3, i_cb, 3000), (m3, i_cn, 1200), (m3, i_ab, 1000), (m3, i_ds, null), (m3, i_cj, null),
    (m4, i_cc, 2000), (m4, i_fd, 2500), (m4, i_cb, 3200), (m4, i_ab, 1200), (m4, i_af, 1800), (m4, i_ds, null), (m4, i_cj, null);
end $$;
commit;
