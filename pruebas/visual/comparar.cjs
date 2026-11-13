// 9b-2 · La comparación de una captura con la aprobada (pixelmatch). Sola y sin navegador, para que el CI y la prueba al revés (alreves9b2)
// usen exactamente lo mismo. Tolerancia: UMBRAL = cuánto puede distinguirse un píxel (0–1, color) y MAXIMO = qué parte de la pantalla puede
// ser distinta (0,5 %: un reloj o un «hace 3 min» no frena el CI; un botón movido, una tarjeta que cambia de tamaño o un color, sí).
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');
const UMBRAL = 0.15, MAXIMO = 0.005;
function compara(actual, aprobada) {
  const a = PNG.sync.read(actual), b = PNG.sync.read(aprobada);
  if (a.width !== b.width || a.height !== b.height) return { ok: false, razon: `otro tamaño (${a.width}×${a.height}, la aprobada ${b.width}×${b.height})`, ratio: 1, diff: null };
  const diff = new PNG({ width: a.width, height: a.height });
  const n = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: UMBRAL });
  const ratio = n / (a.width * a.height);
  // Dónde: las franjas de 40 px con píxeles distintos (el CI no deja bajar las imágenes: la zona se lee en el registro).
  const franjas = {}; for (let y = 0; y < a.height; y++) for (let x = 0; x < a.width; x++) { const i = (y * a.width + x) * 4; if (diff.data[i] === 255 && diff.data[i + 1] === 0) { const k = Math.floor(y / 40) * 40; franjas[k] = (franjas[k] || 0) + 1; } }
  const zona = Object.entries(franjas).sort((u, v) => v[1] - u[1]).slice(0, 4).map(([y, c]) => `y${y}:${c}px`).join(' ');
  return { ok: ratio <= MAXIMO, razon: ratio <= MAXIMO ? '' : `${(ratio * 100).toFixed(2)} % de la pantalla distinta (el máximo es ${(MAXIMO * 100).toFixed(2)} %) · franjas ${zona}`, ratio, zona, diff: PNG.sync.write(diff) };
}
module.exports = { compara, UMBRAL, MAXIMO };
