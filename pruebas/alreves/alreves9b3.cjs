// Prueba al revés de los guardianes de 9b-3 (la escala: topes compartidos, copias que se olvidan, tipos de parámetros y orden por texto). Se
// inyecta el defecto, el guardián debe fallar con SU mensaje ([nombre]); se restaura. «crear»: se crea el archivo, se corre y se borra.
const ENT = require('../lib/entorno.cjs'); // rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const PA = 'apps/web/lib/pases/pases.ts', MI = 'apps/web/lib/moderacion-img.ts', TR = 'apps/web/lib/traductor.ts', UB = 'apps/web/lib/ubicacion.ts',
  M = 'packages/db/migrations/0133_escala.sql', T = 'apps/web/lib/topes.ts', LL = 'apps/web/lib/llaves/llaves.ts', BO = 'apps/web/lib/boletos.ts',
  RU = 'apps/web/app/api/ruta/posicion/route.ts', IN = 'apps/web/lib/errores/ingesta.ts';
const casos = [
  // topeCompartido: el tope de Wallet vuelve a la memoria del proceso (ventana por minuto con la hora del proceso)
  ['topeCompartido', PA, '  return dentroDelTope("pase_ws", ip || "?", lim);', '  const m = Math.floor(Date.now() / 60_000);\n  return m > 0 && lim > 0;'],
  // … un corta-circuito en memoria (la moderación de fotos corta 30 s en este proceso)
  ['topeCompartido', MI, 'const CORTE_MS = 30_000;', 'const CORTE_MS = 30_000;\nlet cortadoHasta = 0;\nexport const cortar = () => { cortadoHasta = Date.now() + CORTE_MS; };'],
  // … un contador de fallas de primer nivel (el traductor vuelve a contar sus fallas en memoria)
  ['topeCompartido', TR, 'export class SinTraductor extends Error {}', 'const corta = { fallas: 0, medio: false };\nexport class SinTraductor extends Error {}'],
  // … un Map que guarda la última hora de cada token (la posición del repartidor, una por segundo)
  ['topeCompartido', RU, 'const MAX = 16 * 1024;', 'const MAX = 16 * 1024;\nconst ultimas = new Map<string, number>();\nexport const marcar = (k: string) => ultimas.set(k, Date.now());'],
  // … la clave del tope es el dato (sin huella)
  ['topeCompartido', T, 'const clave = (k: string) => huella(`tope:${k}`).slice(0, 40);', 'const clave = (k: string) => k.slice(0, 40);'],
  // … y la base suma y lee en dos sentencias
  ['topeCompartido', M, '  on conflict (scope, key_hash, window_start) do update set n = r.n + excluded.n\n  returning n', '  on conflict (scope, key_hash, window_start) do nothing'],
  // ingestaLimitada: el tope por teléfono de los errores se cae
  ['ingestaLimitada', IN, '(!dev || await dentroDelTope("errores_dev", dev, lim.dev)) && ', ''],
  // copiaQueSeOlvida: las ciudades vuelven a tardar 60 s en cada proceso; la base deja de avisar de un cambio de Configuración
  // (22 nov: la copia es una cacheConAviso de lib/cache-aviso.ts; el defecto la cambia por una copia a mano que no se registra)
  ['copiaQueSeOlvida', UB, 'const CIUDADES = cacheConAviso({ ttlMs: 60_000, cargar: async (): Promise<Ciudad[]> => {', 'let copia: { at: number; c: Ciudad[] } | null = null;\nconst CIUDADES = { leer: async () => (copia && Date.now() - copia.at < 60_000 ? copia.c : (copia = { at: Date.now(), c: await cargarCiudades() }).c) };\nasync function cargarCiudades(): Promise<Ciudad[]> {'],
  ['copiaQueSeOlvida', M, 'create trigger feature_flags_avisa after insert or update or delete on feature_flags for each statement execute function config_avisar();', ''],
  // parametroSinTipo: el mismo $2 como uuid (user_id) y como text (action) en un insert
  ['parametroSinTipo', LL, 'where id = $2), $3, $4, $5::inet', 'where id = $2), $2, $4, $5::inet'],
  // ordenSinTexto: «order by id» sobre «id::text» fuera de El Compa y Mensajes (los extras de un evento: 100 antes que 98)
  ['ordenSinTexto', BO, 'not off order by sort, event_addons.id`', 'not off order by sort, id`'],
  // consultaUnaVez: la consulta de la ayuda vuelve a armarse en cada trozo
  ['consultaUnaVez', 'apps/web/lib/compa/ayuda-indice.ts', '`with q as materialized (select ayuda_consulta($1, $2, $5) as tq),', '`with q as (select ayuda_consulta($1, $2, $5) as tq),'],
  // saldoAlDia: EN CIRCULACIÓN vuelve a salir solo del resumen del barrido (10 min atrás)
  ['saldoAlDia', 'apps/web/lib/admin-gam.ts', `                   + (select coalesce(sum(e.delta), 0) from coin_entries e join users u on u.id = e.user_id
                       where e.created_at > t.t and u.home_city_id is not null and ($1::text[] = '{}' or u.home_city_id = any($1)))
`, ''],
  // fotoSinReloj: compa7e vuelve a normalizar a mano (la hora en punto rompe la comparación), o el normalizador deja de quitar la hora
  ['fotoSinReloj', 'pruebas/e2e/compa7e.cjs', "const { norm } = require('../lib/sin-reloj.cjs');", "const norm = (t) => t.replace(/\\d+/g, '#').replace(/\\s+/g, ' ').trim();"],
  ['fotoSinReloj', 'pruebas/lib/sin-reloj.cjs', ".replace(HORA, 'HORA')", ''],
  // precondicionPropia: pre4e vuelve a crear su casa solo si Marisol no tiene ninguna
  ['precondicionPropia', 'pruebas/e2e/pre4e.cjs', 'not exists (select 1 from user_homes h where h.user_id = ${MARISOL} and h.address_id = user_addresses.id and h.removed_at is null)', 'not exists (select 1 from user_homes where user_id = ${MARISOL} and removed_at is null)'],
  // … (20 nov, barajada 331738974) pedidos2c vuelve a fijar solo auto_accept y prep_min antes de guardar Pedidos en línea (neg9n le dejaba delivery sin forma de pago
  // y «Guardar» quedaba apagado); pagos2d deja de fijar cómo se entrega; dlv2f3 deja de fijar cómo se paga el pickup y la tarjeta
  ['precondicionPropia', 'pruebas/e2e/pedidos2c.cjs', "pickup=true, delivery=false, pay_cash_pickup=true, pay_cash_delivery=false, pay_card=false, who='team', external_app=null, auto_accept=false, prep_min=20", "auto_accept=false, prep_min=20"],
  // 24 nov · fic9cab vuelve a tocar «Agregar» por su lugar en todo el menú (los primeros son «Populares» y cambian con los pedidos de otras pruebas).
  ['precondicionPropia', 'pruebas/e2e/fic9cab.cjs', "const bt = fila.getByRole('button', { name: 'Agregar' }).first();", "const bt = q.locator('[data-screen-label=\"Ficha · menú\"]').getByRole('button', { name: 'Agregar' }).first();"],
  ['precondicionPropia', 'pruebas/e2e/pagos2d.cjs', "pickup=true, delivery=false, pay_cash_delivery=false, auto_accept=false", "auto_accept=false"],
  ['precondicionPropia', 'pruebas/e2e/dlv2f3.cjs', "pay_cash_pickup=true, pay_card=false, who='team'", "who='team'"],
  // toqueEsperaLaPantalla (20 nov, «dos veces seguidas» parte 2/4): pq4e vuelve a contar los negocios en cuanto cambia la URL, sin esperar la pantalla
  // de presupuestos (con el esqueleto todavía puesto la cuenta da 0); primero como estaba, luego la cuenta en una sola orden
  ['toqueEsperaLaPantalla', 'pruebas/e2e/pq4e.cjs', "const pq = m.locator('[data-screen-label=\"APP-NEG-HOGAR-PRESUPUESTOS\"]'); await pq.waitFor();\n  const cands = pq.getByRole('checkbox'); const nC = await cands.count();", "const cands = m.getByRole('checkbox'); const nC = await cands.count();"],
  ['toqueEsperaLaPantalla', 'pruebas/e2e/pq4e.cjs', "const pq = m.locator('[data-screen-label=\"APP-NEG-HOGAR-PRESUPUESTOS\"]'); await pq.waitFor();\n  const cands = pq.getByRole('checkbox'); const nC = await cands.count();", "const nC = await m.getByRole('checkbox').count(); const cands = m.getByRole('checkbox');"],
  // silencioPropio: compa7h deja de poner las horas de silencio de Marisol de fábrica y espera «silencio» igual
  ['silencioPropio', 'pruebas/e2e/compa7h.cjs', "const silencioDeFabrica = () => sql(`update users set notif_prefs = coalesce(notif_prefs, '{}'::jsonb) - 'quiet' where id = '${MU}'`);", "const silencioDeFabrica = () => {};"],
  // cupoPropio: edu4a vuelve a fijar los cupos sin fijar los reservados (da por hecho que nadie se inscribió en el grupo)
  ['cupoPropio', 'pruebas/e2e/edu4a.cjs', "set seats_booked = 0, seats_outside = 0, seats_total = 4 where business_id", "set seats_outside = 0, seats_total = seats_outside + seats_booked + 4 where business_id"],
  // salidaComoLaPagina: tra4w vuelve a elegir la próxima salida sin mirar si el servicio sigue vivo
  ['salidaComoLaPagina', 'pruebas/e2e/tra4w.cjs', "and i.removed_at is null and i.svc_kind = 'asiento'", "and i.svc_kind = 'asiento'"],
  // pruebasIndependientes: el corredor deja de cerrar las ventanas de un minuto entre pruebas, o deja de cerrar la espera entre códigos
  ['pruebasIndependientes', 'pruebas/correr.mjs', '  if (t.carril === "e2e") cerrarVentanas();\n', ''],
  ['pruebasIndependientes', 'pruebas/correr.mjs', "delete from otp_codes where created_at > now() - interval '1 minute';\\n", ''],
  // esperaQueEspera: cit3c vuelve a esperar «en atención», que el botón «Llegó · en atención» ya cumple
  ['esperaQueEspera', 'pruebas/e2e/cit3c.cjs', "await hasta(() => op(T.numero, 'status_detail') === 'live', 'llegó: en atención (en la base)');", "await d.getByText(/en atención/).first().waitFor();"],
  // tarjetaPropia: fie4v deja de guardarle su tarjeta a Marisol y comprueba el depósito retenido igual
  // capturaSinHora: la ficha de Sabor Dominicano se captura sin abrir el negocio (de noche sale cerrada)
  ['capturaSinHora', 'pruebas/visual/pantallas.json', '"abiertos": ["sabor-dominicano", "barberia-el-primo", "bodega-don-pepe", "clinica-esperanza"]', '"abiertos": []'],
  // 26 nov · el corredor vuelve a tapar solo las hojas: «Abierto · hasta 9 PM» (con el punto dentro) cambia con la hora real y la ficha cae entre las 8 y las 11
  ['capturaSinHora', 'pruebas/visual/correr.mjs', 'const tx = el.children.length ? propio(el) : (el.textContent || "").trim(); if (tx && R.test(tx)) poner(el);', 'if (el.children.length) continue; const tx = (el.textContent || "").trim(); if (tx && R.test(tx)) poner(el);'],
  // 20 nov · el Inicio pinta cuatro «Abierto ahora»: con tres fijados, de noche entra otro negocio y la captura se corre
  ['capturaSinHora', 'pruebas/visual/pantallas.json', '"abiertos": ["sabor-dominicano", "barberia-el-primo", "bodega-don-pepe", "clinica-esperanza"]', '"abiertos": ["sabor-dominicano", "barberia-el-primo", "bodega-don-pepe"]'],
  // libroEnAyudantes: sinTopeDeAyuda vuelve a correr los mensajes de El Compa sin el modo réplica
  ['libroEnAyudantes', 'pruebas/lib/negocio-nuevo.cjs', "set session_replication_role = replica; update compa_messages", "update compa_messages"],
  // veinticuatroHoras: pedir.ts vuelve a contar el último pedido desde la medianoche, o una prueba vuelve a «00:00–23:59»
  ['veinticuatroHoras', 'apps/web/lib/pedir.ts', "actual && b.last_min && !sinCierre ? actual[1] - b.last_min", "actual && b.last_min ? actual[1] - b.last_min"],
  ['veinticuatroHoras', 'pruebas/e2e/pedidos2c.cjs', '[["00:00","00:00"]]', '[["00:00","23:59"]]'],
  // tarjetaPropia: Marisol reserva un viaje sin guardarle su tarjeta («Reservar» queda apagado en una base nueva)
  ['tarjetaPropia', 'pruebas/e2e/cho4y.cjs', "  require('../lib/negocio-nuevo.cjs').tarjeta('5705550122');\n", ''],
  // … (20 nov, barajada 331738974) Marisol aparta una renta sin guardarle su tarjeta («Apartar · $178 al recoger» queda apagado en una base nueva)
  ['tarjetaPropia', 'pruebas/e2e/veh4y.cjs', "  require('../lib/negocio-nuevo.cjs').tarjeta('5705550122');\n", ''],
  // bloquePorNombre: la página de una versión vuelve a tomar el aviso de producción por su lugar en la cabecera
  ['bloquePorNombre', 'apps/web/app/admin/TextosPaginas.tsx', 'tabs, nota]', 'tabs, cab[4]!]'],
  // etiquetaDelPaso: a11y9c vuelve a bajar a los hijos del paso 2 por el prefijo (que también es el marco, con su «Volver»)
  ['etiquetaDelPaso', 'pruebas/e2e/a11y9c.cjs', '[data-screen-label="ONB-NEG-C1 · lo propio de tu categoría"] > div', '[data-screen-label^="ONB-NEG-C1"] > div'],
  // tarjetaPropia: ins4e vuelve a guardarle tarjeta solo a otra clienta (0299) y Marisol inscribe con matrícula retenida sin ninguna
  ['tarjetaPropia', 'pruebas/e2e/ins4e.cjs', "  require('../lib/negocio-nuevo.cjs').tarjeta('5705550122');\n", ''],
  // compaEnElChat: msg2p deja de apagar El Compa de Sabor Dominicano al empezar (compa7f lo deja encendido)
  ['existenciaPropia','pruebas/e2e/leg9e.cjs',"sold_out = false, stock_left = greatest(stock_left, stock_par), stock_day = null where","sold_out = false where"],
  ['modoPropio','pruebas/e2e/menu2b.cjs',"localStorage.setItem('tl-modo-v1', JSON.stringify({ 'sabor-dominicano': 'pickup' }));","0;"],
  ['modoPropio','pruebas/e2e/pagos2d.cjs',"localStorage.setItem('tl-modo-v1', JSON.stringify({ 'sabor-dominicano': 'pickup' }));","0;"],
  ['equipoDePruebaConDosPasos','pruebas/e2e/ana9g.cjs',"insert into staff_mfa_pruebas (phone, note)","select 1 /* staff_mfa */"],
  ['compaEnElChat', 'pruebas/e2e/msg2p.cjs', "update compa_business_settings set enabled = false where business_id = '${BIZ}'`);\n", "select 1`);\n"],
  ['tarjetaPropia', 'pruebas/e2e/fie4v.cjs', "  require('../lib/negocio-nuevo.cjs').tarjeta('5705550122');\n", ''],
  // alrevesQueFalla: correr.mjs vuelve a contar en verde la prueba al revés con un ✗ que sale con 0; una suite vuelve a no salir con error
  ['alrevesQueFalla', 'pruebas/correr.mjs', 'ok: codigo === 0 && !sinNada && !mudo,', 'ok: codigo === 0 && !sinNada,'],
  ['alrevesQueFalla', 'pruebas/alreves/alreves6c.cjs', '\nif (bien !== casos.length) process.exit(1);\n', '\n'],
  ['alrevesQueFalla', 'pruebas/alreves/alreves5e.cjs', '.replace(a, () => b)', '.replace(a, b)'],
  // codigoRecogidaPropio: app8e vuelve a no decidir el código de recogida
  ['codigoRecogidaPropio', 'pruebas/e2e/app8e.cjs', ', proof=false, pickup_code=false where', ' where'],
  // ciudadSinAmbiguedad: sis9j vuelve a hacer clic en «Reading» sin decir cuál (el selector de ciudad del admin también lo dice)
  ['ciudadSinAmbiguedad', 'pruebas/e2e/sis9j.cjs', "await clic(a.locator('main').getByText('Reading', { exact: true }));", "await clic(a.getByText('Reading', { exact: true }));"],
  // retiradoNoCuenta: rep2l vuelve a buscar a Juan por teléfono sin mirar el estado (sale también el retirado)
  ['retiradoNoCuenta', 'pruebas/e2e/rep2l.cjs', "select status || '|' || vehicle || '|' || (invite_code is null) from delivery_drivers where phone = '+1${JUAN_TEL}' and status <> 'removed'", "select status || '|' || vehicle || '|' || (invite_code is null) from delivery_drivers where phone = '+1${JUAN_TEL}'"],
  // precioVuelve: ret4n sube el precio de la pierna y ya no lo devuelve al salir
  ['precioVuelve', 'pruebas/e2e/ret4n.cjs', "  process.on('exit', () => sql(`update items set price_cents = ${p0} where business_id = '${M}' and name->>'es' = 'Pierna de cerdo'`)); // 9b-3 · devuelve el precio: merc4p cuenta con el de la semilla\n", ''],
  // almuerzoATodaHora: vec9m vuelve a abrir «Pescado frito» sin ponerlo a toda hora (depende de la hora del CI)
  ['almuerzoATodaHora', 'pruebas/e2e/vec9m.cjs', "sql(`update items set avail = 'siempre' where", "sql(`update items set avail = 'own' where"],
  // plazoAbiertoSeLee: Inscribirme vuelve a decir «48 horas» en vez del plazo de Configuración
  ['plazoAbiertoSeLee', 'apps/web/app/(app)/n/[id]/inscribirme/Inscribirme.tsx', 'te lo guardan ${b.plazos.oferta} horas.`', 'te lo guardan 48 horas.`'],
  // … y el dinero del evento vuelve a decir «el martes» en vez del día de pago de Configuración (evt_pago_dia, 9n-6)
  ['plazoAbiertoSeLee', 'apps/web/app/panel/EventosCambios.tsx', 'Te llega a tu banco ${diaSemanaTxt(L.pagoDia, true)} después de cada fecha', 'Te llega a tu banco el martes después de cada fecha'],
  // purgaPorRazon: la purga de Salud vuelve a borrar también lo de los niños y la casa
  ['purgaPorRazon', 'apps/web/lib/citas-flujo.ts', "        and p.reason not in ('nino', 'fe', 'casa') -- ", "        and true -- "],
  // telefonoAlAzarRespetaFijos: telLibre vuelve a sacar al azar un número sin saltar los que otra prueba usa por su número (Rita de sis9j)
  // smsFueraDeSilencio: pan9n2 vuelve a esperar el SMS de la invitación sin apagar las horas de silencio
  ['smsFueraDeSilencio', 'pruebas/e2e/pan9n2.cjs', "'{\"quiet\": false}'::jsonb where phone = '+1${INV}'", "'{}'::jsonb where phone = '+1${INV}'"],
  ['telefonoAlAzarRespetaFijos', 'pruebas/lib/negocio-nuevo.cjs', "    if (!esFijo(t) && sql(", "    if (sql("],
  // textoQueExiste: una prueba busca en la pantalla un texto que ya no está en ningún lado (lo que le pasó a sis9j con 9o)
  ['textoQueExiste', 'pruebas/e2e/sis9j.cjs', "await contiene(a, 'DESPLIEGUES Y VUELTAS ATRÁS')", "await contiene(a, 'Llegan cuando se encienda producción')"],
];
const crear = [
  // parametroSinTipo: un archivo nuevo con el error de siempre (uuid y text en el mismo $1)
  ['parametroSinTipo', 'apps/web/lib/zz9b3tipos.ts', 'import { db } from "./db";\nexport const x = (u: string) => db().query(`insert into app_events (user_id, ref, name) values ($1, $1, \'buscar\')`, [u]);\n'],
  // topeCompartido: un tope por minuto nuevo en memoria, en una ruta
  ['topeCompartido', 'apps/web/app/api/zz9b3tope/route.ts', 'const vistos = new Map<string, number>();\nexport async function GET(req: Request) { const k = req.headers.get("x-real-ip") ?? "?"; vistos.set(k, (vistos.get(k) ?? 0) + 1); return new Response(null, { status: (vistos.get(k) ?? 0) > 10 ? 429 : 204 }); }\n'],
];
let bien = 0, total = 0;
const correr = (g, env = {}) => {
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe', env: { ...process.env, ...env } }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${g}]`)) ?? ''; return [!!l, l]; }
};
const informe = (g, que, [falla, out]) => { total++; console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (${que})${out ? ' → ' + out.trim().slice(0, 170) : ''}`); if (falla) bien++; };
for (const [g, f, a, b, env] of casos) {
  const ruta = path.join(R, f);
  if (!fs.existsSync(ruta)) { total++; console.log(`  ✗ ${g}: no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ ${g}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(g, env); } finally { fs.writeFileSync(ruta, orig); }
  informe(g, f.split('/').pop(), r);
}
for (const [g, f, c] of crear) {
  const ruta = path.join(R, f), dir = path.dirname(ruta), nuevo = !fs.existsSync(dir);
  fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(ruta, c);
  let r; try { r = correr(g); } finally { fs.unlinkSync(ruta); if (nuevo) try { fs.rmdirSync(dir); } catch { /* no vacía */ } }
  informe(g, `crear ${f.split('/').pop()}`, r);
}
let limpio = require('../lib/alreves-fin.cjs')(R, { mostrar: true });
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
