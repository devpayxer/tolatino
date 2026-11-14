-- Semilla de pruebas · 9n-2 · El panel del negocio. SOLO SANDBOX (decisión I; regla 13).
-- Para revisar «Aceptar una invitación al equipo» sin armar nada: una invitación VIVA de Sabor Dominicano para el teléfono de prueba +1 570 555 0251
-- (entra con ese número y abre /e/PruebaEq). El código es de prueba, de un solo uso y vence a los 365 días; en producción esta semilla nunca corre.
-- Idempotente: el teléfono invitado es único por negocio (índice parcial) y el código también.
begin;

do $$
begin
  if not exists (select 1 from businesses where id = 'sabor-dominicano') then return; end if;
  if exists (select 1 from business_members where business_id = 'sabor-dominicano' and phone = '+15705550251' and status in ('invited', 'requested', 'active')) then return; end if;
  if exists (select 1 from business_members where invite_code = 'PruebaEq') then return; end if;
  insert into business_members (business_id, kind, display_name, role, phone, status, show_on_page, same_as_business_hours, invite_code, invited_at, invite_expires_at, invite_sends, sort)
  values ('sabor-dominicano', 'staff', 'Invitada de Prueba', '{"es":"Caja y mostrador","en":"Register and counter"}'::jsonb, '+15705550251', 'invited', true, true, 'PruebaEq', now(), now() + interval '365 days', 1,
          (select coalesce(max(sort), 0) + 1 from business_members where business_id = 'sabor-dominicano'));
end $$;

commit;
