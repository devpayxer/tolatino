// 9u · Toda consulta FIJA del código se le pasa a Postgres con PREPARE contra la base de pruebas (con todas las migraciones): la analiza y le pone
// tipos SIN ejecutarla. Caza la clase «una consulta que ninguna prueba corre llega rota al sandbox»:
//   - «Asignar a…» de Colas (14–21 nov): `… || ' · ' || r.name->>'es'` → «operator does not exist: text ->> unknown».
//   - «Mi casa», actualizar una casa en una dirección que ya tenía una: 15 valores y la consulta no usaba $1 ni $2 →
//     «could not determine data type of parameter $1» (el cliente de la app manda los parámetros sin tipo: falla igual que PREPARE).
//   - y cualquier columna, tabla, función u operador que no exista, o una coma de más.
// Qué entra: el primer argumento de `.query(` cuando es UN literal (`…`, '…' o "…") sin `${…}`, y es select / with / insert / update / delete.
// Qué NO entra (se cuenta y se dice): las consultas armadas con `${…}` (LAUNCH: «consultas que ninguna prueba ejecuta») y lo que no es de datos
// (begin, set, lock…). No toca datos: PREPARE no ejecuta; cada una se suelta con DEALLOCATE.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync, spawnSync } = require('child_process');
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };

// Lee un literal que empieza en t[i] (ya pasada su comilla q). Un `${X}` con X = el nombre de una constante de texto (del mismo archivo o importada por
// su nombre de un archivo del repo) se sustituye por su valor; cualquier otra expresión deja la consulta como «armada» (no se puede saber qué corre).
function leer(t, i, q, resolver, prof = 0) {
  let s = '', armada = false, conPiezas = false;
  for (; i < t.length; i++) {
    const ch = t[i];
    if (ch === '\\') { const sig = t[i + 1]; s += sig === 'n' ? '\n' : sig === 't' ? '\t' : sig; i++; continue; }
    if (q === '`' && ch === '$' && t[i + 1] === '{') {
      let k = i + 2, hondo = 1; for (; k < t.length && hondo; k++) { if (t[k] === '{') hondo++; else if (t[k] === '}') hondo--; }
      const expr = t.slice(i + 2, k - 1).trim(), v = /^[A-Za-z_$][\w$]*$/.test(expr) && prof < 6 ? resolver(expr, prof + 1) : null;
      if (v == null) armada = true; else { s += v; conPiezas = true; }
      i = k - 1; continue;
    }
    if (ch === q) return { s, fin: i, armada, conPiezas, cerrada: true };
    if (q !== '`' && ch === '\n') break; // un literal de comillas no cruza líneas
    s += ch;
  }
  return { s, fin: i, armada, conPiezas, cerrada: false };
}

