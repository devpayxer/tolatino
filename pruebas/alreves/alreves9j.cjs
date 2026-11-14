// Prueba al revés de los guardianes de 9j (Super Admin › Sistema y la seguridad del equipo: segundo factor obligatorio, TOTP propio, errores del
// servidor, llaves que vencen, interruptores por persona, vidrio roto de Salud y el build mínimo). Se inyecta el defecto, el guardián debe fallar con
// SU mensaje ([nombre]); se restaura. «crear»: se crea el archivo, se corre y se borra.
const ENT = require('../lib/entorno.cjs'); // rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const AD = 'apps/web/lib/admin.ts', DP = 'apps/web/lib/equipo/dos-pasos.ts', TO = 'apps/web/lib/equipo/totp.ts', LA = 'apps/web/app/admin/layout.tsx',
  AC = 'apps/web/app/admin/dos-pasos/acciones.ts', M = 'packages/db/migrations/0140_sistema.sql', EP = 'apps/web/app/api/interno/error-prueba/route.ts',
  IS = 'apps/web/instrumentation.ts', IN = 'apps/web/lib/errores/ingesta.ts', SA = 'apps/web/lib/sistema/salud.ts', BA = 'apps/web/lib/barrido.ts',
  LL = 'apps/web/lib/tiendas/llavero.ts', RE = 'apps/web/lib/reportar.ts', FL = 'apps/web/lib/sistema/flags.ts', FO = 'apps/web/app/api/ayuda/foto/[id]/route.ts',
  VI = 'apps/web/lib/sistema/vidrio.ts', AN = 'apps/web/lib/app-nativa.ts';
