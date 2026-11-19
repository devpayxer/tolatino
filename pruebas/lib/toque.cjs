// 9t · Objetivos táctiles de 44 px, medidos sobre lo servido (packages/ui/src/toque.css). Lo usan a11y9c (e2e) y quien quiera revisar una pantalla.
//
// medirToque(p): por cada pieza del sistema con `data-toque`, el área que de verdad recibe el toque = su caja ∪ su ::after (lo que el navegador
//   resolvió: getComputedStyle(e, '::after') da top/right/bottom/left en px), recortada por los ancestros que recortan (overflow, respetando
//   el bloque contenedor de lo que es absolute/fixed). Devuelve:
//   · cortos   — miden menos de 44 en un eje sin razón: FALLA.
//   · vecinos  — miden menos porque el grupo tiene tope (--tl-toque-x/y = la mitad del hueco) y hay otro control a menos de 44 px en ese eje
//                (o con los 44 enteros se saldría de lo que lo recorta): la regla, bien.
//   · topeSinVecino — tope del grupo en un eje donde ESTE control no tiene vecino (un hijo del medio de una fila envuelta, sin nada debajo):
//                el tope es del contenedor y no sabe de qué lado está cada uno. Se informa (el primero y el último del grupo sí crecen enteros).
//   · pisan    — el área de uno cubre la caja de otro control o de un campo (le roba el toque) o dos áreas se cruzan: FALLA.
//   · sinArea  — `data-toque="sombra"` / `"recorte"`: piezas que se dejaron sin área ampliada porque volverlas position: relative cambiaba
//                pixeles (la sombra pasaba por encima del texto vecino; el suavizado de una esquina redondeada). Se informan; ampliarlas pide
//                el OK visual (docs/REVISION.md).
//   · recortados — el ::after queda cortado por un contenedor con overflow hidden: se informa.
//   · fuera    — su caja no se ve entera (dentro de un carrusel, fuera de la vista de su contenedor): no se mide.
//   · ajenos   — controles sin `data-toque` (de la pantalla, no del sistema) que miden menos de 44: solo se cuentan.
// toqueInvisible(p): la página CON las áreas y SIN ellas (se quita `data-toque` un momento y se vuelve a poner) es la misma pixel a pixel
//   junto a cada control con área (captura completa, con el foco del teclado en un control del sistema: el anillo tampoco cambia; solo se
//   tolera el suavizado de bordes, ver comparar y zonasDeToque) y nada que se desplaza cambia de largo (scrollWidth/scrollHeight del documento y de cada contenedor con scroll). Si no, FALLA.
const fs = require('fs');

