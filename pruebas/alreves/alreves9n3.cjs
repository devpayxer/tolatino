// Prueba al revés de los guardianes de 9n-3 (el Super Admin y Configuración): Colas sin tope de 200, el selector de ciudad que no da más alcance que el rol,
// Enviar mensaje con sus topes, Negocios por cursor y su CSV con tope, los dos pasos por cuenta propia, el buscador acotado, Noche editable, el cupo del RSVP y la
// semilla del demo de Noche solo en pruebas. Se inyecta el defecto, el guardián debe fallar con SU mensaje ([nombre]); se restaura. «crear»: se crea el archivo,
// se corre y se borra. Sale con 1 si algún defecto no se caza (alrevesQueFalla).
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const AC = 'apps/web/lib/admin-colas.ts', AD = 'apps/web/lib/admin.ts', AA = 'apps/web/app/admin/acciones.ts', AU = 'apps/web/app/admin/acciones-usuarios.ts', M = 'packages/db/migrations/0147_admin.sql',
  AN = 'apps/web/lib/admin-negocios.ts', AG = 'apps/web/app/admin/acciones-negocios.ts', DP = 'apps/web/lib/equipo/dos-pasos.ts', SA = 'apps/web/app/admin/seguridad/acciones.ts',
  AB = 'apps/web/lib/admin-buscar.ts', NR = 'apps/web/lib/noche-reservas.ts', NE = 'apps/web/app/(app)/noche/[num]/NocheEstado.tsx', NV = 'apps/web/app/(app)/n/[id]/noche/Reservar.tsx',
  EA = 'apps/web/lib/evt-admin.ts', SD = 'infra/pruebas/semilla/0065_noche_demo.sql';