const casos = [
  // equipoConDosPasos: staff() deja de mirar el segundo factor (cualquier sesión de solo SMS abre el Super Admin y sus acciones)
  ['equipoConDosPasos', AD, '  if ((await estadoDosPasos(u)).estado !== "ok") return null;\n', ''],
  // … requerir() deja pasar a la sección sin el segundo factor
  ['equipoConDosPasos', AD, '  if (m.dos.estado !== "ok") redirect("/admin/dos-pasos");\n', ''],
  // … el marco pinta las secciones y las colas sin el segundo factor
  ['equipoConDosPasos', LA, '  if (m.dos.estado !== "ok") return <main className="min-h-dvh bg-paper">{children}</main>;\n', ''],
  // … el camino de las pruebas sin el candado del entorno (existiría con un SMS de pruebas mal puesto en producción)
  ['equipoConDosPasos', DP, 'const CAMINO_PRUEBAS = MODO_SMS === "pruebas" && ENTORNO !== "produccion";', 'const CAMINO_PRUEBAS = MODO_SMS === "pruebas";'],
  // … una sesión marcada «pruebas» vale en cualquier parte
  ['equipoConDosPasos', DP, 'if (s.mfa_at && (s.mfa_via !== "pruebas" || CAMINO_PRUEBAS))', 'if (s.mfa_at)'],
  // … la lista de las pruebas se lee sin el candado
  ['equipoConDosPasos', DP, '${CAMINO_PRUEBAS ? "exists (select 1 from staff_mfa_pruebas x where x.phone = u.phone)" : "false"} as pruebas,', 'exists (select 1 from staff_mfa_pruebas x where x.phone = u.phone) as pruebas,'],
  // … la base acepta cualquier teléfono en la lista de las pruebas
  ['equipoConDosPasos', M, "phone text primary key check (phone ~ '^\\+1570555[0-9]{4}$'),", 'phone text primary key,'],
  // … una acción de los dos pasos deja de revisar que venga de nuestra página
  ['equipoConDosPasos', AC, '  if (!u || !(await mismoOrigen())) return { ok: false, msg: fuera };\n  return entrarConCodigo(', '  if (!u) return { ok: false, msg: fuera };\n  return entrarConCodigo('],
  // … la ruta que provoca un error del servidor existe también en producción
  ['equipoConDosPasos', EP, 'if (!(MODO_SMS === "pruebas" && ENTORNO !== "produccion") || !tokenOk(', 'if (!tokenOk('],
  // totpPropio: la ventana se abre a ±2 pasos (60 s de más para adivinar)
  ['totpPropio', TO, 'export const VENTANA = 1;', 'export const VENTANA = 2;'],
  // … el código ya usado vuelve a entrar (sin la escritura condicionada al último paso)
  ['totpPropio', DP, ' and (last_step is null or last_step < $2)`, [s.mfa_id, paso]', '`, [s.mfa_id, paso]'],
  // … una dependencia externa para el TOTP
  ['totpPropio', TO, 'import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";', 'import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";\nimport { authenticator } from "otplib";'],
  // … el código se compara con === (filtra por el tiempo)
  ['totpPropio', TO, 'if (timingSafeEqual(Buffer.from(codigo(s, p0 + d)), Buffer.from(c)))', 'if (codigo(s, p0 + d) === c)'],
  // … un código de recuperación sirve muchas veces
  ['totpPropio', DP, 'set recovery_hashes = array_remove(recovery_hashes, $2), last_used_at = now()', 'set last_used_at = now()'],
  // … la base deja bajar el último paso aceptado
  ['totpPropio', M, "      raise exception 'un código usado no vuelve a entrar';\n", '      null;\n'],
  // erroresDelServidor: instrumentation.ts carga la base también en el borde (y sin la condición, guarda desde cualquier proceso)
  ['erroresDelServidor', IS, '  if (process.env.NEXT_RUNTIME === "nodejs") {', '  {'],
  // … el error del servidor sin tope por minuto (un bucle llena la base)
  ['erroresDelServidor', IN, '  if (!(await dentroDelTope("errores_servidor", "todo", lim.errores_por_minuto))) return { ok: false, por: "limite" };\n', ''],
  // … la base deja de aceptar el tipo «servidor»
  ['erroresDelServidor', M, "check (kind in ('js', 'nativo', 'cierre', 'red', 'servidor'))", "check (kind in ('js', 'nativo', 'cierre', 'red'))"],
  // llaveConVencimiento: el aviso sale a los 7 días (no da tiempo a renovar con Apple o Google)
  ['llaveConVencimiento', SA, 'export const AVISO_LLAVE_DIAS = 30;', 'export const AVISO_LLAVE_DIAS = 7;'],
  // … el barrido deja de revisar las llaves que vencen
  ['llaveConVencimiento', BA, ', ["llavesVencen", async () => (await import("./sistema/salud")).avisarLlavesQueVencen()]', ''],
  // … reemplazar una llave no deja rastro en key_rotations
  ['llaveConVencimiento', LL, '  if (prev) await c.query(`insert into key_rotations', '  if (prev) await c.query(`select 1 from key_rotations'],
  // flagPorPersona: «Reportar un problema» se vuelve a leer crudo (ignora la ciudad y el porcentaje)
  ['flagPorPersona', RE, 'const on = await (await import("./sistema/flags")).flagPara("app.reportar", q.userId);', 'const on = (await db().query<{ enabled: boolean }>(`select enabled from feature_flags where key = \'app.reportar\'`)).rows[0]?.enabled === true;'],
  // … la base deja acotar cualquier interruptor (los que se leen todo o nada quedarían encendidos para todos)
  ['flagPorPersona', M, "check (scope in ('all', 'city', 'percent') and (scope = 'all' or scopable)", "check (scope in ('all', 'city', 'percent') and true"],
  // … cambiar un interruptor sin auditoría
  ['flagPorPersona', FL, '    await auditar(cx, { actor: s.id, action: "sistema.flag",', '    void ({ actor: s.id, action: "sistema.flag",'],
  // vidrioRoto: la foto de Salud se le muestra al equipo sin motivo
  ['vidrioRoto', FO, 'if (s && !sinMotivo && colasVisibles(s)', 'if (s && colasVisibles(s)'],
  // … un motivo de tres letras basta
  ['vidrioRoto', VI, '  if (m.length < 10) return', '  if (m.length < 3) return'],
  // … break_glass se puede cambiar o borrar
  ['vidrioRoto', M, 'create trigger break_glass_no_cambia before update or delete on break_glass for each row execute function sistema_solo_insercion();', ''],
  // minimoDisponible: en producción el mínimo puede pasar del último build disponible (nadie podría actualizar)
  ['minimoDisponible', AN, '            if (ENTORNO === "produccion") throw new Choque(', '            if (ENTORNO === "nunca") throw new Choque('],
];
const crear = [
  // equipoConDosPasos: una página nueva del Super Admin sin requerir()
  ['equipoConDosPasos', 'apps/web/app/admin/zz9j/page.tsx', 'import { db } from "@/lib/db";\nexport default async function Page() { const r = await db().query("select count(*) from users"); return <p>{String(r.rows[0]?.count)}</p>; }\n'],
  // … una ruta nueva de /api/admin sin staff()
  ['equipoConDosPasos', 'apps/web/app/api/admin/zz9j/route.ts', 'import { db } from "@/lib/db";\nexport async function GET() { return Response.json((await db().query("select phone from users limit 5")).rows); }\n'],
  // … otro archivo que lee la lista de las pruebas
  ['equipoConDosPasos', 'apps/web/lib/zz9j-exento.ts', 'import { db } from "./db";\nexport const exento = async (tel: string) => (await db().query(`select 1 from staff_mfa_pruebas where phone = $1`, [tel])).rowCount === 1;\n'],
  // … otro archivo que marca una sesión con el segundo factor
  ['equipoConDosPasos', 'apps/web/lib/zz9j-marca.ts', 'import { db } from "./db";\nexport const marcar = (id: string) => db().query(`update sessions set mfa_at = now(), mfa_via = \'totp\' where id = $1`, [id]);\n'],
];
let bien = 0, total = 0;
const correr = (g, env = {}) => {
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe', env: { ...process.env, ...env } }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${g}]`)) ?? ''; return [!!l, l]; }
};
const informe = (g, que, [falla, out]) => { total++; console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (${que})${out ? ' → ' + out.trim().slice(0, 170) : ''}`); if (falla) bien++; };
for (const [g, f, a, b, env] of casos) {
  const ruta = path.join(R, f);
  if (!fs.existsSync(ruta)) { total++; console.log(`  ✗ ${g}: no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ ${g}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(g, env); } finally { fs.writeFileSync(ruta, orig); }
  informe(g, f.split('/').pop(), r);
}
for (const [g, f, c] of crear) {
  const ruta = path.join(R, f), dir = path.dirname(ruta), nuevo = !fs.existsSync(dir);
  fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(ruta, c);
  let r; try { r = correr(g); } finally { fs.unlinkSync(ruta); if (nuevo) try { fs.rmdirSync(dir); } catch { /* no vacía */ } }
  informe(g, `crear ${f.split('/').pop()}`, r);
}
let limpio = true; try { execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); } catch (e) { limpio = false; console.log(String(e.stderr).slice(0, 600)); }
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
