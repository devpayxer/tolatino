// 9t (19 nov) · Objetivos táctiles de 44 px, medidos sobre lo servido (LAUNCH «Objetivos táctiles de 44 px»).
// La decisión del fundador (19 nov): agrandar DE VERDAD lo que lo necesita (la caja de cada control mide ≥ 44 × 44; nada de áreas invisibles
// fuera de la caja). Dos intentos anteriores se revirtieron: un ::after fuera de la caja tapaba a vecinos de otros contenedores, y un área
// «decidida al tocar» no pasó a11y9c. Por eso aquí se miden tres cosas en cada pantalla:
//   - chicos(p):  cada control visible (botón, enlace, pestaña, radio, casilla, interruptor) mide ≥ 44 × 44, salvo lo de PERMITIDOS (cada
//                 regla con su razón; el guardián objetivosTactiles vigila que la lista sea corta y que cada una diga por qué);
//   - pisan(p):   ninguna caja le quita el toque a otro control: se toca (elementFromPoint) en nueve puntos de cada control, pantalla por
//                 pantalla bajando la página, y el que recibe el toque es él (o algo suyo) — no otro control que se le pone encima;
//   - (las pruebas usan además botonesQueNoCaben de caben.cjs y miran que la página no se mueva de lado, a 320 con letra grande).
const CONTROLES = '[role=button],[role=link],[role=tab],[role=radio],[role=checkbox],[role=switch],button,a[href]';

// Lo único que puede medir menos de 44. `regla` es el nombre de una prueba que corre en la página (abajo, en REGLAS).
const PERMITIDOS = [
  { regla: 'enTexto', por: 'Un enlace dentro de una oración: WCAG 2.5.8 lo exime (lo manda el alto del renglón; agrandarlo separa las líneas del párrafo).' },
  { regla: 'oculto', por: 'Fuera de la vista (solo para lectores de pantalla, 1 px o menos): nadie lo puede tocar.' },
];
// Las reglas, como texto para evaluarlas en la página (sin funciones que viajen por Playwright).
const REGLAS = {
  enTexto: "e.tagName === 'A' && e.parentElement && /^(P|SPAN|LI)$/.test(e.parentElement.tagName) && (e.parentElement.textContent || '').length > (e.textContent || '').length + 8",
  oculto: "r.width <= 1 || r.height <= 1",
};

const chicos = (p, min = 44) => p.evaluate(([SEL, REGLAS, min]) => {
  const reglas = Object.entries(REGLAS).map(([k, v]) => [k, new Function('e', 'r', 'return ' + v)]);
  const malos = [], permitidos = {}; let medidos = 0;
  for (const e of document.querySelectorAll(SEL)) {
    if (!e.getClientRects().length || e.closest('[aria-hidden=true],[inert]') || getComputedStyle(e).visibility === 'hidden') continue;
    const r = e.getBoundingClientRect(); medidos++;
    if (r.width >= min && r.height >= min) continue;
    const k = reglas.find(([, f]) => f(e, r));
    if (k) { permitidos[k[0]] = (permitidos[k[0]] || 0) + 1; continue; }
    const lab = e.closest('[data-screen-label]');
    malos.push(`«${(e.getAttribute('aria-label') || e.textContent || e.tagName).trim().replace(/\s+/g, ' ').slice(0, 28)}» ${Math.round(r.width)}×${Math.round(r.height)}${lab ? ' @' + lab.getAttribute('data-screen-label').slice(0, 30) : ''}`);
  }
  return { medidos, malos, permitidos };
}, [CONTROLES, REGLAS, min]);

const pisan = (p) => p.evaluate(async (SEL) => {
  const capa = (e) => { for (let x = e; x && x !== document.body; x = x.parentElement) { const s = getComputedStyle(x).position; if (s === 'fixed' || s === 'sticky') return x; } return null; };
  const nombre = (e) => `«${(e.getAttribute('aria-label') || e.textContent || e.tagName).trim().replace(/\s+/g, ' ').slice(0, 24)}»`;
  const malos = new Set(), H = innerHeight, W = innerWidth;
  const espera = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  for (let i = 0, y = 0; i < 40; i++, y += Math.round(H * 0.75)) {
    scrollTo(0, y); await espera();
    for (const b of document.querySelectorAll(SEL)) {
      if (!b.getClientRects().length || b.closest('[aria-hidden=true],[inert]')) continue;
      const r = b.getBoundingClientRect();
      if (r.width < 4 || r.height < 4 || r.bottom <= 0 || r.top >= H || r.right <= 0 || r.left >= W) continue;
      const cb = capa(b);
      for (const fx of [0.12, 0.5, 0.88]) for (const fy of [0.12, 0.5, 0.88]) {
        const x = r.left + r.width * fx, yy = r.top + r.height * fy;
        if (x < 0 || x >= W || yy < 0 || yy >= H) continue;
        const h = document.elementFromPoint(x, yy); if (!h) continue;
        const a = h.closest(SEL);
        if (!a || a === b || b.contains(a) || a.contains(b)) continue;
        if (capa(a) && capa(a) !== cb) continue; // el encabezado o la barra fija tapan lo que pasa por debajo al desplazar: no es una caja grande
        // Un botón puesto A PROPÓSITO encima de un control grande (Volver, Guardar y «3 FOTOS» sobre la foto de la ficha, que abre la galería):
        // va en una capa (position absolute) entre él y lo que comparten, cabe entero dentro de B y ocupa poco de B. Una caja agrandada que se
        // sale sobre un vecino (lo que se revirtió) no es nada de eso.
        { const ra = a.getBoundingClientRect(); let enCapa = false;
          for (let x2 = a; x2 && !x2.contains(b); x2 = x2.parentElement) if (getComputedStyle(x2).position === 'absolute') { enCapa = true; break; }
          if (enCapa && ra.left >= r.left - 1 && ra.right <= r.right + 1 && ra.top >= r.top - 1 && ra.bottom <= r.bottom + 1 && ra.width * ra.height <= 0.25 * r.width * r.height) continue; }
        // un control que B tapa en parte (B por debajo, recortado por un carrusel) no cuenta si el punto está fuera de lo que se ve de B
        let vis = true; for (let x2 = b.parentElement; x2 && x2 !== document.body; x2 = x2.parentElement) { const s = getComputedStyle(x2); if (/(auto|scroll|hidden|clip)/.test(s.overflowX + s.overflowY)) { const q = x2.getBoundingClientRect(); if (x < q.left || x > q.right || yy < q.top || yy > q.bottom) { vis = false; break; } } }
        if (vis) malos.add(`${nombre(a)} pisa a ${nombre(b)}`);
      }
    }
    if (y + H >= document.documentElement.scrollHeight) break;
  }
  scrollTo(0, 0);
  return [...malos];
}, CONTROLES);

