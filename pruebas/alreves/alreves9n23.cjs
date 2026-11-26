// Prueba al revés del guardián de 9n-23. panelEquipoSoloLectura («Panel del dueño»: el equipo ve el panel de un negocio en solo lectura): la entrada
// del equipo sin neg:ver o sin las ciudades del rol, accesoPanel (el de las acciones) dejando entrar al equipo, una acción o una ruta con la entrada del
// equipo, la página sin ?equipo=1, sin auditar o sin marcar la petición, lecturas que marcan, cobran o abren lo cifrado, y la pantalla sin aviso, con
// «Guardar» o perdiendo ?equipo=1; el 360° sin el botón o sin el verbo del historial. Se inyecta el defecto, el guardián debe fallar con SU mensaje
// ([nombre]); se restaura. «crear»: se crea el archivo, se corre y se borra.
const ENT = require('../lib/entorno.cjs'); // rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const G = 'panelEquipoSoloLectura';
const L = 'apps/web/lib/panel.ts', P = 'apps/web/app/panel/[id]/[[...r]]/page.tsx', PN = 'apps/web/app/panel/Panel.tsx', N = 'apps/web/app/admin/N360.tsx';
const casos = [
  // (1) la entrada del equipo: sin neg:ver, sin las ciudades del rol, sin la marca; accesoPanel abierto al equipo; procesar al mirar
  [L, '  if (!s?.puede("neg", "ver")) return null;', '  if (!s) return null;'],
  [L, "and (cardinality($2::text[]) = 0 or b.city_id = any($2::text[]))`, [negocioId, s.ciudadesRol]", "and $2::text[] is not null`, [negocioId, s.ciudadesRol]"],
  [L, 'return { yo: s, negocio, kind: "owner", partes: ["all"], soloVer: true };', 'return { yo: s, negocio, kind: "owner", partes: ["all"] } as Acceso & { soloVer: true };'],
  [L, '  if (!r) return null;\n  const partes = r.kind === "owner"', '  if (!r) return accesoPanelSoloLectura(negocioId);\n  const partes = r.kind === "owner"'],
  [L, '  if (!acc.soloVer) await (await import("./suscripcion")).procesar(id)', '  await (await import("./suscripcion")).procesar(id)'],
  // (3) la página: sin ?equipo=1, sin auditar, sin marcar la petición, marcando una solicitud vista, con las tarjetas de quien mira
  [P, 'const equipo = !dueno && sp.equipo === "1" ? await accesoPanelSoloLectura(id) : null;', 'const equipo = !dueno ? await accesoPanelSoloLectura(id) : null;'],
  [P, '      if (!ya) await auditar(c, { actor: equipo.yo.id, action: "negocio.ver_panel"', '      if (!ya) void ({ actor: equipo.yo.id, action: "negocio.ver_panel"'],
  [P, '    marcarSoloLectura();\n', '    void marcarSoloLectura;\n'],
  [P, '    if (!acc.soloVer) await verSolicitud(d.id, appId);', '    await verSolicitud(d.id, appId);'],
  [P, 'tarjetas: acc.soloVer ? [] : await misTarjetas(acc.yo.id) };', 'tarjetas: await misTarjetas(acc.yo.id) };'],
  [P, '!ruta.det && !acc.soloVer ? await faltaAceptar(u.id)', '!ruta.det ? await faltaAceptar(u.id)'],
  // (4) leer no deja huella
  ['apps/web/lib/mensajes.ts', '  if (t.unread && !soloLectura()) await db().query(`update chat_threads set biz_unread = 0', '  if (t.unread) await db().query(`update chat_threads set biz_unread = 0'],
  ['apps/web/lib/solicitudes.ts', '  if (!soloLectura()) await db().query(`update request_targets set seen_at', '  await db().query(`update request_targets set seen_at'],
  ['apps/web/lib/cobros.ts', 'export async function repararPagos(negocio: string) {\n  if (soloLectura()) return;', 'export async function repararPagos(negocio: string) {\n  void soloLectura;'],
  ['apps/web/lib/estimados.ts', 'export async function repararEstimados(negocio: string): Promise<void> {\n  if (soloLectura()) return;', 'export async function repararEstimados(negocio: string): Promise<void> {\n  void soloLectura;'],
  ['apps/web/lib/ninos-privado.ts', '  const t = r && !soloLectura() ? descifrar(r.enc) : null;', '  const t = r ? descifrar(r.enc) : null;'],
  ['apps/web/lib/envios.ts', 'const t = soloLectura() ? null : descifrar(', 'const t = descifrar('],
  ['apps/web/lib/visitas-inm.ts', '    const t = r && !soloLectura() ? descifrar(r.enc) : null;', '    const t = r ? descifrar(r.enc) : null;'],
  ['apps/web/lib/citas-panel.ts', 'motivo: !soloLectura() ? p?.reason ?? null : null,', 'motivo: p?.reason ?? null,'],
  // (5) la pantalla y el 360°
  [PN, 'off: soloVer || !(e.F.dirty', 'off: !(e.F.dirty'],
  [PN, '<AvisoSoloLectura es={es} negocio={d.name} />', 'null'],
  [PN, 'router.push(conEq(href), { scroll: false })', 'router.push(href, { scroll: false })'],
  [N, 'window.open(`/panel/${n.id}?equipo=1`, "_blank")', 'window.open(`/panel/${n.id}`, "_blank")'],
  [N, '  "negocio.ver_panel": E2("abrió en solo lectura el panel de", "opened read-only the dashboard of"),\n', ''],
];
const crear = [
  // (2) solo la página: una acción del panel, una ruta o una pantalla con la entrada del equipo, o que marque la petición
  ['apps/web/app/panel/acciones-zz9n23.ts', '"use server";\nimport { accesoPanelSoloLectura } from "@/lib/panel";\nexport async function x(id: string) { const a = await accesoPanelSoloLectura(id); return !!a; }\n'],
  ['apps/web/app/api/zz9n23/route.ts', 'import { accesoPanelSoloLectura } from "@/lib/panel";\nexport async function POST() { return Response.json({ ok: !!(await accesoPanelSoloLectura("x")) }); }\n'],
  ['apps/web/lib/zz9n23.ts', 'import "server-only";\nimport { marcarSoloLectura } from "./vista-equipo";\nexport const x = () => marcarSoloLectura();\n'],
];
let bien = 0, total = 0;
const correr = () => {
  try { execSync(`node guardianes/run.mjs --solo ${G}`, { cwd: R, stdio: 'pipe' }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${G}]`)) ?? ''; return [!!l, l]; }
};
const informe = (que, [falla, out]) => { total++; console.log(`  ${falla ? '✓' : '✗'} ${G} al revés (${que})${out ? ' → ' + out.trim().slice(0, 170) : ''}`); if (falla) bien++; };
for (const [f, a, b] of casos) {
  const ruta = path.join(R, f);
  if (!fs.existsSync(ruta)) { total++; console.log(`  ✗ ${G}: no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ ${G}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(); } finally { fs.writeFileSync(ruta, orig); }
  informe(f.split('/').pop(), r);
}
for (const [f, c] of crear) {
  const ruta = path.join(R, f);
  fs.mkdirSync(path.dirname(ruta), { recursive: true });
  fs.writeFileSync(ruta, c);
  let r; try { r = correr(); } finally { fs.unlinkSync(ruta); if (f.includes('/zz9n23/')) fs.rmdirSync(path.dirname(ruta)); }
  informe(`crear ${f.split('/').pop()}`, r);
}
let limpio = require('../lib/alreves-fin.cjs')(R, { mostrar: true });
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
