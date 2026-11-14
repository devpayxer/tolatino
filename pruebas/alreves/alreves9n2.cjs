// Prueba al revés de los guardianes de 9n-2 (el panel del negocio y la página del negocio): la invitación al equipo de un solo uso con teléfono y tope, «Cuenta borrada» en todos
// los paneles, «Pedir reseña» una vez por pedido, la respuesta de una reseña con historial, el aviso del organizador por la auto-moderación, «Avisar a tus seguidores» una vez,
// el pedido programado que cruza la medianoche, Panel › Eventos con cursor, To'Latino Negocios sin negocio, Populares por lo más pedido, el historial de no-show solo del negocio
// y los anuncios para negocios. Se inyecta el defecto, el guardián debe fallar con SU mensaje ([nombre]); se restaura.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const W = 'apps/web/', M = 'packages/db/migrations/0146_panel.sql', EI = W + 'lib/equipo-invitacion.ts', AE = W + 'app/panel/acciones-equipo.ts', PE = W + 'app/e/[code]/page.tsx',
  TC = W + 'lib/textos-cuenta.ts', PA = W + 'app/panel/Panel.tsx', RP = W + 'lib/resena-pedir.ts', RS = W + 'lib/resenas.ts', EC = W + 'lib/evt-cambios.ts', NV = W + 'lib/novedades.ts',
  PD = W + 'lib/pedir.ts', EV = W + 'lib/evt.ts', SN = W + 'app/panel/SinNegocio.tsx', RV = W + 'lib/reservas.ts', PN = W + 'lib/panel.ts', PG = W + 'app/panel/page.tsx';
const casos = [
  // invitacionDeEquipoSegura
  ['invitacionDeEquipoSegura', EI, 'invite_code = null, invite_expires_at = null,', 'invite_code = invite_code, invite_expires_at = null,'],
  ['invitacionDeEquipoSegura', EI, 'if (m.phone !== tel) { await anotarMalo(userId, c);', 'if (false) { await anotarMalo(userId, c);'],
  ['invitacionDeEquipoSegura', EI, "and m.status = 'invited' for update of m", "and m.status = 'invited'"],
  ['invitacionDeEquipoSegura', EI, 'if ((await intentosMalos(userId)) >= TOPE_MALOS) return no("Muchos intentos. Espera una hora o pídele al negocio una invitación nueva.", "Too many tries. Wait an hour or ask the business for a new invite.");\n  const m =', 'const m ='],
  ['invitacionDeEquipoSegura', AE, 'href: `/e/${code}`, ', ''],
  ['invitacionDeEquipoSegura', AE, 'avisarPersonaEquipo(m.id, "equipo_quitado")', 'avisarPersonaEquipo(m.id, "equipo_quitadoX")'],
  ['invitacionDeEquipoSegura', PE, 'redirect(`/entrar?volver=', 'redirect(`/otra?volver='],
  // cuentaBorradaEnTodosLosPaneles
  ['cuentaBorradaEnTodosLosPaneles', PA, 'traducirBorradas(props, props.lang === "es")', 'props'],
  ['cuentaBorradaEnTodosLosPaneles', TC, 'export function traducirBorradas<T>(', 'export function traducirBorradasX<T>('],
  // resenaPedidaUnaVez
  ['resenaPedidaUnaVez', RP, 'on conflict (operation_id) do nothing', 'on conflict do nothing'],
  ['resenaPedidaUnaVez', RP, 'r.st !== "done"', 'false'],
  ['resenaPedidaUnaVez', M, 'create unique index if not exists review_requests_op_idx on review_requests (operation_id);', 'create index if not exists review_requests_op_idx on review_requests (operation_id);'],
  // respuestaDeResenaConHistorial
  ['respuestaDeResenaConHistorial', RS, 'insert into review_reply_history', 'insert into review_reply_log'],
  ['respuestaDeResenaConHistorial', RS, 'r.edits >= MAX_EDITS_RESP', 'false'],
  ['respuestaDeResenaConHistorial', M, 'create trigger review_reply_history_solo_insercion before update or delete on review_reply_history', 'create trigger review_reply_history_solo_insercion before insert on review_reply_history'],
  // avisoDelOrganizadorModerado
  ['avisoDelOrganizadorModerado', EC, 'if (!rev.ok) return falla(rev.msg.es, rev.msg.en);', ''],
  // novedadAvisaUnaVez
  ['novedadAvisaUnaVez', NV, 'if (p.ya) return', 'if (false) return'],
  ['novedadAvisaUnaVez', NV, "and coalesce(u.notif_prefs->>(case when $3::text = 'oferta' then 'of' else 'hoy' end), '') <> 'false'", ''],
  // programadoCruzaMedianoche
  ['programadoCruzaMedianoche', PD, 'm <= z - 60; m += 30) slots.push', 'm <= z - 60 && m < 1440; m += 30) slots.push'],
  // eventosPanelConCursor
  ['eventosPanelConCursor', EV, '(e.start_date, e.id) < ($2::date, $3::bigint)', 'e.start_date < $2::date'],
  // negociosSinNegocio
  ['negociosSinNegocio', SN, 'router.push("/cuenta/ajustes")', 'router.push("/cuenta")'],
  ['negociosSinNegocio', PG, 'redirect("/publica");\n  return <SinNegocio', 'redirect("/publica");\n  return <Otra'],
  // popularesPorLoMasPedido
  ['popularesPorLoMasPedido', PD, 'const pop = populares(F.ventas,', 'const pop = pobulares(F.ventas,'],
  // noShowSoloDelNegocio
  ['noShowSoloDelNegocio', RV, "from operations where business_id = $1 and kind = 'table' and user_id = (select", "from operations where kind = 'table' and user_id = (select"],
  // anuncioDeNegociosEnElPanel
  ['anuncioDeNegociosEnElPanel', PN, "a.audience = 'negocios'", "a.audience = 'todos'"],
];
const crear = [];
let bien = 0, total = 0;
const correr = (g) => {
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${g}]`)) ?? ''; return [!!l, l]; }
};
const informe = (g, que, [falla, out]) => { total++; console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (${que})${out ? ' → ' + out.trim().slice(0, 170) : ''}`); if (falla) bien++; };
for (const [g, f, a, b] of casos) {
  const ruta = path.join(R, f);
  if (!fs.existsSync(ruta)) { total++; console.log(`  ✗ ${g}: no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ ${g}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(g); } finally { fs.writeFileSync(ruta, orig); }
  informe(g, f.split('/').pop(), r);
}
for (const [g, f, c] of crear) {
  const ruta = path.join(R, f);
  fs.writeFileSync(ruta, c);
  let r; try { r = correr(g); } finally { fs.unlinkSync(ruta); }
  informe(g, `crear ${f.split('/').slice(-2).join('/')}`, r);
}
let limpio = true; try { execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); } catch (e) { limpio = false; console.log(String(e.stderr).slice(0, 600)); }
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
