// 19 nov · Botones que no caben en su caja. En la ficha Pro, «Cómo llegar» (122 px) iba en un tercio de 111 px a 390: se salía del margen, y con
// letra grande en el iPhone SE la página se movía de lado. La página no tenía scroll (el borde no llegaba a la ventana), así que «sin scroll de
// lado» no lo veía. Esto mira cada botón visible: su caja no pasa la de su contenedor (salvo los rieles que se desplazan).
const botonesQueNoCaben = (p) => p.evaluate(() => {
  const malos = [];
  for (const e of document.querySelectorAll('button, [role="button"]')) {
    const a = e.getBoundingClientRect(); if (!a.width || !a.height) continue;
    let pa = e.parentElement; while (pa && getComputedStyle(pa).display === 'contents') pa = pa.parentElement; if (!pa) continue;
    if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(pa).overflowX)) continue;
    const r = pa.getBoundingClientRect();
    if (a.right > r.right + 1.5 || a.left < r.left - 1.5) malos.push(`«${(e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 28)}» ${Math.round(a.width)} px en ${Math.round(r.width)}`);
  }
  return malos;
});

// 23 nov · La ficha ya no tiene la fila de tres botones: ahora puede desbordar «Contactar» (junto al estado), los renglones de la hoja y los
// botones del escritorio. botonesQueNoCaben mira cada botón contra la caja de su padre, pero un envoltorio flex-none crece con su botón y no
// lo delata: estas dos miran contra la VENTANA y contra la propia caja del botón.
// · botonesFueraDeLaVentana: ningún botón visible (fuera de los rieles que se desplazan) pasa el borde de la ventana ni queda debajo de 0.
const botonesFueraDeLaVentana = (p) => p.evaluate(() => {
  const malos = [], W = window.innerWidth;
  for (const e of document.querySelectorAll('button, [role="button"], [role="tab"]')) {
    const a = e.getBoundingClientRect(); if (!a.width || !a.height) continue;
    let riel = false; for (let q = e.parentElement; q && q !== document.body; q = q.parentElement) { if (/(auto|scroll)/.test(getComputedStyle(q).overflowX) && q.scrollWidth > q.clientWidth + 1) { riel = true; break; } }
    if (riel) continue;
    if (a.right > W + 1.5 || a.left < -1.5) malos.push(`«${(e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 28)}» de ${Math.round(a.left)} a ${Math.round(a.right)} en ${W}`);
  }
  return malos;
});
// · contenidoSeSale(p, selector): lo que hay dentro de cada elemento que cumple el selector (renglones de la hoja, fila del estado, cabecera)
//   no pasa de la caja del elemento: un texto largo se corta con elipsis (su caja queda dentro), no empuja.
const contenidoSeSale = (p, selector) => p.evaluate((sel) => {
  const malos = [];
  for (const e of document.querySelectorAll(sel)) {
    const r = e.getBoundingClientRect(); if (!r.width) continue;
    for (const h of e.querySelectorAll('*')) {
      const a = h.getBoundingClientRect(); if (!a.width || !a.height) continue;
      if (a.right > r.right + 1.5 || a.left < r.left - 1.5) malos.push(`${h.tagName.toLowerCase()} «${(h.textContent || '').trim().slice(0, 24)}» de ${Math.round(a.left)} a ${Math.round(a.right)} en ${Math.round(r.left)}-${Math.round(r.right)}`);
    }
    if (e.scrollWidth > e.clientWidth + 1.5) malos.push(`${e.tagName.toLowerCase()} «${(e.textContent || '').trim().slice(0, 24)}» scrollWidth ${e.scrollWidth} > ${e.clientWidth}`);
  }
  return malos;
}, selector);
module.exports = { botonesQueNoCaben, botonesFueraDeLaVentana, contenidoSeSale };
