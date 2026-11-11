// Prueba al revés de los guardianes de 8e (la ruta del Repartidor, compartir y háptica por el puente, el brillo, fijar la Puerta y los
// permisos mínimos ampliados): se inyecta el defecto, el guardián debe fallar; se restaura. «crear»: se crea el archivo, se corre y se borra.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const M = 'packages/db/migrations/0128_ruta_en_vivo.sql', L = 'apps/web/lib/ruta.ts', RP = 'apps/web/lib/repartidor.ts', PO = 'apps/web/app/api/ruta/posicion/route.ts',
  VI = 'apps/web/app/api/ruta/vivo/route.ts', NR = 'apps/web/lib/nativo/ruta.ts', TX = 'apps/web/app/admin/acciones-tx.ts', BA = 'apps/web/lib/barrido.ts',
  JS = 'apps/mobile/plugins/tl-ruta/android/com/tolatino/plugins/TLRutaServicio.java', JP = 'apps/mobile/plugins/tl-ruta/android/com/tolatino/plugins/TLRutaPlugin.java',
  SW = 'apps/mobile/plugins/tl-ruta/ios/TLRutaPlugin.swift', FI = 'apps/web/app/(app)/n/[id]/Ficha.tsx', ES = 'apps/web/app/(puerta)/puerta/Escanear.tsx',
  PA = 'apps/web/lib/nativo/pantalla.ts', BO = 'apps/web/app/(app)/cuenta/boletos/[codigo]/Boleto.tsx', PU = 'apps/web/app/(puerta)/puerta/Puerta.tsx',
  TP = 'apps/mobile/plugins/tl-pantalla/android/com/tolatino/plugins/TLPantallaPlugin.java', AJ = 'apps/mobile/apps.json',
  MR = 'apps/mobile/android/app/src/repartidor/AndroidManifest.xml', MC = 'apps/mobile/android/app/src/cliente/AndroidManifest.xml',
  PR = 'apps/mobile/ios/Targets/ToLatinoRepartidor/Info.plist', SC = 'apps/mobile/plugins/tl-pantalla/ios-sin-camara/TLPantallaPlugin+SinLinterna.swift', PS = 'apps/mobile/plugins/tl-pantalla/ios/TLPantallaPlugin.swift';
