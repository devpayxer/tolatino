// 24 nov (decisión AU; revisión de bc9a893) · La línea RESULTADOS de pruebas/correr.mjs, en un sitio que se puede probar sin correr pruebas.
// scripts/ci/subir.mjs la lee del registro de cada trabajo de pruebas (el repaso tras una roja y la evidencia encadenada de --subir): si esta cuenta
// miente, una roja se vuelve verde en la cadena. Por eso la cuenta vive aquí, con sus casos ejecutables (node pruebas/lib/resultados.cjs --casos, los
// corre el guardián subidaConHerramienta), y el corredor solo la llama:
//   anotar(hechas, nombre, ok)  cada prueba que corrió HASTA su resultado; la roja gana (un nombre que sale dos veces y una vez rojo, es rojo).
//   resultados({ pedidas, hechas, inestables, delCarril, detenida })
//     pedidas     la selección (sin repetir); verdes y rojas son SOLO de las pedidas que corrieron (una que no corrió no está en ninguna);
//     inestables  verdes que fallaron una vez y pasaron al repetirlas (decisión AG);
//     completa    todas las pedidas corrieron hasta su resultado, sin fallos del carril (la pasada real de guardianes o la huella del árbol:
//                 delCarril, que no son pruebas) y sin detenerse por una señal.
//   linea(...)  «RESULTADOS {json}», la línea que imprime el corredor.
'use strict';

function anotar(hechas, nombre, ok) {
  if (hechas.get(nombre) !== false) hechas.set(nombre, !!ok);
}

function resultados({ pedidas = [], hechas = new Map(), inestables = [], delCarril = [], detenida = false } = {}) {
  const ps = [...new Set(pedidas)];
  const verdes = ps.filter((n) => hechas.get(n) === true);
  const rojas = ps.filter((n) => hechas.get(n) === false);
  const inest = [...new Set(inestables)].filter((n) => hechas.get(n) === true);
  const carril = [...new Set(delCarril)];
  const completa = !detenida && !carril.length && ps.every((n) => hechas.has(n));
  return { pedidas: ps, verdes, rojas, inestables: inest, completa, ...(carril.length ? { delCarril: carril } : {}) };
}

const linea = (x) => `RESULTADOS ${JSON.stringify(resultados(x))}`;

/* Los casos: una corrida de mentira por cada forma de terminar. */
function casos() {
  let bien = 0, total = 0;
  const ok = (c, que) => { total++; if (c) bien++; console.log(`  ${c ? '✓' : '✗'} ${que}`); };
  const corrida = (pasos) => { const h = new Map(); for (const [n, v] of pasos) anotar(h, n, v); return h; };
  // Todas verdes.
  let r = resultados({ pedidas: ['a1x', 'b1x'], hechas: corrida([['a1x', true], ['b1x', true]]) });
  ok(r.completa && r.verdes.join() === 'a1x,b1x' && !r.rojas.length, 'todas verdes: completa, sin rojas');
  // Una roja.
  r = resultados({ pedidas: ['a1x', 'b1x'], hechas: corrida([['a1x', true], ['b1x', false]]) });
  ok(r.completa && r.verdes.join() === 'a1x' && r.rojas.join() === 'b1x', 'una roja: en rojas y no en verdes; completa');
  // Varias rojas: se dicen todas.
  r = resultados({ pedidas: ['a1x', 'b1x', 'c1x'], hechas: corrida([['a1x', false], ['b1x', true], ['c1x', false]]) });
  ok(r.rojas.join() === 'a1x,c1x' && r.verdes.join() === 'b1x', 'varias rojas: se dicen todas, no solo la primera');
  // La roja gana: un nombre que sale dos veces (verde y luego roja, o roja y luego verde) es rojo.
  r = resultados({ pedidas: ['a1x', 'a1x', 'b1x'], hechas: corrida([['a1x', true], ['b1x', false], ['a1x', false], ['b1x', true]]) });
  ok(r.pedidas.join() === 'a1x,b1x' && r.rojas.join() === 'a1x,b1x' && !r.verdes.length, 'la roja gana: un nombre que sale dos veces y una vez rojo es rojo (en cualquier orden)');
  // Una que no corrió (carril cortado): ni verde ni roja, y completa:false.
  r = resultados({ pedidas: ['a1x', 'b1x'], hechas: corrida([['a1x', true]]) });
  ok(!r.completa && r.verdes.join() === 'a1x' && !r.rojas.length && !r.verdes.includes('b1x'), 'una pedida que no corrió: ni verde ni roja, y completa:false');
  // Inestable: verde que falló una vez; una inestable que no es verde no se dice.
  r = resultados({ pedidas: ['a1x', 'b1x'], hechas: corrida([['a1x', true], ['b1x', false]]), inestables: ['a1x', 'b1x', 'a1x'] });
  ok(r.completa && r.inestables.join() === 'a1x' && r.verdes.includes('a1x'), 'inestable: verde y dicha una vez; una roja no es inestable');
  // Carril cortado (la pasada de guardianes del inicio en rojo): ninguna corrió y delCarril lo dice.
  r = resultados({ pedidas: ['a1x'], hechas: new Map(), delCarril: ['guardianes-inicio', 'guardianes-inicio'] });
  ok(!r.completa && !r.verdes.length && !r.rojas.length && r.delCarril.join() === 'guardianes-inicio', 'carril cortado: ni verdes ni rojas, delCarril y completa:false');
  // Un fallo del carril al final (todas corrieron): completa:false igual.
  r = resultados({ pedidas: ['a1x'], hechas: corrida([['a1x', true]]), delCarril: ['guardianes-final'] });
  ok(!r.completa && r.verdes.join() === 'a1x', 'un fallo del carril al final: completa:false aunque todas corrieron');
  // Detenida por una señal: completa:false aunque todas tengan resultado.
  r = resultados({ pedidas: ['a1x'], hechas: corrida([['a1x', true]]), detenida: true });
  ok(!r.completa && r.verdes.join() === 'a1x', 'detenida por una señal: completa:false');
  // La línea.
  const l = linea({ pedidas: ['a1x'], hechas: corrida([['a1x', false]]) });
  ok(/^RESULTADOS \{/.test(l) && JSON.parse(l.slice('RESULTADOS '.length)).rojas.join() === 'a1x', 'la línea: «RESULTADOS {json}»');
  console.log(`\n${bien}/${total} casos de la línea RESULTADOS`);
  return bien === total;
}

module.exports = { anotar, resultados, linea, casos };

if (require.main === module && process.argv.includes('--casos')) process.exit(casos() ? 0 : 1);
