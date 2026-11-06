-- Fase 4 · 4f (planes). SOLO SANDBOX. Un dueño de prueba y una cuenta de cobro simulada para Hermanos Díaz Multiservicios
-- (tiene «Mantenimiento de la casa»), y los meses de visita del Plan de confort de Cibao (calefacción en octubre, aire en abril).
begin;
do $$
declare b text := 'hermanos-diaz-multiservicios';
begin
  if not exists (select 1 from businesses where id = b and is_demo) then return; end if;
  insert into users (phone, first_name, last_name, lang, home_city_id) values ('+15705550233', 'Héctor', 'Díaz', 'es', 'hzl') on conflict (phone) do nothing;
  if not exists (select 1 from business_members where business_id = b and kind = 'owner' and user_id is not null) then
    insert into business_members (business_id, user_id, kind, display_name, status, show_on_page, panel_access, sort, same_as_business_hours)
      select b, u.id, 'owner', 'Héctor Díaz', 'active', true, array['all'], 0, true from users u where u.phone = '+15705550233';
  end if;
  insert into stripe_accounts (business_id, stripe_account_id, status, charges_enabled, payouts_enabled, requirements, bank_last4, simulated)
    values (b, 'acct_sim_' || b, 'enabled', true, true, '[]'::jsonb, '4410', true) on conflict (business_id) do nothing;
end $$;
update items set svc_attrs = svc_attrs || '{"vis": [10, 4]}'::jsonb where business_id = 'calefaccion-aire-cibao' and svc_kind = 'plan' and not (svc_attrs ? 'vis');
commit;
