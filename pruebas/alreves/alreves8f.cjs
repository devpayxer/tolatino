// Prueba al revés de los guardianes de 8f (errores propios, «Reportar un problema», beta y mapas): se inyecta el defecto, el guardián debe
// fallar; se restaura. Casos de «crear»: se crea el archivo, se corre el guardián y se borra.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const I = 'apps/web/lib/errores/ingesta.ts', T = 'apps/web/lib/errores/tapar.ts', C = 'apps/web/lib/nativo/errores.ts', M = 'packages/db/migrations/0127_apps_beta.sql',
  RT = 'apps/web/app/api/errores/route.ts', A = 'apps/web/lib/errores/admin.ts', V = 'apps/web/lib/errores/vivo.ts', BA = 'apps/web/lib/barrido.ts',
  P = 'apps/web/app/(app)/soporte/reportar/Reportar.tsx', NR = 'apps/web/lib/nativo/reporte.ts', N = 'apps/web/next.config.ts', PK = 'apps/web/package.json',
  NG = 'infra/pruebas/nginx-pruebas.conf', IS = 'apps/mobile/scripts/islas.mjs', SZ = 'apps/web/lib/errores/simbolizar.ts', MP = 'scripts/mapas-privados.mjs',
  BE = 'apps/web/lib/beta.ts', PG = 'apps/web/app/(app)/beta/apk/[ficha]/page.tsx', BJ = 'apps/web/app/(app)/beta/apk/[ficha]/bajar/route.ts',
  SA = 'apps/web/app/admin/SoporteAdmin.tsx', SE = 'apps/web/lib/soporte-equipo.ts', SW = 'apps/mobile/plugins/tl-reporte/ios/TLReporteBeta.swift',
  JV = 'apps/mobile/plugins/tl-reporte/android/com/tolatino/plugins/TLReporteBeta.java';
