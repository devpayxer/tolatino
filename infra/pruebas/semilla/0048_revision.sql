-- Semilla de pruebas · 8i · Las cuentas de revisión de Apple y Google, SOLO SANDBOX (decisión I; fase8-apps.md §6 #24). En producción se crean
-- a mano en la Fase 9 con el OK del fundador (Paquete 9). Todo is_test.
--   · Cuatro cuentas, una por app, con números de FICCIÓN (+1 484 555 0181…0184: los 555-01xx no existen; nunca llega un SMS). Entran con su
--     código FIJO, que vive en el entorno (REVISION_CODIGO_CLIENTE, _NEGOCIO, _REPARTIDOR, _PUERTA; deploy.sh lo crea al azar) y nunca aquí.
--   · Negocios: el negocio de revisión «To’Latino Revisión» OCULTO (status hidden: no sale en la página, Buscar ni el mapa), con la cuenta de
--     Negocios de dueña. Repartidor: repartidor de ese negocio. Puerta: entra y ve su inicio; el portero se suma desde el panel del negocio de
--     revisión (invitación de verdad: el teléfono del portero va cifrado y la semilla no tiene la llave).
--   · Las cuentas nacen ACTIVAS pero el interruptor app.revision.cuentas sigue APAGADO: sin encenderlo (Sistema › Apps › Fichas y revisión, con
--     motivo) ningún código fijo sirve.
-- Idempotente: cada cosa se reconoce por su teléfono o su id.
begin;

do $$
declare
  cli uuid; neg uuid; rep uuid; pue uuid;
begin
  insert into users (phone, first_name, last_name, lang, home_city_id, phone_verified_at) values
    ('+14845550181', 'Revisión', 'To’Latino', 'en', 'hzl', now()),
    ('+14845550182', 'Revisión', 'Negocios', 'en', 'hzl', now()),
    ('+14845550183', 'Revisión', 'Repartidor', 'en', 'hzl', now()),
    ('+14845550184', 'Revisión', 'Puerta', 'en', 'hzl', now())
  on conflict (phone) do nothing;
  select id into cli from users where phone = '+14845550181';
  select id into neg from users where phone = '+14845550182';
  select id into rep from users where phone = '+14845550183';
  select id into pue from users where phone = '+14845550184';

  -- El negocio de revisión: oculto desde que nace (nadie lo ve fuera del panel de su dueña y del Super Admin).
  insert into businesses (id, city_id, category_id, subcategory_ids, name, status, status_reason, status_at, origin, owner_user_id, address, phone, about, filter_values, is_demo)
  values ('revision-tolatino', 'hzl', 'NEG-FOOD', array['NEG-FOOD-10']::text[], 'To’Latino Revisión', 'hidden', 'Negocio de revisión de las tiendas (8i): invisible para todos', now(), 'self', neg,
    '100 Ejemplo St, Hazleton PA', '+14845550182', '{"es":"Negocio de revisión de las tiendas. No es un negocio de verdad y nadie lo ve.","en":"Store review business. Not a real business and nobody sees it."}'::jsonb,
    array['pickup','delivery','online']::text[], true)
  on conflict (id) do nothing;
  insert into business_stats_cache (business_id, plan, verified, photo_count) values ('revision-tolatino', 'pro', false, 0) on conflict (business_id) do nothing;
  if not exists (select 1 from business_members where business_id = 'revision-tolatino' and user_id = neg) then
    insert into business_members (business_id, user_id, kind, display_name, status, show_on_page, panel_access)
    values ('revision-tolatino', neg, 'owner', 'Revisión Negocios', 'active', false, '{all}');
  end if;
  if not exists (select 1 from delivery_drivers where business_id = 'revision-tolatino' and user_id = rep) then
    insert into delivery_drivers (business_id, user_id, display_name, phone, vehicle, status, accepted_at)
    values ('revision-tolatino', rep, 'Revisión Repartidor', '+14845550183', 'auto', 'active', now());
  end if;

  insert into review_accounts (app, user_id, business_id, purpose, code_ref, active, is_test) values
    ('cliente', cli, null, 'Revisión de Apple y Google · To’Latino (sandbox)', 'REVISION_CODIGO_CLIENTE', true, true),
    ('negocio', neg, 'revision-tolatino', 'Revisión de Apple y Google · Negocios, con el negocio oculto (sandbox)', 'REVISION_CODIGO_NEGOCIO', true, true),
    ('delivery', rep, null, 'Revisión de Apple y Google · Repartidor (sandbox)', 'REVISION_CODIGO_REPARTIDOR', true, true),
    ('checkin', pue, null, 'Revisión de Apple y Google · Puerta (sandbox)', 'REVISION_CODIGO_PUERTA', true, true)
  on conflict (user_id) do nothing;
end $$;

commit;
