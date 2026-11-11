-- Semilla de pruebas · 8f · Programa beta, errores y «Reportar un problema». SOLO SANDBOX (decisión I). (El plan la numeraba 0046: ver 0127.)
-- Para que Super Admin › Sistema › Apps (Versiones, Testers, Salud, Reportes) se vea con algo:
--   · Builds de las cuatro apps en cada estado (disponible, procesando, subido, compilando, falló, retirado), sin commit ni CI inventados (8h los
--     registra desde el CI de verdad). Un APK propio de PRUEBA «disponible» por app de Android: apunta a privado/apk/prueba-{app}.apk, que el
--     servidor arma la primera vez que alguien lo baja (lib/tiendas/apk-prueba.ts; un ZIP con forma de APK que NO se instala; su sha256 es fijo).
--   · Testers: Juan (repartidor, APK propio, activo), Lucía (Play interno, falta agregarla en Play Console) y Héctor (APK propio, quitado con
--     motivo). Ninguno de TestFlight: el correo de Apple va cifrado con la llave del servidor y la semilla no lo tiene (el punta a punta invita uno).
--   · Tres grupos de errores (nuevo, visto, resuelto) con sus eventos, ya tapados y sin personas, y sus alertas ya anotadas (no avisan otra vez).
--   · Un caso TK- de «Reportar un problema» de Lucía con su registro técnico (sin captura: la semilla no sube archivos).
-- Idempotente: cada build por (app, plataforma, canal, build); cada tester por (cuenta, app, plataforma); cada grupo por su huella; el caso por su clave.
begin;

