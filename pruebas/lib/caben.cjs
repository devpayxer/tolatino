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
module.exports = { botonesQueNoCaben };
