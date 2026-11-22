// 22 nov · «Árbol idéntico» (revisión del CI, A2): la huella del árbol de trabajo, la copia de referencia y la restauración. La usa
// pruebas/correr.mjs en el carril «al revés»: toma la huella y la copia al empezar el carril y, tras CADA suite, compara la huella con la INICIAL;
// si difiere, la suite es roja nombrando los archivos y el corredor restaura desde la copia. Vive en el proceso del corredor (se carga al arrancar):
// una suite que siembra un defecto en este archivo no cambia la comparación de la corrida en curso.
// Qué entra en la huella (ver-a-garantias §2 y §9, condición 4):
// - cada archivo que hay en el disco, con sus bytes y su modo normalizado como git (644, 755 o enlace con su destino), sea con seguimiento, nuevo
//   o ignorado, y los que enumera «git ls-files -z --cached --others --exclude-standard» (también los que faltan, como «falta»);
// - las carpetas vacías (git no las ve; privacidadSalud revienta con una en packages/db/migrations);
// - HEAD, HEAD~1, origin/produccion y origin/pruebas resueltos (migracionReversible y produccionSoloAvanza los leen);
// - el entorno que leen los guardianes y lo que lanzan, la versión de Node (la del proceso y la del PATH) y la de TypeScript que resuelve.
// Fuera: node_modules, .git, .next, .turbo y .pnpm-store (dependencias y builds: ningún guardián los lee), y cualquier carpeta con su propio .git
// dentro (otra copia de trabajo, como .claude/worktrees/). Cualquier error al calcularla = no hay huella (quien llama lo trata como rojo).
// Nada de esto escribe en el árbol salvo restaurar(); lo apartado (archivos nuevos que dejó una suite) no se borra: va a la carpeta de la copia.
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { execFileSync } = require('child_process');

const SALTAR = new Set(['node_modules', '.git', '.next', '.turbo', '.pnpm-store']);
const REFS = ['HEAD', 'HEAD~1', 'refs/remotes/origin/produccion', 'refs/remotes/origin/pruebas'];
const VARIABLES = ['TOLATINO_FASE', 'GUARDIANES_SIN_TEXTOS', 'SABOR', 'TL_BUILD', 'TL_PRODUCCION', 'TOLATINO_URL', 'NODE_OPTIONS', 'NODE_PATH', 'GIT_DIR', 'GIT_INDEX_FILE', 'GIT_WORK_TREE'];
// Sin tomar el candado del índice (un «git add» de otra copia no cae por esto).
const GIT_ENV = () => ({ ...process.env, GIT_OPTIONAL_LOCKS: '0' });
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const enEl = (raiz, rel) => path.join(raiz, ...rel.split('/'));

function git(raiz, args) { return execFileSync('git', args, { cwd: raiz, env: GIT_ENV(), encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }); }

/* Un archivo: «644:<sha>», «755:<sha>», «l:<destino>» o «falta». */
function entrada(abs) {
  let st; try { st = fs.lstatSync(abs); } catch (e) { if (e.code === 'ENOENT' || e.code === 'ENOTDIR') return 'falta'; throw e; }
  if (st.isSymbolicLink()) return `l:${fs.readlinkSync(abs)}`;
  if (st.isDirectory()) return 'carpeta';
  if (!st.isFile()) return `raro:${st.mode.toString(8)}`;
  return `${st.mode & 0o100 ? '755' : '644'}:${sha(fs.readFileSync(abs))}`;
}

/* Recorre el disco: archivos (con su entrada) y carpetas vacías. */
function recorrer(raiz) {
  const archivos = new Map(), vacias = [], fuera = [];
  const ir = (rel) => {
    const abs = rel ? enEl(raiz, rel) : raiz;
    const hijos = fs.readdirSync(abs, { withFileTypes: true });
    if (!hijos.length && rel) vacias.push(rel);
    for (const h of hijos) {
      const r = rel ? `${rel}/${h.name}` : h.name;
      if (h.isDirectory()) {
        if (SALTAR.has(h.name)) continue;
        if (fs.existsSync(path.join(abs, h.name, '.git'))) { fuera.push(`${r}/`); continue; } // otra copia de trabajo o repo anidado
        ir(r);
      } else archivos.set(r, entrada(path.join(abs, h.name)));
    }
  };
  ir('');
  return { archivos, vacias: vacias.sort(), fuera };
}

