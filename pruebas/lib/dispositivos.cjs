// 9b-2 · Los 9 dispositivos de la punta a punta (PLAN §3.4): iPhone SE, iPhone 15, iPhone 15 Pro Max, Pixel, Galaxy, iPad y escritorio
// 1024 · 1280 · 1440. Cada uno lleva su motor (WebKit para Apple, Chromium para lo demás) y el descriptor de Playwright.
// «tipo» decide a qué contextos de una prueba se aplica: un teléfono cambia los contextos de teléfono (ancho < 600) y deja los de escritorio
// como los pide la prueba; el escritorio, al revés; la tableta cambia todos. Por defecto (sin variable) NADA cambia: teléfono 390 y escritorio 1360.
const { devices } = require('playwright');
const d = (n) => devices[n];
const TABLA = {
  'iphone-se': { motor: 'webkit', tipo: 'telefono', nombre: 'iPhone SE', desc: d('iPhone SE (3rd gen)') },
  'iphone-15': { motor: 'webkit', tipo: 'telefono', nombre: 'iPhone 15', desc: d('iPhone 15') },
  'iphone-15-pro-max': { motor: 'webkit', tipo: 'telefono', nombre: 'iPhone 15 Pro Max', desc: d('iPhone 15 Pro Max') },
  'pixel': { motor: 'chromium', tipo: 'telefono', nombre: 'Pixel 7', desc: d('Pixel 7') },
  'galaxy': { motor: 'chromium', tipo: 'telefono', nombre: 'Galaxy S24', desc: d('Galaxy S24') },
  'ipad': { motor: 'webkit', tipo: 'tableta', nombre: 'iPad Pro 11', desc: d('iPad Pro 11') },
  'escritorio-1024': { motor: 'chromium', tipo: 'escritorio', nombre: 'Escritorio 1024', desc: { viewport: { width: 1024, height: 768 } } },
  'escritorio-1280': { motor: 'chromium', tipo: 'escritorio', nombre: 'Escritorio 1280', desc: { viewport: { width: 1280, height: 800 } } },
  'escritorio-1440': { motor: 'chromium', tipo: 'escritorio', nombre: 'Escritorio 1440', desc: { viewport: { width: 1440, height: 900 } } },
};
for (const [id, x] of Object.entries(TABLA)) if (!x.desc) throw new Error(`dispositivos: Playwright no tiene el descriptor de ${x.nombre} (${id})`);
module.exports = { TABLA, IDS: Object.keys(TABLA), de: (id) => (id ? TABLA[id] ?? null : null) };
