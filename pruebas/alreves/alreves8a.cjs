// Prueba al revés de los guardianes de 8a (las cuatro cáscaras, el puente, las islas y el llavero): se inyecta el defecto, el guardián
// debe fallar; se restaura. Casos de «crear»: se crea el archivo, se corre el guardián y se borra.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const J = 'apps/mobile/apps.json', M = 'packages/db/migrations/0125_apps_base.sql', AN = 'apps/web/lib/app-nativa.ts', MW = 'apps/web/middleware.ts',
  CFG = 'apps/mobile/ios/Targets/ToLatino/capacitor.config.json', CFGA = 'apps/mobile/android/app/src/negocios/assets/capacitor.config.json',
  ALJ = 'apps/mobile/plugins/tl-alcance/android/com/tolatino/plugins/TLAlcancePlugin.java', ALS = 'apps/mobile/plugins/tl-alcance/ios/TLAlcancePlugin.swift',
  REP = 'apps/web/app/repartidor/Repartidor.tsx', PU = 'apps/web/lib/nativo/puente.ts', PA = 'apps/web/lib/nativo/pantalla.ts', RPJ = 'apps/mobile/plugins/tl-reporte/android/com/tolatino/plugins/TLReportePlugin.java',
  LLS = 'apps/mobile/plugins/tl-local/ios/TLLocalPlugin.swift', PN = 'apps/web/lib/panel.ts', SO = 'apps/web/lib/soporte.ts', CU = 'apps/web/lib/cuenta.ts',
  PLP = 'apps/mobile/ios/Targets/ToLatinoPuerta/Info.plist', PLC = 'apps/mobile/ios/Targets/ToLatino/Info.plist', STP = 'apps/mobile/ios/Targets/ToLatinoPuerta/en.lproj/InfoPlist.strings',
  MFP = 'apps/mobile/android/app/src/puerta/AndroidManifest.xml', MFR = 'apps/mobile/android/app/src/repartidor/AndroidManifest.xml', MFB = 'apps/mobile/android/app/src/main/AndroidManifest.xml',
  PRV = 'apps/mobile/ios/Targets/ToLatinoNegocios/PrivacyInfo.xcprivacy', BUS = 'apps/web/app/(app)/buscar/Buscar.tsx', RSP = 'apps/web/app/repartidor/sin-conexion/page.tsx',
  RSS = 'apps/web/app/repartidor/sin-conexion/SinSenalRep.tsx', WF = '.github/workflows/cascaras.yml', CI = '.github/workflows/ci.yml', INT = 'apps/web/app/admin/sistema/integraciones/page.tsx',
  RL = 'apps/web/app/api/admin/llavero/route.ts', LL = 'apps/web/lib/tiendas/llavero.ts', BO = 'apps/web/lib/boletos-sin-conexion.ts', AL = 'apps/web/lib/nativo/almacen.ts',
  ISS = 'apps/web/app/(sin-senal)/cuenta/boletos/sin-conexion/BoletosSinSenal.tsx', IOSGI = 'apps/mobile/ios/.gitignore';