let fijo = null;
/* Lo que no puede cambiar dentro de una corrida del corredor (su entorno): se calcula una vez. */
function entornoFijo() {
  if (fijo) return fijo;
  let nodePath = '-'; try { nodePath = execFileSync('node', ['--version'], { encoding: 'utf8' }).trim(); } catch { /* sin node en el PATH */ }
  fijo = { node: process.version, nodePath, variables: Object.fromEntries(VARIABLES.map((k) => [k, process.env[k] ?? null])) };
  return fijo;
}
function versionTs(raiz) {
  try { return JSON.parse(fs.readFileSync(require.resolve('typescript/package.json', { paths: [raiz] }), 'utf8')).version; } catch { return '-'; }
}

/* La huella. Devuelve { archivos: Map, vacias: [], refs: {}, otros: {}, digest }. Lanza si algo no se puede leer. */
function huella(raiz) {
  const { archivos, vacias, fuera } = recorrer(raiz);
  // Lo que git enumera y el recorrido no vio: un archivo con seguimiento que falta en el disco (entra como «falta»). Lo de las carpetas que se
  // saltan (dependencias, builds, otra copia de trabajo anidada) queda fuera también aquí.
  for (const rel of git(raiz, ['ls-files', '-z', '--cached', '--others', '--exclude-standard']).split('\0')) {
    if (!rel || archivos.has(rel) || rel.split('/').some((x) => SALTAR.has(x)) || fuera.some((f) => rel.startsWith(f))) continue;
    archivos.set(rel, entrada(enEl(raiz, rel)));
  }
  const refs = {};
  for (const r of REFS) { try { refs[r] = git(raiz, ['rev-parse', '--verify', '-q', `${r}^{commit}`]).trim(); } catch (e) { if (e.status === 1) refs[r] = '-'; else throw e; } }
  const otros = { ...entornoFijo(), typescript: versionTs(raiz) };
  const h = crypto.createHash('sha256');
  for (const k of [...archivos.keys()].sort()) h.update(`${k}\0${archivos.get(k)}\n`);
  h.update(`vacias\0${vacias.join('\0')}\nrefs\0${JSON.stringify(refs)}\notros\0${JSON.stringify(otros)}`);
  return { archivos, vacias, refs, otros, digest: h.digest('hex') };
}

/* Qué cambió de «a» (la inicial) a «b». Lista de { ruta, que } legible. */
function diferencias(a, b) {
  const d = [];
  for (const [k, v] of a.archivos) { const w = b.archivos.get(k); if (w === undefined) d.push({ ruta: k, que: 'ya no está' }); else if (w !== v) d.push({ ruta: k, que: w === 'falta' ? 'ya no está' : v === 'falta' ? 'apareció' : v.split(':')[0] !== w.split(':')[0] ? `modo ${v.split(':')[0]} → ${w.split(':')[0]}` : 'contenido distinto' }); }
  for (const [k, w] of b.archivos) if (!a.archivos.has(k) && w !== 'falta') d.push({ ruta: k, que: 'nuevo' });
  const va = new Set(a.vacias), vb = new Set(b.vacias);
  for (const k of vb) if (!va.has(k)) d.push({ ruta: `${k}/`, que: 'carpeta vacía nueva' });
  for (const k of va) if (!vb.has(k)) d.push({ ruta: `${k}/`, que: 'carpeta vacía que ya no está vacía o no está' });
  for (const r of REFS) if (a.refs[r] !== b.refs[r]) d.push({ ruta: `(git) ${r}`, que: `${a.refs[r].slice(0, 12)} → ${b.refs[r].slice(0, 12)}` });
  if (JSON.stringify(a.otros) !== JSON.stringify(b.otros)) d.push({ ruta: '(entorno)', que: `${JSON.stringify(a.otros)} → ${JSON.stringify(b.otros)}`.slice(0, 300) });
  return d.sort((x, y) => x.ruta.localeCompare(y.ruta));
}

