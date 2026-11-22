// Prueba al revés de 9t9 · Un elemento malo no detiene a los demás y nada queda fuera por un tope, en los barridos de dinero (guardián barridoUnoPorUno).
// Cada caso deshace un arreglo a propósito y el guardián tiene que fallar con SU mensaje (el texto de cada caso abajo); después se restaura y los guardianes
// quedan limpios:
//   el ayudante (lib/barrido-uno.ts) que traga el error, que no hace fallar la tarea, cadaUno sin fin(), porTandas que repite;
//   barrerPlanes sin el ayudante, sin tandas, sin orden, con «hoy» que no es el de la ciudad; una función que junta fallos y nunca llama fin(); un .catch que
//   traga el error de un elemento (devoluciones, cobros fuera de sesión, liquidaciones); una selección con tope sin orden (mercado, plan Pro); la tarea «dinero»
//   que vuelve a tragar el error y su selección sin orden; la base sin el índice de lo que toca.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const H = 'apps/web/lib/barrido-uno.ts', PL = 'apps/web/lib/planes.ts', RE = 'apps/web/lib/rentas.ts', RV = 'apps/web/lib/revision-pasarela.ts', CF = 'apps/web/lib/cobro-fuera.ts';
const ME = 'apps/web/lib/mercado.ts', BA = 'apps/web/lib/barrido.ts', LQ = 'apps/web/lib/evt-liquidacion.ts', SU = 'apps/web/lib/suscripcion.ts', MG = 'packages/db/migrations/0208_barrido_lo_que_toca.sql';
const G = 'barridoUnoPorUno';
const casos = [
  // El ayudante
  [H, '      this.ids.push(id);\n', '', 'Fallos.uno: si el elemento lanza, se anota'],
  [H, '    throw new Error(`${this.tarea}: ${this.ids.length} de ${this.total} fallaron (${this.ids.join(", ")})`.slice(0, TOPE));', '    console.warn(this.tarea, this.ids);', 'Fallos.fin: con fallidos, la tarea sale fallida'],
  [H, '  await b.cada(lista, idDe, f);\n  b.fin();', '  await b.cada(lista, idDe, f);', 'cadaUno termina con fin()'],
  [H, '    vistos.push(...L.map(clave));\n', '', 'porTandas no repite en la corrida'],
  // barrerPlanes
  [PL, '    await B.cada(L, (x) => x.numero, (x) => unPlan(x, entorno));', '    for (const x of L) await unPlan(x, entorno);', 'bucle por elemento a mano'],
  [PL, '    await U.porTandas(B, 50, async (vistos) => (await db().query<P>(TOCA_PLAN, [vistos])).rows, (x) => x.numero, (x) => unPlan(x, entorno), { clave: (x) => x.id });',
    '    for (const x of (await db().query<P>(TOCA_PLAN, [[]])).rows) await unPlan(x, entorno);', 'recorre TOCA_PLAN por tandas'],
  [PL, '   order by least(case when s.status = \'paused\' then s.paused_until end, s.next_charge_on, s.next_visit_on) nulls last, s.id\n', '', 'TOCA_PLAN elige lo que toca hoy en la ciudad'],
  [PL, 's.next_charge_on <= (now() at time zone ci.timezone)::date and (s.retry_on is null', 's.next_charge_on <= now()::date and (s.retry_on is null', 'TOCA_PLAN elige lo que toca hoy en la ciudad'],
  // Junta los fallos y nunca hace fallar la tarea
  [RE, '  await B.cada(L, (x) => `renta ${x.rid}`, (x) => liquidarDeposito(x.rid));\n  B.fin();', '  await B.cada(L, (x) => `renta ${x.rid}`, (x) => liquidarDeposito(x.rid));', 'nunca llama fin()'],
  // Un .catch que traga el error de un elemento
  [RV, 'if ((await ejecutarDevolucionSobra(g.id)) === "done") n++;', 'if ((await ejecutarDevolucionSobra(g.id).catch(() => "pending")) === "done") n++;', 'un .catch que traga el error'],
  [CF, '    if (await termina(a, true)) n++;', '    if (await termina(a, true).catch((e) => { console.error(e); return false; })) n++;', 'un .catch que traga el error'],
  [LQ, '      return !!u.rowCount;\n    });\n    if (ok && (await pagarUna(s.id))) pagadas++;', '      return !!u.rowCount;\n    }).catch(() => false);\n    if (ok && (await pagarUna(s.id))) pagadas++;', 'un .catch que traga el error'],
  // Una selección con tope sin orden
  [ME, "o.status in ('declined', 'expired', 'cancelled', 'done') order by p.held_at nulls first, p.id limit 20", "o.status in ('declined', 'expired', 'cancelled', 'done') limit 20", 'una selección con tope sin orden'],
  [SU, "      order by case when status = 'trial' then trial_ends_at when status = 'past_due' then next_attempt_at when status = 'courtesy' then courtesy_until else current_period_end end, business_id\n", '', 'una selección con tope sin orden'],
  // La tarea «dinero» de barrido.ts
  [BA, 'await N.uno("pagos", () => cobros.repararPagos(b));', 'await cobros.repararPagos(b).catch(() => undefined);', 'la tarea «dinero» recorre cada negocio'],
  [BA, 'group by b order by min(t) nulls first, b limit 2000', 'group by b limit 2000', 'negociosConRetenido: la tajada de 2000 lleva su orden'],
  // La base
  [MG, 'create index if not exists plan_subs_visita_idx on plan_subscriptions (next_visit_on) where status = \'active\';\n', '', 'los índices de lo que toca de los planes'],
];
const soloTextos = !!process.env.ALREVES_SOLO_TEXTOS;
let bien = 0, total = 0;
const correr = (g) => {
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); return []; }
  catch (e) { return String(e.stderr).split('\n').filter((x) => x.trim().startsWith(`[${g}]`)); }
};
const informe = (g, que, msg, lineas) => {
  total++;
  const l = soloTextos ? lineas[0] : lineas.find((x) => x.includes(msg));
  console.log(`  ${l ? '✓' : '✗'} ${g} al revés (${que}: «${msg}»)${l ? ' → ' + l.trim().slice(0, 200) : lineas.length ? ' → otro mensaje: ' + lineas[0].trim().slice(0, 160) : ' → el guardián no falló'}`);
  if (l) bien++;
};
for (const [f, a, b, msg] of casos) {
  const ruta = path.join(R, f);
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ ${G}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  try { informe(G, path.basename(f), msg, correr(G)); } finally { fs.writeFileSync(ruta, orig); }
}
let limpio = true;
if (!require('../lib/alreves-fin.cjs')(R)) limpio = false;
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
