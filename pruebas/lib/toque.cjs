// 9t · Objetivos táctiles de 44 px, medidos sobre lo servido (packages/ui/src/toque.ts: el toque del dedo que cae en nada tocable, junto a un
// control, es de ese control). Lo usan a11y9c (e2e) y alreves9ttoque2 (al revés). Todo se mide en la pantalla tal como el navegador la tiene
// (elementFromPoint: lo que de verdad recibe el toque) bajando la página de a una vista:
//
// medirToque(p) → por cada control en la vista (button, a[href], los roles de control):
//   · pisan     — un toque en la caja de un control o de un campo que NO es suyo: lo recibe otro control fuera de su propia caja (un ::after
//                 agrandado, lo que se revirtió el 19 nov) o el área ampliada se lo da a otro. FALLA siempre (es la clase que rompió el CI).
//   · cortos    — un control de menos de 44 px cuya área de 44 × 44 (su caja agrandada lo que le falta, repartido a los dos lados) tiene
//                 puntos que no son de nadie sin razón (sin área de toque, o se le cortó sin vecino). FALLA en el teléfono.
//   · limitados — puntos de su área que son de otro por una razón: la caja de un vecino o un campo, un vecino más cercano (cada uno su mitad
//                 del hueco), otra capa (una hoja, un encabezado fijo), lo de debajo tiene acción propia (la fila que abre el plato), tapado
//                 o fuera de la vista. Se informan.
//   · completos — los que reciben el toque en sus 44 × 44 enteros (o ya miden 44).
// tocarJunto(p) → un toque REAL con el dedo (touchscreen.tap) en un punto del área ampliada de un control, fuera de su caja: el clic le llega
//   a ese control (y solo a él: el del navegador se descarta); un toque en la caja de otro control es de ese otro. El clic se detiene antes de
//   que haga nada (no cambia la pantalla).
// toqueInvisible(p) → la página con el área de toque y con ella en pausa es la misma pixel a pixel y no cambia lo que se desplaza (no pinta
//   nada; si algún día alguien la vuelve a hacer con estilos, esto lo caza).
const fs = require('fs');