const casos = [
  // appsUnaFuente
  ['appsUnaFuente', J, '"ios": "com.tolatino.negocios",', '"ios": "com.tolatino.negocio",'],
  ['appsUnaFuente', M, "'com.tolatino.repartidor', 'com.tolatino.repartidor', '/repartidor', '{/repartidor}', 3)", "'com.tolatino.repartidor', 'com.tolatino.repartidor', '/reparto', '{/repartidor}', 3)"],
  ['appsUnaFuente', AN, 'export const PLATAFORMAS: Plataforma[] = ["ios", "android"];', 'export const PLATAFORMAS: Plataforma[] = ["ios", "android"];\nexport const NEGOCIOS_IOS = "com.tolatino.negocios";'],
  ['appsUnaFuente', M, "  ('app.cascara.delivery', true, 'App To''Latino Repartidor'), ", '  '],
  // cascaraSoloSuAlcance
  ['cascaraSoloSuAlcance', CFG, '      "ajenas": [\n        "/panel",', '      "ajenas": ['],
  ['cascaraSoloSuAlcance', CFGA, '"allowNavigation": [\n      "pruebas.tolatino.com"\n    ]', '"allowNavigation": [\n      "pruebas.tolatino.com",\n      "*.stripe.com"\n    ]'],
  ['cascaraSoloSuAlcance', ALJ, 'if (alguna(ruta, ajenas)) return false;', 'if (alguna(ruta, ajenas) || ruta.startsWith("/admin")) return false;'],
  ['cascaraSoloSuAlcance', MW, 'const d = destinoEnApp(app.app, req.nextUrl.pathname + req.nextUrl.search);', 'const d = req.nextUrl.pathname === "/" ? "/panel" : null;'],
  ['cascaraSoloSuAlcance', J, '"alcance": ["/panel"],', '"alcance": ["/panel", "/admin"],'],
  ['cascaraSoloSuAlcance', ALS, '    override public func shouldOverrideLoad(', '    public func noDecide('],
  // capacitorSoloEnPuente
  ['capacitorSoloEnPuente', REP, 'import { useRouter } from "next/navigation";', 'import { useRouter } from "next/navigation";\nimport { Capacitor } from "@capacitor/core";'],
  ['capacitorSoloEnPuente', REP, 'const hoyNY = () =>', 'const esNativo = () => !!(window as unknown as { Capacitor?: unknown }).Capacitor;\nconst hoyNY = () =>'],
  ['capacitorSoloEnPuente', PU, '  try { if (window.self !== window.top) return false; } catch { return false; }\n', ''],
  // nativoConRespaldo
  ['nativoConRespaldo', PA, '  if (!p) return; // la web no puede cambiar el brillo', '  if (p === undefined) return;'],
  ['nativoConRespaldo', PA, 'type TLPantalla = { mantener(o: { on: boolean }): Promise<void>; brillo(o: { max: boolean }): Promise<void> };', 'type TLPantalla = { mantener(o: { on: boolean }): Promise<void>; brillo(o: { max: boolean }): Promise<void>; linterna(o: { on: boolean }): Promise<void> };'],
  ['nativoConRespaldo', RPJ, '    public void leer(PluginCall call) {', '    public void leerTodo(PluginCall call) {'],
  ['nativoConRespaldo', LLS, '        CAPPluginMethod(name: "todos", returnType: CAPPluginReturnPromise),\n', ''],
  // appNoAutoriza
  ['appNoAutoriza', PN, 'import "server-only";', 'import "server-only";\nimport { deLaApp } from "./app-nativa";\nexport async function esDueno() { return (await deLaApp())?.app === "negocio"; }'],
  ['appNoAutoriza', SO, '  const a = leerRotulo(ua), APP', '  const tl = h.get("x-tl-app");\n  const a = leerRotulo(tl ?? ua), APP'],
  ['appNoAutoriza', CU, "returning u.id, u.phone, u.first_name, u.last_name, u.nick, u.lang, cuenta_estado(u.status, u.status_until) as estado, u.status_until as hasta`,\n    [huellaToken(t), ap.version", "returning u.id, u.phone, u.first_name, u.last_name, u.nick, u.lang, cuenta_estado(u.status, u.status_until) as estado, u.status_until as hasta, s.app`,\n    [huellaToken(t), ap.version"],
  ['appNoAutoriza', MW, '  r.headers.set("cache-control", "no-store");', '  r.headers.set("cache-control", "no-store");\n  r.cookies.set("tl_app", app.app);'],
  // permisoConTexto
  ['permisoConTexto', J, '"checkin": { "es": "To\'Latino Puerta usa la cámara para leer el QR de los boletos en la puerta. No guarda fotos ni video.", "en": "To\'Latino Puerta uses the camera to read ticket QR codes at the door. It does not save photos or video." }', '"checkin": { "es": "Cámara.", "en": "Camera." }'],
  ['permisoConTexto', STP, '"NSCameraUsageDescription" = "To\'Latino Puerta uses the camera', '"NSCameraUsageDescription" = "Puerta uses the camera'],
  ['permisoConTexto', PLP, '	<key>UIApplicationSceneManifest</key>', '	<key>NSLocationWhenInUseUsageDescription</key>\n	<string>Para saber dónde estás cuando escaneas en la puerta del evento.</string>\n	<key>UIApplicationSceneManifest</key>'],
  // permisosMinimos
  ['permisosMinimos', MFP, '    <uses-permission android:name="android.permission.CAMERA" />', '    <uses-permission android:name="android.permission.CAMERA" />\n    <uses-permission android:name="android.permission.RECORD_AUDIO" />'],
  ['permisosMinimos', MFR, '    <application', '    <uses-permission android:name="android.permission.CAMERA" />\n    <application'],
  ['permisosMinimos', PLC, '	<key>UIApplicationSceneManifest</key>', '	<key>NSMicrophoneUsageDescription</key>\n	<string>x</string>\n	<key>UIApplicationSceneManifest</key>'],
  ['permisosMinimos', J, '"permisos": { "camara": true, "ubicacion": "al_usar" },', '"permisos": { "camara": true, "ubicacion": "entrega" },'],
  ['permisosMinimos', MFB, '    <uses-permission android:name="android.permission.INTERNET" />', '    <uses-permission android:name="android.permission.INTERNET" />\n    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />'],
  // sinRastreo
  ['sinRastreo', PLC, '	<key>UIApplicationSceneManifest</key>', '	<key>NSUserTrackingUsageDescription</key>\n	<string>Para anuncios.</string>\n	<key>UIApplicationSceneManifest</key>'],
  ['sinRastreo', MFP, '    <application', '    <uses-permission android:name="com.google.android.gms.permission.AD_ID" />\n    <application'],
  ['sinRastreo', PRV, '	<key>NSPrivacyTracking</key>\n	<false/>', '	<key>NSPrivacyTracking</key>\n	<true/>'],
  ['sinRastreo', PRV, '	<key>NSPrivacyTrackingDomains</key>\n	<array/>', '	<key>NSPrivacyTrackingDomains</key>\n	<array>\n		<string>ads.example.com</string>\n	</array>'],
  ['sinRastreo', BUS, 'const leer = (): string[] =>', 'declare const gtag: (...a: unknown[]) => void;\nconst medir = () => gtag("event", "buscar");\nconst leer = (): string[] =>'],
  // sinAvisoWebEnApp
  ['sinAvisoWebEnApp', BUS, 'const leer = (): string[] =>', 'const AVISO_INSTALAR = "Agrega To\'Latino a tu pantalla de inicio";\nconst leer = (): string[] =>'],
  ['sinAvisoWebEnApp', REP, 'const hoyNY = () =>', 'const instalar = () => window.addEventListener("beforeinstallprompt", () => undefined);\nconst hoyNY = () =>'],
  // islaCoherente
  ['islaCoherente', RSP, 'export const dynamic = "force-static";', 'export const dynamic = "force-dynamic";'],
  ['islaCoherente', REP, 'const hoyNY = () =>', 'const abrirDB = () => indexedDB.open("tl-rep");\nconst hoyNY = () =>'],
  ['islaCoherente', RSS, 'onCta: () => { void irAlServidor("/repartidor"); } });', 'onCta: () => { location.href = "/repartidor"; } });'],
  ['islaCoherente', WF, '      - "apps/web/app/repartidor/sin-conexion/**"\n      - ".github/workflows/cascaras.yml"\n  pull_request:', '      - ".github/workflows/cascaras.yml"\n  pull_request:'],
  ['islaCoherente', RSS, 'import { PanelBloques,', 'import { db } from "@/lib/db";\nimport { PanelBloques,'],
  ['islaCoherente', ISS, 'onClick={() => { void irAlServidor("/cuenta/boletos"); }}', 'onClick={() => { location.href = "/cuenta/boletos"; }}'],
  // llavesFueraDelRepo
  ['llavesFueraDelRepo', INT, 'const [filas] = await Promise.all([listar()]);', 'const [filas] = await Promise.all([listar()]);\n  const crudo = await (await import("@/lib/db")).db().query(`select blob_enc from store_secrets`);'],
  ['llavesFueraDelRepo', RL, '  return NextResponse.json({ ok: true, huella: r.huella,', '  return NextResponse.json({ ok: true, contenido: b.toString("base64"), huella: r.huella,'],
  ['llavesFueraDelRepo', WF, 'permissions:\n  contents: read', 'permissions:\n  contents: read\nenv:\n  LLAVE: ${{ secrets.ASC_KEY }}'],
  ['llavesFueraDelRepo', CI, '  pull_request:\n', '  pull_request_target:\n'],
  ['llavesFueraDelRepo', M, "  if tg_op <> 'INSERT' then raise exception 'store_secret_reads es solo de inserción'; end if;", "  if tg_op = 'DELETE' then return old; end if;"],
  ['llavesFueraDelRepo', LL, '            (select count(*)::int from store_secret_reads r where r.secret_id = s.id) as lecturas,', '            s.blob_enc, (select count(*)::int from store_secret_reads r where r.secret_id = s.id) as lecturas,'],
  ['llavesFueraDelRepo', IOSGI, '*.p8\n', ''],
  ['llavesFueraDelRepo', INT, 'import { listar, llaveroListo, TIPOS } from "@/lib/tiendas/llavero";', 'import { leer, listar, llaveroListo, TIPOS } from "@/lib/tiendas/llavero";'],
  // Guardianes de 6h ampliados (la garantía pasó al almacén)
  ['paqueteMinimo', AL, 'crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"])', 'crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, true, ["encrypt", "decrypt"])'],
  ['sinConexionSinDatosAjenos', BO, '  if (c !== m) { await ALM.vaciar("b"); if (c)', '  if (c !== m) { if (c)'],
  ['sinConexionSinDatosAjenos', BO, '    if (!v) { await ALM.vaciar("b"); return; }\n    const { k, kid } = await llave(v);\n    for', '    if (!v) return;\n    const { k, kid } = await llave(v);\n    for'],
];
const crear = [
  ['llavesFueraDelRepo', 'apps/mobile/AuthKey_ABCD123456.p8', 'llave de prueba (no es una llave real)\n'],
  ['llavesFueraDelRepo', 'apps/mobile/cuenta-servicio.json', '{ "type": "service_account", "private_key": "-----BEGIN PRIVATE KEY-----\\nNO-ES-UNA-LLAVE\\n-----END PRIVATE KEY-----\\n" }\n'],
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
  const [falla, out] = correr(g);
  fs.writeFileSync(ruta, orig);
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