const casos = [
  // erroresTapados
  ['erroresTapados', I, 'const mensaje = taparError(texto(b.mensaje, 2000).replace(/^Uncaught\\s+(?:\\(in promise\\)\\s+)?/, ""), 500);', 'const mensaje = texto(b.mensaje, 500);'],
  ['erroresTapados', I, 'const crudo = taparError(texto(b.stack, 16384), 16384);', 'const crudo = texto(b.stack, 16384);'],
  ['erroresTapados', I, 'const stack = taparError(s.stack, 16384);', 'const stack = s.stack;'],
  ['erroresTapados', I, 'const ruta = familiaRuta(b.ruta);', 'const ruta = typeof b.ruta === "string" ? b.ruta.slice(0, 80) : null;'],
  ['erroresTapados', T, '  t = t.replace(CORREO, "[correo]").replace(TEL, "[tel]");', '  t = t.replace(CORREO, "[correo]");'],
  ['erroresTapados', T, '  t = tapar(t).texto;\n', ''],
  ['erroresTapados', T, '  t = t.replace(COMILLAS, (m, q: string, x: string) => (CODIGO.test(x) || !x ? m : `${q}…${q}`));\n', ''],
  ['erroresTapados', T, 'if (ESTATICO.test(p) && !p.includes("..")) return p + pos;', 'return u;'],
  ['erroresTapados', C, 'ruta: familia(location.pathname) });', 'ruta: location.pathname + location.search });'],
  ['erroresTapados', M, "  check (not texto_con_secretos(message) and not texto_con_secretos(stack))\n", "  check (true)\n"],
  // ingestaLimitada
  ['ingestaLimitada', RT, 'const MAX = 32 * 1024;', 'const MAX = 1024 * 1024;'],
  ['ingestaLimitada', RT, '  const t = await leer(req).catch(() => null);', '  const t = await req.text().catch(() => null);'],
  ['ingestaLimitada', RT, '  if (!mio) return nada(403);\n', ''],
  ['ingestaLimitada', I, '  if (!(await permitir(e.dev, e.ip, { global: lim.errores_por_minuto, dev: lim.errores_por_dispositivo }))) return { ok: false, por: "limite" };\n', ''],
  ['ingestaLimitada', I, 'await dentroDelTope("errores_ip", ip ?? "?", lim.dev * 4)', 'await dentroDelTope("errores_ip", ip ?? "?", 1e9)'],
  ['ingestaLimitada', I, '  if ((tipo === "cierre" || tipo === "nativo") && !app) return { ok: false, por: "invalido" };\n', ''],
  ['ingestaLimitada', T, 'const CORREO = /(?<![A-Za-z0-9._%+-])[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,253}\\.[A-Za-z]{2,24}/g;', 'const CORREO = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}/g;'],
  ['ingestaLimitada', 'apps/web/lib/errores/huella.ts', '  if (l.length > 500) return null;\n', ''],
  // erroresSinPersonas
  ['erroresSinPersonas', M, "  session_hash text not null check (session_hash ~ '^[a-f0-9]{32}$'),\n  is_test", "  session_hash text not null check (session_hash ~ '^[a-f0-9]{32}$'),\n  user_id uuid references users (id),\n  is_test"],
  ['erroresSinPersonas', I, 'sesion = hmac(`errores:${dia}:${e.dev ?? e.ip ?? "?"}`).slice(0, 32);', 'sesion = (e.dev ?? "x").replace(/-/g, "").slice(0, 32);'],
  ['erroresSinPersonas', C, 'stack: (x.stack ?? "").slice(0, 16000), ruta:', 'stack: (x.stack ?? "").slice(0, 16000), cuenta: document.cookie, ruta:'],
  ['erroresSinPersonas', A, 'select ${ISO("at")} as at, release as build,', 'select ${ISO("at")} as at, session_hash as sesion, release as build,'],
  // reporteConConsentimiento
  ['reporteConConsentimiento', P, '  useEffect(() => {\n    if (!agitado || !esApp()) return;', '  useEffect(() => { void registro().then((L) => reportar({ texto: "auto", registro: L }, null)); }, []);\n  useEffect(() => {\n    if (!agitado || !esApp()) return;'],
  ['reporteConConsentimiento', P, 'const elegir = (f: File) => { if (!/^image\\//.test(f.type)) return;', 'const elegir = (f: File) => { void subirFotoPrivada(f); if (!/^image\\//.test(f.type)) return;'],
  ['reporteConConsentimiento', P, 'const ver = () => { if (lineas) { setLineas(null); return; } void registro().then((L) => setLineas(L.slice(-40))); };', 'const ver = () => { if (lineas) { setLineas(null); return; } void registro().then((L) => setLineas(L.slice(-40))); enviar(); };'],
  ['reporteConConsentimiento', NR, 'export async function registro(): Promise<string[]> {', 'export async function mandarRegistro() { await fetch("/api/registro", { method: "POST" }); }\nexport async function registro(): Promise<string[]> {'],
  ['reporteConConsentimiento', JV, 'import java.util.List;', 'import java.util.List;\nimport java.net.HttpURLConnection;'],
  ['reporteConConsentimiento', SW, 'import WebKit', 'import WebKit\nlet _subir = URLSession.shared'],
  // erroresEnVivo
  ['erroresEnVivo', BA, '        ["errores", async () => (await import("./errores/vivo")).barrerErrores()],\n', ''],
  ['erroresEnVivo', V, '      if (!a) continue;\n', ''],
  ['erroresEnVivo', V, "where e.at > now() - interval '10 minutes' and g.status <> 'silenciado'", "where e.at > now() - interval '10 minutes'"],
  ['erroresEnVivo', M, '  unique (group_id, kind, release)\n', '  check (true)\n'],
  ['erroresEnVivo', M, "status = case when g.status = 'resuelto' and error_build_posterior(new.release, g.resolved_in_build) then 'nuevo' else g.status end,", "status = g.status,"],
  // mapasPrivados
  ['mapasPrivados', PK, '"build": "next build && node ../../scripts/mapas-privados.mjs .",', '"build": "next build",'],
  ['mapasPrivados', NG, '    location ~* \\.map$ { return 404; }\n', ''],
  ['mapasPrivados', IS, ', filter: (s) => !s.endsWith(".map")', ''],
  ['mapasPrivados', SZ, '  if (f.startsWith(raiz + path.sep)) {', '  if (true) {'],
  ['mapasPrivados', MP, '    renameSync(p, q);\n', ''],
  // apkUnUso
  ['apkUnUso', PG, '  const e = await verEnlace(ficha, u.id);', '  const e = await verEnlace(ficha, u.id); await bajarApk(ficha, u.id);'],
  ['apkUnUso', BJ, 'export async function POST(', 'export async function GET(_r: NextRequest) { return new NextResponse(null); }\nexport async function POST('],
  ['apkUnUso', BE, 'where id = $1::bigint and used_at is null and revoked_at is null and expires_at > now()`, [l.id])', 'where id = $1::bigint`, [l.id])'],
  ['apkUnUso', BE, '  if (!b || createHash("sha256").update(b).digest("hex") !== l.sha) return { ok: false, status: 409 };\n', '  if (!b) return { ok: false, status: 409 };\n'],
  // tiendasSimuladorAislado
  // 9b-3 · Desde 8h la dirección de App Store Connect vive en lib/tiendas/direcciones.ts: el defecto va allí.
  ['tiendasSimuladorAislado', 'apps/web/lib/tiendas/direcciones.ts', 'export const URL_ASC = () => (!PROD && process.env.ASC_API_URL ? process.env.ASC_API_URL : "https://api.appstoreconnect.apple.com");', 'export const URL_ASC = () => process.env.ASC_API_URL ?? "https://api.appstoreconnect.apple.com";'],
  // pluginViejoNoRompe (la clase que cazó push8c)
  ['pluginViejoNoRompe', NR, '  try { await p.agitar({ on }); } catch { return () => undefined; }', '  await p.agitar({ on });'],
  ['pluginViejoNoRompe', NR, '  try { const r = await p.cierres(); return', '  { const r = await p.cierres(); return'],
  // colaConVista ampliado
  ['colaConVista', SA, ', reporte_app: "App · Reportar un problema", correo: "Correo a Soporte" };', ', correo: "Correo a Soporte" };'], // 9b-3 · la lista de hoy (9: correo)
  ['colaConVista', SE, '  const registro = c.origin === "reporte_app" ? await registroDelCaso(c.id) : null;', '  const registro = null as RegistroEquipo;'],
];
const crear = [
  ['erroresTapados', 'apps/web/lib/errores/otro.ts', 'import "server-only";\nimport { db } from "../db";\nexport async function x(m: string) { await db().query(`insert into app_error_events (group_id, message, session_hash) values (1, $1, $2)`, [m, "a"]); }\n'],
  ['reporteConConsentimiento', 'apps/web/app/(app)/cuenta/reporte-solo.ts', '"use server";\nimport { reportarProblema } from "@/lib/reportar";\nexport async function x() { return reportarProblema({ userId: "x" }, { texto: "abc" }); }\n'],
  ['apkUnUso', 'apps/web/public/assets/tolatino-prueba.apk', 'PK'],
  ['mapasPrivados', 'apps/web/public/assets/app.js.map', '{}'],
  ['tiendasSimuladorAislado', 'apps/web/lib/tiendas/asc-env.ts', 'import "server-only";\nexport const URL = process.env.ASC_API_URL;\n'],
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
// 9b-3 · alrevesQueFalla: un defecto sin cazar pone la prueba en rojo (antes salía con 0 y el CI la contaba en verde).
if (bien !== total) process.exit(1);
