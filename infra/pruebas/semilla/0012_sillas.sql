-- Sillas rentadas de ejemplo (Fase 3 · 3d). SOLO SANDBOX: corre sobre el negocio de ejemplo (is_demo) y una vez.
-- Kelvin Rosario (silla 2) entra a To'Latino con +1 570 555 0177 para conectar su propia cuenta de cobro (simulada en el
-- sandbox) desde el aviso que le manda el dueño. Su presentación sale en la página de su silla.
begin;
do $$
declare b text := 'barberia-el-primo'; kel uuid;
begin
  if not exists (select 1 from businesses where id = b and is_demo) then return; end if;
  insert into users (phone, first_name, last_name, lang, home_city_id) values ('+15705550177', 'Kelvin', 'Rosario', 'es', 'hzl')
    on conflict (phone) do update set first_name = coalesce(users.first_name, 'Kelvin') returning id into kel;
  update business_members set user_id = kel,
         bio = '{"es":"Fades y diseños desde 2019. Llego temprano y confirmo al instante: si ves la hora libre, es tuya.","en":"Fades and designs since 2019. If you see the time open, it is yours."}'::jsonb
   where business_id = b and chair_seat = 2 and kind = 'renter' and user_id is null;
end $$;
commit;