// Lo de DENTRO de un control no se sale de su caja hacia los lados sin que nada lo recorte: con los botones a 44, a 320 con letra grande el
// nombre «To’Latino» del encabezado se salía de su caja y se dibujaba encima de «ES» (la caja medía bien; lo que se veía, no).
const desbordan = (p) => p.evaluate((SEL) => {
  const malos = [];
  for (const e of document.querySelectorAll(SEL)) {
    if (!e.getClientRects().length || e.closest('[aria-hidden=true],[inert]')) continue;
    const r = e.getBoundingClientRect(); if (r.width < 2) continue;
    if (/(hidden|clip|auto|scroll)/.test(getComputedStyle(e).overflowX)) continue;
    const w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT); let n, peor = 0;
    while ((n = w.nextNode())) {
      if (!n.textContent.trim()) continue;
      let recorta = false; for (let x = n.parentElement; x && x !== e; x = x.parentElement) if (/(hidden|clip|auto|scroll)/.test(getComputedStyle(x).overflowX)) { recorta = true; break; }
      if (recorta) continue;
      const g = document.createRange(); g.selectNodeContents(n); const q = g.getBoundingClientRect();
      if (q.width) peor = Math.max(peor, q.right - r.right, r.left - q.left);
    }
    if (peor > 1.5) malos.push(`«${(e.getAttribute('aria-label') || e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 24)}» se sale ${Math.round(peor)} px de su caja`);
  }
  return malos;
}, CONTROLES);

// 21 nov · «Al escribir hace zoom en el teléfono» (pedido del fundador): Safari de iPhone agranda la página al enfocar un campo cuya letra mide
// menos de 16 px. En pantallas táctiles la regla de globals.css pone todo campo de texto a 16. Aquí se mide sobre lo servido, en ESTA pantalla:
//   - cada campo de texto visible (input de texto, textarea, select) mide 16 px o más;
//   - ninguno quedó ACHICADO por la regla: con la regla apagada (html[data-sin-campo16], solo para esto) se lee la letra que el campo traía; si
//     traía más de 16 y ahora mide menos que eso, le falta data-letra-propia.
// tactil: false cuando el navegador no dice (pointer: coarse); quien llama decide si eso es un fallo (en teléfono de Chromium, sí).
const CAMPOS = 'input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]):not([type=color]):not([type=hidden]),textarea,select';
const campos = (p) => p.evaluate((SEL) => {
  const tactil = matchMedia('(pointer: coarse)').matches, R = document.documentElement;
  const E = [...document.querySelectorAll(SEL)].filter((e) => e.getClientRects().length && !e.closest('[aria-hidden=true],[inert]') && getComputedStyle(e).visibility !== 'hidden');
  const dice = (e) => `«${(e.getAttribute('aria-label') || e.getAttribute('placeholder') || e.getAttribute('name') || e.tagName).trim().slice(0, 28)}»`;
  const ahora = E.map((e) => parseFloat(getComputedStyle(e).fontSize));
  R.setAttribute('data-sin-campo16', '');
  const traia = E.map((e) => parseFloat(getComputedStyle(e).fontSize));
  R.removeAttribute('data-sin-campo16');
  const chicos = [], achicados = [];
  E.forEach((e, i) => {
    if (ahora[i] < 16) chicos.push(`${dice(e)} ${ahora[i]} px`);
    if (traia[i] > 16 && ahora[i] < traia[i]) achicados.push(`${dice(e)} traía ${traia[i]} px y quedó en ${ahora[i]}`);
  });
  return { tactil, medidos: E.length, chicos, achicados, subidos: E.filter((_, i) => traia[i] < 16 && ahora[i] >= 16).length };
}, CAMPOS);

module.exports = { CONTROLES, PERMITIDOS, REGLAS, CAMPOS, chicos, pisan, desbordan, campos };
