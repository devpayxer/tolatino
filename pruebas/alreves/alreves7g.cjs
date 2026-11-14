// Prueba al revés de los guardianes de 7g (el copiloto del equipo): se inyecta el defecto, el guardián debe fallar; se restaura.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const M = 'packages/db/migrations/0122_compa_copiloto.sql', MA = 'packages/db/migrations/0124_compa_admin_config.sql', C = 'apps/web/lib/compa/conversacion.ts', CP = 'apps/web/lib/compa/contexto-copiloto.ts', V = 'apps/web/lib/compa/verificar.ts',
  K = 'apps/web/lib/compa/copiloto.ts', AC = 'apps/web/app/admin/acciones-copiloto.ts', SA = 'apps/web/app/admin/SoporteAdmin.tsx', CO = 'apps/web/app/admin/Colas.tsx', E = 'apps/web/lib/soporte-equipo.ts',
  PG = 'apps/web/app/admin/soporte/page.tsx', AD = 'apps/web/lib/admin-colas.ts', ACO = 'apps/web/app/admin/acciones-colas.ts', BA = 'apps/web/lib/barrido.ts';
const casos = [
  // copilotoSoloBorrador: el copiloto solo deja un borrador
  ['copilotoSoloBorrador', C, "    return (await c.query<{ id: string }>(\n      `insert into compa_drafts", "    await c.query(`insert into support_messages (case_id, city_id, sender, staff_id, body) values ($1, $2, 'staff', $3, $4)`, [ctx.casoId, ciudad, q.userId, borrador]);\n    return (await c.query<{ id: string }>(\n      `insert into compa_drafts"],
  ['copilotoSoloBorrador', C, "source_label, chips, engine, draft) values ($1, $2, 'compa', $3, $4, $5, '{}', $6, true)`,\n      [conv.id, ciudad, tapar(borrador).texto", "source_label, chips, engine, draft) values ($1, $2, 'compa', $3, $4, $5, '{}', $6, false)`,\n      [conv.id, ciudad, tapar(borrador).texto"],
  ['copilotoSoloBorrador', C, '  const d = await disponible({ uso: "copilot", canal: "app", ciudad, negocio: ctx.negocio });\n  if (!d.ok) return', '  const d = { ok: true } as { ok: boolean };\n  if (!d.ok) return'],
  ['copilotoSoloBorrador', C, '    if (n >= lim) return { limite: true };', '    if (n >= 100000) return { limite: true };'],
  ['copilotoSoloBorrador', CP, 'import { casoEquipo, money } from "../soporte-equipo";', 'import { casoEquipo, money, responder } from "../soporte-equipo"; void responder;'],
  ['copilotoSoloBorrador', AC, '  if (!(await mismoOrigen())) return { ok: false, msg: "Abre Super Admin desde To\'Latino." };\n', ''],
  ['copilotoSoloBorrador', AC, '  if (caso && !(s.puede("sop", "ver") && s.puede("sop", "editar"))) return', '  if (caso && !s.puede("sop", "ver")) return'],
  ['copilotoSoloBorrador', AC, '  if (cola && !s.puede("colas", "aprobar")) return', '  if (cola && !s.puede("colas", "ver")) return'],
  ['copilotoSoloBorrador', SA, 'setCop({ ...r, num }); setModo("persona"); setResp(r.borrador);', 'setCop({ ...r, num }); setModo("persona"); setResp(r.borrador); void sopResponder(num, r.borrador, null, r.id);'],
  ['copilotoSoloBorrador', SA, 'sopResponder(k.num, resp, macro, borrador)', 'sopResponder(k.num, resp, macro, cop?.id ?? null)'],
  ['copilotoSoloBorrador', CO, 'setCop({ ...r, caso: id }); setToast(', 'setCop({ ...r, caso: id }); void decidirSop(id, r.borrador); setToast('],
  ['copilotoSoloBorrador', CO, 'const copOn = k.queue === "sop" && "copiloto" in k && !!k.copiloto', 'const copOn = "copiloto" in k'],
  ['copilotoSoloBorrador', E, 'from compa_drafts where id = $1::uuid and case_id = $2::bigint and staff_id = $3 and used is null', 'from compa_drafts where id = $1::uuid and used is null and $2::bigint > 0 and $3::uuid is not null'],
  ['copilotoSoloBorrador', M, "check (not from_draft or (sender = 'staff' and not internal))", "check (true)"],
  // 9b-3 · compa_drafts_antes y support_messages_antes las redefine 0124 (la última manda): el defecto va en la que hoy las define.
  ['copilotoSoloBorrador', MA, "    raise exception 'compa_borrador_mensaje: ese mensaje no salió de este borrador';", "    null;"],
  ['copilotoSoloBorrador', MA, "new.at, new.from_draft)\n          is distinct from", "new.at)\n          is distinct from"],
  ['copilotoSoloBorrador', K, 'disponible({ uso: "copilot", canal: "app", ciudad: x.ciudad, negocio: x.negocio ?? null }), alTope()', 'disponible({ uso: "copilot", canal: "app", ciudad: x.ciudad, negocio: x.negocio ?? null }), Promise.resolve(false)'],
  // compaSoloSusDatos (7g): el caso con las lecturas de la ficha y el permiso de la acción; la conversación de ESE caso
  ['compaSoloSusDatos', CP, '  if (!(s.puede("sop", "ver") && s.puede("sop", "editar"))) return null;\n  const k = await casoEquipo(s, numero);', '  const k = await casoEquipo(s, numero);'],
  ['compaSoloSusDatos', CP, '  if (!s.puede("colas", "aprobar")) return null;\n  const k = await casoCola(s, id);', '  const k = await casoCola(s, id);'],
  ['compaSoloSusDatos', CP, 'if (!k || k.queue !== "sop" ||', 'if (!k ||'],
  ['compaSoloSusDatos', CP, '  const u = (await db().query<{ lang: string | null }>(`select lang from users where id = $1::uuid`, [h.uid])).rows[0];', '  const u = (await db().query<{ lang: string | null; n: number }>(`select lang, (select count(*)::int from support_messages m where m.user_id = $1::uuid) as n from users where id = $1::uuid`, [h.uid])).rows[0];'],
  ['compaSoloSusDatos', CP, 'export async function contextoCopiloto(s: Staff, x:', 'export async function contextoCopiloto(z: { s: Staff }, s: Staff, x:'],
  ['compaSoloSusDatos', C, "where use = 'copilot' and user_id = $1 and closed_at is null\n          and (support_case_id = $2::bigint or help_request_id = $3::bigint)", "where use = 'copilot' and closed_at is null\n          and (support_case_id = $2::bigint or help_request_id = $3::bigint) and $1::uuid is not null"],
  // compaSinDatosSensibles (7g)
  ['compaSinDatosSensibles', CP, '  if (h.k === "enrollment" || h.rub === "salud" || h.rub === "pro") return null;\n', ''],
  ['compaSinDatosSensibles', CP, "not (o.kind not in ('enrollment') and not (coalesce(o.details->>'rubro', '') in ('salud', 'pro')) and not exists", "not (not (coalesce(o.details->>'rubro', '') in ('salud', 'pro')) and not exists"],
  ['compaSinDatosSensibles', CP, '.replace(TEL, TAPADO).replace(CORREO, TAPADO)', '.replace(CORREO, TAPADO)'],
  ['compaSinDatosSensibles', CP, '  if (await sensible(h.num, h.uid, null)) return null;\n', ''],
  // compaSalidaLimpia (7g): el copiloto verifica con verificarCopiloto (también las reglas) y su sistema es fijo
  ['compaSalidaLimpia', C, 'esquema: ESQUEMA_COPILOTO, verificador: (j) => verificarCopiloto(j, vc) });', 'esquema: ESQUEMA_COPILOTO, verificador: (j) => ({ ok: true as const, r: j as SalidaCopiloto }) });'],
  ['compaSalidaLimpia', C, '  const ver = x.verificador ?? ((j: unknown) => verificar(j, vctx!));', '  const ver = x.verificador ?? ((j: unknown) => ({ ok: true as const, r: j as Respuesta }));'],
  ['compaSalidaLimpia', C, '    const v = verificarCopiloto(borradorCopilotoConReglas(', '    const v = ((j: SalidaCopiloto) => ({ ok: true as const, r: j }))(borradorCopilotoConReglas('],
  ['compaSalidaLimpia', C, 'export const SISTEMA_COPILOTO = [', 'export const SISTEMA_COPILOTO = process.env.X ? [] : ['],
  ['compaSalidaLimpia', V, '  if (PROMETE_COP.test(sinAcentosV(r.borrador))) return { ok: false, motivo: "promete" };\n', ''],
  ['compaSalidaLimpia', V, '    for (const nota of c.internas) for (const s of tejas(nota, 5)) if (t.has(s)) return { ok: false, motivo: "nota_interna" };\n', ''],
  ['compaSalidaLimpia', V, '    for (const w of palabrasV(r.borrador)) if (numsInt.has(w)) return { ok: false, motivo: "nota_interna" };\n', ''],
  ['compaSalidaLimpia', V, '  for (const m of r.borrador.match(MONTO) ?? []) if (!enTexto(m, pubC)) return { ok: false, motivo: "monto" };\n', ''],
  ['compaSalidaLimpia', V, 'sugerir_devolver: r.sugerir_devolver && c.puedeDevolver', 'sugerir_devolver: r.sugerir_devolver'],
  // compaSinRutaCritica (7g): la ficha solo pregunta con .catch; el borrador solo desde su acción
  ['compaSinRutaCritica', PG, 'm.copilotoDisponible({ ciudad: caso.ciudad, negocio: caso.negocio?.id ?? null })).catch(() => false)', 'm.copilotoDisponible({ ciudad: caso.ciudad, negocio: caso.negocio?.id ?? null }))'],
  ['compaSinRutaCritica', AD, 'm.copilotoDisponible({ ciudad: q.city_id, negocio: q.business_id })).catch(() => false)', 'm.copilotoDisponible({ ciudad: q.city_id, negocio: q.business_id }))'],
  ['compaSinRutaCritica', ACO, 'import { db, tx } from "@/lib/db";', 'import { db, tx } from "@/lib/db";\nimport { copilotoDisponible } from "@/lib/compa/copiloto"; void copilotoDisponible;'], // 9b-3 · el import de hoy
  ['compaSinRutaCritica', PG, '.then((m) => m.copilotoDisponible(', '.then((m) => m.borrador(null as never, {}) && m.copilotoDisponible('],
  // libroSoloInsercion (7g): compa_drafts
  ['libroSoloInsercion', MA, "  if old.used is not null then raise exception 'compa_borrador_usado: ese borrador ya se usó o se descartó'; end if;\n", ''], // 9b-3 · 0124 manda
  ['libroSoloInsercion', BA, "update compa_drafts set used = 'discarded' where used is null", "delete from compa_drafts where used is null"],
  ['libroSoloInsercion', E, '`update compa_drafts set used = $2, message_id = $3::bigint where id = $1::uuid`', '`update compa_drafts set draft = $2, message_id = $3::bigint where id = $1::uuid`'],
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
// 9b-3 · alrevesQueFalla: un defecto sin cazar pone la prueba en rojo (antes salía con 0 y el CI la contaba en verde).
if (bien !== casos.length) process.exit(1);
