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

function consultas(raiz) {
  const archivos = execSync(`git ls-files 'apps/web/**/*.ts' 'apps/web/**/*.tsx' 'services/**/*.ts' 'scripts/**/*.mjs' 'scripts/**/*.ts'`, { cwd: raiz, encoding: 'utf8' }).split('\n').filter(Boolean);
  const out = []; let dinamicas = 0, otras = 0;
  for (const f of archivos) {
    const t = fs.readFileSync(path.join(raiz, f), 'utf8');
    const re = /\.query\b/g; let m;
    while ((m = re.exec(t))) {
      // Tras `.query` puede venir el tipo (`<{ id: string; n: number }>`, con `;`, comillas y `=>` dentro): se salta contando < y >.
      let j = re.lastIndex;
      if (t[j] === '<') { let prof = 0; for (; j < t.length; j++) { if (t[j] === '<') prof++; else if (t[j] === '>' && t[j - 1] !== '=') { prof--; if (!prof) { j++; break; } } } }
      const ab = /^\(\s*([`'"])/.exec(t.slice(j, j + 400));
      if (!ab) continue;
      const q = ab[1]; let i = j + ab[0].length, s = '', dyn = false, cerrada = false;
      for (; i < t.length; i++) {
        const ch = t[i];
        if (ch === '\\') { const sig = t[i + 1]; s += sig === 'n' ? '\n' : sig === 't' ? '\t' : sig; i++; continue; }
        if (q === '`' && ch === '$' && t[i + 1] === '{') { dyn = true; break; }
        if (ch === q) { cerrada = true; break; }
        if (q !== '`' && ch === '\n') break; // un literal de comillas no cruza líneas: no era una consulta
        s += ch;
      }
      if (dyn) { dinamicas++; continue; }
      if (!cerrada) continue;
      // Un literal seguido de `+` es una consulta armada por trozos: no es fija.
      if (/^\s*\+/.test(t.slice(i + 1, i + 12))) { dinamicas++; continue; }
      const sql = s.trim().replace(/;\s*$/, '');
      if (!/^(select|with|insert|update|delete)\b/i.test(sql)) { otras++; continue; }
      out.push({ f, linea: t.slice(0, m.index).split('\n').length, sql });
    }
  }
  return { out, dinamicas, otras };
}

(async () => {
  const { out, dinamicas, otras } = consultas(ENT.RAIZ);
  // Que de verdad corrió: el código tiene miles de consultas fijas; un extractor roto que encuentra pocas no puede dar verde.
  ok(out.length > 4500, `consultas fijas encontradas: ${out.length} (armadas con \${…} que no entran: ${dinamicas}; que no son de datos: ${otras})`);
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
