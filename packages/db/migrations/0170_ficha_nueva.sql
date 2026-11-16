-- 0170 · C-007 — la ficha nueva reemplaza la página del negocio (APP-NEG-LISTING) de los negocios Pro, en teléfono y computadora
-- (canvas tolatino-master+, project/entrega/cambios.md). Free sigue con la ficha de siempre (su versión nueva no está decidida).
-- · ficha_nueva_pro (1 = la ficha nueva para los Pro · 0 = todos con la de siempre) entra al catálogo de Configuración, sección nueva
--   «negocios». Es el interruptor para volver atrás sin desplegar: la página (app/(app)/n/[id]/page.tsx) lo lee con valor() en cada visita.
-- Idempotente: insert … on conflict do nothing.
begin;

create or replace function pg_temp.ampliar_check(t regclass, nombre text, valores text[]) returns void language plpgsql as $$
declare d text; v text; nuevo text := '';
begin
  select pg_get_constraintdef(oid) into d from pg_constraint where conname = nombre and conrelid = t;
  if d is null then return; end if;
  foreach v in array valores loop
    if position(quote_literal(v) in d) = 0 then nuevo := nuevo || quote_literal(v) || '::text, '; end if;
  end loop;
  if nuevo = '' then return; end if;
  execute format('alter table %s drop constraint %I', t, nombre);
  execute format('alter table %s add constraint %I %s', t, nombre, replace(d, 'ARRAY[', 'ARRAY[' || nuevo));
end $$;

do $$ begin perform pg_temp.ampliar_check('config_keys', 'config_keys_section_check', array['negocios']); end $$;

insert into config_keys (key, min, max, def, unit, section, label, help, editable, bloqueo, edit_in, sort) values
  ('ficha_nueva_pro', 0, 1, 1, '{"es":"1 = sí · 0 = no","en":"1 = yes · 0 = no"}', 'negocios', '{"es":"Ficha nueva para los negocios Pro","en":"New business page for Pro businesses"}',
    '{"es":"Con 1, la página de cada negocio Pro es la ficha nueva (pestañas en el teléfono, una sola página con la tarjeta a la derecha en la computadora). Con 0, todos vuelven a la ficha de siempre al momento. Los negocios Free siempre tienen la de siempre. Pedidos, citas y reservas funcionan igual con las dos.","en":"With 1, every Pro business page is the new page (tabs on the phone, one page with the card on the right on a computer). With 0, everyone goes back to the usual page right away. Free businesses always have the usual one. Orders, appointments and reservations work the same with both."}', true, null, null, 1)
on conflict (key) do nothing;

commit;
