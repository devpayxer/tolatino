// Prueba al revés del guardián fotosAdjuntarTodoONada (22 nov): una acción que adjunta fotos por id (galería y portada del panel, la foto del equipo,
// los eventos) compara cuántas pidió con cuántas adjuntó y rechaza con su mensaje, deshaciendo todo el pedido. Se inyecta cada defecto (volver a
// contestar ok sin adjuntar, o adjuntar sin mirar el resultado) y el guardián debe fallar con SU mensaje ([guardián]); se restaura. Punta a punta: ayu4m.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const G = 'fotosAdjuntarTodoONada';
const A = 'apps/web/app/panel/acciones.ts', Q = 'apps/web/app/panel/acciones-equipo.ts', E = 'apps/web/lib/evt.ts';
const casos = [
  // Galería y portada: no comparar, no lanzar, no decirlo, no quitar repetidas, adjuntar sin contar.
  [A, '    if (puestas !== lista.length) throw new FotoNoAdjunta();\n', ''],
  [A, 'if (puestas !== lista.length) throw new FotoNoAdjunta();', 'if (puestas > lista.length) throw new FotoNoAdjunta();'],
  [A, 'if (puestas !== lista.length) throw new FotoNoAdjunta();', 'if (puestas !== lista.length) return "tope" as const;'],
  [A, 'if (e instanceof FotoNoAdjunta) return no("Una de las fotos ya no está. Súbela otra vez.", "One of the photos is gone. Upload it again.");', 'if (e instanceof FotoNoAdjunta) return { ok: true };'],
  [A, 'if (e instanceof FotoNoAdjunta) return no("Una de las fotos ya no está. Súbela otra vez.", "One of the photos is gone. Upload it again.");', 'if (e instanceof FotoNoAdjunta) return no("Esa foto no existe.", "That photo doesn’t exist.");'],
  [A, '[...new Set(ids.filter((x) => typeof x === "string" && UUID.test(x)))]', 'ids.filter((x) => typeof x === "string" && UUID.test(x))'],
  [A, '      puestas += (await c.query(`update media set owner_kind = \'business\'', '      await c.query(`update media set owner_kind = \'business\''],
  // La foto del equipo: ignorarla en silencio (la vacía), o rechazarla con otro texto.
  [Q, '        if (!photo) throw new FotoNoAdjunta();\n', ''],
  [Q, 'if (e instanceof FotoNoAdjunta) return no("Esa foto no existe.", "That photo doesn’t exist.");', 'if (e instanceof FotoNoAdjunta) return { ok: true };'],
  [Q, 'if (e instanceof FotoNoAdjunta) return no("Esa foto no existe.", "That photo doesn’t exist.");', 'if (e instanceof FotoNoAdjunta) return no("Esa foto ya no está.", "That photo is gone.");'],
  [Q, '        if (!photo) throw new FotoNoAdjunta();\n        await c.query(', '        if (photo) await c.query('],
  // Eventos.
  [E, '  if ((puestas.rowCount ?? 0) !== ids.length) throw new FotosAjenasEvt();', ''],
  [E, '  if (err instanceof FotosAjenasEvt) return no("Una de las fotos ya no está. Súbela otra vez.", "One of the photos is gone. Upload it again.");\n', ''],
  [E, '[...new Set(d.fotos.map((f) => f.id))]', 'd.fotos.map((f) => f.id)'],
  // Por clase: una función nueva que pasa fotos al negocio sin leer el resultado.
  [A, 'export async function fotosOrden(', 'export async function fotosNuevas(id: string, x: string) {\n  await tx(async (c) => {\n    await c.query(`update media set owner_kind = \'business\', owner_id = $1 where id = $2::uuid and owner_kind = \'user\' and status = \'visible\' and not rev_sin_c2 and not private`, [id, x]);\n  });\n}\nexport async function fotosOrden('],
];
let bien = 0, total = 0;
const correr = () => {
  try { execSync(`node guardianes/run.mjs --solo ${G}`, { cwd: R, stdio: 'pipe' }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${G}]`)) ?? ''; return [!!l, l]; }
};
for (const [f, a, b] of casos) {
  const ruta = path.join(R, f);
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(); } finally { fs.writeFileSync(ruta, orig); }
  total++; console.log(`  ${r[0] ? '✓' : '✗'} ${G} al revés (${f.split('/').pop()})${r[1] ? ' → ' + r[1].trim().slice(0, 170) : ''}`); if (r[0]) bien++;
}
const limpio = require('../lib/alreves-fin.cjs')(R, { mostrar: true });
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
