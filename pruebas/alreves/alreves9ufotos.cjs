// Prueba al revés del guardián fotosConVariantes (Fotos a la medida, decisión AI, 20 nov): toda foto pública tiene sus variantes WebP de nombre fijo
// y nunca se ve una foto rota. Se inyecta el defecto, el guardián debe fallar con SU mensaje ([fotosConVariantes]); se restaura.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const G = 'fotosConVariantes', V = 'apps/web/lib/fotos-variantes.ts', NP = 'infra/pruebas/nginx-pruebas.conf', NQ = 'infra/produccion/nginx-produccion.conf';
const casos = [
  // Una ruta de subida pública que guarda la foto sin generar variantes.
  [G, 'apps/web/app/api/medios/route.ts', '  await guardarVariantes(id, img.data, img.info.width);\n', ''],
  [G, 'apps/web/app/api/negocio/video/route.ts', 'cp = `v/${id}.jpg`;', 'cp = `n/${id}.jpg`;'],
  // Variantes agrandadas, sin la calidad fija, con metadatos, o un fallo que tumba la subida.
  [G, V, 'const out: number[] = ANCHOS.filter((a) => a <= w);', 'const out: number[] = [...ANCHOS];'],
  [G, V, '.resize({ width, withoutEnlargement: true })', '.resize({ width })'],
  [G, V, '.webp({ quality: CALIDAD_WEBP, effort: 4 })', '.webp({ quality: 100 })'],
  [G, V, '.webp({ quality: CALIDAD_WEBP, effort: 4 }).toBuffer()', '.webp({ quality: CALIDAD_WEBP, effort: 4 }).keepMetadata().toBuffer()'],
  [G, V, '  } catch { return "fallo"; }\n}', '  } catch (e) { throw e; }\n}'],
  [G, V, 'export const ANCHOS = [320, 640, 1080, 1600] as const;', 'export const ANCHOS = [400, 800, 1600] as const;'],
  // Una copia de media sin lo anotado.
  [G, 'apps/web/lib/evt.ts', "sort, uploaded_by, bytes, var_widths, var_bytes, var_at)\n", "sort, uploaded_by)\n"],
  // nginx sin el respaldo o con la caché de un año en el respaldo; Cloudflare con un año fijo.
  [G, NP, '        error_page 404 = @tl_maestra;\n', ''],
  [G, NQ, '        if ($http_accept !~* "image/webp") { return 418; }\n', ''],
  [G, NQ, 'add_header Cache-Control "public, max-age=60" always;', 'add_header Cache-Control "public, max-age=31536000, immutable" always;'],
  [G, NP, '        proxy_intercept_errors on;\n', ''],
  [G, NP, '        rewrite ^(?:/medios)?/n/([0-9a-f-]+)\\.w[0-9]+\\.webp$ /n/$1.jpg break;\n', ''],
  [G, 'infra/produccion/cloudflare/reglas.json', '"edge_ttl": "origen"', '"edge_ttl": 31536000'],
  // El barrido sin la tarea, o con una consulta que no es la del índice parcial.
  [G, 'apps/web/lib/barrido.ts', '["fotosVariantes", async () => (await import("./fotos-variantes")).barrerVariantes()],', ''],
  [G, V, "where var_at is null and status = 'visible' and purged_at is null and url like '/medios/n/%.jpg' and created_at", "where var_at is null and purged_at is null and url like '/medios/n/%.jpg' and created_at"],
  [G, V, 'export const TANDA = 20;', 'export const TANDA = 5000;'],
  // La purga de una cuenta que deja sus variantes.
  [G, 'apps/web/lib/datos/purgar.ts', '    for (const v of clavesVariantes(clave, f.w, f.var_widths)) await borrarObjeto(v);\n', ''],
  // Las pruebas que lo prueban.
  [G, 'pruebas/lib/negocio-nuevo.cjs', "return r.s === 404 ? maestra('public, max-age=60') : { ...r, tipo: 'image/webp', cc: anio };", "return { ...r, tipo: 'image/webp', cc: anio };"],
  [G, 'pruebas/infra/correr.sh', 'bash pruebas/infra/medios-nginx.test.sh || mal=1', 'true'],
  [G, 'pruebas/e2e/fot9u.cjs', 'el barrido la convirtió', 'el barrido corrió'],
];
let bien = 0, total = 0;
const correr = (g) => {
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${g}]`)) ?? ''; return [!!l, l]; }
};
const informe = (g, que, [falla, out]) => { total++; console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (${que})${out ? ' → ' + out.trim().slice(0, 170) : ''}`); if (falla) bien++; };
for (const [g, f, a, b] of casos) {
  const ruta = path.join(R, f);
  if (!fs.existsSync(ruta)) { total++; console.log(`  ✗ no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(g); } finally { fs.writeFileSync(ruta, orig); }
  informe(g, f.split('/').pop(), r);
}
let limpio = true; try { execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); } catch (e) { limpio = false; console.log(String(e.stderr).slice(0, 600)); }
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
