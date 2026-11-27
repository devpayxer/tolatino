// Prueba al revés de 9t9 · Un elemento malo no detiene a los demás y nada queda fuera por un tope, en los barridos de dinero (guardián barridoUnoPorUno).
// Cada caso deshace un arreglo a propósito y el guardián tiene que fallar con SU mensaje (el texto de cada caso abajo); después se restaura y los guardianes
// quedan limpios:
//   el ayudante (lib/barrido-uno.ts) que traga el error, que no hace fallar la tarea, cadaUno sin fin(), porTandas que repite;
//   barrerPlanes sin el ayudante, sin tandas, sin orden, con «hoy» que no es el de la ciudad; una función que junta fallos y nunca llama fin(); un .catch que
//   traga el error de un elemento (devoluciones, cobros fuera de sesión, liquidaciones); una selección con tope sin orden (mercado, plan Pro); la tarea «dinero»
//   que vuelve a tragar el error y su selección sin orden; la base sin el índice de lo que toca.
//   27 nov · Los barridos que NO son de dinero ya convertidos (lista ND del guardián): un bucle a mano (puerta, temas; revertirDeudas con sus reversiones),
//   un .catch o un try/catch que traga el error (evento privado, fotos de la ayuda), sin fin() (mesas; evento privado en el barrido central), el ayudante
//   con otro nombre que su tarea, una selección con tope sin orden (recordatorios de boletos, retos de llaves, «¿ya se avisó?» de las llaves), porTandas
//   que no deja fuera lo visto (archivos de datos), los avisos de Eventos con lo ya mandado dentro de la tajada, y barrido.ts que ya no llama al barrido.
//   27 nov, 2ª tanda · Los de «bucle por elemento sin el ayudante» y compaRetencion (soporte, El Compa, push, errores, beta, tiendas, reportes, purga de
//   cuentas, salud, despliegues, mantenimiento, campañas, verificaciones (3-D Secure), apertura, vacantes, ofertas, colas y las fotos): un caso cada uno.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const H = 'apps/web/lib/barrido-uno.ts', PL = 'apps/web/lib/planes.ts', RE = 'apps/web/lib/rentas.ts', RV = 'apps/web/lib/revision-pasarela.ts', CF = 'apps/web/lib/cobro-fuera.ts';
const ME = 'apps/web/lib/mercado.ts', BA = 'apps/web/lib/barrido.ts', LQ = 'apps/web/lib/evt-liquidacion.ts', SU = 'apps/web/lib/suscripcion.ts', MG = 'packages/db/migrations/0208_barrido_lo_que_toca.sql';
const PU = 'apps/web/lib/puerta.ts', EP = 'apps/web/lib/evento-privado.ts', EA = 'apps/web/lib/evt-avisos.ts', LL = 'apps/web/lib/llaves/llaves.ts', DX = 'apps/web/lib/datos/exportar.ts';
const SA = 'apps/web/lib/sistema/salud.ts', TE = 'apps/web/lib/temas.ts', MS = 'apps/web/lib/mesa-espera.ts', AC = 'apps/web/lib/ayuda-cita.ts';
const L2 = (x) => `apps/web/lib/${x}`;
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
  // 27 nov · TOCA_PLAN con 1 M de planes: el tope de UTC + 1 y los candidatos con «in (select …)» (recorría todas las citas en secuencial)
  [PL, "with h as (select max((now() at time zone timezone)::date) as tope from cities)", "with h as (select (now() at time zone 'UTC')::date + 1 as tope)", 'el tope es el día más adelantado de las ciudades'],
  [PL, "   where s.id = any(array(select id from plan_subscriptions, h where", "   where s.id in (select id from plan_subscriptions, h where", 'los candidatos van como lista'],
  // 27 nov · Los barridos que NO son de dinero ya convertidos (lista ND) y revertirDeudas
  [LQ, "    await B.cada(ids, (id) => `reversion ${id}`, async (id) => { if (await ejecutarReversion(id)) n++; });", '    for (const id of ids) if (await ejecutarReversion(id)) n++;', 'revertirDeudas: bucle por elemento a mano'],
  [PU, '  await U.porTandas(B, 200, async (vistos) =>', '  await (async (B, n, traer, idDe, f) => { for (const x of await traer([])) await f(x); })(B, 200, async (vistos) =>', 'barrerPuertaAbre: bucle por elemento a mano'],
  [EP, '(v) => v.num, (v) => moverDinero(v.num));', '(v) => v.num, (v) => moverDinero(v.num).catch(() => undefined));', 'vencerEvp: un .catch que traga el error'],
  [EP, '  if (!y) B.fin();\n', '', 'vencerEvp: en el barrido central (sin filtro) la tarea sale fallida'],
  [EA, ' order by min(d.starts_at), d.id, t.holder_user_id limit 500', ' limit 500', 'barrerRecordatoriosBoletos: una selección con tope sin orden'],
  [EA, "          and not exists (select 1 from evt_avisos_enviados z where z.kind = 'aforo' and z.ref = d.id::text)\n", '', 'eligen solo lo que aún no se mandó antes del tope'],
  [LL, ' order by expires_at, id limit 5000', ' limit 5000', 'purgarRetos: una selección con tope sin orden'],
  [DX, 'and not (id = any($1::uuid[])) order by requested_at, data_exports.id limit 50`, [vistos])', 'order by requested_at, data_exports.id limit 50`, [])', 'vencerExportaciones: porTandas sin dejar fuera lo ya visto'],
  [SA, "select 1 where exists (select 1 from notifications where ref_kind = 'llave_vence' and ref_id = $1)", "select 1 from notifications where ref_kind = 'llave_vence' and ref_id = $1 limit 1", 'avisarLlavesQueVencen: una selección con tope sin orden'],
  [TE, '  await (await import("./barrido-uno")).cadaUno("temasResenas", L, (x) => x.id, async ({ id }) => {', '  await (async (f) => { for (const x of L) await f(x); })(async ({ id }) => {', 'rehacerTemas no recorre sus elementos con lib/barrido-uno.ts'],
  [MS, '  B.fin();\n  return n;', '  return n;', 'barrerEsperaMesas junta sus fallos y nunca llama fin()'],
  [MS, 'U.Fallos("esperaMesas")', 'U.Fallos("mesas")', 'barrerEsperaMesas: el ayudante no lleva el nombre de su tarea'],
  [AC, '    await borrarConVariantes(m.url, m.w, m.var_widths);', '    try { await borrarConVariantes(m.url, m.w, m.var_widths); } catch { return; }', 'purgarFotosAyuda: un try/catch que traga el error'],
  [BA, '["temasResenas", async () => (await import("./temas")).rehacerTemas()]', '["temasResenas", async () => (await import("./temas")).temasDe("")]', 'la tarea «temasResenas» de barrido.ts ya no llama a rehacerTemas'],
  // 27 nov · 2ª tanda: los de «bucle por elemento sin el ayudante» y compaRetencion (lista ND): el bucle a mano, el .catch o el try/catch que traga el error,
  // sin fin(), el ayudante con otro nombre, la selección con tope sin orden (también «limit ${CONSTANTE}») y porTandas que no deja fuera lo visto.
  [L2("soporte-equipo.ts"), "  await (await import(\"./barrido-uno\")).cadaUno(\"soporte\", L.filter((x) => x.staff), (x) => x.num, async (x) => {", "  await (async (L2: { num: string; staff: string | null }[], _i: unknown, f: (x: { num: string; staff: string | null }) => Promise<void>) => { for (const x of L2) await f(x); })(L.filter((x) => x.staff), (x) => x.num, async (x) => {", "barrerSoporte no recorre sus elementos con lib/barrido-uno.ts"],
  [L2("compa/respuesta-auto.ts"), "(x) => turnoAuto(x.id));", "(x) => turnoAuto(x.id).catch(() => ({ que: \"nada\" })));", "contestarPendientes: un .catch que traga el error"],
  [L2("compa/canales.ts"), "  B.fin();\n  return { retomadas, purgadas: a + b };", "  return { retomadas, purgadas: a + b };", "barrerCanales junta sus fallos y nunca llama fin()"],
  [L2("compa/purga.ts"), "order by c.purged_at, m.id limit 50`, [vistos])", "order by c.purged_at, m.id limit 50`, [[]])", "barrerRetencion: porTandas sin dejar fuera lo ya visto"],
  [L2("push/cola.ts"), "  await B.cada(S, (s) => `aviso ${s.id}`, (s) => smsRespaldo(s.id));", "  for (const s of S) await smsRespaldo(s.id);", "barrerPush: bucle por elemento a mano"],
  [L2("errores/vivo.ts"), "  B.fin();\n  return { alertas, avisados, purgados };", "  return { alertas, avisados, purgados };", "barrerErrores junta sus fallos y nunca llama fin()"],
  [L2("beta.ts"), "  await (await import(\"./barrido-uno\")).cadaUno(\"beta\", L, (x) => `tester ${x.id}`, (x) => sincronizar(x.id));", "  for (const x of L) await sincronizar(x.id);", "barrerBeta: bucle por elemento a mano"],
  [L2("tiendas/tuberia.ts"), "order by updated_at, app_builds.id limit 5", "limit 5", "barrerTiendas: una selección con tope sin orden"],
  [L2("reportes.ts"), " and not (r.id = any($1::bigint[]))", "", "barrerReportes: porTandas sin dejar fuera lo ya visto"],
  [L2("datos/purgar.ts"), "    const r = await purgarCuenta(x.id);", "    const r = await purgarCuenta(x.id).catch(() => ({ cuenta: x.id, ok: false, filas: 0, tablas: 0, pendientes: 0, negocios: 0, fotos: 0 }));", "purgarVencidas: un .catch que traga el error"],
  [L2("sistema/salud.ts"), "  filas.push(await disco());", "  try { filas.push(await disco()); } catch { filas.push({ service: \"disco\", ok: false, latency_ms: null, value: null, detail: \"?\" }); }", "medirSalud: un try/catch que traga el error"],
  [L2("sistema/despliegues.ts"), "where id = $1 and noticed_at is null`, [d.id]);", "where id = $1 and noticed_at is null`, [d.id]).catch(() => undefined);", "avisarDespliegues: un .catch que traga el error"],
  [L2("sistema/despliegues.ts"), "  n += (await B.uno(\"retirar\", () => retirarAnunciosDeMantenimiento())) ?? 0;\n  B.fin();\n", "  n += (await B.uno(\"retirar\", () => retirarAnunciosDeMantenimiento())) ?? 0;\n", "avisarMantenimiento junta sus fallos y nunca llama fin()"],
  [L2("crecimiento/campanas.ts"), " and not (id = any($1::bigint[]))", "", "campanasProgramadas: porTandas sin dejar fuera lo ya visto"],
  [L2("pagos/verificacion.ts"), "        and not (a.pi = any($2::text[]))\n", "", "vencerVerificaciones: porTandas sin dejar fuera lo ya visto"],
  [L2("pagos/verificacion.ts"), "    if (u.rowCount && x.kind === \"renta\") await sigueRenta(x.pi);\n  });\n  B.fin();\n", "    if (u.rowCount && x.kind === \"renta\") await sigueRenta(x.pi);\n  });\n", "vencerVerificaciones junta sus fallos y nunca llama fin()"],
  [L2("ciudades/aviso.ts"), "cadaUno(\"avisoApertura\", C,", "cadaUno(\"ciudades\", C,", "avisarAperturas: el ayudante no lleva el nombre de su tarea"],
  [L2("alertas.ts"), "order by j.published_at, j.id, a.id limit 300", "limit 300", "barrerVacantes: una selección con tope sin orden"],
  [L2("repartidor-ofertas.ts"), "  await (await import(\"./barrido-uno\")).cadaUno(\"ofertas\", r.rows, (x) => `${x.negocio}:${x.numero}`, async (x) => {", "  await (async (L: typeof r.rows, _i: unknown, f: (x: (typeof r.rows)[number]) => Promise<void>) => { for (const x of L) await f(x); })(r.rows, (x) => `${x.negocio}:${x.numero}`, async (x) => {", "vencerOfertas: bucle por elemento a mano"],
  [L2("repartidor-barrido.ts"), "    await borrarConVariantes(m.url, m.w, m.var_widths);\n    await db().query(`update media set purged_at = now(), status = 'removed', removed_reason = 'retencion'", "    try { await borrarConVariantes(m.url, m.w, m.var_widths); } catch { return; }\n    await db().query(`update media set purged_at = now(), status = 'removed', removed_reason = 'retencion'", "purgarFotosEntrega: un try/catch que traga el error"],
  [L2("repartidor-barrido.ts"), "    if (r.rows.length) await c.query(", "    for (const x of r.rows.slice(0, 1)) await c.query(", "soltarTomados ahora recorre elementos"],
  [L2("mensajes-purga.ts"), "media.id limit 200`, [vistos])", "media.id limit 200`, [[]])", "purgarFotosSinEnviar: porTandas sin dejar fuera lo ya visto"],
  [L2("fotos-variantes.ts"), "    const maestra = await leerSiHay(clave);", "    const maestra = await leerSiHay(clave).catch(() => null);", "barrerVariantes: un .catch que traga el error"],
  [L2("fotos-revision.ts"), "    const r = await revisarRetenida(x.id, R);", "    const r = await revisarRetenida(x.id, R).catch(() => \"nada\" as const);", "barrerRevision: un .catch que traga el error"],
  [L2("fotos-revision.ts"), "having count(*) >= $1 order by min(pr.created_at), pr.media_id limit", "having count(*) >= $1 limit", "barrerRevision: una selección con tope sin orden"],
  [L2("fotos-privadas.ts"), "    out[(await moverAPrivada(f)) ? \"movidas\" : \"sinArchivo\"]++;", "    try { out[(await moverAPrivada(f)) ? \"movidas\" : \"sinArchivo\"]++; } catch { out.fallos++; }", "barrerPrivadas: un try/catch que traga el error"],
  [L2("ayuda-cita.ts"), "  B.fin();\n  return L.length;", "  return L.length;", "cerrarDevueltosSinRespuesta junta sus fallos y nunca llama fin()"],
  [L2("repartidor-auto.ts"), "    const r = await ofrecer(x.biz, x.numero, null, null);", "    const r = await ofrecer(x.biz, x.numero, null, null).catch(() => ({ ok: false as const, msg: { es: \"\", en: \"\" } }));", "asignarSolos: un .catch que traga el error"],
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