const casos = [
  // ubicacionSoloEntregaActiva
  ['ubicacionSoloEntregaActiva', M, "and d.user_id = rider and d.status = 'active' and d.id = t.driver_id)", "and d.status = 'active')"],
  ['ubicacionSoloEntregaActiva', M, "and o.city_id = ciudad and d.user_id", "and d.user_id"],
  ['ubicacionSoloEntregaActiva', M, "  if not ruta_activa(new.operation_id, new.rider_user_id, new.city_id) then raise exception 'ruta: la entrega no está activa para este repartidor en esta ciudad'; end if;\n", ''],
  ['ubicacionSoloEntregaActiva', M, "  if tg_op = 'UPDATE' then raise exception 'delivery_positions es solo de inserción'; end if;\n", ''],
  ['ubicacionSoloEntregaActiva', M, "    if (m - coalesce(t.last_accuracy_m, 0) - coalesce(new.accuracy_m, 0)) / greatest(seg, 1) > cfg_int('ubic_vel_max_mps') then", "    if false then"],
  ['ubicacionSoloEntregaActiva', L, '  const activa = !!(await db().query<{ ok: boolean }>(`select ruta_activa($1::bigint, $2::uuid, $3) as ok`, [t.op, t.rider, t.city])).rows[0]?.ok && (await encendida());', '  const activa = await encendida();'],
  ['ubicacionSoloEntregaActiva', L, '      if (m / seg > vmax) continue; // velocidad imposible\n', ''],
  ['ubicacionSoloEntregaActiva', L, 'where t.token_hash = $1 and t.sharing_until is null`, [huella(token)]', 'where t.token_hash = $1`, [huella(token)]'],
  ['ubicacionSoloEntregaActiva', RP, '      return { ok: true, aviso: { tpl: "ord_here", numero } } as const;', '      return { ok: true, aviso: { tpl: "ord_here", numero }, ruta: await empezarRuta(c, o.id, userId, "recogi") } as const;'],
  ['ubicacionSoloEntregaActiva', PO, '  const token = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.get("authorization") ?? "")?.[1];', '  const token = req.cookies.get("tl_ruta")?.value;'],
  ['ubicacionSoloEntregaActiva', NR, 'if (r.status === 401 || r.status === 410 || j.activa === false) { pararWeb(); return; }', 'if (r.status === 401) { pararWeb(); return; }'],
  ['ubicacionSoloEntregaActiva', JS, 'if (st == 401 || st == 410 || !activa) {', 'if (st == 401) {'],
  ['ubicacionSoloEntregaActiva', SW, 'if h.statusCode == 401 || h.statusCode == 410 || !activa { self.limpiar(); return }', 'if h.statusCode == 401 { self.limpiar(); return }'],
  ['ubicacionSoloEntregaActiva', SW, 'self.gestor.requestWhenInUseAuthorization() // nunca «Siempre»', 'self.gestor.requestAlwaysAuthorization()'],
  // rutaSoloDeLosTres
  ['rutaSoloDeLosTres', L, "kind = 'order' and user_id = $2 and coalesce(mode, 'pickup') = 'delivery'`, [numero, userId]", "kind = 'order' and coalesce(mode, 'pickup') = 'delivery' and $2::uuid is not null`, [numero, userId]"],
  ['rutaSoloDeLosTres', L, '  if (desdeCliente && !t.cliente) return null; // el cliente no ve nada antes de «Recogí»\n', ''],
  ['rutaSoloDeLosTres', L, '  return vista(o.id, false, true);', '  return vista(o.id, true, true);'],
  ['rutaSoloDeLosTres', L, "and kind = 'order' and business_id = $2 and coalesce", "and kind = 'order' and $2::text is not null and coalesce"],
  ['rutaSoloDeLosTres', L, '  if (m.length < 10) return { ok: false, msg: "Escribe el motivo (al menos 10 letras): ver la ruta de una persona queda en la auditoría." };\n', ''],
  ['rutaSoloDeLosTres', VI, '? async () => ((await accesoPanel(negocio, "ord")) ? rutaNegocio(negocio, pedido) : null)', '? async () => rutaNegocio(negocio, pedido)'],
  ['rutaSoloDeLosTres', VI, 'const NO = () => new Response("", { status: 404, headers: { "cache-control": "no-store" } });', 'const NO = () => new Response("", { status: 403, headers: { "cache-control": "no-store" } });'],
  ['rutaSoloDeLosTres', TX, '  if (!s || !s.puede("tx", "ver")) return { ok: false, mensaje: "Tu rol no ve transacciones." };\n  const r = await rutaAdmin(', '  if (!s) return { ok: false, mensaje: "Entra." };\n  const r = await rutaAdmin('],
  // posicionesConPurga
  ['posicionesConPurga', M, "('ubic_retener_dias', 1, 90, 14,", "('ubic_retener_dias', 1, 3650, 14,"],
  ['posicionesConPurga', M, "    if old.received_at >= now() - make_interval(days => cfg_int('ubic_retener_dias')) then\n      raise exception 'delivery_positions: solo se purga lo vencido (ubic_retener_dias)';\n    end if;\n", ''],
  ['posicionesConPurga', M, '  update delivery_tracks set last_geom = null, last_accuracy_m = null, purged_at = now()', '  update delivery_tracks set purged_at = now()'],
  ['posicionesConPurga', BA, '        ["ruta", async () => (await import("./ruta")).purgarRutas()],\n', ''],
  ['posicionesConPurga', JS, '        archivo().delete();\n', ''],
  // rutaSoloNuestroServidor
  ['rutaSoloNuestroServidor', JP, '        if (prueba != null && depurable()) {', '        if (prueba != null) {'],
  ['rutaSoloNuestroServidor', JP, '        i.putExtra("servidor", servidorDe(call));', '        i.putExtra("servidor", call.getString("url", servidorDe(call)));'],
  ['rutaSoloNuestroServidor', JS, '            c = (HttpURLConnection) new URL(servidor + "/api/ruta/posicion").openConnection();', '            c = (HttpURLConnection) new URL(servidor + "/api/ruta/posicion").openConnection();\n            new URL("https://otro.example/x");'],
  ['rutaSoloNuestroServidor', SW, '        #if DEBUG\n        if let p = call.getString("servidorPrueba")', '        if let p = call.getString("servidorPrueba")'],
  ['rutaSoloNuestroServidor', SW, '        guard let tk = call.getString("token")', '        if let u = call.getString("url") { servidor = u }\n        guard let tk = call.getString("token")'],
  ['rutaSoloNuestroServidor', 'apps/mobile/android/app/src/debug/res/xml/red_humo.xml', '<domain includeSubdomains="false">127.0.0.1</domain>', '<domain includeSubdomains="false">127.0.0.1</domain>\n        <domain includeSubdomains="true">pruebas.tolatino.com</domain>'],
  ['rutaSoloNuestroServidor', 'apps/mobile/android/app/src/repartidor/AndroidManifest.xml', '<application android:usesCleartextTraffic="false">', '<application android:usesCleartextTraffic="false" android:networkSecurityConfig="@xml/red_humo">'],
  // compartirPorElPuente
  ['compartirPorElPuente', FI, '    if ((await compartirNativo({ titulo: f.nombre, url })) !== "copiado") return;', '    if (navigator.share) { await navigator.share({ title: f.nombre, url }); return; }'],
  ['compartirPorElPuente', ES, '    vibrar(bien ? "hecho" : "error");', '    navigator.vibrate?.(bien ? 80 : 200);'],
  // brilloSeDevuelve
  ['brilloSeDevuelve', PA, '    return () => { document.removeEventListener("visibilitychange", f); void brilloMaximo(false); };', '    return () => { document.removeEventListener("visibilitychange", f); };'],
  ['brilloSeDevuelve', BO, '  useBrilloQr(!!b.matriz', '  void brilloMaximo(true); useBrilloQr(!!b.matriz'],
  ['brilloSeDevuelve', PS, '            if let b = self.brilloAntes { UIScreen.main.brightness = b; self.brilloAntes = nil }\n        }\n    }', '        }\n    }'],
  // fijarConConfirmacion
  ['fijarConConfirmacion', PU, '    void pantallaFijada().then(setFijada);', '    void pantallaFijada().then(setFijada); void fijarPantalla();'],
  ['fijarConConfirmacion', TP, '            try { getActivity().startLockTask(); r.put("ok", true); }', '            try { ((android.app.admin.DevicePolicyManager) getContext().getSystemService("device_policy")).setLockTaskPackages(null, new String[0]); getActivity().startLockTask(); r.put("ok", true); }'],
  // permisosMinimos ampliado (8e)
  ['permisosMinimos', MR, '    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />', '    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />\n    <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />'],
  ['permisosMinimos', MC, '    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />', '    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />\n    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />'],
  ['permisosMinimos', PR, '		<string>location</string>\n	</array>', '		<string>location</string>\n		<string>audio</string>\n	</array>'],
  ['permisosMinimos', MR, ' android:foregroundServiceType="location" />', ' android:foregroundServiceType="location|camera" android:exported="true" />'],
  ['permisosMinimos', AJ, '"permisos": { "camara": false, "ubicacion": "entrega" }', '"permisos": { "camara": false, "ubicacion": "siempre" }'],
  ['permisosMinimos', AJ, '"plugins": ["App", "AppLauncher", "Haptics", "PushNotifications", "Share", "SplashScreen", "StatusBar", "TLAlcance", "TLLocal", "TLPantalla", "TLReporte"],', '"plugins": ["App", "AppLauncher", "Haptics", "PushNotifications", "Share", "SplashScreen", "StatusBar", "TLAlcance", "TLLocal", "TLPantalla", "TLReporte", "TLRuta"],'],
  // nativoConRespaldo (la linterna en las dos variantes de iOS) y pluginViejoNoRompe (TLRuta)
  ['nativoConRespaldo', SC, '    @objc func linterna(_ call: CAPPluginCall) { call.resolve(["ok": false]) }', '    @objc func otraCosa(_ call: CAPPluginCall) { call.resolve(["ok": false]) }'],
  ['pluginViejoNoRompe', NR, '  try { return (await n.empezar({', '  { return (await n.empezar({'],
];
const crear = [
  ['ubicacionSoloEntregaActiva', 'apps/web/lib/ruta-otra.ts', 'import "server-only";\nimport { db } from "./db";\nexport async function x() { await db().query(`insert into delivery_positions (operation_id) values (1)`); }\n'],
  ['rutaSoloDeLosTres', 'apps/web/lib/ruta-leer.ts', 'import "server-only";\nimport { db } from "./db";\nexport async function x() { return db().query(`select geom from delivery_positions`); }\n'],
  ['compartirPorElPuente', 'apps/web/lib/compartir-otro.ts', 'export const c = () => navigator.share({ url: "/" });\n'],
  ['fijarConConfirmacion', 'apps/web/app/(puerta)/puerta/Fijar.tsx', '"use client";\nimport { fijarPantalla } from "@/lib/nativo/pantalla";\nexport function F() { void fijarPantalla(); return null; }\n'],
];
let bien = 0, total = 0;
const correr = (g) => { try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); return [false, '']; } catch (e) { return [true, String(e.stderr).split('\n').find((l) => l.includes('[')) || '']; } };
for (const [g, f, a, b] of casos) {
  total++;
  const ruta = `${R}/${f}`;
  if (!fs.existsSync(ruta)) { console.log(`  ✗ ${g}: no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { console.log(`  ✗ ${g}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  const [falla, out] = correr(g); fs.writeFileSync(ruta, orig);
  console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (${f.split('/').pop()})${out ? ' → ' + out.trim().slice(0, 150) : ''}`); if (falla) bien++;
}
for (const [g, f, c] of crear) {
  total++;
  const ruta = `${R}/${f}`;
  fs.writeFileSync(ruta, c);
  const [falla, out] = correr(g);
  fs.unlinkSync(ruta);
  console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (crear ${f.split('/').pop()})${out ? ' → ' + out.trim().slice(0, 150) : ''}`); if (falla) bien++;
}
console.log(`\n${bien}/${total} al revés`);
execSync('node guardianes/run.mjs', { cwd: R, stdio: 'inherit' });
