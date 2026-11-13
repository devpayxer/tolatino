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
  return { ok: ratio <= MAXIMO, razon: ratio <= MAXIMO ? '' : `${(ratio * 100).toFixed(2)} % de la pantalla distinta (el máximo es ${(MAXIMO * 100).toFixed(2)} %)`, ratio, diff: PNG.sync.write(diff) };
}
module.exports = { compara, UMBRAL, MAXIMO };
