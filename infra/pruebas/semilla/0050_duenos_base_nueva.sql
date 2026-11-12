-- Semilla de pruebas · 9b-1 · Los dueños que la base del sandbox tenía desde el 5 nov y que una base NUEVA no tiene. SOLO SANDBOX (decisión I;
-- regla 13). Las semillas ya confirmadas no se editan: esta las completa (como 0049).
--   · Pedro Prueba (+1 570 555 0133, ficción 555) es el dueño de Sabor Dominicano: lo da por hecho la semilla 0007 (firma las respuestas a las
--     reseñas de Sabor Dominicano con su id) y lo dan por hecho ~40 pruebas del panel (menú, pedidos, mensajes, planes, Free/Pro). En el sandbox
--     de siempre lo hizo dueño la prueba rec2 (reclamo con código, 5 nov); en una base recién sembrada Pedro no existía y Sabor Dominicano no
--     tenía dueño: esas pruebas fallaban en el primer paso. rec2 ahora reclama un negocio propio de la corrida.
--   · Kelvin (+1 570 555 0177, ya en la semilla) es el dueño de Multiservicios La Patria (licencias, 1k: lic) por la misma razón.
--   · Luis (+1 570 555 0166, ya en la semilla) es el dueño de Bufete Almonte (lo reclamó rec1j el 5 nov): las pruebas de Profesionales
--     (pro4l, pro4l2, svc4h2) entran a su panel con él, y sin una persona que reciba citas el bufete no tenía horas para pedir en línea.
--   · Sabor Dominicano cobra con tarjeta: su cuenta de cobro del simulador (como las de 0015…0026 para los otros negocios). En el sandbox de
--     siempre la conectó pagos2d (2d); en una base nueva, las pruebas que corren antes (din2o, avisos, pedidos con tarjeta) no la tenían.
-- Solo si el negocio NO tiene dueño (en el sandbox de siempre ya lo tiene y no cambia nada). Nada se borra.
begin;

insert into users (phone, phone_verified_at, first_name, last_name, home_city_id) values
  ('+15705550133', now(), 'Pedro', 'Prueba', 'hzl')
on conflict (phone) do nothing;

do $$
declare x record; u users;
begin
  for x in select * from (values ('sabor-dominicano', '+15705550133'), ('multiservicios-la-patria', '+15705550177'), ('bufete-almonte', '+15705550166')) v(negocio, tel) loop
    select * into u from users where phone = x.tel;
    if u.id is null or not exists (select 1 from businesses where id = x.negocio and owner_user_id is null and status = 'active') then continue; end if;
    -- Lo mismo que hace «Aplicar cambio» de un reclamo (admin/acciones-colas.ts, decidirReclamo): miembro dueño con todo el panel y owner_user_id.
    update business_members set kind = 'owner', panel_access = '{all}', updated_at = now()
     where business_id = x.negocio and user_id = u.id and status = 'active';
    if not found then
      insert into business_members (business_id, user_id, kind, display_name, phone, panel_access, status)
      values (x.negocio, u.id, 'owner', trim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')), u.phone, '{all}', 'active');
    end if;
    update businesses set owner_user_id = u.id, updated_at = now() where id = x.negocio and owner_user_id is null;
  end loop;
end $$;

insert into stripe_accounts (business_id, stripe_account_id, status, charges_enabled, payouts_enabled, requirements, bank_last4, simulated)
select 'sabor-dominicano', 'acct_sim_sabor-dominicano', 'enabled', true, true, '[]'::jsonb, '6789', true
 where exists (select 1 from businesses where id = 'sabor-dominicano')
on conflict (business_id) do nothing;

-- Boutique Yaritza cobra con tarjeta (0019: «update delivery_settings set pay_card = true»): en una base nueva la tienda no tenía su fila de
-- Pedidos y el update no hacía nada, así que el plan de pagos (layaway) no salía en su ficha. La fila, con la tarjeta encendida.
insert into delivery_settings (business_id, pay_card)
select 'boutique-yaritza', true where exists (select 1 from businesses where id = 'boutique-yaritza' and is_demo)
on conflict (business_id) do nothing;

-- Los organizadores de la semilla 0035 (la Parroquia «publica sin revisión previa», la Cantina, El Palacio, Welly Cruz, Inglés para Todos) tienen sus eventos en
-- vivo, pero en una base nueva no tenían el módulo Eventos encendido: ninguno salía en /eventos ni se podía comprar (evt_negocio_publico). En
-- el sandbox de siempre ya lo tienen. El trigger businesses_evt_relistar vuelve a calcular sus fechas.
update businesses set modules_on = array(select distinct x from unnest(modules_on || array['eventos']) x), updated_at = now()
 where id in ('parroquia-santa-maria', 'cantina-don-beto', 'el-palacio-show', 'welly-cruz-eventos', 'ingles-para-todos') and is_demo and not ('eventos' = any(modules_on));

-- Los eventos de 0035 que nacen «en vivo» quedaban en la cola en una base nueva: 0035 corre antes de que exista un Admin (Ana la crea 0049)
-- y «sin una persona del equipo que apruebe, nada se pone en vivo sin revisión». Ahora sí hay quien apruebe: Ana los aprueba como lo haría
-- 0035 (en vivo, aprobado y revisado por ella). Solo los que 0035 marcó «live» y siguen en revisión sin aprobar (los «review» y «draft» de
-- 0035 se quedan como están). En el sandbox de siempre ya estaban en vivo y no cambia nada.
update events e set status = 'live', approved_at = now(), approved_by = a.id, reviewed_at = now(), reviewed_by = a.id
  from (select u.id from users u join staff_members s on s.user_id = u.id where u.phone = '+15705550199' and s.role = 'admin' and s.status = 'active') a
 where e.status = 'review' and e.approved_at is null
   and (e.business_id, e.title->>'es') in (('la-terraza-night', 'Jueves de Bachata en Vivo'), ('la-terraza-night', 'Karaoke latino · entrada libre'),
        ('sabor-dominicano', 'Noche de merengue en vivo'), ('sabor-dominicano', 'Sancocho del domingo en familia'),
        ('ingles-para-todos', 'Taller gratis: inglés para tu entrevista de trabajo'), ('el-palacio-show', 'Comedia dominicana · Noche de risa'),
        ('cantina-don-beto', 'Banda La Dinastía en vivo'));
-- Y el que 0035 deja «con cambios pedidos» (aforo), también por Ana.
update events e set status = 'changes', reviewed_at = now(), reviewed_by = a.id, review_reason_key = 'aforo'
  from (select u.id from users u join staff_members s on s.user_id = u.id where u.phone = '+15705550199' and s.role = 'admin' and s.status = 'active') a
 where e.status = 'review' and e.approved_at is null and e.reviewed_at is null and e.business_id = 'sabor-dominicano' and e.title->>'es' = 'Festival del Sancocho';

-- Las respuestas de Sabor Dominicano que 0007 firmó con Pedro cuando todavía no existía (reply_by quedó vacío).
update reviews set reply_by = (select id from users where phone = '+15705550133')
 where business_id = 'sabor-dominicano' and reply is not null and reply_by is null;

commit;
