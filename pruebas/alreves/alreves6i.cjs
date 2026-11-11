// Prueba al revés de los guardianes de 6i (evento privado): se inyecta el defecto, el guardián debe fallar; se restaura.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const M = 'packages/db/migrations/0114_evento_privado.sql', L = 'apps/web/lib/evento-privado.ts', AC = 'apps/web/app/(app)/privado/[num]/acciones.ts', AP = 'apps/web/app/(app)/n/[id]/evento-privado/acciones.ts',
  PA = 'apps/web/app/panel/acciones-evento-privado.ts', PE = 'apps/web/app/panel/EventoPrivado.tsx', CI = 'apps/web/app/panel/Citas.tsx', AY = 'apps/web/lib/ayuda-cita.ts', EC = 'apps/web/app/(app)/privado/[num]/EstadoEvp.tsx';
const casos = [
  // depositoDeLaPropuesta: la base calcula; el depósito sale de la propuesta guardada; el orden retener → aceptar → commit → cobrar
  ['depositoDeLaPropuesta', M, "  new.subtotal_cents := sub;\n", "  new.subtotal_cents := coalesce(new.subtotal_cents, sub);\n"],
  ['depositoDeLaPropuesta', M, "  new.total_cents := new.subtotal_cents + new.tax_cents;", "  new.total_cents := coalesce(nullif(new.total_cents, 0), new.subtotal_cents + new.tax_cents);"],
  ['depositoDeLaPropuesta', M, "    new.deposit_cents := greatest(100, round(new.total_cents * new.deposit_pct / 100.0));", "    new.deposit_cents := coalesce(nullif(new.deposit_cents, 0), 100);"],
  ['depositoDeLaPropuesta', M, "    new.deposit_pct := coalesce(pp, 0); new.deposit_cents := paid;", "    new.deposit_pct := coalesce(pp, 0);"],
  ['depositoDeLaPropuesta', M, "  if q.version <> ultima then raise exception 'evp: esa propuesta ya fue reemplazada'; end if;\n", ''],
  ['depositoDeLaPropuesta', M, "  if q.valid_until <= now() then raise exception 'evp: esa propuesta ya venció'; end if;\n", ''],
  ['depositoDeLaPropuesta', M, "  if o.user_id <> new.user_id then raise exception 'evp: solo acepta quien pidió'; end if;\n", ''],
  ['depositoDeLaPropuesta', M, "create unique index if not exists private_event_acceptances_deposito_uq on private_event_acceptances (operation_id) where kind <> 'change';", "create index if not exists private_event_acceptances_deposito_uq on private_event_acceptances (operation_id);"],
  ['depositoDeLaPropuesta', L, "const dep = q.dep, fee =", "const dep = Math.max(q.dep, Number(version) || 0), fee ="],
  ['depositoDeLaPropuesta', L, "    await c.query(\"commit\");\n    retenido = null;\n  } catch (err) {\n    await c.query(\"rollback\").catch(() => undefined);\n    if (retenido) await pasarela.liberar(retenido).catch(() => undefined);\n    const x = deLaBase(err);",
    "    await cobrarOperacion(o.id);\n    await c.query(\"commit\");\n    retenido = null;\n  } catch (err) {\n    await c.query(\"rollback\").catch(() => undefined);\n    if (retenido) await pasarela.liberar(retenido).catch(() => undefined);\n    const x = deLaBase(err);"],
  ['depositoDeLaPropuesta', L, "  await cobrarOperacion(opId);\n  await avisarEvp(numero, \"cliente\", \"evp_ok\")", "  await avisarEvp(numero, \"cliente\", \"evp_ok\")"],
  ['depositoDeLaPropuesta', L, "    if (retenido) await pasarela.liberar(retenido).catch(() => undefined);\n    const x = deLaBase(err);", "    const x = deLaBase(err);"],
  ['depositoDeLaPropuesta', L, "export type EvpIn = { fecha: string;", "export type EvpIn = { totalCents?: number; fecha: string;"],
  ['depositoDeLaPropuesta', L, "export type CambioIn = { nota: string;", "export type CambioIn = { depositCents?: number; nota: string;"],
  ['depositoDeLaPropuesta', L, "export type PropuestaIn = { tipo: \"quote\" | \"alt\" | \"change\";", "export type PropuestaIn = { total?: number; tipo: \"quote\" | \"alt\" | \"change\";"],
  ['depositoDeLaPropuesta', AC, "export async function aceptarEvpAccion(numero: string, version: number,", "export async function aceptarEvpAccion(numero: string, version: number, deposito: number,"],
  ['depositoDeLaPropuesta', AP, "export async function pedirEvpAccion(negocio: string, f: EvpIn)", "export async function pedirEvpAccion(negocio: string, f: EvpIn, totalCents: number)"],
  ['depositoDeLaPropuesta', PA, "export async function evpCancelarNeg(id: string, numero: string, motivo: string)", "export async function evpCancelarNeg(id: string, numero: string, motivo: string, devuelve: number)"],
  // devolucionEvpAcotada
  ['devolucionEvpAcotada', L, "  const n = Math.min(dev, cap);", "  const n = dev;"],
  ['devolucionEvpAcotada', L, "  if (yaHecha) return;\n", ''],
  ['devolucionEvpAcotada', L, "devIdem: `evpcx-${numero}`", "devIdem: `evpcx-${numero}-${Date.now()}`"],
  ['devolucionEvpAcotada', L, "devIdem: `evpbx-${numero}`", "devIdem: `evpbx-${crypto.randomUUID()}`"],
  ['devolucionEvpAcotada', L, "const ac = acuerdoDe(await propuestas(c, o.id)), plazo = ac?.cancelH ?? 72, aTiempo = o.h_left >= plazo;", "const ac = acuerdoDe(await propuestas(c, o.id)), plazo = (await valores(\"evp_cancelar_h\")).evp_cancelar_h, aTiempo = o.h_left >= plazo || !!ac;"],
  ['devolucionEvpAcotada', L, "const dev = aTiempo ? cobrado : 0", "const dev = aTiempo ? cobrado : Math.round(cobrado / 2)"],
  ['devolucionEvpAcotada', L, "const dev = o.pst === \"captured\" || o.pst === \"partially_refunded\" ? Math.max(0, (o.amount ?? 0) - (o.refunded ?? 0)) : 0;", "const dev = o.pst === \"captured\" ? Math.round((o.amount ?? 0) / 2) : 0;"],
  ['devolucionEvpAcotada', L, "  for (const v of debe) await moverDinero(v.num).catch(() => undefined);\n", ''],
  // evpSinTelefonos
  ['evpSinTelefonos', L, "coalesce(nullif(u.first_name, ''), 'Cliente') || coalesce(' ' || left(nullif(u.last_name, ''), 1) || '.', '') as who,", "coalesce(nullif(u.first_name, ''), 'Cliente') || ' ' || u.phone as who,"],
  ['evpSinTelefonos', L, "coalesce(nullif(u.first_name, ''), 'Cliente') || coalesce(' ' || left(nullif(u.last_name, ''), 1) || '.', '') as cliente, o.status,", "coalesce(nullif(u.first_name, ''), 'Cliente') || ' ' || coalesce(u.last_name, '') as cliente, o.status,"],
  ['evpSinTelefonos', L, "  if (TEL.test(nota)) return no(\"Por seguridad, sin teléfonos en la nota.", "  if (false) return no(\"Por seguridad, sin teléfonos en la nota."],
  ['evpSinTelefonos', L, "  if (TEL.test(incluye) || TEL.test(nota)) return no(", "  if (TEL.test(nota)) return no("],
  ['evpSinTelefonos', L, "  if (TEL.test(nota)) return no(\"Por seguridad, sin teléfonos. Para hablar usa Mensajes.\"", "  if (!nota) return no(\"Por seguridad, sin teléfonos. Para hablar usa Mensajes.\""],
  ['evpSinTelefonos', PE, "  out.push({ type: \"acts\", items: [{ l: E2(\"Escribirle\", \"Message\"), icon: \"chat\",", "  out.push({ type: \"acts\", items: [{ l: \"tel:\", v: \"secondary\" }, { l: E2(\"Escribirle\", \"Message\"), icon: \"chat\","],
  // libroSoloInsercion (ampliado)
  ['libroSoloInsercion', M, "  if tg_op <> 'INSERT' then raise exception 'private_event_quotes es solo de inserción'; end if;\n", "  if tg_op = 'DELETE' then raise exception 'no'; end if;\n"],
  ['libroSoloInsercion', M, "  if tg_op <> 'INSERT' then raise exception 'private_event_acceptances es solo de inserción'; end if;\n", ''],
  ['libroSoloInsercion', M, "  if tg_op <> 'INSERT' then raise exception 'private_event_asks es solo de inserción'; end if;\n", ''],
  ['libroSoloInsercion', L, "export const areaEvpL =", "export async function borrarAsks(id: string) { await db().query(`delete from private_event_asks where operation_id = $1`, [id]); }\nexport const areaEvpL ="],
  // prefijosAyuda (ampliado a dos letras): la lista de ayudas de Hoy no reconoce EP-
  ['prefijosAyuda', CI, ' n.startsWith("EP-") ? ["evp", E2("Evento privado", "Private event")] :', ''],
  ['prefijosAyuda', CI, ' : numero.startsWith("EP-") ? "evp" : null;', ' : null;'],
  // avisoEventoSmsSoloCritico (evp_*): un aviso no crítico con SMS
  ['avisoEventoSmsSoloCritico', M, "('evp_cambio', 'tx', 'cit', false,", "('evp_cambio', 'tx', 'cit', true,"],
  // promesaSms: la pantalla no promete SMS que no sale
  ['promesaSms', EC, '${E2("Si algo cambia, te avisamos aquí y en tus avisos.", "If anything changes, we let you know here and in your notifications.")}', '${E2("Te avisan por SMS si algo cambia.", "They text you if anything changes.")}'],
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
