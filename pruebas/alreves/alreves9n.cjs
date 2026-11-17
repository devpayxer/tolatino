// Prueba al revés de los guardianes de 9n (lo diferido del negocio, el Repartidor y la operación del Super Admin): la prueba de entrega, el repartidor
// sin el teléfono del cliente, los días especiales que no se borran, la ruta que abre «Aceptar» la oferta, la cola nueva en la base y con su vista,
// el plazo de las colas desde Configuración y la evidencia de la disputa con la foto. Se inyecta el defecto, el guardián debe fallar con SU mensaje
// ([nombre]); se restaura. «crear»: se crea el archivo, se corre y se borra.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const M = 'packages/db/migrations/0144_negocio.sql', M9 = 'packages/db/migrations/0177_mercado_repartidor.sql', /* 9n · la operations_prueba vigente */ RP = 'apps/web/lib/repartidor.ts', RO = 'apps/web/lib/repartidor-ofertas.ts', PD = 'apps/web/lib/pedidos.ts',
  RT = 'apps/web/app/repartidor/Repartidor.tsx', CI = 'apps/web/lib/citas.ts', CO = 'apps/web/lib/colas.ts', AC = 'apps/web/lib/admin-colas.ts', CU = 'apps/web/app/admin/Colas.tsx',
  DI = 'apps/web/lib/disputas.ts', CF = 'apps/web/lib/config.ts';
