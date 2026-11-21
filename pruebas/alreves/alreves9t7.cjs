// Prueba al revés de 9t7 · Las devoluciones y reversiones le preguntan a la pasarela (guardián devolucionPreguntaALaPasarela). Cada caso rompe el código,
// la base o la pantalla a propósito y el guardián tiene que fallar con SU mensaje (el texto de cada caso abajo); después se restaura y los guardianes
// quedan limpios:
//   (1) una devolución (cobros, boletos) o una reversión que va a la pasarela sin anotar antes que se manda y su dato buscable, o sin mandarlo; una llamada
//       nueva a pasarela.devolver fuera de las que preguntan; buscarDevolucion que no busca refunds:<id>;
//   (2) la consulta pasada la llave: sin exigir la ventana; «nunca llegó» sin mirar si lo debido sigue igual; las anotadas sin el dato preguntadas como si lo
//       tuvieran; la reversión que vuelve a valer sin el veredicto; la misma llave para siempre;
//   (3) «Resolver a mano» sin preguntar antes; que marque aunque Stripe no conteste o diga que salió; la devolución de lo que sobró sin su camino manual;
//   (4) la base sin el dato una vez, sin dar por mandado lo de antes; la hoja que no lo dice.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ, G = 'devolucionPreguntaALaPasarela';
const CB = 'apps/web/lib/cobros.ts', BO = 'apps/web/lib/boletos-despues.ts', LQ = 'apps/web/lib/evt-liquidacion.ts', DC = 'apps/web/lib/devolucion-consulta.ts', DA = 'apps/web/lib/dinero-alertas.ts';
const PS = 'apps/web/lib/pagos/pasarela.ts', PT = 'apps/web/app/admin/Planes.tsx', MG = 'packages/db/migrations/0206_devoluciones_preguntan.sql';
const casos = [
  // (1)
  [CB, "update refunds set gateway_ref = case when sent_at is null then 'refunds:' || id else gateway_ref end, sent_at = coalesce(sent_at, now()) where id = $1::bigint and status = 'pending' and manual_at is null returning gateway_ref as gref`, [r.id])).rows[0];\n  if (!m) return { ok: false, msg: STRIPE_NO };",
    "update refunds set attempts = attempts where id = $1::bigint returning null::text as gref`, [r.id])).rows[0];\n  if (!m) return { ok: false, msg: STRIPE_NO };", 'ejecutarDevolucionPago: anota que se manda y su dato buscable'],
  [BO, "{ plataforma: r.pg, ...(m.gref ? { meta: { tl_intencion: m.gref } } : {}) }", "{ plataforma: r.pg }", 'ejecutarDevolucion: manda el dato buscable'],
  [LQ, "sent_at = coalesce(sent_at, now()) where id = $1::bigint and status = 'pending' and manual_at is null returning gateway_ref as gref`, [id])).rows[0];\n  if (!m) return false;\n  const { llaveDe }",
    "sent_at = coalesce(sent_at, now()) where id = $1::bigint and status = 'pending' returning gateway_ref as gref`, [id])).rows[0];\n  if (!m) return false;\n  const { llaveDe }", 'ejecutarReversion: anota que se manda'],
  [CB, "export async function pagoDe(opId: string): Promise<PagoVista | null> {\n", "export async function pagoDe(opId: string): Promise<PagoVista | null> {\n  await pasarela.devolver(\"pi_x\", 1, \"x\");\n", 'pasarela.devolver en pagoDe sin su intención anotada antes'],
  [PS, 'const REF_DEV = /^(gateway_refunds|refunds|event_settlement_reversals):\\d{1,18}$/;', 'const REF_DEV = /^(gateway_refunds):\\d{1,18}$/;', 'buscarDevolucion busca también'],
  // (2)
  [DC, 'if (!r || r.st !== "pending" || r.mano || !r.enviada || !r.vieja) return { resultado: null, quedo: "ya_no_estaba" };', 'if (!r || r.st !== "pending" || r.mano) return { resultado: null, quedo: "ya_no_estaba" };', 'resolverDevolucion: solo pasada la llave'],
  [DC, '    if (!r.igual) return (r.boletos ?', '    if (false) return (r.boletos ?', 'cerrarConVeredicto: hecha por el mismo cierre'],
  [DC, "where r.status = 'pending' and r.manual_at is null and r.gateway_ref is not null and coalesce(r.key_from, r.created_at) <= now()", "where r.status = 'pending' and r.manual_at is null and coalesce(r.key_from, r.created_at) <= now()", 'preguntarViejas: pregunta solo las mandadas con su dato'],
  [LQ, '  else if (v?.noLlego && r.viva) {', '  else if (r.viva) {', 'resolverReversion: pasada la llave'],
  [CB, 'pasarela.devolver(r.pi, r.amt, llaveDe(r.idem, r.kn),', 'pasarela.devolver(r.pi, r.amt, r.idem,', 'la llave que va a Stripe es la de la fila'],
  // (3)
  [DA, '    const pre = await (await import("./devolucion-consulta")).antesDeAMano(s, id, a.kind, a.sujeto, n);\n    if (!pre.sigue) return pre.ok ? { ok: true, msg: pre.msg } : { ok: false, msg: pre.msg };\n', '', 'notaAlerta: «Resolver a mano» le pregunta a la pasarela ANTES'],
  [DC, '  if (resultado === "sin_respuesta") return { sigue: false, ok: false, msg: "Stripe no contestó la consulta: no se cambió nada. Prueba en un momento." };\n', '', 'antesDeAMano: la pasarela antes'],
  [DC, '  if (resultado === "hecho") {', '  if (false) {', 'antesDeAMano: la pasarela antes'],
  [DA, ' && a.kind !== "extra_refund_stuck") || !/', ') || !/', 'la devolución de lo que sobró también tiene «Resolver a mano»'],
  [DA, "union all select 'refunds', z.id, z.status = 'pending' and z.manual_at is null from refunds z where a.kind = 'refund_stuck'", "union all select 'refunds', z.id, false from refunds z where a.kind = 'refund_stuck'", '«Preguntar a Stripe ahora» también en las devoluciones'],
  [PT, 'E("Antes de guardar, se le pregunta a Stripe:', 'E("Antes de guardar, revisa en Stripe:', 'la hoja de «Resolver a mano» dice'],
  // (4)
  [MG, "  if old.gateway_ref is not null and new.gateway_ref is distinct from old.gateway_ref then raise exception 'devolucion: gateway_ref se anota una vez'; end if;\n", '', 'la base: el dato una vez'],
  [MG, "update refunds set sent_at = created_at where sent_at is null and status = 'pending';\n", '', 'la base: el dato una vez'],
  [MG, "  check (subject_kind not in ('refunds', 'event_settlement_reversals', 'gateway_refunds') or decision = 'vale');", "  check (true);", 'la base: el dato una vez'],
];
const soloTextos = !!process.env.ALREVES_SOLO_TEXTOS;
let bien = 0, total = 0;
const correr = () => {
  try { execSync(`node guardianes/run.mjs --solo ${G}`, { cwd: R, stdio: 'pipe' }); return []; }
  catch (e) { return String(e.stderr).split('\n').filter((x) => x.trim().startsWith(`[${G}]`)); }
};
const informe = (que, msg, lineas) => {
  total++;
  const l = soloTextos ? lineas[0] : lineas.find((x) => x.includes(msg));
  console.log(`  ${l ? '✓' : '✗'} ${G} al revés (${que}: «${msg}»)${l ? ' → ' + l.trim().slice(0, 200) : lineas.length ? ' → otro mensaje: ' + lineas[0].trim().slice(0, 160) : ' → el guardián no falló'}`);
  if (l) bien++;
};
for (const [f, a, b, msg] of casos) {
  const ruta = path.join(R, f);
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ ${G}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  try { informe(path.basename(f), msg, correr()); } finally { fs.writeFileSync(ruta, orig); }
}
let limpio = true;
try { execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); } catch { limpio = false; }
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
