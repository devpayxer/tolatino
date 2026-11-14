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
  ['copiaQueSeOlvida', UB, '  if (!escucha) { escucha = true; alCambiarConfig(() => { cache = null; }); }\n', ''],
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
  // salidaComoLaPagina: tra4w vuelve a elegir la próxima salida sin mirar si el servicio sigue vivo
  ['salidaComoLaPagina', 'pruebas/e2e/tra4w.cjs', "and i.removed_at is null and i.svc_kind = 'asiento'", "and i.svc_kind = 'asiento'"],
  // pruebasIndependientes: el corredor deja de cerrar las ventanas de un minuto entre pruebas, o deja de cerrar la espera entre códigos
  ['pruebasIndependientes', 'pruebas/correr.mjs', '  if (t.carril === "e2e") cerrarVentanas();\n', ''],
  ['pruebasIndependientes', 'pruebas/correr.mjs', "delete from otp_codes where created_at > now() - interval '1 minute';\\n", ''],
  // esperaQueEspera: cit3c vuelve a esperar «en atención», que el botón «Llegó · en atención» ya cumple
  ['esperaQueEspera', 'pruebas/e2e/cit3c.cjs', "await hasta(() => op(T.numero, 'status_detail') === 'live', 'llegó: en atención (en la base)');", "await d.getByText(/en atención/).first().waitFor();"],
  // tarjetaPropia: fie4v deja de guardarle su tarjeta a Marisol y comprueba el depósito retenido igual
  // capturaSinHora: la ficha de Sabor Dominicano se captura sin abrir el negocio (de noche sale cerrada)
  ['capturaSinHora', 'pruebas/visual/pantallas.json', '"abiertos": ["sabor-dominicano"]', '"abiertos": []'],
  // libroEnAyudantes: sinTopeDeAyuda vuelve a correr los mensajes de El Compa sin el modo réplica
  ['libroEnAyudantes', 'pruebas/lib/negocio-nuevo.cjs', "set session_replication_role = replica; update compa_messages", "update compa_messages"],
  // veinticuatroHoras: pedir.ts vuelve a contar el último pedido desde la medianoche, o una prueba vuelve a «00:00–23:59»
  ['veinticuatroHoras', 'apps/web/lib/pedir.ts', "actual && b.last_min && !sinCierre ? actual[1] - b.last_min", "actual && b.last_min ? actual[1] - b.last_min"],
  ['veinticuatroHoras', 'pruebas/e2e/pedidos2c.cjs', '[["00:00","00:00"]]', '[["00:00","23:59"]]'],
  // tarjetaPropia: Marisol reserva un viaje sin guardarle su tarjeta («Reservar» queda apagado en una base nueva)
  ['tarjetaPropia', 'pruebas/e2e/cho4y.cjs', "  require('../lib/negocio-nuevo.cjs').tarjeta('5705550122');\n", ''],
  // bloquePorNombre: la página de una versión vuelve a tomar el aviso de producción por su lugar en la cabecera
  ['bloquePorNombre', 'apps/web/app/admin/TextosPaginas.tsx', 'tabs, nota]', 'tabs, cab[4]!]'],
  // etiquetaDelPaso: a11y9c vuelve a bajar a los hijos del paso 2 por el prefijo (que también es el marco, con su «Volver»)
  ['etiquetaDelPaso', 'pruebas/e2e/a11y9c.cjs', '[data-screen-label="ONB-NEG-C1 · lo propio de tu categoría"] > div', '[data-screen-label^="ONB-NEG-C1"] > div'],
  // tarjetaPropia: ins4e vuelve a guardarle tarjeta solo a otra clienta (0299) y Marisol inscribe con matrícula retenida sin ninguna
  ['tarjetaPropia', 'pruebas/e2e/ins4e.cjs', "  require('../lib/negocio-nuevo.cjs').tarjeta('5705550122');\n", ''],
  // compaEnElChat: msg2p deja de apagar El Compa de Sabor Dominicano al empezar (compa7f lo deja encendido)
  ['compaEnElChat', 'pruebas/e2e/msg2p.cjs', "update compa_business_settings set enabled = false where business_id = '${BIZ}'`);\n", "select 1`);\n"],
  ['tarjetaPropia', 'pruebas/e2e/fie4v.cjs', "  require('../lib/negocio-nuevo.cjs').tarjeta('5705550122');\n", ''],
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
let limpio = true; try { execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); } catch (e) { limpio = false; console.log(String(e.stderr).slice(0, 600)); }
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
