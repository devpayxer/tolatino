// 9u · Todos los sitios `.query(` del código y qué se sabe de cada uno, SIN base ni servidor (solo lee el repo). Lo usan sql9u (PREPARE de las
// consultas que se pueden enumerar) y pruebas/lib/consultas-medir.cjs (cuántas, cuáles quedan fuera y cuáles ejecutó una corrida).
//
// Cada sitio sale con un `estado` (nunca se pierde uno: la suma de los estados es el total de sitios):
//   fija        un literal entero (`…`, '…' o "…") o armado SOLO con constantes de texto/números resolubles → su `sql` es lo que corre.
//   variantes   `cond ? <literal> : <literal>` (también anidado y con constantes): hay más de un texto posible y TODOS se enumeran en `sqls`.
//   lista       la consulta lleva `${…}` cuyo valor sale de una lista cerrada de trozos (ver enumerar()): se enumeran todas las combinaciones, en `sqls`.
//   armada      lleva `${…}` o `+` con algo que no se puede enumerar: `motivo` dice por qué (grupo) y `exprs` qué trozos.
//   nombre      `.query(x, …)` con x una variable que no es una constante de texto: la arma el código; `motivo` dice cómo.
//   noDatos     begin, commit, set, lock, listen… (no son de datos: no se prepara).
//   ajena       un `.query` que no es de Postgres (p. ej. `.query` de un objeto de URL).
// `sqls` (cuando hay) es la lista de textos que se pueden PREPARAR; para `fija` es [sql].
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');

// Lee un literal que empieza en t[i] (ya pasada su comilla q). Cada `${expr}` se le pide al resolvedor: devuelve la lista de textos que puede
// valer (una constante, la llamada a una función que arma un trozo con argumentos fijos, un ternario de textos…) o null si no se puede saber.
// El literal vale entonces el producto de todas las listas (`alts`, hasta MAX_ALTS). `exprs` junta las `${…}` que no se pudieron resolver.
const MAX_ALTS = 256;
function leer(t, i, q, resolver, prof = 0) {
  let alts = [''], armada = false, conPiezas = false, mucho = false; const exprs = [];
  for (; i < t.length; i++) {
    const ch = t[i];
    if (ch === '\\') { const sig = t[i + 1]; const c = sig === 'n' ? '\n' : sig === 't' ? '\t' : sig; alts = alts.map((a) => a + c); i++; continue; }
    if (q === '`' && ch === '$' && t[i + 1] === '{') {
      let k = i + 2, hondo = 1; for (; k < t.length && hondo; k++) { if (t[k] === '{') hondo++; else if (t[k] === '}') hondo--; }
      const expr = t.slice(i + 2, k - 1).trim(), v = prof < 8 ? resolver(expr, prof + 1) : null;
      if (v == null) { armada = true; exprs.push(expr); }
      else {
        conPiezas = true;
        if (alts.length * v.length > MAX_ALTS) { mucho = true; armada = true; exprs.push(expr); } else alts = alts.flatMap((a) => v.map((x) => a + x));
      }
      i = k - 1; continue;
    }
    if (ch === q) return { s: alts[0], alts, fin: i, armada, conPiezas, cerrada: true, exprs, mucho };
    if (q !== '`' && ch === '\n') break; // un literal de comillas no cruza líneas
    alts = alts.map((a) => a + ch);
  }
  return { s: alts[0], alts, fin: i, armada, conPiezas, cerrada: false, exprs, mucho };
}

// Salta espacios y comentarios (`// …` y `/* … */`): `.query(\n // nosemgrep: …\n \`select…\`` tiene el literal DESPUÉS del comentario.
function saltar(t, j) {
  for (;;) {
    while (j < t.length && /\s/.test(t[j])) j++;
    if (t[j] === '/' && t[j + 1] === '/') { while (j < t.length && t[j] !== '\n') j++; continue; }
    if (t[j] === '/' && t[j + 1] === '*') { const e = t.indexOf('*/', j + 2); j = e < 0 ? t.length : e + 2; continue; }
    return j;
  }
}