const medirToque = (p) => p.evaluate(async () => {
  const T = window.__tlToque;
  const CONTROLES = 'button,a[href],[role=button],[role=link],[role=tab],[role=radio],[role=checkbox],[role=switch],[role=option],[role=menuitem]';
  const CAMPOS = 'input:not([type=hidden]),select,textarea';
  const MIN = 44, TOL = 0.5;
  const out = { instalado: !!(T && T.version === 2 && typeof T.destinos === 'function'), vistas: 0, controles: 0, completos: 0, cortos: [], limitados: {}, pisan: [], cubiertos: 0, medidas: [] };
  const vis = (e) => e.getClientRects().length > 0 && !e.closest('[aria-hidden=true],[inert]') && getComputedStyle(e).visibility !== 'hidden';
  const nombre = (e) => `<${e.tagName.toLowerCase()}${e.getAttribute('role') ? ' role=' + e.getAttribute('role') : ''}> «${(e.getAttribute('aria-label') || e.textContent || e.getAttribute('placeholder') || '').trim().replace(/\s+/g, ' ').slice(0, 28)}»`;
  // Con 1,5 px de holgura: elementFromPoint redondea a la grilla del dispositivo (un punto 0,6 px por encima de un ícono le pega al ícono).
  const contiene = (e, x, y) => [...e.getClientRects()].some((r) => x >= r.left - 1.5 && x <= r.right + 1.5 && y >= r.top - 1.5 && y <= r.bottom + 1.5);
  const destinos = (pts) => (out.instalado ? T.destinos(pts) : pts.map(() => ({ el: null, razon: 'sin área de toque (no está instalada)' })));
  const vistos = new Set(), pisanVisto = new Set();
  const espera = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const raiz = document.scrollingElement || document.documentElement;
  const alto = () => raiz.scrollHeight;
  window.scrollTo(0, 0); await espera();
  for (let paso = 0; paso < 14; paso++) {
    out.vistas++;
    const W = innerWidth, H = innerHeight;
    const enVista = (r) => r.right > 0 && r.bottom > 0 && r.left < W && r.top < H;
    const ctrls = [...document.querySelectorAll(CONTROLES)].filter(vis);
    const todos = [...new Set([...ctrls, ...document.querySelectorAll(CAMPOS)])].filter(vis);
    // ── pisan: la caja de cada control y de cada campo (5 × 5 puntos adentro) es de él ──
    const pts = [], dueno = [];
    for (const o of todos) {
      const r = o.getBoundingClientRect(); if (!enVista(r) || r.width < 2 || r.height < 2) continue;
      for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
        const x = r.left + 1 + (r.width - 2) * i / 4, y = r.top + 1 + (r.height - 2) * j / 4;
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const h = document.elementFromPoint(x, y); if (!h) continue;
        if (h === o || o.contains(h)) { pts.push([x, y]); dueno.push(o); continue; }
        const hc = h.closest(CONTROLES + ',' + CAMPOS);
        if (hc && hc !== o && !o.contains(hc) && !hc.contains(o) && !contiene(h, x, y) && !contiene(hc, x, y)) {
          const k = nombre(hc) + '|' + nombre(o); if (!pisanVisto.has(k)) { pisanVisto.add(k); out.pisan.push(`${nombre(hc)} recibe el toque en la caja de ${nombre(o)}, fuera de su propia caja (${Math.round(x)}, ${Math.round(y)}; lo de debajo: <${h.tagName.toLowerCase()}> ${[...h.getClientRects()].map((q) => [q.left, q.top, q.width, q.height].map(Math.round).join(',')).join(' ')}; la caja: ${[...hc.getClientRects()].map((q) => [q.left, q.top, q.width, q.height].map(Math.round).join(',')).join(' ')})`); }
        } else out.cubiertos++; // lo tapa algo que se ve encima (una hoja, el encabezado fijo): el toque es de lo que se ve
      }
    }
    destinos(pts).forEach((d, i) => {
      if (d.el && d.el !== dueno[i]) { const k = nombre(d.el) + '|' + nombre(dueno[i]); if (!pisanVisto.has(k)) { pisanVisto.add(k); out.pisan.push(`el área de toque le da a ${nombre(d.el)} un toque en la caja de ${nombre(dueno[i])} (${Math.round(pts[i][0])}, ${Math.round(pts[i][1])})`); } }
    });
    // ── el área de 44 × 44 de cada control chico, en el borde de afuera y a mitad del área, cada 3 px ──
    for (const c of ctrls) {
      if (vistos.has(c)) continue;
      const r = c.getBoundingClientRect();
      if (r.left < 0 || r.top < 0 || r.right > W || r.bottom > H) continue; // entero en la vista (si no, en otra vista)
      const h0 = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2);
      if (!h0 || !(h0 === c || c.contains(h0))) continue; // tapado (bajo una hoja, el encabezado): se mide donde se ve
      vistos.add(c); out.controles++;
      const ex = Math.max(0, (MIN - r.width) / 2), ey = Math.max(0, (MIN - r.height) / 2);
      const etiqueta = `${nombre(c)} ${Math.round(r.width)}×${Math.round(r.height)}`;
      if (!ex && !ey) { out.completos++; continue; }
      const E = { l: r.left - ex, t: r.top - ey, rr: r.right + ex, b: r.bottom + ey };
      const anillo = [];
      for (const f of [0.02, 0.5]) { // el borde de afuera del área y la mitad del agregado
        const l = r.left - ex * (1 - f), t = r.top - ey * (1 - f), rr = r.right + ex * (1 - f), b = r.bottom + ey * (1 - f);
        for (let x = l; x <= rr; x += 3) { anillo.push([x, t], [x, b]); }
        for (let y = t; y <= b; y += 3) { anillo.push([l, y], [rr, y]); }
      }
      const fuera = anillo.filter(([x, y]) => !(x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) && x >= E.l && x <= E.rr && y >= E.t && y <= E.b);
      const ds = destinos(fuera);
      const razones = {};
      fuera.forEach(([x, y], i) => {
        let k;
        if (x < 0 || y < 0 || x >= W || y >= H) k = 'fuera de la vista';
        else {
          const h = document.elementFromPoint(x, y), d = ds[i];
          if (h && (h === c || c.contains(h))) return; // de él (un hijo que se sale de la caja)
          if (d.el === c) return; // de él por el área ampliada
          if (h && h.closest(CONTROLES + ',' + CAMPOS)) k = 'la caja de un vecino';
          else if (d.el) k = 'un vecino más cercano';
          else if (/^(vecino|empate)/.test(d.razon) || (d.quien && d.quien !== c && !c.contains(d.quien))) k = 'un vecino más cercano';
          else if (/^otra capa/.test(d.razon)) k = 'otra capa (hoja, encabezado fijo)';
          else if (d.razon === 'clicable') k = 'lo de debajo tiene acción propia';
          else if (d.razon === 'propio') k = 'algo accionable debajo (etiqueta, lienzo…)';
          else if (d.razon === 'inerte') k = 'inerte';
          else k = 'CORTO: ' + d.razon;
        }
        razones[k] = (razones[k] || 0) + 1;
      });
      const ks = Object.keys(razones);
      if (!ks.length) { out.completos++; continue; }
      const corto = ks.find((k) => k.startsWith('CORTO'));
      const txt = `${etiqueta}: ${ks.map((k) => `${k} (${razones[k]} de ${fuera.length})`).join(', ')}`;
      if (corto) out.cortos.push(txt);
      else for (const k of ks) (out.limitados[k] = out.limitados[k] || []).push(etiqueta);
      out.medidas.push(txt);
    }
    if (raiz.scrollTop + innerHeight >= alto() - 2) break;
    window.scrollBy(0, Math.round(innerHeight * 0.8)); await espera();
  }
  window.scrollTo(0, 0); await espera();
  return out;
});