/* La copia de referencia: cada archivo de la huella (no los que faltan) en <dir>/arbol, con su modo. Fuera del árbol. */
function copiar(raiz, h, dir) {
  const base = path.join(dir, 'arbol');
  fs.mkdirSync(base, { recursive: true });
  for (const [rel, v] of h.archivos) {
    if (v === 'falta' || v === 'carpeta') continue;
    const dst = enEl(base, rel);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    if (v.startsWith('l:')) fs.symlinkSync(v.slice(2), dst);
    else { fs.copyFileSync(enEl(raiz, rel), dst); fs.chmodSync(dst, v.startsWith('755') ? 0o755 : 0o644); }
  }
  fs.writeFileSync(path.join(dir, 'huella.json'), JSON.stringify({ digest: h.digest, vacias: h.vacias, refs: h.refs, otros: h.otros, archivos: Object.fromEntries(h.archivos) }));
  return base;
}

/* Lee una copia hecha por copiar() (para el arranque tras una corrida muerta). */
function leerCopia(dir) {
  const j = JSON.parse(fs.readFileSync(path.join(dir, 'huella.json'), 'utf8'));
  return { archivos: new Map(Object.entries(j.archivos)), vacias: j.vacias, refs: j.refs, otros: j.otros, digest: j.digest };
}

/* Lleva el árbol de vuelta a «ini» desde la copia de <dir>. Lo nuevo no se borra: se aparta a <dir>/apartados/<ruta> (y se dice dónde).
   Las referencias de git y el entorno no se tocan (si eso cambió, quien llama corta). Devuelve { restaurados, apartados, carpetas }. */
function restaurar(raiz, ini, dir) {
  const ahora = huella(raiz), base = path.join(dir, 'arbol'), out = { restaurados: [], apartados: [], carpetas: [] };
  for (const [rel, v] of ini.archivos) {
    const w = ahora.archivos.get(rel);
    if (w === v || v === 'carpeta') continue;
    const dst = enEl(raiz, rel);
    if (v === 'falta') { if (w && w !== 'falta') apartar(rel); continue; }
    let st = null; try { st = fs.lstatSync(dst); } catch { /* no está */ }
    if (st && st.isDirectory()) apartar(rel); // donde había un archivo ahora hay una carpeta
    else if (st) fs.unlinkSync(dst); // se reemplaza por la copia de referencia (su contenido sembrado no es trabajo de nadie: la suite lo escribió)
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    if (v.startsWith('l:')) fs.symlinkSync(v.slice(2), dst);
    else { fs.copyFileSync(enEl(base, rel), dst); fs.chmodSync(dst, v.startsWith('755') ? 0o755 : 0o644); }
    out.restaurados.push(rel);
  }
  for (const [rel, w] of ahora.archivos) if (!ini.archivos.has(rel) && w !== 'falta' && fs.existsSync(enEl(raiz, rel))) apartar(rel);
  function apartar(rel) {
    const src = enEl(raiz, rel), dst = enEl(path.join(dir, 'apartados'), rel);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    try { fs.renameSync(src, dst); } catch (e) { if (e.code !== 'EXDEV') throw e; fs.cpSync(src, dst, { recursive: true }); fs.rmSync(src, { recursive: true }); }
    out.apartados.push(rel);
  }
  // Carpetas: las vacías que faltan se crean; las vacías que sobran (y las que quedaron vacías al apartar) se quitan, de abajo arriba. Solo vacías.
  const ini_v = new Set(ini.vacias);
  for (const k of ini.vacias) if (!fs.existsSync(enEl(raiz, k))) { fs.mkdirSync(enEl(raiz, k), { recursive: true }); out.carpetas.push(`${k}/ (creada)`); }
  for (let vuelta = 0; vuelta < 64; vuelta++) {
    const sobran = recorrer(raiz).vacias.filter((k) => !ini_v.has(k));
    if (!sobran.length) break;
    for (const k of sobran) { fs.rmdirSync(enEl(raiz, k)); out.carpetas.push(`${k}/ (quitada, vacía)`); }
  }
  return out;
}

module.exports = { huella, diferencias, copiar, leerCopia, restaurar, entrada, sha, REFS, SALTAR };