// Desde t[j] (dentro de una expresión) hasta el primer carácter de `stop` a profundidad 0 (fuera de paréntesis, llaves, corchetes, textos y comentarios).
// Devuelve su posición, o -1 si se acaba el texto (o se cierra algo que no se abrió y no es de `stop`). `angulos`: cuenta también < > (tipos genéricos).
function hastaNivel0(t, j, stop, angulos = false) {
  let p = 0;
  for (; j < t.length; j++) {
    const ch = t[j];
    if (ch === '"' || ch === "'" || ch === '`') { const r = leer(t, j + 1, ch, () => ['0']); j = r.fin; continue; }
    if (ch === '/' && t[j + 1] === '/') { while (j < t.length && t[j] !== '\n') j++; continue; }
    if (ch === '/' && t[j + 1] === '*') { const e = t.indexOf('*/', j + 2); j = e < 0 ? t.length : e + 1; continue; }
    if (ch === '(' || ch === '[' || ch === '{' || (angulos && ch === '<')) { p++; continue; }
    if (ch === ')' || ch === ']' || ch === '}' || (angulos && ch === '>' && t[j - 1] !== '=')) { if (!p) return stop.test(ch) ? j : -1; p--; continue; }
    if (!p && stop.test(ch)) {
      if (ch === '?' && (t[j + 1] === '?' || t[j + 1] === '.' || t[j - 1] === '?')) continue; // `??` y `?.` no son el ternario
      return j;
    }
  }
  return -1;
}
// El paréntesis que cierra al que se abre en t[i].
function cierra(t, i) { const k = hastaNivel0(t, i + 1, /\)/); return k; }
// Parte una lista de argumentos o de parámetros por las comas de nivel 0.
function partir(t, angulos = false) {
  const out = []; let d = 0;
  for (;;) { const k = hastaNivel0(t, d, /,/, angulos); if (k < 0) { out.push(t.slice(d)); break; } out.push(t.slice(d, k)); d = k + 1; }
  return out.map((x) => x.trim()).filter((x, i, a) => x || i < a.length - 1);
}