const medirToque = (p) => p.evaluate(() => {
  const SEL = 'button,a[href],[role=button],[role=link],[role=tab],[role=radio],[role=checkbox],[role=switch],[role=option],[role=menuitem]';
  const MIN = 44, TOL = 0.5, INF = 1e9;
  const vis = (e) => e.getClientRects().length > 0 && e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().height > 0 && !e.closest('[aria-hidden=true],[inert]') && getComputedStyle(e).visibility !== 'hidden';
  const nombre = (e) => `<${e.tagName.toLowerCase()}${e.getAttribute('role') ? ' role=' + e.getAttribute('role') : ''}> «${(e.getAttribute('aria-label') || e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 28)}»`;
  const R = (r) => ({ l: r.left, t: r.top, r: r.right, b: r.bottom });
  const corta = (a, c) => ({ l: Math.max(a.l, c.l), t: Math.max(a.t, c.t), r: Math.min(a.r, c.r), b: Math.min(a.b, c.b) });
  const une = (a, c) => ({ l: Math.min(a.l, c.l), t: Math.min(a.t, c.t), r: Math.max(a.r, c.r), b: Math.max(a.b, c.b) });
  const w = (a) => Math.max(0, a.r - a.l), h = (a) => Math.max(0, a.b - a.t), area = (a) => w(a) * h(a);
  const dentro = (a, c) => a.l >= c.l - TOL && a.t >= c.t - TOL && a.r <= c.r + TOL && a.b <= c.b + TOL;
  // Lo que recorta a `e`: la intersección de las cajas de relleno de sus ancestros con overflow, sin contar los que un absolute/fixed salta.
  const recorte = (e) => {
    let c = { l: -INF, t: -INF, r: INF, b: INF }, modo = getComputedStyle(e).position, quien = null;
    for (let a = e.parentElement; a && a !== document.body && a !== document.documentElement; a = a.parentElement) {
      if (modo === 'fixed') break;
      const s = getComputedStyle(a);
      const contiene = s.position !== 'static' || s.transform !== 'none' || s.filter !== 'none' || /paint|layout|strict|content/.test(s.contain || '');
      if (modo === 'absolute' && !contiene) continue;
      if (s.overflowX !== 'visible' || s.overflowY !== 'visible') {
        const r = a.getBoundingClientRect(), x = r.left + a.clientLeft, y = r.top + a.clientTop, n = { ...c };
        if (s.overflowX !== 'visible') { c.l = Math.max(c.l, x); c.r = Math.min(c.r, x + a.clientWidth); }
        if (s.overflowY !== 'visible') { c.t = Math.max(c.t, y); c.b = Math.min(c.b, y + a.clientHeight); }
        if (c.l !== n.l || c.r !== n.r || c.t !== n.t || c.b !== n.b) quien = quien || { e: a, scroll: /(auto|scroll)/.test(s.overflowX + s.overflowY) };
      }
      modo = s.position === 'static' && contiene ? 'relative' : s.position;
    }
    return { c, quien };
  };
  // Los topes que tiene el ::after (toque.css): el del grupo (x/y, de su padre) y los de los lados (heredados). 22 px o nada = sin tope.
  const tope = (e, vars) => { const a = getComputedStyle(e, '::after'); return vars.map((v) => [v.replace('--tl-toque-', ''), parseFloat(a.getPropertyValue(v))]).filter(([, n]) => n < 22).map(([k, n]) => `${k} ${n}px`).join(', '); };
  const todos = [...document.querySelectorAll(SEL)].filter(vis);
  const info = todos.map((e) => {
    const r = R(e.getBoundingClientRect()), s = getComputedStyle(e);
    const bl = parseFloat(s.borderLeftWidth) || 0, bt = parseFloat(s.borderTopWidth) || 0, br = parseFloat(s.borderRightWidth) || 0, bb = parseFloat(s.borderBottomWidth) || 0;
    const pb = { l: r.l + bl, t: r.t + bt, r: r.r - br, b: r.b - bb };
    let halo = { ...r }, ideal = { ...r }, conAfter = false;
    if (e.getAttribute('data-toque') === '') {
      const a = getComputedStyle(e, '::after');
      if (a.content !== 'none' && a.position === 'absolute') {
        conAfter = true;
        halo = une(r, { l: pb.l + parseFloat(a.left), t: pb.t + parseFloat(a.top), r: pb.r - parseFloat(a.right), b: pb.b - parseFloat(a.bottom) });
      }
      const ex = Math.max(0, (MIN - w(pb)) / 2), ey = Math.max(0, (MIN - h(pb)) / 2);
      ideal = une(r, { l: pb.l - ex, t: pb.t - ey, r: pb.r + ex, b: pb.b + ey });
    }
    const { c, quien } = recorte(e);
    return { e, r, halo, ideal, conAfter, clip: c, quien, ef: corta(halo, c), id: corta(ideal, c), toque: e.getAttribute('data-toque'),
      topeX: tope(e, ['--tl-toque-x', '--tl-toque-izq', '--tl-toque-der']), topeY: tope(e, ['--tl-toque-y', '--tl-toque-arriba', '--tl-toque-abajo']) };
  });
  const rel = (a, c) => a.e.contains(c.e) || c.e.contains(a.e);
  // Los campos (escribir en uno no puede caer en el área del botón de al lado: «Borrar» junto al buscador).
  const campos = [...document.querySelectorAll('input:not([type=hidden]),select,textarea')].filter(vis).map((e) => ({ e, r: R(e.getBoundingClientRect()) }));
  const seCruzan = (a, c) => area(corta(a, c)) > TOL;
  const out = { controles: 0, cortos: [], vecinos: [], topeSinVecino: [], pisan: [], sinArea: [], recortados: [], fuera: 0, ajenos: 0, medidas: [] };
  for (const x of info) {
    if (x.toque === null) { if (w(x.r) < MIN - TOL || h(x.r) < MIN - TOL) out.ajenos++; continue; }
    out.controles++;
    if (!dentro(x.r, x.clip)) { out.fuera++; continue; }
    const W = w(x.ef), H = h(x.ef), etiqueta = `${nombre(x.e)} ${Math.round(w(x.r))}×${Math.round(h(x.r))} → ${Math.round(W)}×${Math.round(H)}`;
    out.medidas.push(etiqueta);
    // Robar toques: el área de este cubre la caja de otro control, o se cruza con el área de otro (las cajas de los dos, separadas).
    for (const o of info) {
      if (o === x || rel(x, o) || seCruzan(x.r, o.r)) continue;
      if (seCruzan(x.ef, o.r)) out.pisan.push(`${etiqueta} pisa la caja de ${nombre(o.e)}`);
      else if (o.toque !== null && o.e.compareDocumentPosition(x.e) & Node.DOCUMENT_POSITION_FOLLOWING && seCruzan(x.ef, o.ef)) out.pisan.push(`${etiqueta} y ${nombre(o.e)}: las dos áreas se cruzan (tope: la mitad del hueco)`);
    }
    for (const c of campos) if (!rel(x, c) && !seCruzan(x.r, c.r) && seCruzan(x.ef, c.r)) out.pisan.push(`${etiqueta} pisa el campo ${nombre(c.e)}`);
    if (W >= MIN - TOL && H >= MIN - TOL) continue;
    if (x.toque !== '') { out.sinArea.push(`${etiqueta} (${x.toque})`); continue; }
    if (!x.conAfter) { out.cortos.push(`${etiqueta}: sin ::after (¿falta toque.css?)`); continue; }
    // ¿Por qué no llega? Eje por eje: el tope del grupo (--tl-toque-x/y) o un contenedor que lo recorta.
    //  · tope con un vecino a menos de 44 px en ese eje (la regla: la mitad del hueco), o con los 44 enteros se saldría de lo que lo recorta → vecinos;
    //  · tope sin vecino ni borde → topeSinVecino (se informa);
    //  · sin tope, recortado por un overflow → recortados (se informa); · si no → cortos (FALLA).
    const ejes = [W < MIN - TOL ? 'x' : null, H < MIN - TOL ? 'y' : null].filter(Boolean);
    const veredicto = ejes.map((k) => {
      const tope = k === 'x' ? x.topeX : x.topeY;
      if (tope) {
        const banda = k === 'x' ? { l: x.r.l - MIN, r: x.r.r + MIN, t: x.r.t, b: x.r.b } : { l: x.r.l, r: x.r.r, t: x.r.t - MIN, b: x.r.b + MIN };
        const vecino = info.some((o) => o !== x && !rel(x, o) && !seCruzan(x.r, o.r) && seCruzan(banda, o.r));
        const sale = k === 'x' ? x.ideal.l < x.clip.l - TOL || x.ideal.r > x.clip.r + TOL : x.ideal.t < x.clip.t - TOL || x.ideal.b > x.clip.b + TOL;
        return vecino || sale ? ['vecinos', `${k}: tope ${tope}${vecino ? '' : ', borde'}`] : ['topeSinVecino', `${k}: tope ${tope} del grupo, sin vecino de este lado`];
      }
      const corte = k === 'x' ? x.halo.l < x.clip.l - TOL || x.halo.r > x.clip.r + TOL : x.halo.t < x.clip.t - TOL || x.halo.b > x.clip.b + TOL;
      if (corte && x.quien) return ['recortados', `${k}: lo recorta ${nombre(x.quien.e)}${x.quien.scroll ? ' (scroll)' : ''}`];
      return ['cortos', `${k}: sin tope ni recorte`];
    });
    const peor = ['cortos', 'topeSinVecino', 'recortados', 'vecinos'].find((g) => veredicto.some((v) => v[0] === g));
    out[peor].push(`${etiqueta} (${veredicto.map((v) => v[1]).join('; ')})`);
    continue;
  }
  return out;
});