// Un toque real con el dedo junto a un control chico (en su área, fuera de su caja) y otro en la caja de un control: a quién le llega el clic.
// Los clics se detienen en la ventana (después de que el área de toque decide), así que nada cambia en la pantalla.
async function tocarJunto(p) {
  let cand = null;
  await p.evaluate(() => window.scrollTo(0, 0));
  // Bajando la página de a una vista hasta encontrar un control chico con área libre (muchos están dentro de filas que ya hacen algo).
  for (let paso = 0; paso < 14 && !cand; paso++) {
    if (paso) { const fin = await p.evaluate(() => { const r = document.scrollingElement || document.documentElement; if (r.scrollTop + innerHeight >= r.scrollHeight - 2) return true; window.scrollBy(0, Math.round(innerHeight * 0.8)); return false; }); if (fin) break; await p.waitForTimeout(150); }
    cand = await buscarJunto(p);
  }
  if (!cand) { await p.evaluate(() => window.scrollTo(0, 0)); return { probado: false }; }
  const r = await tocarEn(p, cand);
  await p.evaluate(() => window.scrollTo(0, 0));
  return r;
}
const buscarJunto = (p) => p.evaluate(() => {
    const T = window.__tlToque; if (!T) return null;
    const CONTROLES = 'button,a[href],[role=button],[role=link],[role=tab],[role=radio],[role=checkbox],[role=switch],[role=option],[role=menuitem]';
    const W = innerWidth, H = innerHeight;
    for (const c of document.querySelectorAll(CONTROLES)) {
      const r = c.getBoundingClientRect();
      if (r.width <= 0 || r.top < 60 || r.left < 0 || r.right > W || r.bottom > H - 60 || (r.width >= 44 && r.height >= 44)) continue;
      const ey = Math.max(0, (44 - r.height) / 2), ex = Math.max(0, (44 - r.width) / 2);
      for (const [x, y] of [[(r.left + r.right) / 2, r.bottom + ey * 0.6], [(r.left + r.right) / 2, r.top - ey * 0.6], [r.right + ex * 0.6, (r.top + r.bottom) / 2], [r.left - ex * 0.6, (r.top + r.bottom) / 2]]) {
        if ((x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) || x < 0 || y < 0 || x >= W || y >= H) continue;
        const d = T.destino(x, y);
        if (d.el !== c) continue;
        // Y otro control con caja en la vista para el segundo toque.
        const o = [...document.querySelectorAll(CONTROLES)].find((z) => { if (z === c || z.contains(c) || c.contains(z)) return false; const q = z.getBoundingClientRect(); const h = document.elementFromPoint((q.left + q.right) / 2, (q.top + q.bottom) / 2); return q.width > 4 && q.height > 4 && q.top > 60 && q.bottom < H - 60 && q.left >= 0 && q.right <= W && h && (h === z || z.contains(h)); });
        if (!o) continue;
        c.setAttribute('data-toque-prueba', 'c'); o.setAttribute('data-toque-prueba', 'o');
        const q = o.getBoundingClientRect();
        window.__toqueClics = [];
        window.__toqueEscucha = (e) => { const t = e.target instanceof Element ? e.target : null; const z = t && t.closest('[data-toque-prueba]'); window.__toqueClics.push({ a: z ? z.getAttribute('data-toque-prueba') : null, real: e.isTrusted }); e.preventDefault(); e.stopImmediatePropagation(); };
        window.addEventListener('click', window.__toqueEscucha, true);
        const n = (e) => `<${e.tagName.toLowerCase()}${e.getAttribute('role') ? ' role=' + e.getAttribute('role') : ''}> «${(e.getAttribute('aria-label') || e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 24)}»`;
        return { x, y, ox: (q.left + q.right) / 2, oy: (q.top + q.bottom) / 2, c: `${n(c)} ${Math.round(r.width)}×${Math.round(r.height)}`, o: n(o) };
      }
    }
    return null;
  });
