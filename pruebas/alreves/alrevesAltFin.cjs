// Prueba al revés de 9t · «Cuando el cliente no contesta a otra salida / otra hora, nadie se entera» (28 nov). Cada caso rompe a propósito UNO de los avisos del
// barrido (Viajes, Noche, Fiestas, clases e Iglesias, visitas) y la prueba altfin-* de ese vertical tiene que fallar; después se restaura el archivo y todas pasan.
// Si una prueba salía en verde con el aviso roto, no estaba mirando nada. Necesita la base de pruebas arriba (pruebas/servir/base.sh); no necesita el servidor.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const R = ENT.RAIZ;
// [archivo que se rompe, texto, texto roto, prueba que tiene que fallar, lo que se rompió]
const casos = [
  ['apps/web/lib/viajes.ts', 'await avisarCliente(v.num, "viaje_alt_fin"', 'await avisarCliente(v.num, "viaje_exp"', 'altfin-viajes', 'Viajes: el cliente recibe otro aviso'],
  ['apps/web/lib/viajes.ts', 'await avisarNeg(v.num, "biz_viaje_alt_fin"', 'await Promise.resolve(v.num, "biz_viaje_alt_fin"', 'altfin-viajes', 'Viajes: el negocio no se entera'],
  ['apps/web/lib/noche-reservas.ts', 'await avisarCliente(v.num, "noche_alt_fin"', 'await Promise.resolve(v.num, "noche_alt_fin"', 'altfin-noche', 'Noche: el cliente no se entera'],
  ['apps/web/lib/noche-reservas.ts', 'await avisarNeg(v.num, "biz_noche_alt_fin"', 'await Promise.resolve(v.num, "biz_noche_alt_fin"', 'altfin-noche', 'Noche: el local no se entera'],
  ['apps/web/lib/fiestas-reservas.ts', 'await avisarCliente(v.num, "fiesta_alt_fin"', 'await Promise.resolve(v.num, "fiesta_alt_fin"', 'altfin-fiestas', 'Fiestas: el cliente no se entera'],
  ['apps/web/lib/fiestas-reservas.ts', 'await avisarNeg(v.num, "biz_fiesta_alt_fin"', 'await Promise.resolve(v.num, "biz_fiesta_alt_fin"', 'altfin-fiestas', 'Fiestas: el negocio no se entera'],
  ['apps/web/lib/inscripciones.ts', 'await avisarCliente(o.num, "insc_alt_fin"', 'await Promise.resolve(o.num, "insc_alt_fin"', 'altfin-insc', 'Clases: el cliente no se entera'],
  ['apps/web/lib/inscripciones.ts', 'await avisarNeg(o.num, "biz_insc_alt_fin"', 'await Promise.resolve(o.num, "biz_insc_alt_fin"', 'altfin-insc', 'Clases: el lugar no se entera'],
  ['apps/web/lib/inscripciones.ts', '"insc_done", "insc_alt_fin"];', '"insc_done"];', 'altfin-insc', 'Iglesias: sin su plantilla (ni la neutra de consejería)'],
  // Y la clase de error contraria: avisar también a quien NO está en el caso (la solicitud sin respuesta, que ya tiene su aviso).
  ['apps/web/lib/inscripciones.ts', '    if (o.status === "pending") await avisarCliente(o.num, "insc_exp"', '    if (o.status !== "zz") await avisarCliente(o.num, "insc_exp"', 'altfin-insc', 'Clases: la cancelación por «otro grupo» también manda el aviso de «sin respuesta»'],
  ['apps/web/lib/visitas-inm.ts', 'await avisarCliente(o, "vis_alt_fin")', 'await Promise.resolve(o, "vis_alt_fin")', 'altfin-visitas', 'Visitas: el cliente no se entera'],
  ['apps/web/lib/visitas-inm.ts', 'await avisarNeg(o, "biz_vis_alt_fin")', 'await Promise.resolve(o, "biz_vis_alt_fin")', 'altfin-visitas', 'Visitas: el negocio no se entera'],
];
const correr = (t) => { const r = spawnSync('node', [`pruebas/e2e/${t}.cjs`], { cwd: R, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); return { st: r.status, txt: `${r.stdout || ''}\n${r.stderr || ''}` }; };
let bien = 0;
for (const [f, a, b, t, que] of casos) {
  const ruta = path.join(R, f), orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { console.log(`  ✗ no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r;
  try { r = correr(t); } finally { fs.writeFileSync(ruta, orig); }
  const cazo = r.st !== 0 && /✗ /.test(r.txt);
  console.log(`  ${cazo ? '✓' : '✗'} al revés (${que}): ${t} ${cazo ? 'falla' : r.st === 0 ? 'NO falló' : 'cayó sin decir qué: ' + r.txt.slice(-200)}`);
  if (cazo) bien++;
}
let limpias = 0;
for (const t of ['altfin-viajes', 'altfin-noche', 'altfin-fiestas', 'altfin-insc', 'altfin-visitas']) { const r = correr(t); if (r.st === 0) limpias++; else console.log(`  ✗ ${t} no pasa con el código restaurado`); }
console.log(`\n${bien}/${casos.length} defectos cazados · pruebas limpias después: ${limpias}/5`);
process.exit(bien === casos.length && limpias === 5 ? 0 : 1);
