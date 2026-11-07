-- Fase 4 · 4y-4 (renta de vehículos). SOLO SANDBOX. Renta de Camionetas Hazleton renta con el motor de rentas de 4f-2:
-- precio por día, depósito, cuántas tiene, millas incluidas por día (mpd) y el precio de la milla de más (mi, en centavos).
-- Los servicios «precio cerrado con fotos» que traía del prototipo no aplican a una renta: quedan retirados (no se borran).
-- Un dueño de prueba para el panel: Daniel (5705550355). Cuenta de cobro simulada.
begin;
insert into users (phone, first_name, last_name, lang, home_city_id) select '+15705550355', 'Daniel', 'Camionetas', 'es', 'hzl'
  where exists (select 1 from businesses where id = 'renta-camionetas-hzl' and is_demo) on conflict (phone) do nothing;
do $$
declare b text := 'renta-camionetas-hzl';
  r record;
begin
  if not exists (select 1 from businesses where id = b and is_demo) then return; end if;
  for r in select * from (values
    (0, 'Camioneta de 15 pasajeros', '15-passenger van', 'Por día · 150 millas incluidas · licencia y 21 años', 'Per day · 150 miles included · license and age 21', 11900, 50000, 1, 150, 35),
    (1, 'Camioneta de carga', 'Cargo van', 'Por día · 150 millas incluidas · licencia y 21 años', 'Per day · 150 miles included · license and age 21', 8900, 30000, 2, 150, 35),
    (2, 'Remolque de 6 × 12', '6 × 12 trailer', 'Por día · se engancha a tu vehículo · licencia y 21 años', 'Per day · hitches to your vehicle · license and age 21', 4900, 15000, 1, 0, 0)
  ) as t(s, n, ne, d, de, p, dep, qty, mpd, mi) loop
    if not exists (select 1 from items where business_id = b and module = 'renta' and name->>'es' = r.n) then
      insert into items (business_id, module, name, descr, price_cents, unit, tax_pct, channels, stock_mode, stock_left, stock_par, deposit_cents, sort, svc_attrs)
      values (b, 'renta', jsonb_build_object('es', r.n, 'en', r.ne), jsonb_build_object('es', r.d, 'en', r.de), r.p, 'dia', 6, '{pick}', 'qty', r.qty, r.qty, r.dep, r.s,
              case when r.mpd > 0 then jsonb_build_object('mpd', r.mpd, 'mi', r.mi) else '{}'::jsonb end);
    end if;
  end loop;
  update items set removed_at = now() where business_id = b and module = 'svc' and svc_kind = 'cotiza' and removed_at is null;
  update businesses set modules_on = array(select distinct x from unnest(modules_on || array['renta']) x) where id = b and not ('renta' = any(modules_on));
  insert into business_members (business_id, user_id, kind, display_name, role, status, show_on_page, panel_access, since_year, sort, same_as_business_hours)
    select b, u.id, 'owner', 'Daniel Camionetas', '{"es":"Dueño","en":"Owner"}'::jsonb, 'active', true, '{all}', 2018, 0, true from users u
     where u.phone = '+15705550355' and not exists (select 1 from business_members m where m.business_id = b and m.kind = 'owner');
  insert into stripe_accounts (business_id, stripe_account_id, status, charges_enabled, payouts_enabled, requirements, bank_last4, simulated)
    values (b, 'acct_sim_' || b, 'enabled', true, true, '[]'::jsonb, '4288', true) on conflict (business_id) do nothing;
end $$;
commit;
