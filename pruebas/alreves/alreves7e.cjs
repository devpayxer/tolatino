// Prueba al revés de los guardianes de 7e (El Compa en el panel): se inyecta el defecto, el guardián debe fallar; se restaura.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const M = 'packages/db/migrations/0120_compa_panel.sql', P = 'apps/web/lib/compa/contexto-panel.ts', C = 'apps/web/lib/compa/conversacion.ts', A = 'apps/web/lib/compa/acciones.ts',
  PG = 'apps/web/app/panel/[id]/[[...r]]/page.tsx', PN = 'apps/web/app/panel/Panel.tsx', CP = 'apps/web/app/panel/CompaPanel.tsx', AC = 'apps/web/app/panel/acciones-compa.ts',
  HOY = 'apps/web/app/panel/Citas.tsx';
const casos = [
  // guiaDelPanelCompleta: cada sección del panel con su fila, con la parte que pide accesoPanel y el título del panel
  ['guiaDelPanelCompleta', M, "  ('entrega', 'entrega', 'dlv', 'delivery',", "  ('entregas', 'entregas', 'dlv', 'delivery',"],
  ['guiaDelPanelCompleta', M, "  ('cobros', 'cobros', 'pay', 'always',", "  ('cobros', 'cobros', null, 'always',"],
  ['guiaDelPanelCompleta', M, "  ('hoy', 'hoy', 'ord', 'sells',", "  ('hoy', 'hoy', 'msg', 'sells',"],
  ['guiaDelPanelCompleta', M, `'{"es":"Fotos y portada","en":"Photos and cover"}'`, `'{"es":"Fotos","en":"Photos and cover"}'`],
  ['guiaDelPanelCompleta', M, "  ('compa', 'compa', null, 'always',", "  ('admin', 'admin', null, 'always',"],
  ['guiaDelPanelCompleta', PG, '  else if (r.length === 1 && r[0] === "compa") ruta = { sec: "cpa", sub: null, det: null };', '  else if (r.length === 1 && r[0] === "compa") ruta = { sec: "cpa", sub: null, det: null };\n  else if (r.length === 1 && r[0] === "insights") ruta = { sec: "mas", sub: null, det: null };'],
  ['guiaDelPanelCompleta', PN, '  { k: "ver", icon: "shield",', '  { k: "ins", icon: "bolt", l: ["Insights", "Insights"], s: ["x", "x"] },\n  { k: "ver", icon: "shield",'],
  ['guiaDelPanelCompleta', A, '      const acc = await accesoPanel(a.target.negocio ?? "", s.parte ?? undefined);', '      const acc = await accesoPanel(a.target.negocio ?? "");'],
  // compaSoloSusDatos (panel)
  ['compaSoloSusDatos', P, "      where m.business_id = $2 and m.user_id = $1 and m.status = 'active' and b.status <> 'merged'", "      where m.business_id = $2 and m.status = 'active' and b.status <> 'merged'"],
  ['compaSoloSusDatos', P, '  const partes = m.kind === "owner" ? ["all"] : m.access ?? [];', '  const partes = ["all"];'],
  ['compaSoloSusDatos', P, '  for (const s of guia) (puedeAbrir(partes, s.parte) ? secciones : prohibidas).set(s.code, s);', '  for (const s of guia) secciones.set(s.code, s);'],
  ['compaSoloSusDatos', P, '    puedes_abrir: [...secciones.values()].map(', '    puedes_abrir: [...secciones.values(), ...prohibidas.values()].map('],
  ['compaSoloSusDatos', P, '    ve("ord") ? db()', '    true ? db()'],
  ['compaSoloSusDatos', A, '    const s = /^[a-z]+(\\/[a-z]+)?$/.test(a.ref) ? x.secciones.get(a.ref) : undefined;', '    const s = { ruta: a.ref, parte: null };'],
  ['compaSoloSusDatos', C, ' and closed_at is null and business_id = $4 for update`,', ' and closed_at is null for update`,'],
  ['compaSoloSusDatos', C, '  if (r.accion.tipo === "go_to_panel" && ctx.prohibidas.has(r.accion.ref)) return fija(LINEAS.dueno, `modelo:seccion_prohibida:${r.accion.ref}`);\n', ''],
  ['compaSoloSusDatos', C, '  if (sec && !sec.permitida) return fija(LINEAS.dueno, `seccion_prohibida:${sec.s.code}`);\n', ''],
  ['compaSoloSusDatos', C, '  const hallados = crudos.filter((h) => !ctx.slugsProhibidos.has(h.slug));', '  const hallados = crudos;'],
  ['compaSoloSusDatos', C, "    `select id::text, number from compa_conversations where user_id = $1 and business_id = $2 and use = 'owner'", "    `select id::text, number from compa_conversations where business_id = $2 and use = 'owner'"],
  // compaInterruptores (panel)
  ['compaInterruptores', C, '  if (!d.ok || (await alTope())) return { ok: false, apagado: true, msg: LINEAS.panelApagado };', '  if (!d.ok) return { ok: false, apagado: true, msg: LINEAS.panelApagado };'],
  ['compaInterruptores', C, '  const d = await disponible({ uso: "owner", canal: "app", ciudad, negocio });', '  const d = { ok: true } as const;'],
  // compaSalidaLimpia (panel)
  ['compaSalidaLimpia', C, 'export const SISTEMA_PANEL = [', 'export const SISTEMA_PANEL = process.env.X ? [] : ['],
  ['compaSalidaLimpia', C, 'sistema: SISTEMA_PANEL, datos: ctx.datos', 'sistema: ctx.texto, datos: ctx.datos'],
  // compaSiempreIA (panel)
  ['compaSiempreIA', CP, '{ l: E2("Con una persona", "Talk to a person"), v: "secondary"', '...(h ? [] : []), { l: E2("Pregunta", "Ask"), v: "secondary"'],
  ['compaSiempreIA', CP, 'E2(`El Compa es una IA. No cambia nada en tu panel: te dice dónde se hace y te lleva. Lo de dinero o tu cuenta lo ve una persona del equipo, ${x.horario}.`,', 'E2(`El Compa te ayuda con tu panel.`,'],
  ['compaSiempreIA', CP, 'm: `EL COMPA · ${', 'm: `${'],
  ['compaSiempreIA', C, "  \"Eres El Compa, el asistente de IA de To'Latino, la plataforma de la comunidad latina en Pennsylvania. Eres una IA y lo dices si te preguntan; nunca te haces pasar por una persona, por el dueño ni por el equipo de To'Latino.\",", "  \"Eres El Compa, el asistente del panel.\","],
  // compaSinRutaCritica: el asistente solo en su sección y con .catch; nada del motor en el panel fuera de su acción
  ['compaSinRutaCritica', PG, '.asistentePanel(acc.yo.id, d.id, lang).catch(() => null) : undefined;', '.asistentePanel(acc.yo.id, d.id, lang) : undefined;'],
  ['compaSinRutaCritica', HOY, '"use client";', '"use client";\nimport { asistentePanel } from "@/lib/compa/asistente-panel"; void asistentePanel;'],
  ['compaSinRutaCritica', PN, 'import { compaBloques, type AutoPanel, type CpaPanel } from "./CompaPanel";', 'import { compaBloques, type AutoPanel, type CpaPanel } from "./CompaPanel";\nimport { turnoPanel } from "@/lib/compa/conversacion"; void turnoPanel;'],
  // compaAccionConfirmada: «Ir a …» con mismo origen y la persona de la sesión
  ['compaAccionConfirmada', AC, 'export async function compaPanelIr(id: string, accion: string): Promise<ResCpa> {\n  if (!(await mismoOrigen())) return SIN;', 'export async function compaPanelIr(id: string, accion: string): Promise<ResCpa> {'],
  ['compaAccionConfirmada', AC, 'const r = await confirmar({ userId: u.id }, String(accion ?? ""), "app");', 'const r = await confirmar({ userId: a.yo.id }, String(accion ?? ""), "app");'],
  // compaTapaEnElMotor (panel): el texto de la persona, los trozos y la respuesta, tapados también en turnoPanel
  ['compaTapaEnElMotor', C, '[conv.id, ciudad, q.userId, t.texto, x.persona ? "persona" : null]', '[conv.id, ciudad, q.userId, crudo, x.persona ? "persona" : null]'],
  ['compaTapaEnElMotor', C, '  const trozos: TrozoModelo[] = hallados.map((h) => ({ fuente: h.slug, titulo: h.title[h.lang] ?? h.title.es, seccion: h.heading, texto: tapar(h.body).texto }));\n  const titulos = new Map(hallados.map((h) => [h.slug, h.title]));\n  const vctx: Contexto = { fuentes: trozos.map((z) => z.fuente), conCuenta: true,', '  const trozos: TrozoModelo[] = hallados.map((h) => ({ fuente: h.slug, titulo: h.title[h.lang] ?? h.title.es, seccion: h.heading, texto: h.body }));\n  const titulos = new Map(hallados.map((h) => [h.slug, h.title]));\n  const vctx: Contexto = { fuentes: trozos.map((z) => z.fuente), conCuenta: true,'],
  ['compaTapaEnElMotor', C, '        [conv.id, ciudad, tapar(r.texto).texto, slug, label, chips,', '        [conv.id, ciudad, r.texto, slug, label, chips,'],
  // accionesConAcceso: cada acción del panel pide el acceso antes de la base
  ['accionesConAcceso', AC, '  const a = typeof id === "string" ? await accesoPanel(id) : null;\n  if (!a) return SIN;\n  await cerrarPanel(', '  const a = { yo: { id: "" }, negocio: { id: String(id) } };\n  await db().query("select 1");\n  await cerrarPanel('],
];
let bien = 0;
for (const [g, f, a, b] of casos) {
  const ruta = `${R}/${f}`;
  if (!fs.existsSync(ruta)) { console.log(`  ✗ ${g}: no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { console.log(`  ✗ ${g}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let falla = false, out = '';
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); } catch (e) { falla = true; out = String(e.stderr).split('\n').find((l) => l.includes('[')) || ''; }
  fs.writeFileSync(ruta, orig);
  console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (${f.split('/').pop()})${out ? ' → ' + out.trim().slice(0, 150) : ''}`); if (falla) bien++;
}
console.log(`\n${bien}/${casos.length} al revés`);
execSync('node guardianes/run.mjs', { cwd: R, stdio: 'inherit' });
