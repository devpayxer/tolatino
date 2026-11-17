// Prueba al revés del guardián mercadoConRepartidor (LAUNCH «Envío del mercado con repartidor propio en /repartidor», 17 nov): el envío del mercado va
// por el mismo Repartidor que la comida (número y tipo de lib/reparto-comun.ts), sale con el repartidor solo cuando el mercado lo marcó listo, siempre
// lleva prueba, se cobra lo real una sola vez al «Entregado» del repartidor (liquidarMercado, nunca cobrarOperacion) y el mercado no lo cierra mientras
// el repartidor lo tiene (lib/mercado.ts, el panel y la base). Se inyecta el defecto, el guardián debe fallar con SU mensaje ([nombre]); se restaura.
// «crear»: se crea el archivo, se corre y se borra.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const W = 'apps/web/', L = W + 'lib/', MIG = 'packages/db/migrations/0177_mercado_repartidor.sql';
const C = L + 'reparto-comun.ts', RP = L + 'repartidor.ts', RO = L + 'repartidor-ofertas.ts', ME = L + 'mercado.ts', RU = L + 'ruta.ts',
  VI = W + 'app/api/ruta/vivo/route.ts', PM = W + 'app/panel/MercadoPanel.tsx', AC = W + 'app/repartidor/acciones.ts';
const G = 'mercadoConRepartidor';
const casos = [
  // el número del Repartidor vuelve a ser solo de comida
  [C, 'export const NUM_REPARTO = /^(?:\\d{1,12}|M-\\d{1,10})$/;', 'export const NUM_REPARTO = /^\\d{1,12}$/;'],
  // … el tipo, solo comida
  [C, "export const KIND_REPARTO = `('order', 'market_order')`;", "export const KIND_REPARTO = `('order')`;"],
  // … sale con el repartidor aunque no esté listo
  [C, "export const listoParaRepartoSql = (a = \"o\") => `(${a}.kind = 'order' or ${a}.status_detail = 'listo')`;", "export const listoParaRepartoSql = (a = \"o\") => `true`;"],
  // el mapa en vivo del cliente solo para la comida
  [VI, 'if (!NUM_REPARTO.test(pedido)) return NO();', 'if (!/^\\d{1,12}$/.test(pedido)) return NO();'],
  // escribirle al cliente solo en pedidos de comida
  [RO, "and d.status = 'active' and o.kind in ${KIND_REPARTO} and o.status = 'confirmed' for update of o", "and d.status = 'active' and o.kind = 'order' and o.status = 'confirmed' for update of o"],
  // la ruta del Repartidor deja fuera al mercado
  [RU, "where o.number = $1 and o.kind in ${KIND_REPARTO} and t.rider_user_id = $2", "where o.number = $1 and o.kind = 'order' and t.rider_user_id = $2"],
  // el aviso del repartidor solo encuentra pedidos de comida
  [AC, 'where o.number = $1 and o.kind in ${KIND_REPARTO}`', "where o.number = $1 and o.kind = 'order'`"],
  // el envío del mercado sin prueba obligatoria
  [RP, "(coalesce(ds.proof, false) or o.kind = 'market_order') as pide_prueba, o.kind = 'market_order' as merc", "coalesce(ds.proof, false) as pide_prueba, o.kind = 'market_order' as merc"],
  // «Recogí» antes de que el mercado lo marque listo
  [RP, 'if (o.merc && o.detail !== "listo") return no(', 'if (false) return no('],
  // al «Entregado» del repartidor se captura todo lo retenido
  [RP, 'await (await import("./mercado")).liquidarMercado(r.op as string).catch(() => undefined);', 'await cobrarOperacion(r.op as string).catch(() => undefined);'],
  // se asigna sin estar listo
  [RP, 'if (driverId !== null && o.kind === "market_order" && o.detail !== "listo") return no(', 'if (false) return no('],
  // se ofrece sin estar listo
  [RO, '    if (!o.listo) return no(', '    if (false) return no('],
  // el mercado marca «Entregado» aunque el repartidor lo tenga
  [ME, 'if (o.mode === "delivery" && o.driver) return no(', 'if (false) return no('],
  // … y «Va en camino»
  [ME, 'if (o.driver) return no("Ya lo tiene un repartidor', 'if (false) return no("Ya lo tiene un repartidor'],
  // el panel muestra «Entregado» propio con el repartidor
  [PM, 'const propio = x.modo !== "delivery" || (D === "camino" && !x.reparto?.rep);', 'const propio = true;'],
  // la base deja cerrar con la prueba del panel
  [MIG, "p.kind in ('foto', 'codigo') and p.driver_id = new.driver_id", "p.kind in ('foto', 'codigo', 'negocio')"],
  // la ruta en vivo no vale para el mercado
  [MIG, "and o.kind in ('order', 'market_order') and coalesce(o.mode, 'pickup') = 'delivery' and o.status = 'confirmed' and coalesce(o.stage, '') <> 'delivered'", "and o.kind = 'order' and coalesce(o.mode, 'pickup') = 'delivery' and o.status = 'confirmed' and coalesce(o.stage, '') <> 'delivered'"],
  // la ruta del mercado no se cierra al entregar
  [MIG, "  when (new.kind in ('order', 'market_order') and (old.status", "  when (new.kind = 'order' and (old.status"],
  // el mercado sin códigos
  [MIG, "  when (new.kind in ('order', 'market_order') and new.status = 'confirmed') execute function operations_codigos();", "  when (new.kind = 'order' and new.status = 'confirmed') execute function operations_codigos();"],
];
const crear = [
  // lo real del mercado se cobra desde otro lado
  [L + 'zzmercrep.ts', 'import "server-only";\nimport { liquidarMercado } from "./mercado";\nexport const x = (id: string) => liquidarMercado(id);\n'],
  // una pieza nueva del Repartidor solo con la comida
  [L + 'repartidor-zz.ts', 'import "server-only";\nimport { db } from "./db";\nexport const x = (n: string) => db().query(`select 1 from operations o where o.number = $1 and o.kind = \'order\'`, [n]);\n'],
];
let bien = 0, total = 0;
const correr = () => {
  try { execSync(`node guardianes/run.mjs --solo ${G}`, { cwd: R, stdio: 'pipe' }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${G}]`)) ?? ''; return [!!l, l]; }
};
const informe = (que, [falla, out]) => { total++; console.log(`  ${falla ? '✓' : '✗'} ${G} al revés (${que})${out ? ' → ' + out.trim().slice(0, 170) : ''}`); if (falla) bien++; };
for (const [f, a, b] of casos) {
  const ruta = path.join(R, f);
  if (!fs.existsSync(ruta)) { total++; console.log(`  ✗ no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(); } finally { fs.writeFileSync(ruta, orig); }
  informe(f.split('/').pop(), r);
}
for (const [f, c] of crear) {
  const ruta = path.join(R, f);
  fs.writeFileSync(ruta, c);
  let r; try { r = correr(); } finally { fs.unlinkSync(ruta); }
  informe(`crear ${f.split('/').slice(-2).join('/')}`, r);
}
let limpio = true; try { execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); } catch (e) { limpio = false; console.log(String(e.stderr).slice(0, 600)); }
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