// Lo que se desplaza: el documento y cada contenedor con scroll, en el orden del DOM (quitar el atributo no cambia el DOM).
const extensiones = (p) => p.evaluate(() => [document.scrollingElement || document.documentElement, ...document.querySelectorAll('body *')]
  .filter((e, i) => i === 0 || /(auto|scroll)/.test(getComputedStyle(e).overflowX + getComputedStyle(e).overflowY))
  .map((e) => `${e.tagName.toLowerCase()}${e.dataset && e.dataset.screenLabel ? '[' + e.dataset.screenLabel + ']' : ''} ${e.scrollWidth}×${e.scrollHeight}`));
const marcas = (p, poner) => p.evaluate((poner) => {
  if (!poner) { window.__toque = [...document.querySelectorAll('[data-toque]')].map((e) => [e, e.getAttribute('data-toque')]); for (const [e] of window.__toque) e.removeAttribute('data-toque'); return window.__toque.length; }
  for (const [e, v] of window.__toque || []) e.setAttribute('data-toque', v); const n = (window.__toque || []).length; window.__toque = null; return n;
}, poner);

// Dónde mirar: lo que el área de toque puede cambiar está junto a un control con área (su caja y 32 px alrededor: la sombra más larga del
// sistema llega a ~30 px). Fuera de ahí, una diferencia entre dos capturas es del navegador (19 nov, /sistema: el «0» de VoteBar, en una figura
// SIN controles, cambiaba de suavizado al cambiar las capas de otras figuras): se cuenta aparte y no falla. Coordenadas de la captura completa
// (la página arriba del todo; × devicePixelRatio).
const zonasDeToque = (p) => p.evaluate(() => {
  window.scrollTo(0, 0);
  const d = window.devicePixelRatio || 1, M = 32;
  return [...document.querySelectorAll('[data-toque=""]')].filter((e) => e.getClientRects().length > 0).map((e) => {
    const r = e.getBoundingClientRect();
    return [Math.floor((r.left - M) * d), Math.floor((r.top - M) * d), Math.ceil((r.right + M) * d), Math.ceil((r.bottom + M) * d)];
  });
});
// Dos capturas: pixelmatch con umbral 0,005 y su detector de suavizado (includeAA: false). Un control que pasa a position: relative se pinta
// en su propia capa y, en una posición fraccionaria, Chromium suaviza distinto los bordes de un ícono o de un borde redondeado (1–8 niveles
// de 255 en el BottomNav, los chips de PartyPicker, los votos: invisible) y deja diferencias de 1 nivel en zonas lisas: eso no cuenta. Lo que
// sí cuenta, aunque no se note a simple vista: la sombra del Button «action» pasando por encima del texto de abajo (75 pixeles distintos con
// 0,005 en /sistema a 390). Sin pngjs/pixelmatch (fuera del CI), solo byte a byte.
const UMBRAL = 0.005;
function comparar(a, b, zonas) {
  if (a.equals(b)) return { igual: true, distintos: 0, fuera: 0 };
  let PNG, pixelmatch; try { ({ PNG } = require('pngjs')); pixelmatch = require('pixelmatch'); } catch { return { igual: false, distintos: null, fuera: null, sinHerramientas: true }; }
  const x = PNG.sync.read(a), y = PNG.sync.read(b);
  if (x.width !== y.width || x.height !== y.height) return { igual: false, distintos: null, fuera: null, tamano: `${x.width}×${x.height} / ${y.width}×${y.height}` };
  const dif = new PNG({ width: x.width, height: x.height });
  pixelmatch(x.data, y.data, dif.data, x.width, x.height, { threshold: UMBRAL, diffMask: true });
  // Las zonas, por filas (para no recorrerlas una por una en cada pixel).
  const filas = new Map();
  for (const [x0, y0, x1, y1] of zonas) for (let yy = Math.max(0, y0); yy < Math.min(x.height, y1); yy++) { const f = filas.get(yy) || []; f.push([Math.max(0, x0), Math.min(x.width, x1)]); filas.set(yy, f); }
  let distintos = 0, fuera = 0, zona = null;
  for (let i = 0; i < dif.data.length; i += 4) {
    if (!(dif.data[i] === 255 && dif.data[i + 1] === 0 && dif.data[i + 2] === 0 && dif.data[i + 3] > 0)) continue;
    const q = i / 4, py = Math.floor(q / x.width), px = q % x.width;
    if ((filas.get(py) || []).some(([u, v]) => px >= u && px < v)) { distintos++; zona = zona ? [Math.min(zona[0], px), Math.min(zona[1], py), Math.max(zona[2], px), Math.max(zona[3], py)] : [px, py, px, py]; }
    else fuera++;
  }
  return { igual: distintos === 0, distintos, fuera, zona };
}