async function tocarEn(p, cand) {
  const leer = () => p.evaluate(() => { const v = window.__toqueClics || []; window.__toqueClics = []; return v; });
  await p.touchscreen.tap(cand.x, cand.y); await p.waitForTimeout(150);
  const junto = await leer();
  await p.waitForTimeout(800); // pasa la ventana en que se descarta el clic del navegador
  await p.touchscreen.tap(cand.ox, cand.oy); await p.waitForTimeout(150);
  const encima = await leer();
  await p.evaluate(() => { window.removeEventListener('click', window.__toqueEscucha, true); for (const e of document.querySelectorAll('[data-toque-prueba]')) e.removeAttribute('data-toque-prueba'); });
  return { probado: true, ...cand, junto, encima };
}

// Lo que se desplaza: el documento y cada contenedor con scroll.
const extensiones = (p) => p.evaluate(() => [document.scrollingElement || document.documentElement, ...document.querySelectorAll('body *')]
  .filter((e, i) => i === 0 || /(auto|scroll)/.test(getComputedStyle(e).overflowX + getComputedStyle(e).overflowY))
  .map((e) => `${e.tagName.toLowerCase()}${e.dataset && e.dataset.screenLabel ? '[' + e.dataset.screenLabel + ']' : ''} ${e.scrollWidth}×${e.scrollHeight}`));

async function toqueInvisible(p, { nombre = 'pantalla', salida = null } = {}) {
  const cap = () => p.screenshot({ fullPage: true, animations: 'disabled', caret: 'hide' });
  const pausa = (v) => p.evaluate((v) => { if (!window.__tlToque) return false; window.__tlToque.pausar(v); return true; }, v);
  for (let intento = 0; intento < 3; intento++) {
    const con = await cap(), eCon = await extensiones(p);
    if (!(await pausa(true))) return { estable: true, igual: false, sinArea: true, scroll: [] };
    let sin, eSin;
    try { sin = await cap(); eSin = await extensiones(p); } finally { await pausa(false); }
    const con2 = await cap();
    if (!con.equals(con2)) continue; // la página se movió sola (un reloj, una imagen que terminó de cargar): otra vez
    const scroll = eCon.map((x, i) => (x !== eSin[i] ? `${x} → en pausa ${eSin[i]}` : null)).filter(Boolean);
    const igual = con.equals(sin);
    if (!igual && salida) { fs.writeFileSync(`${salida}/toque-${nombre}-con.png`, con); fs.writeFileSync(`${salida}/toque-${nombre}-sin.png`, sin); }
    return { estable: true, igual, scroll, bytes: con.length };
  }
  return { estable: false, igual: false, scroll: [] };
}

module.exports = { medirToque, tocarJunto, toqueInvisible };