function consultas(raiz) {
  const archivos = execSync(`git ls-files 'apps/web/**/*.ts' 'apps/web/**/*.tsx' 'services/**/*.ts' 'scripts/**/*.mjs' 'scripts/**/*.ts'`, { cwd: raiz, encoding: 'utf8' }).split('\n').filter(Boolean);
  const textos = new Map(), memo = new Map();
  const texto = (f) => { if (!textos.has(f)) { let x = null; try { x = fs.readFileSync(path.join(raiz, f), 'utf8'); } catch { /* no está */ } textos.set(f, x); } return textos.get(f); };
  // De dónde sale un nombre importado: `import { X, Y as Z } from "./otro"` o "@/lib/…" (el alias de apps/web).
  const origenDe = (f, nombre) => {
    const t = texto(f); if (!t) return null;
    for (const m of t.matchAll(/import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*["']([^"']+)["']/g)) {
      for (const pieza of m[1].split(',')) { const [orig, alias] = pieza.trim().replace(/^type\s+/, '').split(/\s+as\s+/); if ((alias || orig) !== nombre) continue;
        const base = m[2].startsWith('@/') ? path.join('apps/web', m[2].slice(2)) : m[2].startsWith('.') ? path.join(path.dirname(f), m[2]) : null; if (!base) return null;
        for (const ext of ['.ts', '.tsx', '/index.ts']) if (texto(base + ext) != null) return { f: base + ext, nombre: orig };
        return null; }
    }
    return null;
  };
  // El valor de una constante de texto (`const X = \`…\``), o null si no es un literal o lleva algo que no se puede resolver.
  const valor = (f, nombre, prof) => {
    const k = f + '::' + nombre; if (memo.has(k)) return memo.get(k);
    memo.set(k, null); // corta los ciclos
    const t = texto(f); let v = null;
    if (t) {
      const m = new RegExp('(?:^|\\n)\\s*(?:export\\s+)?const\\s+' + nombre.replace(/\$/g, '\\$') + '\\s*(?::\\s*string\\s*)?=\\s*([`\'"])').exec(t);
      // Solo si la constante ES el literal (termina ahí): `const por = "usuario" in quien ? … : …` empieza con comillas y no es un texto fijo.
      if (m) { const r = leer(t, m.index + m[0].length, m[1], (n, p) => valor(f, n, p), prof); v = r.cerrada && !r.armada && /^\s*(;|\r?\n|$)/.test(t.slice(r.fin + 1, r.fin + 40)) ? r.s : null; }
      else {
        // Un número fijo (`const HORAS_LLAVE = 23;`, también en una lista `const A = 1, B = 30_000;`) entra con su valor.
        const n = new RegExp('(?:\\bconst\\s+|,\\s*)' + nombre.replace(/\$/g, '\\$') + '\\s*(?::\\s*number\\s*)?=\\s*(-?\\d[\\d_]*(?:\\.\\d+)?)\\s*[,;]').exec(t);
        if (n) v = n[1].replace(/_/g, '');
        else {
          // Otro nombre para la misma constante (`export const HORAS_LLAVE_STRIPE = HORAS_LLAVE;`), o una importada.
          const al = new RegExp('\\bconst\\s+' + nombre.replace(/\$/g, '\\$') + '\\s*=\\s*([A-Za-z_$][\\w$]*)\\s*;').exec(t);
          if (al && prof < 6) v = valor(f, al[1], prof + 1);
          else { const o = origenDe(f, nombre); if (o) v = valor(o.f, o.nombre, prof); }
        }
      }
    }
    memo.set(k, v); return v;
  };
  const out = []; let armadas = 0, otras = 0, resueltas = 0;
  for (const f of archivos) {
    const t = texto(f);
    const re = /\.query\b/g; let m;
    while ((m = re.exec(t))) {
      // Tras `.query` puede venir el tipo (`<{ id: string; n: number }>`, con `;`, comillas y `=>` dentro): se salta contando < y >.
      let j = re.lastIndex;
      if (t[j] === '<') { let prof = 0; for (; j < t.length; j++) { if (t[j] === '<') prof++; else if (t[j] === '>' && t[j - 1] !== '=') { prof--; if (!prof) { j++; break; } } } }
      const resto = t.slice(j, j + 400), ab = /^\(\s*([`'"])/.exec(resto), porNombre = ab ? null : /^\(\s*([A-Za-z_$][\w$]*)\s*[,)]/.exec(resto);
      let sql, conPiezas = false;
      if (ab) {
        const r = leer(t, j + ab[0].length, ab[1], (n, p) => valor(f, n, p));
        if (r.armada) { armadas++; continue; }
        if (!r.cerrada) continue;
        // Un literal seguido de `+` es una consulta armada por trozos: no es fija.
        if (/^\s*\+/.test(t.slice(r.fin + 1, r.fin + 12))) { armadas++; continue; }
        sql = r.s; conPiezas = r.conPiezas;
      } else if (porNombre) {
        // `.query(TOCA_PLAN, […])`: la consulta entera es una constante de texto.
        const v = valor(f, porNombre[1], 1); if (v == null) continue;
        sql = v; conPiezas = true;
      } else continue;
      sql = sql.trim().replace(/;\s*$/, '');
      if (!/^(select|with|insert|update|delete)\b/i.test(sql)) { otras++; continue; }
      if (conPiezas) resueltas++;
      out.push({ f, linea: t.slice(0, m.index).split('\n').length, sql });
    }
  }
  return { out, dinamicas: armadas, otras, resueltas };
}

(async () => {
  const { out, dinamicas, otras, resueltas } = consultas(ENT.RAIZ);
  // Que de verdad corrió: el código tiene miles de consultas fijas; un extractor roto que encuentra pocas no puede dar verde.
  ok(out.length > 4500, `consultas encontradas: ${out.length}, de ellas ${resueltas} armadas solo con constantes de texto (resueltas); armadas con algo más, que no entran: ${dinamicas}; que no son de datos: ${otras}`);
  // El guion: cada consulta en sus líneas (se anota de cuál a cuál) para saber a quién le toca cada error (psql lo da con su número de línea).
  let guion = '\\set ON_ERROR_STOP off\n', n = 1;
  for (const q of out) {
    const trozo = `deallocate all;\nprepare q as ${q.sql};\n`;
    q.desde = n + 1; n += trozo.split('\n').length - 1; q.hasta = n;
    guion += trozo;
  }
  guion += '\\echo @@sql9u-fin@@\n';
  const r = spawnSync('docker', ['exec', '-i', ENT.DB, 'psql', '-U', 'tolatino', '-d', 'tolatino', '-q', '-v', 'VERBOSITY=terse', '-f', '-'], { input: guion, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  ok(r.status === 0 && (r.stdout || '').includes('@@sql9u-fin@@'), 'psql recorrió el guion entero contra la base de pruebas');
  const errores = [...(r.stderr || '').matchAll(/^psql:<stdin>:(\d+): ERROR:\s*(.*)$/gm)].map((m) => ({ l: Number(m[1]), msg: m[2] }));
  const nErr = ((r.stderr || '').match(/ERROR:/g) || []).length;
  const malas = errores.map((e) => { const q = out.find((x) => e.l >= x.desde && e.l <= x.hasta); return `${q ? `${q.f}:${q.linea}` : `línea ${e.l} del guion`} · ${e.msg}`; });
  for (const m of malas) console.log('  ✗ ' + m);
  ok(nErr === 0, `las ${out.length} consultas fijas preparan en Postgres (errores: ${nErr}${malas.length ? ' · ' + malas.slice(0, 5).join(' | ') : ''})`);
  console.log('SQL9U OK');
})().catch((e) => { console.error(String(e && e.message || e).slice(0, 1500)); process.exit(1); });