async function toqueInvisible(p, { nombre = 'pantalla', salida = null, foco = true } = {}) {
  // El anillo del foco en un control del sistema (Tab hasta llegar a uno; el anillo de :focus-visible sale con el teclado).
  if (foco) for (let i = 0; i < 40; i++) { if (await p.evaluate(() => !!(document.activeElement && document.activeElement.getAttribute('data-toque') === ''))) break; await p.keyboard.press('Tab'); }
  const zonas = await zonasDeToque(p);
  const cap = () => p.screenshot({ fullPage: true, animations: 'disabled', caret: 'hide' });
  for (let intento = 0; intento < 3; intento++) {
    const con = await cap(), eCon = await extensiones(p);
    const n = await marcas(p, false);
    let sin, eSin;
    try { sin = await cap(); eSin = await extensiones(p); } finally { await marcas(p, true); }
    const con2 = await cap();
    // La página se movió sola entre las dos capturas CON áreas (un reloj, una imagen que terminó de cargar) cerca de un control: otra vez.
    if (!comparar(con, con2, zonas).igual) { if (salida && process.env.TOQUE_DEPURAR) { fs.writeFileSync(`${salida}/toque-${nombre}-con.png`, con); fs.writeFileSync(`${salida}/toque-${nombre}-con2.png`, con2); } continue; }
    const scroll = eCon.map((x, i) => (x !== eSin[i] ? `${x} → sin áreas ${eSin[i]}` : null)).filter(Boolean);
    const c = comparar(con, sin, zonas);
    if (!c.igual && salida) { fs.writeFileSync(`${salida}/toque-${nombre}-con.png`, con); fs.writeFileSync(`${salida}/toque-${nombre}-sin.png`, sin); }
    return { marcas: n, zonas: zonas.length, ...c, scroll, estable: true };
  }
  return { marcas: 0, zonas: zonas.length, igual: false, distintos: null, fuera: null, scroll: [], estable: false };
}

module.exports = { medirToque, toqueInvisible };
