// Prueba al revés de 9t8 · La devolución de lo no usado de un patrocinio le pregunta a la pasarela (guardián patrocinioDevolucionPregunta) y «Un día más» de
// una renta lleva la clave del toque (guardián diaMasConToque). Cada caso rompe el código, la base o la pantalla a propósito y SU guardián tiene que fallar con
// SU mensaje (el texto de cada caso abajo); después se restaura y los guardianes quedan limpios:
//   patrocinioDevolucionPregunta: (1) la base que no anota la intención al terminar (negocios o eventos), que deja cambiar el dato, que deja «a mano» una hecha,
//     que deja decidir «ninguno»; (2) un «no» de Stripe que se reintenta, una fallida que vuelve a la pasarela; (3) la consulta sin exigir la ventana, «nunca
//     llegó» sin otra llave; (4) «Preguntar a Stripe ahora», «Elegir cuál vale», «Resolver a mano» (y su pregunta antes) sin la del patrocinio; la alerta vieja.
//   diaMasConToque: sin exigir la clave, sin buscar antes el cobro de esa clave, sin guardarla, la acción o la pantalla sin mandarla o cambiándola siempre, la base
//     sin el índice.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const PA = 'apps/web/lib/patrocinio.ts', DA = 'apps/web/lib/dinero-alertas.ts', DC = 'apps/web/lib/devolucion-consulta.ts', RV = 'apps/web/lib/revision-pasarela.ts';
const MG = 'packages/db/migrations/0207_patrocinio_devolucion_pregunta.sql', RE = 'apps/web/lib/rentas.ts', AC = 'apps/web/app/(app)/renta/[num]/acciones.ts', UI = 'apps/web/app/(app)/renta/[num]/RentaEstado.tsx';
const P = 'patrocinioDevolucionPregunta', D = 'diaMasConToque';
const casos = [
  // patrocinioDevolucionPregunta (1) la base
  [P, MG, "  when (old.refund_cents is null and new.refund_cents is not null) execute function sponsorship_refunds_anotar('evento');", "  when (false) execute function sponsorship_refunds_anotar('evento');", 'la intención la anota la base en la transacción'],
  [P, MG, "create trigger sponsorships_devolucion_anotar after update of refund_cents on sponsorships", "create trigger sponsorships_devolucion_anotar after update of status on sponsorships", 'la intención la anota la base en la transacción'],
  [P, MG, "  if old.gateway_ref is not null and new.gateway_ref is distinct from old.gateway_ref then raise exception 'pat_dev: gateway_ref se anota una vez'; end if;\n", '', 'la base: empieza en camino'],
  [P, MG, "if old.status = 'done' or new.status = 'done' then raise exception 'dinero_a_mano: ya está hecha en Stripe'; end if;", "if false then raise exception 'dinero_a_mano'; end if;", 'la base: empieza en camino'],
  [P, MG, "'gateway_refunds', 'sponsorship_refunds') or decision = 'vale');", "'gateway_refunds') or decision = 'vale');", 'solo se decide «vale»'],
  // (2) fallida
  [P, PA, "  if (SIN_RESPUESTA.has(codigo) || g.ok) {\n    await db().query(`update sponsorship_refunds", "  if (true) {\n    await db().query(`update sponsorship_refunds", 'ejecutarDevolucionPat: sin respuesta sigue en camino'],
  [P, PA, "  if (f) await alertaPat(r, porConsulta", "  if (f) await pasarela.liberar(r.pi);\n  if (f) await alertaPat(r, porConsulta", 'fallarDevolucionPat: fallida una vez'],
  // (3) pasada la llave
  [P, PA, 'if (!r || r.st !== "pending" || r.mano || !r.enviada || !r.vieja) return { resultado: null, quedo: "ya_no_estaba" };', 'if (!r || r.st !== "pending") return { resultado: null, quedo: "ya_no_estaba" };', 'resolverDevolucionPat: solo pasada la llave'],
  [P, PA, "set key_from = now(), key_n = key_n + 1, last_error = 'nunca_llego' where id = $1::bigint and status = 'pending' and manual_at is null\n", "set last_error = 'nunca_llego' where id = $1::bigint and status = 'pending' and manual_at is null\n", 'cerrarConVeredictoPat: hecha por el mismo cierre'],
  // (4) las acciones del equipo y la alerta
  [P, DA, "                          union all select 'sponsorship_refunds', z.id, z.status = 'pending' and z.manual_at is null from sponsorship_refunds z where a.kind = 'refund_stuck' and a.subject_id ~ '^sponsorship_refunds:[0-9]{1,18}$' and z.id = split_part(a.subject_id, ':', 2)::bigint`;", '`;', '«Preguntar a Stripe ahora» también en la devolución de un patrocinio'],
  [P, RV, '    : t === "sponsorship_refunds" ? (await (await import("./patrocinio")).resolverDevolucionPat(id, o)).quedo\n', '', '«Elegir cuál vale» cierra la devolución de un patrocinio'],
  [P, DA, 'const est = t === "gateway_refunds" || t === "sponsorship_refunds" ? "status in', 'const est = t === "gateway_refunds" ? "status in', '«Resolver a mano» la devolución de un patrocinio'],
  [P, DC, '    resultado = await K.consultar({ tabla: "sponsorship_refunds", id: r.id, monto: r.amt, ciudad: r.city, negocio: r.biz, medio: "refund", objeto: r.pi }, o);\n', '    resultado = "no_hallado";\n', 'antesDeAMano: la devolución de un patrocinio también le pregunta'],
  [P, PA, '  await (await import("./dinero-alertas")).alertar("refund_stuck", sujetoDe(r.id), {', '  await (await import("./dinero-alertas")).alertar("refund_stuck", `pat-dev-${r.kind}-${r.ref}`, {', 'la alerta de la devolución de un patrocinio es la de su intención'],
  // diaMasConToque
  [D, RE, '    if (!UUID.test(String(clave ?? ""))) return no("Vuelve a intentarlo.", "Try again.");\n', '', 'sin la clave del toque'],
  [D, RE, '    if (ya) return terminarCobroRenta((await CF.intencion(ya.id))!);\n', '', 'el de ESA clave (si lo hay) se termina'],
  [D, RE, 'actor: userId, toque: clave } })', 'actor: userId } })', 'la clave del toque va con la intención'],
  [D, AC, ', typeof clave === "string" ? clave : undefined);', ');', 'la acción pasa la clave del toque'],
  [D, UI, '    if (que === "dia" && !red) clave.current = uuid();\n', '    clave.current = uuid();\n', 'la pantalla manda la clave del toque'],
  [D, MG, "create unique index if not exists offsession_charges_toque on offsession_charges (kind, ref_id, (detail->>'toque')) where detail ? 'toque';", "create index if not exists offsession_charges_toque on offsession_charges ((detail->>'toque'));", 'la base no deja dos cobros con la misma clave'],
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
for (const [g, f, a, b, msg] of casos) {
  const ruta = path.join(R, f);
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ ${g}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  try { informe(g, path.basename(f), msg, correr(g)); } finally { fs.writeFileSync(ruta, orig); }
}
let limpio = true;
try { execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); } catch { limpio = false; }
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
