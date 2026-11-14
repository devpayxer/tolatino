-- Semilla de pruebas · 9d · Tus datos (fase9-apertura.md §2 0134: el plan la llama 0049; 0049–0051 ya existían). SOLO SANDBOX (decisión I; regla 13).
-- Para que el fundador vea en el sandbox, sin hacer nada, lo que pasa con los datos (todas cuentas de prueba, teléfonos 555):
--   · Borra Mañana (570-555-9401): pidió borrar su cuenta hace 29 días; se borra mañana (Usuarios 360° › Privacidad: «se borra el …»).
--   · Borra Ayer (570-555-9402): pidió borrarla hace 31 días; el barrido la purga en su primer minuto (Usuarios 360° › Privacidad: la purga tabla por
--     tabla; en el panel de Sabor Dominicano su pedido sale como «Cuenta borrada»).
--   · Datos Listos (570-555-9403): pidió su archivo; el barrido lo arma (Mi cuenta › Privacidad › Descargar mis datos: «Tu archivo está listo»).
--   · Datos Vencidos (570-555-9404): su archivo venció sin bajarse (y por la regla de uno cada 7 días, todavía no pide otro).
-- Idempotente (por teléfono; una cuenta ya purgada no vuelve a nacer igual: su teléfono quedó vacío y la semilla crea otra con ese número solo si
-- esta semilla cambia). Nada se borra.
begin;
insert into users (phone, phone_verified_at, first_name, last_name, home_city_id, lang, is_test) values
  ('+15705559401', now(), 'Borra', 'Mañana', 'hzl', 'es', true),
  ('+15705559402', now(), 'Borra', 'Ayer', 'hzl', 'es', true),
  ('+15705559403', now(), 'Datos', 'Listos', 'hzl', 'es', true),
  ('+15705559404', now(), 'Datos', 'Vencidos', 'hzl', 'es', true)
on conflict (phone) do nothing;

-- Lo de cada una (para que la purga y el archivo tengan qué mostrar): un guardado, una búsqueda y una dirección.
insert into favorites (user_id, kind, target_id) select u.id, 'business', 'sabor-dominicano' from users u where u.phone in ('+15705559401', '+15705559402', '+15705559403') on conflict do nothing;
insert into search_logs (city_id, user_id, query, results)
  select 'hzl', u.id, 'mangu', 4 from users u where u.phone in ('+15705559402', '+15705559403') and not exists (select 1 from search_logs s where s.user_id = u.id);
insert into user_addresses (user_id, label, street, zip, city_id, is_default)
  select u.id, 'casa', '120 W Broad St', '18201', 'hzl', true from users u where u.phone in ('+15705559402', '+15705559403') and not exists (select 1 from user_addresses a where a.user_id = u.id);
-- Un pedido de Borra Ayer en Sabor Dominicano (lo que el negocio ve como «Cuenta borrada» después de la purga).
insert into operations (number, kind, city_id, business_id, user_id, status, mode, pay_mode, client_key, subtotal_cents, total_cents, is_test)
  select '905200001', 'order', 'hzl', 'sabor-dominicano', u.id, 'done', 'pickup', 'none', gen_random_uuid(), 1450, 1450, true
    from users u where u.phone = '+15705559402' and not exists (select 1 from operations o where o.business_id = 'sabor-dominicano' and o.number = '905200001');

-- Los borrados: mañana y hace un día (la purga corre en el barrido).
update users set delete_at = now() + interval '1 day', delete_reason = 'priv' where phone = '+15705559401' and delete_at is null and status = 'active';
update users set delete_at = now() - interval '1 day', delete_reason = 'uso' where phone = '+15705559402' and delete_at is null and status = 'active';
insert into account_changes (user_id, kind, "from", "to", by)
  select u.id, 'delete', null, u.delete_reason, 'user' from users u where u.phone in ('+15705559401', '+15705559402') and u.delete_at is not null
     and not exists (select 1 from account_changes c where c.user_id = u.id and c.kind = 'delete');

-- Los archivos: uno pedido (el barrido lo arma) y uno vencido sin bajarse.
insert into data_exports (user_id, is_test)
  select u.id, true from users u where u.phone in ('+15705559403', '+15705559404') and not exists (select 1 from data_exports e where e.user_id = u.id);
update data_exports e set status = 'vencido', error = null
  from users u where u.id = e.user_id and u.phone = '+15705559404' and e.status = 'pendiente';
commit;
