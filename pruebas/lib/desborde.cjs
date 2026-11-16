// Anchos · Qué se sale de lado en la página: el exceso (scrollWidth - ancho de la ventana) y los elementos que lo causan (los primeros 5, con su
// etiqueta, su borde derecho y su texto). Para que una prueba de «sin scroll de lado» diga QUÉ se sale, sobre todo en WebKit (iPhone SE, iPad),
// que no corre en la máquina de trabajo. Solo cuenta lo que no está dentro de algo que recorta (overflow) y no es fijo.
const desborde = (p) => p.evaluate(() => {
  const W = window.innerWidth, out = [];
  for (const e of document.querySelectorAll('body *')) {
    const r = e.getBoundingClientRect();
    if (!(r.right > W + 1 && r.width > 0) || getComputedStyle(e).position === 'fixed') continue;
    let a = e.parentElement, recorta = false;
    while (a) { if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(a).overflowX)) { recorta = true; break; } a = a.parentElement; }
    if (recorta) continue;
    out.push(`${e.tagName.toLowerCase()}${e.dataset?.screenLabel ? `[${e.dataset.screenLabel}]` : ''}${e.className && typeof e.className === 'string' ? '.' + e.className.split(/\s+/).slice(0, 3).join('.') : ''} →${Math.round(r.right)} «${(e.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 40)}»`);
    if (out.length >= 5) break;
  }
  return { exceso: document.documentElement.scrollWidth - W, quien: out };
});
// true si no hay scroll de lado; si lo hay, lo escribe (para el registro del CI) y da false.
const sinDesborde = async (p, nombre = '') => {
  const d = await desborde(p);
  if (d.exceso <= 1) return true;
  console.log(`  · desborde ${nombre} +${d.exceso}px: ${d.quien.join(' | ') || '(nada visible: ¿una barra?)'}`);
  return false;
};
module.exports = { desborde, sinDesborde };