const casos = [
  // entregaConPrueba: la base deja cerrar un delivery sin prueba
  ['entregaConPrueba', M9, "    raise exception 'entrega sin prueba' using errcode = 'P0001', hint = 'sin_prueba';\n", ''],
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
  ['diaEspecialActivo', 'apps/web/lib/dias-especiales.ts', "where business_id = $1 and status = 'active' and (kind = 'season'", "where business_id = $1 and (kind = 'season'"],
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
  ['configDesdeUnLugar', CF, ' | "cola_sla_rec" | "cola_sla_entrega"\n', ' | "cola_sla_rec"\n'],
  // apelarSinSesionConFicha (9n-7): la ruta de apelar sin sesión toma a la persona del cuerpo, y la ficha deja de vencer
  ['apelarSinSesionConFicha', 'apps/web/app/api/cuenta/apelar/route.ts', 'await apelar(f.uid, "sanction"', 'await apelar(String((await req.clone().json()).uid), "sanction"'],
  ['apelarSinSesionConFicha', 'apps/web/lib/cuenta.ts', '  if (Number(m[3]) * 1000 < Date.now()) return null;\n', ''],
  // rangoDiceLoQuePide (9n-7): cambiar lo que pide Cabo sin reescribir «Para subir»
  ['rangoDiceLoQuePide', 'apps/web/app/admin/acciones-gam.ts', "cond = $3::jsonb, requirement = $4::jsonb, updated_by", "cond = $3::jsonb, updated_by"],
  // boolUnidoEsTrue (9n-7): compa7g vuelve a comparar el from_draft unido con || con 't'
  ['boolUnidoEsTrue', 'pruebas/e2e/compa7g.cjs', "ok(u4[0] === 'true',", "ok(u4[0] === 't',"],
  // corteDeCitas (9n-7): el motor de horas vuelve a ofrecer citas que terminan al cerrar aunque el negocio pidió terminar antes
  ['corteDeCitas', 'apps/web/lib/citas.ts', 't + dur <= z - (x.pol.corte ?? 0); t += step', 't + dur <= z; t += step'],
  // licenciasVuelvenTodas (9n-7): el barrido vuelve a devolver a revisión solo las licencias de Iglesias, Bienes Raíces y Autos
  ['licenciasVuelvenTodas', 'apps/web/lib/licencias.ts', "      where l.status = 'valid' and l.next_review", "      where l.business_id in (select id from businesses where category_id = any(array['NEG-FE','NEG-INMUEBLE','NEG-DEALER'])) and l.status = 'valid' and l.next_review"],
  // cambioNegocioOtraPersona (9n-8): quien lo pidió también lo aplica; el 360° aplica la fusión sin la cola; la ficha fusionada sin redirigir; la decisión editable
  ['cambioNegocioOtraPersona', 'apps/web/app/admin/acciones-colas.ts', '    if (sc.requested_by === s.id) return "Lo pediste tú: lo aplica otra persona del equipo.";\n', ''],
  ['cambioNegocioOtraPersona', 'apps/web/app/admin/acciones-negocios.ts', '    const cs = await encolarCambio(c, { tipo: "mergeBiz", negocio: b.id, ciudad: b.city_id, payload: { dup: o.id }, motivo: m, quien: s.id });',
    '    const cs = "x"; await c.query(`update businesses set status = \'merged\', merged_into = $1 where id = $2`, [b.id, o.id]);'],
  ['cambioNegocioOtraPersona', 'apps/web/app/(app)/n/[id]/page.tsx', '    if (into) permanentRedirect(`/n/${into}`);\n', ''],
  ['cambioNegocioOtraPersona', 'packages/db/migrations/0158_negocios_duplicados.sql', 'before update or delete on business_dup_decisions', 'before delete on business_dup_decisions'],
  // cifrasUsuarioDerivadas (9n-9): la lista vuelve a contar reportes por fila; Dinero sin tx:ver
  ['cifrasUsuarioDerivadas', 'apps/web/lib/admin-usuarios.ts', 'w.push("exists (select 1 from user_stats_cache k2 where k2.user_id = u.id and k2.reportes > 0)");',
    'w.push("exists (select 1 from content_reports x where x.target_kind = \'user\' and x.target_id = u.id::text)");'],
  ['cifrasUsuarioDerivadas', 'apps/web/app/admin/usuarios/[id]/page.tsx', 'const din = !s.puede("tx", "ver") ? undefined : tab === "din" ? await U.dinero360(u.id) : null;', 'const din = tab === "din" ? await U.dinero360(u.id) : null;'],
  // calendarioConDiasEspeciales (9n-10): reservaciones vuelve a ignorar los días especiales; citas, la temporada
  ['calendarioConDiasEspeciales', 'apps/web/lib/reservas.ts', '  const de = await diasEspeciales(c as ReturnType<typeof db>, negocio, b.hoy, 60);', '  const de = { esp: [], temporadas: [], cerradoHasta: null };'],
  ['calendarioConDiasEspeciales', 'apps/web/lib/citas.ts', '  if (x.temporadas.length && !x.temporadas.some((t) => t.desde <= ymd && ymd <= t.hasta)) return [];\n', ''],
  // novedadRepetida (9n-11): la repetición sale en días cerrados; el barrido revive las detenidas; vuelve a avisar a los seguidores
  ['novedadRepetida', 'packages/db/migrations/0161_novedad_repetir.sql', ' and x.t > desde and not negocio_dia_cerrado(bid, x.dia)', ' and x.t > desde'],
  ['novedadRepetida', 'apps/web/lib/novedades.ts', "where p.repeat_days is not null and p.status = 'live' and p.hidden_at is null and p.ends_at <= now()", "where p.repeat_days is not null and p.ends_at <= now()"],
  ['novedadRepetida', 'apps/web/lib/novedades.ts', 'repeat_n = p.repeat_n + 1, updated_at = now()', 'repeat_n = p.repeat_n + 1, followers_notified_at = null, updated_at = now()'],
  // calendarioConDiasEspeciales (0164): las visitas vuelven a armar las horas con la semana
  ['calendarioConDiasEspeciales', 'apps/web/lib/visitas-inm.ts', "cross join jsonb_array_elements(negocio_rangos_dia($1, d::date)) rg),", "join business_hours h on h.business_id = $1 and h.module = '' and h.weekday = extract(dow from d)::int and h.open and not negocio_dia_cerrado($1, d::date)\n         cross join jsonb_array_elements(h.ranges) rg),"],
  // panelSinAccesoBloqueado (9n-13): el panel vuelve a dejar entrar a quien se le quitó el acceso
  ['panelSinAccesoBloqueado', 'apps/web/lib/panel.ts', "where m.business_id = $1 and m.user_id = $2 and m.status = 'active' and m.panel_off_at is null and b.status <> 'merged'", "where m.business_id = $1 and m.user_id = $2 and m.status = 'active' and b.status <> 'merged'"],
  // disputaConEvidencia: la respuesta deja de mandar los archivos
  ['disputaConEvidencia', DI, 'archivos: { recibo: archivos.recibo, conversacion: archivos.conversacion, entrega: archivos.entrega, otro: archivos.foto_entrega } });', 'texto: "" });'],
];
const crear = [
  // diaEspecialActivo: una migración que borra días especiales
  ['diaEspecialActivo', 'packages/db/migrations/0199_zz9n.sql', 'begin;\ndelete from special_hours where date_to < current_date;\ncommit;\n'],
  // sinTelefonoAlRepartidor: una pantalla nueva del Repartidor con el teléfono del cliente
  ['sinTelefonoAlRepartidor', 'apps/web/app/repartidor/zz9n.tsx', 'export const x = (o: { telCliente: string }) => o.telCliente;\n'],
  // calendarioConDiasEspeciales (9n-10): un calendario nuevo con el horario de la semana y nada más
  ['calendarioConDiasEspeciales', 'apps/web/lib/zz9n10.ts', 'export const q = "select weekday, open, ranges from business_hours where business_id = $1";\n'],
  // botonEsRole (9n-8): una prueba nueva que busca <button> a secas
  ['botonEsRole', 'pruebas/e2e/zz9n8.cjs', "module.exports = (p) => p.locator('div').filter({ has: p.locator('button') });\n"],
  // panelSinAccesoBloqueado (9n-13): una acción del panel que busca al miembro por su cuenta
  ['panelSinAccesoBloqueado', 'apps/web/app/panel/zz9n13.ts', 'export const q = `select 1 from business_members where business_id = $1 and user_id = $2 and status = \'active\'`;\n'],
  // cifrasUsuarioDerivadas (9n-9): una acción nueva que escribe la cifra a mano
  ['cifrasUsuarioDerivadas', 'apps/web/app/admin/zz9n9.ts', 'export const q = "update user_stats_cache set reportes = 0 where user_id = $1";\n'],
  // cambioNegocioOtraPersona (9n-8): una pantalla nueva del admin que aplica la fusión directo
  ['cambioNegocioOtraPersona', 'apps/web/app/admin/zz9n8.ts', 'import { aplicarFusion } from "@/lib/negocio-cambios";\nexport const x = aplicarFusion;\n'],
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
