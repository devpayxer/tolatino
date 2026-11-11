// Prueba al revés de los guardianes de 7f (respuestas automáticas de El Compa y «Sugerir respuesta»): se inyecta el defecto, el guardián debe
// fallar; se restaura.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const M = 'packages/db/migrations/0121_compa_respuestas_auto.sql', C = 'apps/web/lib/compa/conversacion.ts', RA = 'apps/web/lib/compa/respuesta-auto.ts', V = 'apps/web/lib/compa/verificar.ts',
  L = 'apps/web/lib/compa/reglas.ts', MS = 'apps/web/lib/mensajes.ts', AC = 'apps/web/app/panel/acciones-compa.ts', MP = 'apps/web/app/panel/MensajesPanel.tsx', CH = 'apps/web/app/(app)/cuenta/mensajes/[negocio]/Chat.tsx',
  PG = 'apps/web/app/panel/[id]/[[...r]]/page.tsx', CA = 'apps/web/app/(app)/cuenta/mensajes/acciones.ts', I = 'apps/web/lib/compa/interruptores.ts', AD = 'apps/web/lib/admin-colas.ts';
const casos = [
  // compaRespuestaAuto: solo Pro, apagadas de fábrica, fuera del horario, quién las cambia, nunca promete, la fija igual que antes, nunca tapa al humano
  ['compaRespuestaAuto', M, '  enabled      boolean not null default false,', '  enabled      boolean not null default true,'],
  ['compaRespuestaAuto', M, "  if new.enabled and (tg_op = 'INSERT' or not old.enabled) and not compa_negocio_pro(new.business_id) then", "  if false and new.enabled and not compa_negocio_pro(new.business_id) then"],
  ['compaRespuestaAuto', C, '  if (!r || !r.on || !r.pro || r.cuando !== "closed" || r.abierto) return false;', '  if (!r || !r.on || r.abierto) return false;'],
  ['compaRespuestaAuto', C, '  if (!r || !r.on || !r.pro || r.cuando !== "closed" || r.abierto) return false;', '  if (!r || !r.on || !r.pro || r.cuando !== "closed") return false;'],
  ['compaRespuestaAuto', C, 'hilo ? hiloApagado(hilo) : Promise.resolve(false)', 'Promise.resolve(false)'],
  ['compaRespuestaAuto', RA, '  if (!b.pro) return no(', '  if (false) return no('],
  ['compaRespuestaAuto', RA, '  if (x.enabled === true && pausa) return no(', '  if (x.enabled === true && false) return no('],
  ['compaRespuestaAuto', AC, '  const a = typeof id === "string" ? await accesoPanel(id, "msg") : null;\n  if (!a) return SIN_MSG;\n  const x = cambios', '  const a = typeof id === "string" ? await accesoPanel(id) : null;\n  if (!a) return SIN_MSG;\n  const x = cambios'],
  ['compaRespuestaAuto', C, '  if (det || detectarAuto(x.ultimo)) return pasar(LINEAS_AUTO.decide(N), `decide:${det?.tipo ?? "negocio"}`);', '  if (det) return pasar(LINEAS_AUTO.decide(N), `decide:${det?.tipo ?? "negocio"}`);'],
  ['compaRespuestaAuto', C, '  const w = verificarAuto(q2.r);', '  const w = { ok: true as const, r: q2.r };'],
  ['compaRespuestaAuto', C, '    texto: [x.ctx.texto, ...trozos.map((z) => `${z.titulo} ${z.seccion} ${z.texto}`)].join("\\n") };', '    texto: [x.ctx.texto, ...trozos.map((z) => `${z.titulo} ${z.seccion} ${z.texto}`), x.ultimo].join("\\n") };'],
  ['compaRespuestaAuto', V, '  if (PCT_TODO.test(todo)) return { ok: false, motivo: "auto_porcentaje" };\n', ''],
  ['compaRespuestaAuto', V, 'const PROMETE = /descuent|', 'const PROMETE = /'],
  ['compaRespuestaAuto', MS, '.compaContestara(b.id, previo.rows[0]?.id ?? null, userId).catch(() => false) : false;', '.compaContestara(b.id, previo.rows[0]?.id ?? null, userId) : false;'],
  ['compaRespuestaAuto', MS, '    else if (b.auto && !b.abierto && !t.auto_reciente) { await ponerRespuestaFija(', '    if (b.auto && !b.abierto && !t.auto_reciente) { await ponerRespuestaFija('],
  ['compaRespuestaAuto', MS, "m.sender = 'auto' and not m.compa and m.created_at > now() - interval '12 hours') as auto_reciente", "m.sender = 'auto' and m.created_at > now() - interval '12 hours') as auto_reciente"],
  ['compaRespuestaAuto', MS, 'Ahora estamos cerrados; te contestamos cuando abramos.`);', 'Ahora estamos cerrados; El Compa te contesta.`);'],
  ['compaRespuestaAuto', C, '    if (x && t.fija && !t.abierto && !x.reciente) await ponerRespuestaFija(', '    if (false) await ponerRespuestaFija('],
  ['compaRespuestaAuto', C, '      `update chat_threads set last_at = now(), last_from = \'auto\', last_text = left($2, 160),', '      `update chat_threads set last_at = now(), last_from = \'auto\', biz_unread = 0, last_text = left($2, 160),'],
  ['compaRespuestaAuto', C, '  if (S.n >= lim.compa_auto_hilo_max) {', '  if (S.n >= 1000) {'],
  // borradorSoloBorrador: el borrador nunca envía
  ['borradorSoloBorrador', C, "  await db().query(`insert into compa_messages (conversation_id, city_id, sender, text, source_slug, source_label, chips, engine, draft) values ($1, $2, 'compa', $3, $4, $5, '{}', $6, true)`,", "  await db().query(`insert into chat_messages (thread_id, sender, body) values ($1, 'business', $2)`, [b.hilo, a.texto]);\n  await db().query(`insert into compa_messages (conversation_id, city_id, sender, text, source_slug, source_label, chips, engine, draft) values ($1, $2, 'compa', $3, $4, $5, '{}', $6, true)`,"],
  ['borradorSoloBorrador', C, "source_label, chips, engine, draft) values ($1, $2, 'compa', $3, $4, $5, '{}', $6, true)`", "source_label, chips, engine, draft) values ($1, $2, 'compa', $3, $4, $5, '{}', $6, false)`"],
  ['borradorSoloBorrador', MP, 'if (r.texto) F.set({ txt: r.texto.slice(0, 1000) }); });', 'if (r.texto) c.run(() => mensajeResponder(d.id, x.id, r.texto!)); });'],
  // compaSiempreIAMensajes
  ['compaSiempreIAMensajes', L, 'es: `Soy El Compa, el asistente de IA de ${n}.`', 'es: `Hola, te escribe ${n}.`'],
  ['compaSiempreIAMensajes', C, '  const resp = a, texto = `${S.primera ? `${LINEAS_AUTO.presentacion(t.nombre)[lang]} ` : ""}${resp.texto}`', '  const resp = a, texto = `${resp.texto}`'],
  ['compaSiempreIAMensajes', CH, '(m.compa ? E2("EL COMPA · IA · ", "EL COMPA · AI · ")', '(m.compa ? E2("RESPUESTA · ", "REPLY · ")'],
  ['compaSiempreIAMensajes', MP, '(m.compa ? E2("EL COMPA · IA · ", "EL COMPA · AI · ")', '(m.compa ? E2("RESPUESTA · ", "REPLY · ")'],
  ['compaSiempreIA', C, "le escribe por el chat de To'Latino. Eres una IA y lo dices si te preguntan; nunca te haces pasar por el dueño", "le escribe por el chat de To'Latino. Nunca te haces pasar por el dueño"],
  // compaSalidaLimpia (7f): los sistemas fijos
  ['compaSalidaLimpia', C, 'sistema: SISTEMA_AUTO, datos: x.ctx.datos', 'sistema: x.ctx.nota, datos: x.ctx.datos'],
  ['compaSalidaLimpia', C, 'export const SISTEMA_BORRADOR = [', 'export const SISTEMA_BORRADOR = process.env.X ? [] : ['],
  // compaTapaEnElMotor (7f)
  ['compaTapaEnElMotor', C, "values ($1, 'auto', $2, true) returning id::text`, [t.id, tapar(texto).texto]", "values ($1, 'auto', $2, true) returning id::text`, [t.id, texto]"],
  ['compaTapaEnElMotor', C, 'const historial: MensajeModelo[] = M.map((m) => ({ de: m.sender === "user" ? "persona" as const : "compa" as const, texto: tapar(m.body).texto }));\n    a = await', 'const historial: MensajeModelo[] = M.map((m) => ({ de: m.sender === "user" ? "persona" as const : "compa" as const, texto: m.body }));\n    a = await'],
  ['compaTapaEnElMotor', MS, '  await c.query(`insert into chat_messages (thread_id, sender, body) values ($1, \'auto\', $2)`, [threadId, txt]);', '  await c.query(`insert into chat_messages (thread_id, sender, body, compa) values ($1, \'auto\', $2, true)`, [threadId, txt]);'],
  // compaInterruptores (7f): la conversación apagada se lee y cambia solo en interruptores.ts
  ['compaInterruptores', AD, 't.compa_off_reason as compa_off', 't.compa_off_reason as compa_off, t.compa_off_at as apagado_en'],
  ['compaInterruptores', MS, "coalesce(compa_pending_until < now() + interval '2 minutes', false) as escribe", "coalesce(compa_pending_until < now() + interval '2 minutes', false) and compa_off_at is null as escribe"],
  // compaSinRutaCritica (7f): Mensajes y el panel solo preguntan con .catch; el turno, después
  ['compaSinRutaCritica', PG, 'await RA.estadoAutoMensajes(d.id).catch(() => null)', 'await RA.estadoAutoMensajes(d.id)'],
  ['compaSinRutaCritica', CA, '  if (r.ok && r.compa && r.id) { const hilo = r.id; after(() => import("@/lib/compa/respuesta-auto").then((m) => m.contestarAuto(hilo)).catch(() => undefined)); }', '  if (r.ok && r.compa && r.id) await (await import("@/lib/compa/respuesta-auto")).contestarAuto(r.id).catch(() => undefined);'],
  ['compaSinRutaCritica', MS, 'import { db, tx } from "./db";', 'import { db, tx } from "./db";\nimport { turnoAuto } from "./compa/conversacion"; void turnoAuto;'],
  // ordenSinTexto
  ['ordenSinTexto', C, 'x.compa from (select * from chat_messages where thread_id = $1 and hidden_at is null order by id desc limit 10) x order by x.id`', 'x.compa from (select * from chat_messages where thread_id = $1 and hidden_at is null order by id desc limit 10) x order by id`'],
  ['ordenSinTexto', MS, 'order by o.id desc limit 1`', 'order by id desc limit 1`'],
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