// [guardián, archivo, texto, reemplazo, todos?]
const casos = [
  // colasSinTope
  ['colasSinTope', AC, 'limit ${CASOS_POR_PAGINA} offset ${(pag - 1) * CASOS_POR_PAGINA}', 'limit 200'],
  ['colasSinTope', AC, 'group by q.queue', 'group by 1'],
  ['colasSinTope', AC, 'and (not $3::boolean or q.assigned_to = $5)', 'and (not $3::boolean or true)', true],
  // ciudadDelSelector
  ['ciudadDelSelector', AD, '(!rol.length || rol.includes(c)) && ', ''],
  ['ciudadDelSelector', AD, 'cities: vista ? [vista] : rol,', 'cities: rol,'],
  ['ciudadDelSelector', AA, '(s.ciudadesRol.length && !s.ciudadesRol.includes(id))', 'false'],
  ['ciudadDelSelector', AA, 'httpOnly: true, ', ''],
  // mensajeDelEquipo
  ['mensajeDelEquipo', AU, 'if (d >= MSG_DIA_DESTINO) return', 'if (false) return'],
  ['mensajeDelEquipo', AU, 'if (h >= MSG_HORA) return', 'if (false) return'],
  ['mensajeDelEquipo', AU, 'if (canal === "sms" && !u.phone_ok) return', 'if (false) return'],
  ['mensajeDelEquipo', AU, 'hacer(id, ["editar"], motivo, async (c, s, u, m) => {\n    if (u.id === s.id) return "Eso no', 'hacer(id, ["editar", "retirar"], motivo, async (c, s, u, m) => {\n    if (u.id === s.id) return "Eso no'],
  ['mensajeDelEquipo', AU, 'https?:\\/\\/|www\\.|', 'www\\.|'],
  ['mensajeDelEquipo', M, 'create trigger admin_messages_no_cambia before update or delete on admin_messages', 'create trigger admin_messages_no_cambia before delete on admin_messages'],
  ['mensajeDelEquipo', M, "where key = 'mod_sancion' and (not sms or sms_mode <> 'sin_push')", "where key = 'mod_sancion_x' and (not sms or sms_mode <> 'sin_push')"],
  // negociosPorCursor
  ['negociosPorCursor', AN, 'limit ${POR_PAGINA + 1}', 'limit ${POR_PAGINA} offset 0'],
  ['negociosPorCursor', AN, '${llave} > $${pc.length}', '${llave} >= $${pc.length}'],
  ['negociosPorCursor', AG, 'if (!s || !s.puede("neg", "exportar")) return no("Tu rol no exporta la lista.");', 'if (!s) return no("Tu rol no exporta la lista.");'],
  ['negociosPorCursor', AG, 'if (n >= 5) return null;', 'if (false) return null;'],
  ['negociosPorCursor', AG, 'action: "negocios.exportar"', 'action: "negocios.exportado"'],
  // dosPasosPropios
  ['dosPasosPropios', DP, 'const p = await pasoFresco(u, f, entrada);\n  if ("err" in p) return p.err;\n  const codigos', 'const p = { paso: Math.floor(Date.now() / 30000) };\n  const codigos'],
  ['dosPasosPropios', DP, 'export async function codigosNuevos(u: Yo, entrada: string)', 'export async function codigosNuevos(userId: string, entrada: string)'],
  ['dosPasosPropios', DP, ' || !(t.x > Date.now())', ''],
  ['dosPasosPropios', DP, 'mfa_at is not null and id <> $2::uuid', 'mfa_at is not null and id = $2::uuid', true],
  ['dosPasosPropios', M, "array['cambio_app', 'codigos_nuevos']", "array['cambio_app']"],
  ['dosPasosPropios', SA, 'const s = await staff();\n  if (!s || !(await mismoOrigen())) return { ok: false, msg: fuera };\n  return codigosNuevos(s,', 'const s = await staff();\n  if (!s) return { ok: false, msg: fuera };\n  return codigosNuevos(s,'],
  // buscadorAcotado
  ['buscadorAcotado', AB, 's.puede("usr", "ver")\n      ?', 'true\n      ?'],
  ['buscadorAcotado', AB, 's.puede("tx", "ver") && /^[A-Za-z]{0,3}', '/^[A-Za-z]{0,3}'],
  ['buscadorAcotado', AB, '(cardinality($2::text[]) = 0 or u.home_city_id = any($2::text[]))', 'true'],
  // nocheEditable
  ['nocheEditable', M, "'noche_mesa_guardada_min', 'noche_fila_viva_min') and not editable", "'noche_mesa_guardada_min') and not editable"],
  ['nocheEditable', NR, 'export const corteMin = (llegada: number, base: number) => Math.max(0, Math.min(base, llegada - 120));', 'export const corteMin = (llegada: number) => (llegada < 480 ? Math.max(0, llegada - 120) : 360);'],
  ['nocheEditable', NR, 'guarda: String(o.det.hold ?? await valor("noche_mesa_guardada_min"))', 'guarda: String(o.det.hold ?? 30)'],
  ['nocheEditable', NE, 'Confirman en menos de ${espL(x.resp, true)}. Si no confirman', 'Confirman en menos de 1 hora. Si no confirman'],
  ['nocheEditable', NV, 'const corte = hNoche(llega != null ? Math.max(0, Math.min(b.corte, llega - 120)) : b.corte),', 'const corte = llega != null && llega < 480 ? hNoche(Math.max(0, llega - 120)) : "6 PM",'],
  // rsvpCupoAdmin
  ['rsvpCupoAdmin', M, 'create trigger events_cupo_admin before update of rsvp_capacity on events', 'create trigger events_cupo_admin_x before update of rsvp_capacity on events'],
  ['rsvpCupoAdmin', M, "check ((kind in ('dia', 'rsvp')) = (ref_id is null))", "check ((kind = 'dia') = (ref_id is null))"],
  ['rsvpCupoAdmin', EA, 'if (n > 0 && n < ev.usado) return no(', 'if (false) return no('],
  ['rsvpCupoAdmin', EA, 'from events e where e.id = $1::bigint for update', 'from events e where e.id = $1::bigint'],
  // semillaNocheDemo
  ['semillaNocheDemo', SD, 'u.ck, true', 'u.ck, false'],
];
const crear = [
  ['semillaNocheDemo', 'packages/db/migrations/0998_demo_noche.sql', "-- un demo de Noche que se coló en una migración\nselect 'N-906599';\n"],
  ['flagPorPersona', 'packages/db/migrations/0998_flag_nuevo.sql', "-- un interruptor que se lee todo o nada y alguien lo marca «scopable»\nupdate feature_flags set scopable = true where key = 'app.errores';\n"],
];
let bien = 0, total = 0;
const correr = (g) => {
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${g}]`)) ?? ''; return [!!l, l]; }
};
const informe = (g, que, [falla, out]) => { total++; console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (${que})${out ? ' → ' + out.trim().slice(0, 170) : ''}`); if (falla) bien++; };
for (const [g, f, a, b, todos] of casos) {
  const ruta = path.join(R, f);
  if (!fs.existsSync(ruta)) { total++; console.log(`  ✗ ${g}: no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ ${g}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, todos ? orig.split(a).join(b) : orig.replace(a, () => b));
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
