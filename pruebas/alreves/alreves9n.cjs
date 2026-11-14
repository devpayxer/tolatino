// Prueba al revés de los guardianes de 9n (lo diferido del negocio, el Repartidor y la operación del Super Admin): la prueba de entrega, el repartidor
// sin el teléfono del cliente, los días especiales que no se borran, la ruta que abre «Aceptar» la oferta, la cola nueva en la base y con su vista,
// el plazo de las colas desde Configuración y la evidencia de la disputa con la foto. Se inyecta el defecto, el guardián debe fallar con SU mensaje
// ([nombre]); se restaura. «crear»: se crea el archivo, se corre y se borra.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const M = 'packages/db/migrations/0144_negocio.sql', RP = 'apps/web/lib/repartidor.ts', RO = 'apps/web/lib/repartidor-ofertas.ts', PD = 'apps/web/lib/pedidos.ts',
  RT = 'apps/web/app/repartidor/Repartidor.tsx', CI = 'apps/web/lib/citas.ts', CO = 'apps/web/lib/colas.ts', AC = 'apps/web/lib/admin-colas.ts', CU = 'apps/web/app/admin/Colas.tsx',
  DI = 'apps/web/lib/disputas.ts', CF = 'apps/web/lib/config.ts';
const casos = [
  // entregaConPrueba: la base deja cerrar un delivery sin prueba
  ['entregaConPrueba', M, "    raise exception 'entrega sin prueba' using errcode = 'P0001', hint = 'sin_prueba';\n", ''],
  // … el trigger ya no se crea
  ['entregaConPrueba', M, 'create trigger operations_prueba before update of status on operations', 'create trigger operations_prueba_x after insert on operations'],
  // … la prueba se puede editar
  ['entregaConPrueba', M, 'create trigger delivery_proofs_no_cambia before update or delete on delivery_proofs', 'create trigger delivery_proofs_no_cambia before delete on delivery_proofs'],
  // … los códigos salen de random()
  ['entregaConPrueba', M, "select lpad(((('x' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))::bit(32)::bigint) % 10000)::text, 4, '0')", "select lpad((floor(random() * 10000))::int::text, 4, '0')"],
  // … la foto de otro pedido o de otra persona sirve de prueba
  ['entregaConPrueba', RP, "owner_kind = 'delivery' and owner_id = $2 and uploaded_by = $3", "owner_kind = 'delivery' and owner_id = $2"],
  // … el código del cliente sin tope de intentos
  ['entregaConPrueba', RP, 'if (!k || k.n >= maxIntentos) return no(', 'if (!k) return no('],
  // … «Entregado» avanza sin prueba aunque el negocio la pida
  ['entregaConPrueba', RP, '    if (o.pide_prueba && !probada) return no(', '    if (false && !probada) return no('],
  // … el repartidor recibe el código del cliente
  ['entregaConPrueba', RP, '  pideRecogida: boolean; recogido: boolean;', '  codigoCliente: string | null; pideRecogida: boolean; recogido: boolean;'],
  // … el panel marca «Entregado» sin dejar su prueba
  ['entregaConPrueba', PD, "insert into delivery_proofs (operation_id, city_id, kind, actor_id)", "insert into delivery_proofs_x (operation_id, city_id, kind, actor_id)"],
  // sinTelefonoAlRepartidor: el detalle vuelve a llamar al cliente
  ['sinTelefonoAlRepartidor', RT, '{ l: E2("Escribir", "Message"), v: "secondary", icon: "chat", onClick: () => { setEscr(escr ? null : "afuera"); setTexto(""); } }]',
    '{ l: E2("Llamar", "Call"), v: "secondary", icon: "phone", onClick: () => { location.href = `tel:${x.telCliente}`; } }]'],
  // … la consulta de las entregas trae el teléfono del cliente
  ['sinTelefonoAlRepartidor', RP, 'u.first_name, u.last_name, o.details as det,', 'u.first_name, u.last_name, u.phone, o.details as det,'],
  // … el texto libre deja pasar un número
  ['sinTelefonoAlRepartidor', RO, '(s.match(/\\d/g) ?? []).length >= 7', '(s.match(/\\d/g) ?? []).length >= 70'],
  // diaEspecialActivo: las citas leen los días quitados
  ['diaEspecialActivo', CI, "from special_hours where business_id = $1 and status = 'active' and kind <> 'season'", 'from special_hours where business_id = $1'],
  // … el estado abierto/cerrado de la base ya no mira la temporada
  ['diaEspecialActivo', M, "select bool_or(t::date between s.date_from and s.date_to) as dentro from special_hours s where s.business_id = bid and s.status = 'active' and s.kind = 'season'",
    'select true as dentro'],
  // ubicacionSoloEntregaActiva: «Rechazar» la oferta también abre la ruta
  ['ubicacionSoloEntregaActiva', RO, "    await c.query(`insert into delivery_offer_replies (offer_id, driver_id, reply, reason)", "    await empezarRuta(c, f.id, userId, \"empezar\");\n    await c.query(`insert into delivery_offer_replies (offer_id, driver_id, reply, reason)"],
  // … «Aceptar» abre la ruta como si hubiera recogido
  ['ubicacionSoloEntregaActiva', RO, 'const ruta = await empezarRuta(c, f.op, userId, "empezar");', 'const ruta = await empezarRuta(c, f.op, userId, "recogi");'],
  // colasEnLaBase: la cola nueva sin ampliar el CHECK
  ['colasEnLaBase', M, "perform pg_temp.ampliar_check('queue_items', 'queue_items_queue_check', array['entrega']);", "perform 1;"],
  // colaConVista: la cola «entrega» sin título en la lista
  ['colaConVista', AC, 'const t = x.queue === "entrega" ?', 'const t = x.queue === "entregaX" ?'],
  // … sin detalle en Colas
  ['colaConVista', CU, 'const esEntrega = k.queue === "entrega";', 'const esEntrega = (k.queue as string) === "entregaX";'],
  // … su plazo de una clave que no está en Configuración
  ['colaConVista', CO, 'slaCfg: "cola_sla_entrega"', 'slaCfg: "cola_sla_entrega_x" as never'],
  // configDesdeUnLugar: la clave del plazo falta en ClaveConfig
  ['configDesdeUnLugar', CF, ' | "cola_sla_entrega";', ';'],
  // disputaConEvidencia: la respuesta deja de mandar los archivos
  ['disputaConEvidencia', DI, 'archivos: { recibo: archivos.recibo, conversacion: archivos.conversacion, entrega: archivos.entrega, otro: archivos.foto_entrega } });', 'texto: "" });'],
];
const crear = [
  // diaEspecialActivo: una migración que borra días especiales
  ['diaEspecialActivo', 'packages/db/migrations/0199_zz9n.sql', 'begin;\ndelete from special_hours where date_to < current_date;\ncommit;\n'],
  // sinTelefonoAlRepartidor: una pantalla nueva del Repartidor con el teléfono del cliente
  ['sinTelefonoAlRepartidor', 'apps/web/app/repartidor/zz9n.tsx', 'export const x = (o: { telCliente: string }) => o.telCliente;\n'],
];
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