do $$
declare b record; ana uuid; u users; t bigint; g record; gid bigint; i int; c support_cases; lid bigint;
begin
  -- ── Builds ──
  for b in select * from (values
      ('cliente', 'ios', 'testflight_interno', '1.0.0', 5, 'disponible', null::text),
      ('cliente', 'ios', 'testflight_interno', '1.0.0', 6, 'procesando', null),
      ('negocio', 'ios', 'testflight_interno', '1.0.0', 3, 'fallo', 'La firma falló: falta el certificado de distribución (Paquete 8-2).'),
      ('negocio', 'ios', 'testflight_interno', '1.0.0', 4, 'compilando', null),
      ('delivery', 'ios', 'testflight_interno', '1.0.0', 2, 'subido', null),
      ('checkin', 'ios', 'testflight_interno', '1.0.0', 2, 'disponible', null),
      ('cliente', 'android', 'play_interno', '1.0.0', 6, 'disponible', null),
      ('delivery', 'android', 'play_interno', '1.0.0', 2, 'procesando', null),
      ('cliente', 'android', 'apk_propio', '1.0.0', 6, 'disponible', null),
      ('negocio', 'android', 'apk_propio', '1.0.0', 3, 'disponible', null),
      ('delivery', 'android', 'apk_propio', '1.0.0', 2, 'disponible', null),
      ('checkin', 'android', 'apk_propio', '1.0.0', 1, 'disponible', null),
      ('checkin', 'android', 'apk_propio', '1.0.0', 2, 'disponible', null)
    ) v(app, plat, canal, version, build, estado, falla) loop
    continue when exists (select 1 from app_builds where app = b.app and platform = b.plat and channel = b.canal and build = b.build);
    continue when exists (select 1 from app_builds where app = b.app and platform = b.plat and channel = b.canal and build > b.build);
    insert into app_builds (app, platform, version, build, channel, status, fail_reason, size_bytes, sha256, artifact_key, is_test)
    values (b.app, b.plat, b.version, b.build, b.canal, b.estado, b.falla,
            case when b.canal = 'apk_propio' then 563 end,
            case when b.canal = 'apk_propio' then '87d79ddd2e33ce3096063a5f902b5959e527782a30190f38ccdb51162947d5ce' end,
            case when b.canal = 'apk_propio' then 'privado/apk/prueba-' || b.app || '-' || b.build || '.apk' end, true);
  end loop;
  -- La Puerta: el APK propio 1 se retiró al salir el 2 (con motivo).
  update app_builds set status = 'retirado', retired_reason = 'Salió el build 2 con el arreglo del lector de QR.'
   where app = 'checkin' and platform = 'android' and channel = 'apk_propio' and build = 1 and status = 'disponible';

  -- ── Testers ──
  select id into ana from users where phone = '+15705550199';
  if ana is not null then
    for b in select * from (values
        ('+15705550144', 'delivery', 'android', 'apk_propio', 'activo', 'Repartidor de prueba en Sabor Dominicano', null::text),
        ('+15705550155', 'cliente', 'android', 'play_interno', 'pendiente_consola', 'Vecina de confianza (Android)', null),
        ('+15705550210', 'cliente', 'android', 'apk_propio', 'quitado', 'Vecino de confianza (Android)', 'Terminó la prueba de octubre')
      ) v(tel, app, plat, canal, estado, motivo, quitado) loop
      select * into u from users where phone = b.tel;
      continue when u.id is null;
      continue when exists (select 1 from beta_testers where user_id = u.id and app = b.app and platform = b.plat);
      insert into beta_testers (user_id, city_id, app, platform, channel, status, sync, invited_by, invite_reason, is_test)
      values (u.id, u.home_city_id, b.app, b.plat, b.canal, case when b.estado = 'quitado' then 'activo' else b.estado end, 'ok', ana, b.motivo, true)
      returning id into t;
      if b.quitado is not null then
        update beta_testers set status = 'quitado', removed_at = now(), removed_by = ana, removed_reason = b.quitado where id = t;
      end if;
    end loop;
  end if;

  -- ── Errores: tres grupos (nuevo, visto, resuelto), ya tapados y sin personas ──
  for g in select * from (values
      ('semilla:error:web-map', 'web', 'web', 'js', 'TypeError: Cannot read properties of undefined (reading ''map'')', 'nuevo', null::text, 'semilla', 12, '/pedido/:n',
        'Cannot read properties of undefined (reading ''map'')', E'    at Lineas (app/(app)/pedido/[num]/Pedido.tsx:88:23)\n    at renderWithHooks (node_modules/react-dom/cjs/react-dom-client.production.js:5410:18)'),
      ('semilla:error:cliente-cierre', 'cliente', 'android', 'cierre', 'Cierre de la app · java.lang.IllegalStateException', 'visto', null, '7', 3, '/cuenta/boletos',
        'Cierre de la app · java.lang.IllegalStateException', E'java.lang.IllegalStateException: El almacén no abrió\n\tat com.tolatino.plugins.TLLocalPlugin.leer(TLLocalPlugin.java:#)'),
      ('semilla:error:negocio-red', 'negocio', 'ios', 'red', 'TypeError: Load failed', 'resuelto', '6', '5', 5, '/panel/:n/hoy',
        'Load failed', E'    at enviar (app/panel/Pedidos.tsx:212:11)')
    ) v(clave, app, plat, tipo, titulo, estado, resuelto, rel, n, ruta, msg, stack) loop
    select id into gid from app_error_groups where fingerprint = left(encode(sha256(convert_to(g.clave, 'UTF8')), 'hex'), 40);
    continue when gid is not null;
    insert into app_error_groups (fingerprint, app, platform, kind, title) values (left(encode(sha256(convert_to(g.clave, 'UTF8')), 'hex'), 40), g.app, g.plat, g.tipo, g.titulo)
    returning id into gid;
    for i in 1..g.n loop
      insert into app_error_events (group_id, release, build, app_version, os_version, device_model, route_family, message, stack, symbolicated, session_hash, is_test)
      values (gid, g.rel, case when g.rel ~ '^[0-9]+$' then g.rel::int end, case when g.app <> 'web' then '1.0.0' end,
              case g.plat when 'ios' then 'iOS 17.5' when 'android' then 'Android 14' else 'Windows' end,
              case g.plat when 'ios' then 'iPhone' when 'android' then 'Pixel 6a' else 'Windows · Chrome' end,
              g.ruta, g.msg, g.stack, g.app = 'web', left(md5(g.clave || ':' || (i % 4)), 32), true);
    end loop;
    if g.estado <> 'nuevo' then
      update app_error_groups set status = g.estado, resolved_in_build = g.resuelto, status_by = ana, status_at = now(),
             status_reason = case g.estado when 'resuelto' then 'Se reintenta al volver la señal (arreglado en el build 6).' else 'Lo estamos revisando con el almacén.' end
       where id = gid;
    end if;
    -- Ya avisado (la semilla no dispara «Errores en vivo»).
    insert into app_error_alerts (group_id, kind, release, events_n, notified_n) values (gid, 'nuevo', coalesce(g.rel, ''), g.n, 0) on conflict do nothing;
  end loop;

  -- ── Un «Reportar un problema» de Lucía, con su registro técnico ──
  select * into u from users where phone = '+15705550155';
  if u.id is not null and not exists (select 1 from support_cases where user_id = u.id and client_key = 'b0e1c6b0-0045-4000-8000-000000000001') then
    insert into support_cases (number, user_id, city_id, topic, origin, priority, device, app_version, client_key, is_test)
    values ('TK-' || nextval('support_case_seq'), u.id, coalesce(u.home_city_id, 'hzl'), 'tecnico', 'reporte_app', 'normal', 'Android · app', 'To''Latino 1.0.0 (6)', 'b0e1c6b0-0045-4000-8000-000000000001', true)
    returning * into c;
    insert into support_messages (case_id, city_id, sender, user_id, body, at) values (c.id, c.city_id, 'user', u.id, 'Mis boletos se queda en blanco cuando abro la app sin señal. Con señal sí salen.', c.created_at);
    insert into support_messages (case_id, city_id, sender, sys_key, vars, at) values (c.id, c.city_id, 'system', 'recibido', jsonb_build_object('num', c.number), c.created_at + interval '1 second');
    insert into support_case_logs (case_id, city_id, kind, body) values (c.id, c.city_id, 'registro_app', jsonb_build_object(
      'sistema', 'Android 14', 'modelo', 'Pixel 6a',
      'lineas', jsonb_build_array('09:41:02 pantalla /', '09:41:10 pantalla /cuenta', '09:41:14 pantalla /cuenta/boletos', '09:41:30 señal: no',
                                  '09:41:31 pantalla /cuenta/boletos/sin-conexion', '09:41:33 error TypeError: Cannot read properties of null (reading ''llave'')')));
  end if;
end $$;

commit;
