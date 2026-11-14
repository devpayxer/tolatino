// Prueba al revés de los guardianes de 9e (lo legal: el texto solo en docs/legal/, nada publicado sin el abogado en producción, aceptar es de solo
// inserción y una vez, los dos idiomas). Se inyecta el defecto, el guardián debe fallar con SU mensaje ([nombre]); se restaura. «crear»: se crea
// el archivo, se corre y se borra. Con TOLATINO_FASE=9, un borrador en docs/legal/ también falla.
const ENT = require('../lib/entorno.cjs'); // rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const M = 'packages/db/migrations/0135_legal.sql', L = 'apps/web/lib/legal.ts', X = 'scripts/legal/indexar.mjs', SEM = 'infra/pruebas/semilla/0053_legal.sql',
  TE = 'docs/legal/us/terminos.es.md', TN = 'docs/legal/us/terminos.en.md', RT = 'apps/web/app/(app)/cookies/page.tsx', PL = 'apps/web/app/(app)/_legal/PaginaLegal.tsx';
const casos = [
  // legalRevisado: la base deja publicar sin revisión, la base es «pruebas» sin la semilla, la app publica sin revisión en producción, el indexador publica
  ['legalRevisado', M, "if new.reviewed_by_counsel is null and legal_entorno() <> 'pruebas' then", "if false and legal_entorno() <> 'pruebas' then"],
  ['legalRevisado', M, "where key = 'entorno'), 'produccion')", "where key = 'entorno'), 'pruebas')"],
  ['legalRevisado', L, 'if (ENTORNO === "produccion" && !v.reviewed_by_counsel) return { ok: false', 'if (false) return { ok: false'],
  ['legalRevisado', X, "out.push(\"commit;\");", "out.push(\"update legal_pages set status = 'publicado';\"); out.push(\"commit;\");"],
  // legalUnaFuente: una página sin su inglés, una ruta que escribe el texto a mano, la página que no lee de lib/legal, un enlace de afuera
  ['legalUnaFuente', TN, '## Who we are', '## Who we are\n## Extra'],
  ['legalUnaFuente', RT, '  return <PaginaLegal clave="cookies" searchParams={searchParams} />;', '  return <main><h1>Cookies</h1><p>To\'Latino usa solo las cookies que necesita para funcionar y ninguna de publicidad ni de terceros en ninguna de sus páginas web ni apps.</p></main>;'],
  ['legalUnaFuente', PL, 'paginaPara({ userId', 'paginaDe({ userId'],
  ['legalUnaFuente', TE, '[Soporte](/soporte). [pendiente: dirección', '[Soporte](https://otro.example/soporte). [pendiente: dirección'],
  // libroSoloInsercion: aceptar se puede cambiar, se anota más de una vez, el libro se puede borrar
  ['libroSoloInsercion', M, "if tg_op <> 'INSERT' then raise exception 'legal_acceptances es solo de inserción'; end if;", "if tg_op = 'DELETE' then raise exception 'legal_acceptances es solo de inserción'; end if;"],
  ['libroSoloInsercion', M, "create unique index if not exists legal_acceptances_una_vez on legal_acceptances (user_id, coalesce(business_id, ''), page_key, jurisdiction, version);", "create index if not exists legal_acceptances_una_vez on legal_acceptances (user_id);"],
  ['libroSoloInsercion', M, "create trigger legal_page_log_no_cambia before update or delete on legal_page_log", "create trigger legal_page_log_no_cambia before update on legal_page_log"],
  // idioma: la página en inglés con otras secciones
  ['idioma', TN, '## Contact\n', '## Contact\n## Extra\nMore.\n'],
];
const crear = [
  // legalRevisado: el código escribe la fila «entorno» (solo la semilla del sandbox)
  ['legalRevisado', 'apps/web/lib/zz9e.ts', 'import "server-only";\nexport const q = `insert into platform_config (key, value) values (\'entorno\', \'"pruebas"\')`;\n'],
  // legalUnaFuente: un componente que copia un párrafo de los Términos
  ['legalUnaFuente', 'apps/web/app/zz9e.tsx', 'export const T = "To\'Latino muestra los negocios y te ayuda a pedir, reservar o pagar. Cada negocio es quien vende, presta el servicio y responde por lo que ofrece";\n'],
  // libroSoloInsercion: otro archivo que anota aceptaciones o las borra
  ['libroSoloInsercion', 'apps/web/lib/zz9e.ts', 'import "server-only";\nexport const q = `delete from legal_acceptances where user_id = $1`;\n'],
  // idioma: una página sin su inglés
  ['idioma', 'docs/legal/us/votos.zz.md', ''],
];
let bien = 0, total = 0;
const correr = (g, env = {}) => {
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe', env: { ...process.env, ...env } }); return [false, '']; }
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
  const ruta = path.join(R, f), dir = path.dirname(ruta), nuevo = !fs.existsSync(dir);
  // «votos.zz.md»: un archivo con otro idioma no cuenta como página; para «sin su inglés» se mueve el .en.md un momento.
  if (f.endsWith('.zz.md')) {
    const en = path.join(R, 'docs/legal/us/votos.en.md'), tmp = en + '.fuera';
    fs.renameSync(en, tmp);
    let r; try { r = correr(g); } finally { fs.renameSync(tmp, en); }
    informe(g, 'votos sin su inglés', r); continue;
  }
  fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(ruta, c);
  let r; try { r = correr(g); } finally { fs.unlinkSync(ruta); if (nuevo) try { fs.rmdirSync(dir); } catch { /* no vacía */ } }
  informe(g, `crear ${f.split('/').pop()}`, r);
}
// Con TOLATINO_FASE=9 (la apertura), un texto que sigue en BORRADOR rompe el build.
informe('legalRevisado', 'BORRADOR con TOLATINO_FASE=9', correr('legalRevisado', { TOLATINO_FASE: '9' }));
// La semilla del sandbox es la única que dice «pruebas» (si no existiera, la base sería producción): existe y solo en infra/pruebas/semilla.
total++; if (fs.existsSync(path.join(R, SEM)) && /'entorno', '"pruebas"'/.test(fs.readFileSync(path.join(R, SEM), 'utf8'))) { bien++; console.log('  ✓ la semilla del sandbox marca la base como «pruebas»'); } else console.log('  ✗ falta la semilla 0053 con «entorno» = pruebas');
let limpio = true; try { execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); } catch (e) { limpio = false; console.log(String(e.stderr).slice(0, 600)); }
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
if (bien !== total || !limpio) process.exit(1);
