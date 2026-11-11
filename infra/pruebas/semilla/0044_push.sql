-- Semilla de pruebas · 8c · Avisos push. SOLO SANDBOX (decisión I).
-- Teléfonos de PRUEBA (proveedor «sim»: nada sale a Apple, Google ni a ningún navegador; el trabajador los da por «en modo pruebas», como el SMS)
-- para que Super Admin › Sistema › Integraciones › Push, Notificaciones › Push y Usuarios 360° › Avisos push se vean con algo:
--   · Héctor (vecino, +1 570 555 0210): To'Latino en iPhone.
--   · Lucía (vecina, +1 570 555 0155): To'Latino en Android, y uno viejo revocado porque el proveedor dijo que ya no servía («invalido»).
--   · Yolanda (dueña de Envíos Quisqueya Cargo, +1 570 555 0333): To'Latino Negocios en Android.
--   · Juan (repartidor de Sabor Dominicano, +1 570 555 0144): To'Latino Repartidor en Android.
--   · Karla (portera de La Terraza, +1 570 555 0512): To'Latino Puerta en iPhone.
-- Y un historial de Héctor con un intento en cada resultado (entregado al proveedor, en modo pruebas, token inválido, rechazado, límite, error y
-- canal apagado) para las cifras. Son cuentas que la regresión no usa para probar el SMS (con un teléfono con avisos, el SMS pasa a respaldo).
-- El token de prueba no es un token de nadie (bytes al azar con forma de sobre cifrado; nunca se descifra: «sim» no lo lee). Todo is_test.
-- Idempotente: cada token por su huella fija; cada aviso del historial por (persona, ref 'semilla_push', resultado).
begin;

do $$
declare u users; l users; x record; tid bigint; nid bigint; oid bigint; t2 bigint; quien users; tok bigint;
begin
  for x in select * from (values
      ('+15705550210', 'cliente', 'ios', 'iPhone · To''Latino'),
      ('+15705550155', 'cliente', 'android', 'Android · To''Latino'),
      ('+15705550333', 'negocio', 'android', 'Android · To''Latino Negocios'),
      ('+15705550144', 'delivery', 'android', 'Android · To''Latino Repartidor'),
      ('+15705550512', 'checkin', 'ios', 'iPhone · To''Latino Puerta')
    ) v(tel, app, plat, label) loop
    select * into u from users where phone = x.tel;
    continue when u.id is null;
    if not exists (select 1 from push_tokens where token_hash = encode(sha256(convert_to('semilla:push:' || x.tel || ':' || x.app, 'UTF8')), 'hex')) then
      insert into push_tokens (user_id, city_id, app, platform, provider, token_enc, token_hash, label, lang, is_test, last_seen_at)
      values (u.id, u.home_city_id, x.app, x.plat, 'sim', gen_random_bytes(48), encode(sha256(convert_to('semilla:push:' || x.tel || ':' || x.app, 'UTF8')), 'hex'), x.label, u.lang, true, now());
    end if;
  end loop;

  -- Lucía: un teléfono anterior que el proveedor dio por inválido (revocado solo, como haría el trabajador con un 410).
  select * into u from users where phone = '+15705550155';
  if u.id is not null and not exists (select 1 from push_tokens where token_hash = encode(sha256(convert_to('semilla:push:+15705550155:viejo', 'UTF8')), 'hex')) then
    insert into push_tokens (user_id, city_id, app, platform, provider, token_enc, token_hash, label, lang, is_test, last_seen_at)
    values (u.id, u.home_city_id, 'cliente', 'android', 'sim', gen_random_bytes(48), encode(sha256(convert_to('semilla:push:+15705550155:viejo', 'UTF8')), 'hex'), 'Android · To''Latino', u.lang, true, now() - interval '40 days')
    returning id into t2;
    update push_tokens set revoked_at = now(), revoked_reason = 'invalido' where id = t2;
  end if;

  -- Héctor: un aviso por resultado, con su intento anotado.
  select * into u from users where phone = '+15705550210';
  if u.id is not null then
    select id into tid from push_tokens where token_hash = encode(sha256(convert_to('semilla:push:+15705550210:cliente', 'UTF8')), 'hex');
    select * into l from users where phone = '+15705550155';
    select id into t2 from push_tokens where token_hash = encode(sha256(convert_to('semilla:push:+15705550155:viejo', 'UTF8')), 'hex');
    for x in select * from (values ('enviado', 'enviado', null::text, 201), ('pruebas', 'pruebas', 'simulado', null), ('invalido', 'fallo', 'Unregistered', 410),
                                   ('rechazado', 'fallo', 'BadRequest', 400), ('limite', 'enviado', 'TooManyRequests', 429), ('error', 'enviado', 'HTTP 503', 503), ('apagado', 'fallo', 'canal_apagado', null)) v(res, pst, code, http) loop
      -- El token inválido es el viejo de Lucía (por eso quedó revocado); lo demás, el iPhone de Héctor.
      if x.res = 'invalido' then quien := l; tok := t2; else quien := u; tok := tid; end if;
      continue when quien.id is null or tok is null;
      continue when exists (select 1 from notifications where user_id = quien.id and ref_kind = 'semilla_push' and ref_id = x.res);
      insert into notifications (user_id, city_id, tpl, title, body, href, ref_kind, ref_id, sms_status, push_status, push_at, created_at)
      values (quien.id, quien.home_city_id, 'push_prueba', 'Prueba de avisos', 'Si ves esto en tu teléfono, los avisos de To''Latino te llegan bien.', '/avisos', 'semilla_push', x.res,
              'no', x.pst, now() - interval '3 hours', now() - interval '3 hours')
      returning id into nid;
      insert into push_outbox (notification_id, token_id, city_id, priority, payload_enc, expires_at, tries, status)
      values (nid, tok, quien.home_city_id, 'normal', null, now() + interval '21 hours', case when x.res in ('limite', 'error') then 2 else 1 end, case when x.pst = 'fallo' then 'fallo' else 'hecho' end)
      returning id into oid;
      -- Un límite o un error se reintentan: el primer intento falló y el segundo llegó.
      if x.res in ('limite', 'error') then
        insert into push_deliveries (outbox_id, notification_id, token_id, tpl, city_id, app, platform, provider, result, error_code, http_status, ms, is_test)
        values (oid, nid, tok, 'push_prueba', quien.home_city_id, 'cliente', 'ios', 'sim', x.res, x.code, x.http, 180, true);
      end if;
      insert into push_deliveries (outbox_id, notification_id, token_id, tpl, city_id, app, platform, provider, result, error_code, http_status, ms, is_test)
      values (oid, nid, tok, 'push_prueba', quien.home_city_id, 'cliente', case when tok = t2 then 'android' else 'ios' end, 'sim', case when x.res in ('limite', 'error') then 'enviado' else x.res end,
              case when x.res in ('limite', 'error') then null else x.code end, case when x.res in ('limite', 'error') then 200 else x.http end, 120, true);
    end loop;
  end if;
end $$;

commit;