// Los sitios de todo el código → [{ f, linea, estado, sqls?, exprs?, motivo? }].
function sitios(raiz) {
  const archivos = execSync(`git ls-files -z --cached --others --exclude-standard -- 'apps/web/**/*.ts' 'apps/web/**/*.tsx' 'services/**/*.ts' 'scripts/**/*.mjs' 'scripts/**/*.ts'`, { cwd: raiz, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).split('\0').filter(Boolean).filter((f, i, a) => a.indexOf(f) === i && fs.existsSync(path.join(raiz, f)));
  const textos = new Map(), memoC = new Map(), memoD = new Map();
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
  const esc = (n) => n.replace(/\$/g, '\\$');
  // El lado derecho de `const NOMBRE = …;` en el archivo f (hasta el `;` de nivel 0), o null.
  const lado = (f, nombre) => {
    const t = texto(f); if (!t) return null;
    const m = new RegExp('(?:^|\\n)[ \\t]*(?:export\\s+)?const\\s+' + esc(nombre) + '\\s*(?::[^=\\n]+?)?=(?!=)\\s*').exec(t); if (!m) return null;
    const ini = m.index + m[0].length, fin = hastaNivel0(t, ini, /;/); return fin < 0 || fin - ini > 6000 ? null : t.slice(ini, fin);
  };
  // El valor de una constante: lo que puede valer su lado derecho (texto, número, otro nombre, un ternario…), o null.
  const constante = (f, nombre, prof) => {
    const k = f + '::' + nombre; if (memoC.has(k)) return memoC.get(k);
    memoC.set(k, null); // corta los ciclos
    let v = null; const rhs = lado(f, nombre);
    if (rhs != null) v = /^\s*(async\s*)?(\(|function\b)/.test(rhs) && /=>|function/.test(rhs.slice(0, 400)) ? null : ev(f, rhs, new Map(), prof + 1);
    else {
      const t = texto(f);
      // Un número fijo en una lista (`const A = 1, B = 30_000;`).
      const n = t && new RegExp(',\\s*' + esc(nombre) + '\\s*(?::\\s*number\\s*)?=\\s*(-?\\d[\\d_]*(?:\\.\\d+)?)\\s*[,;]').exec(t);
      if (n) v = [n[1].replace(/_/g, '')];
      else { const o = origenDe(f, nombre); if (o && prof < 8) v = constante(o.f, o.nombre, prof + 1); }
    }
    memoC.set(k, v); return v;
  };
  // La definición de una función que solo devuelve una expresión: `const F = (a: string, b = "x") => expr;` o `function F(a) { return expr; }`.
  const definicion = (f, nombre) => {
    const k = f + '::' + nombre; if (memoD.has(k)) return memoD.get(k);
    memoD.set(k, null);
    const t = texto(f); let d = null;
    if (t) {
      let params = null, cuerpo = null;
      const rhs = lado(f, nombre);
      if (rhs != null) {
        const r = rhs.replace(/^\s*async\s+/, '').trimStart();
        if (r[0] === '(') { const c = cierra(r, 0); if (c > 0) { params = r.slice(1, c); const m = /^\s*(?::[^=]*?)?=>\s*/.exec(r.slice(c + 1)); if (m) cuerpo = r.slice(c + 1 + m[0].length); } }
      } else {
        const m = new RegExp('(?:^|\\n)[ \\t]*(?:export\\s+)?function\\s+' + esc(nombre) + '\\s*\\(').exec(t);
        if (m) { const a = m.index + m[0].length - 1, c = cierra(t, a); if (c > 0) { params = t.slice(a + 1, c); const r = /^\s*(?::[^{]*?)?\{\s*/.exec(t.slice(c + 1)); if (r) cuerpo = '{' + t.slice(c + 1 + r[0].length - 0); const fin = cuerpo && hastaNivel0(cuerpo, 1, /\}/); cuerpo = fin > 0 ? cuerpo.slice(0, fin + 1) : null; } }
      }
      if (cuerpo != null) {
        cuerpo = cuerpo.trim();
        if (cuerpo[0] === '{') { const r = /^\{\s*return\s+([\s\S]*?);?\s*\}$/.exec(cuerpo); cuerpo = r && hastaNivel0(r[1], 0, /;/) < 0 ? r[1] : null; }
      }
      if (params != null && cuerpo) {
        const ps = partir(params, true).filter(Boolean).map((p) => {
          const m = /^([A-Za-z_$][\w$]*)/.exec(p); if (!m) return null;
          const resto = p.slice(m[0].length), e = hastaNivel0(resto, 0, /=/); return { n: m[1], def: e >= 0 ? resto.slice(e + 1).trim() : null };
        });
        if (ps.every(Boolean)) d = { f, ps, cuerpo };
      }
    }
    if (!d && t) { const o = origenDe(f, nombre); if (o) d = definicion(o.f, o.nombre); }
    memoD.set(k, d); return d;
  };
  // Un objeto o una lista escritos tal cual en una constante (`const F = { a: "…", b: "…" }`, `const L = ["x", "y"] as const`): sus partes en texto.
  const literalDe = (f, nombre, ab) => {
    const rhs = lado(f, nombre); if (rhs == null) { const o = origenDe(f, nombre); return o ? literalDe(o.f, o.nombre, ab) : null; }
    const r = rhs.trim().replace(/\s+as\s+const$/, '');
    const fin = hastaNivel0(r, 1, ab === '{' ? /\}/ : /\]/);
    // Una lista a la que el código le va agregando (`w.push(…)`) o un objeto que se completa después no es cerrado: no se enumera.
    const t = texto(f), cerrado = !new RegExp('\\b' + esc(nombre) + '(\\.(push|unshift|splice|pop|shift)\\(|\\[[^\\]]*\\]\\s*=[^=])').test(t) && r.slice(1, -1).trim() !== '';
    return cerrado && r[0] === ab && fin === r.length - 1 ? partir(r.slice(1, -1)) : null;
  };
  const objeto = (f, nombre) => {
    const ps = literalDe(f, nombre, '{'); if (!ps) return null;
    const o = new Map();
    for (const e of ps) { const m = /^(?:([A-Za-z_$][\w$]*)|"([^"]*)"|'([^']*)')\s*:\s*([\s\S]+)$/.exec(e); if (!m) return null; o.set(m[1] ?? m[2] ?? m[3], m[4].trim()); }
    return o;
  };
  const lista = (f, nombre) => literalDe(f, nombre, '[');
  // Lo que puede valer una expresión (lista de textos) o null si no se puede saber. `env`: parámetros de la función que se está desplegando
  // (una lista de textos, o `{ def }` si el parámetro es una función).
  function ev(f, expr, env, prof) {
    expr = expr.trim().replace(/\s+as\s+(const|string|number)$/, '');
    if (!expr || prof > 12) return null;
    if (expr[0] === '(' && cierra(expr, 0) === expr.length - 1) return ev(f, expr.slice(1, -1), env, prof + 1);
    const q0 = expr[0];
    if (q0 === '`' || q0 === '"' || q0 === "'") {
      const r = leer(expr, 1, q0, (e, p) => ev(f, e, env, p), prof);
      return r.cerrada && !r.armada && r.fin === expr.length - 1 ? r.alts : null;
    }
    if (/^-?\d[\d_]*(\.\d+)?$/.test(expr)) return [expr.replace(/_/g, '')];
    if (/^[A-Za-z_$][\w$]*$/.test(expr)) { const v = env.has(expr) ? env.get(expr) : constante(f, expr, prof); return Array.isArray(v) ? v : null; }
    // `a ?? b`: uno de los dos.
    const nn = hastaNivel0(expr, 0, /\?/);
    if (nn > 0 && expr[nn + 1] === '?') {
      const a = ev(f, expr.slice(0, nn), env, prof + 1), b = ev(f, expr.slice(nn + 2), env, prof + 1);
      return a && b ? [...new Set([...a, ...b])] : null;
    }
    const q = nn;
    if (q > 0) {
      const d = hastaNivel0(expr, q + 1, /:/); if (d < 0) return null;
      const a = ev(f, expr.slice(q + 1, d), env, prof + 1), b = ev(f, expr.slice(d + 1), env, prof + 1);
      return a && b ? [...new Set([...a, ...b])] : null;
    }
    // Aritmética de constantes (`POR_PAGINA + 1`).
    if (/^[\w$.\s+\-*/()]+$/.test(expr) && /[+\-*/]/.test(expr) && !/^[\w$.]+\s*\(/.test(expr)) {
      let bien = true;
      const num = expr.replace(/(^|[^\w$.])([A-Za-z_$][\w$]*)(?![\w$(.])/g, (_, pre, id) => { const v = env.has(id) ? env.get(id) : constante(f, id, prof + 1); if (!Array.isArray(v) || v.length !== 1 || !/^-?\d+(\.\d+)?$/.test(v[0])) { bien = false; return pre + '0'; } return pre + v[0]; });
      if (bien && /^[\d\s+\-*/().]+$/.test(num)) { try { const r = Function('"use strict";return (' + num + ')')(); if (Number.isFinite(r)) return [String(r)]; } catch { /* no es aritmética */ } }
      return null;
    }
    // `LISTA.map((x) => …).join("sep")` y `LISTA.join("sep")`, con LISTA escrita tal cual en una constante.
    let m = /^([A-Za-z_$][\w$]*)\.(map|join)\(/.exec(expr);
    if (m && !env.has(m[1])) {
      const ap = m[0].length - 1, c = cierra(expr, ap), el = lista(f, m[1]); if (c < 0 || !el) return null;
      let partes, resto = expr.slice(c + 1);
      if (m[2] === 'join') { if (resto.trim() !== '') return null; partes = el.map((x) => ev(f, x, env, prof + 1)); resto = '.join(' + expr.slice(ap + 1, c) + ')'; }
      else {
        const cb = /^\(?\s*([A-Za-z_$][\w$]*)\s*\)?\s*=>\s*([\s\S]+)$/.exec(expr.slice(ap + 1, c).trim()); if (!cb) return null;
        partes = el.map((x) => { const v = ev(f, x, env, prof + 1); if (!v || v.length !== 1) return null; return ev(f, cb[2], new Map([...env, [cb[1], v]]), prof + 1); });
      }
      const j = /^\.join\(([\s\S]*)\)$/.exec(resto.trim()); if (!j || partes.some((x) => !x || x.length !== 1)) return null;
      const sep = ev(f, j[1], env, prof + 1); if (!sep || sep.length !== 1) return null;
      return [partes.map((x) => x[0]).join(sep[0])];
    }
    // `OBJETO.parte`, `OBJETO[x]` (todos sus valores) y `OBJETO[x].parte`, con OBJETO escrito tal cual en una constante.
    m = /^([A-Za-z_$][\w$]*)(?:\.([A-Za-z_$][\w$]*)|\[([^\]]*)\])(?:\.([A-Za-z_$][\w$]*))?$/.exec(expr);
    if (m && !env.has(m[1])) {
      const o = objeto(f, m[1]); if (!o) return null;
      const clave = m[2] ?? (/^(["'])(.*)\1$/.exec((m[3] || '').trim())?.[2]);
      const textos = clave != null ? (o.has(clave) ? [o.get(clave)] : []) : [...o.values()];
      if (!textos.length) return null;
      const out = [];
      for (const x of textos) {
        let t2 = x;
        if (m[4]) { const sub = /^\{([\s\S]*)\}$/.exec(x.trim()); if (!sub) return null; const so = new Map(); for (const e of partir(sub[1])) { const k = /^([A-Za-z_$][\w$]*)\s*:\s*([\s\S]+)$/.exec(e); if (k) so.set(k[1], k[2]); } if (!so.has(m[4])) return null; t2 = so.get(m[4]); }
        const v = ev(f, t2, new Map(), prof + 1); if (!v) return null; out.push(...v);
      }
      return [...new Set(out)];
    }
    // `BASE.replace("a", "b")` con BASE y los dos textos fijos.
    m = /^([A-Za-z_$][\w$]*)\.replace\(/.exec(expr);
    if (m) {
      const ap = m[0].length - 1; if (cierra(expr, ap) !== expr.length - 1) return null;
      const base = ev(f, m[1], env, prof + 1), as = partir(expr.slice(ap + 1, -1)).map((x) => ev(f, x, env, prof + 1));
      if (!base || as.length !== 2 || as.some((x) => !x || x.length !== 1)) return null;
      return base.map((b) => b.replace(as[0][0], () => as[1][0]));
    }
    m = /^([A-Za-z_$][\w$]*)\s*\(/.exec(expr);
    if (m) {
      const ap = m[0].length - 1;
      if (cierra(expr, ap) !== expr.length - 1) return null;
      const r = env.get(m[1]), def = r && r.def ? r.def : env.has(m[1]) ? null : definicion(f, m[1]); if (!def) return null;
      const args = partir(expr.slice(ap + 1, -1)), env2 = new Map();
      for (let i = 0; i < def.ps.length; i++) {
        const p = def.ps[i], a = i < args.length ? args[i] : '';
        // Un argumento que es el nombre de una función (`slaCase(cfgSql)`): el parámetro se vuelve esa función.
        const fn = /^[A-Za-z_$][\w$]*$/.test(a) && !env.has(a) && constante(f, a, prof + 1) == null ? definicion(f, a) : null;
        const v = fn ? { def: fn } : a !== '' ? ev(f, a, env, prof + 1) : p.def != null ? ev(def.f, p.def, new Map(), prof + 1) : null;
        if (!v) return null; env2.set(p.n, v);
      }
      if (args.length > def.ps.length) return null;
      return ev(def.f, def.cuerpo, env2, prof + 1);
    }
    return null;
  }

  const res = [];
  for (const f of archivos) {
    const t = texto(f);
    const re = /\.query\b/g; let m;
    while ((m = re.exec(t))) {
      const linea = t.slice(0, m.index).split('\n').length, sitio = (estado, x = {}) => res.push({ f, linea, estado, ...x });
      // Tras `.query` puede venir el tipo (`<{ id: string; n: number }>`, con `;`, comillas y `=>` dentro): se salta contando < y >.
      let j = re.lastIndex;
      if (t[j] === '<') { let prof = 0; for (; j < t.length; j++) { if (t[j] === '<') prof++; else if (t[j] === '>' && t[j - 1] !== '=') { prof--; if (!prof) { j++; break; } } } }
      if (t[j] !== '(') { sitio('ajena', { motivo: 'no es una llamada' }); continue; }
      const a = saltar(t, j + 1), c0 = t[a];
      if (c0 === ')' || c0 === undefined) { sitio('ajena', { motivo: 'sin argumentos' }); continue; }
      const e = hastaNivel0(t, a, /[,)]/), arg = e < 0 ? '' : t.slice(a, e).replace(/\/\/[^\n]*/g, '').trim();
      const alts = arg ? ev(f, arg, new Map(), 0) : null;
      if (alts == null) {
        if (c0 === '`' || c0 === '"' || c0 === "'") {
          const r = leer(t, a + 1, c0, (x, p) => ev(f, x, new Map(), p));
          if (r.cerrada && !r.armada && /^\s*\+/.test(t.slice(r.fin + 1, r.fin + 12))) sitio('armada', { motivo: 'trozos con +', exprs: [] });
          else sitio('armada', { motivo: r.mucho ? 'demasiadas combinaciones' : 'trozos con ${…} que no se resuelven', exprs: r.exprs });
        } else if (/^[A-Za-z_$][\w$]*$/.test(arg)) sitio('nombre', { motivo: 'variable armada por el código', exprs: [arg] });
        else if (c0 === '{') sitio('armada', { motivo: 'consulta con objeto de configuración', exprs: [] });
        else sitio('armada', { motivo: 'llamada o expresión como consulta', exprs: [arg.replace(/\s+/g, ' ').slice(0, 80)] });
        continue;
      }
      const limpios = [...new Set(alts.map((x) => x.trim().replace(/;\s*$/, '')))];
      const datos = limpios.filter((x) => /^(select|with|insert|update|delete)\b/i.test(x));
      if (!datos.length) { sitio('noDatos', { sql: limpios[0].slice(0, 60) }); continue; }
      sitio(datos.length === 1 && limpios.length === 1 ? 'fija' : 'variantes', { sqls: datos });
    }
  }
  return { sitios: res, archivos: archivos.length };
}

// Por qué una consulta queda fuera de la comprobación (solo para el informe; la lista que se vigila cuenta por archivo).
function grupoDe(x) {
  if (x.estado === 'nombre') return 'la consulta entera es una variable que arma el código';
  if (x.motivo && /objeto de configuración|llamada o expresión/.test(x.motivo)) return 'la consulta se pasa como objeto o como llamada';
  const e = (x.exprs || []).join(' | ');
  if (/\.join\(|\.length|^(w|ww|wp|wT|wR|W|y|where|whereLista|whereCat|fm|extra|set|cond|resto|pre|base|desde|hasta|donde|fin|filas|cols|trozos|sql|s)\b/.test(e)) return 'condiciones o columnas que el código junta una a una (push/join) según los filtros';
  if (/^(col|tabla|campo|por|llave|casos|mod|kind|cola|contar|k|at|T|K|cur|sla|q\b)/.test(e) || /\bq\.|\bT\./.test(e)) return 'tabla, columna u orden elegidos en tiempo de ejecución (variable local o de un objeto que viene de fuera)';
  return 'trozo armado con una función que depende de datos del momento (centro, punto, radio, límites) o de importaciones dinámicas';
}

// Lo que queda sin comprobar, por archivo: { archivo: n }. La lista de lo aceptado vive en pruebas/consultas-fuera.json.
function fueraPorArchivo(ss) {
  const o = {};
  for (const x of ss) if (x.estado === 'armada' || x.estado === 'nombre') o[x.f] = (o[x.f] || 0) + 1;
  return Object.fromEntries(Object.entries(o).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}
// Compara con la lista aceptada: todo archivo con MÁS consultas sin comprobar que las aceptadas (o que no estaba) es un problema, y todo archivo con
// MENOS también (se baja el número: la lista no se queda vieja y no hay cupo para una nueva).
function comparar(actual, aceptado) {
  const mal = [];
  for (const [f, n] of Object.entries(actual)) {
    const a = aceptado[f] || 0;
    if (n > a) mal.push(`${f}: ${n - a} consulta(s) nueva(s) que NO se comprueba(n) (${n} armadas con \${…} o por variable; aceptadas ${a}). Escríbelas fijas, o armadas solo con constantes de texto y funciones de trozos con argumentos fijos (así las enumera el PREPARE de sql9u), o, si de verdad no se pueden, súbelas en pruebas/consultas-fuera.json con una prueba de punta a punta que las ejecute`);
  }
  for (const [f, a] of Object.entries(aceptado)) {
    const n = actual[f] || 0;
    if (n < a) mal.push(`${f}: ahora solo ${n} sin comprobar y la lista acepta ${a}: baja el número (o quita el archivo) en pruebas/consultas-fuera.json`);
  }
  return mal;
}
function aceptadas(raiz) {
  try { const j = JSON.parse(fs.readFileSync(path.join(raiz, 'pruebas', 'consultas-fuera.json'), 'utf8')); return j.archivos || {}; } catch { return null; }
}

module.exports = { sitios, leer, saltar, grupoDe, fueraPorArchivo, comparar, aceptadas };

// node pruebas/lib/consultas-sitios.cjs --informe   (los números y la lista de lo que queda fuera, agrupada)  ·  --lista  (el JSON de lo aceptado)
if (require.main === module) {
  const raiz = path.resolve(__dirname, '..', '..'), { sitios: ss, archivos } = sitios(raiz);
  if (process.argv.includes('--lista')) console.log(JSON.stringify({ nota: 'Consultas que consultas-sitios.cjs no puede enumerar (se arman con listas de condiciones, columnas elegidas en ejecución…): cuántas por archivo. Subir un número exige que una prueba de punta a punta ejecute esa consulta.', archivos: fueraPorArchivo(ss) }, null, 2));
  else {
    const c = {}; for (const x of ss) c[x.estado] = (c[x.estado] || 0) + 1;
    console.log(`archivos ${archivos} · sitios .query ${ss.length}:`, c);
    const g = {}; for (const x of ss) if (x.estado === 'armada' || x.estado === 'nombre') (g[grupoDe(x)] ??= []).push(x);
    for (const [k, v] of Object.entries(g)) { console.log(`\n## ${k}: ${v.length}`); const pf = {}; for (const x of v) (pf[x.f] ??= []).push(x.linea); for (const [f, ls] of Object.entries(pf)) console.log(`  ${f}: ${ls.join(', ')}`); }
  }
}
