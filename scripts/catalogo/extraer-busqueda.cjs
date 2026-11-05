// Extrae del prototipo (search-engine.js) el vocabulario de Buscar: sinónimos, frases que se reescriben, palabras vacías
// e «intenciones» (abierto ahora, con delivery, que acepte Medicaid…). Es configuración del producto: va a
// packages/taxonomy/busqueda.json → semilla repetible seeds/busqueda.sql (la tabla `synonyms`, editable desde el admin).
// Uso: node scripts/catalogo/extraer-busqueda.cjs docs/diseno/pantallas/datos/search-engine.js packages/taxonomy/busqueda.json
const vm = require("node:vm"), fs = require("node:fs");
const [src, salida] = process.argv.slice(2);
const code = fs.readFileSync(src, "utf8");
// Las constantes viven dentro de un IIFE: se evalúan sacando su texto (sin ejecutar el resto del motor).
const grab = (name) => { const i = code.indexOf(`const ${name} =`); if (i < 0) throw new Error(`falta ${name}`); let d = 0, j = code.indexOf("=", i) + 1;
  for (let k = j; k < code.length; k++) { const c = code[k]; if ("[{(".includes(c)) d++; else if ("]})".includes(c)) d--; else if (c === ";" && d === 0) return code.slice(j, k); } };
const ctx = vm.createContext({ Set });
const val = (n) => vm.runInContext(`(${grab(n)})`, ctx);
const SYN = val("SYN"), PHR = val("PHR"), INT = val("INT"), EX = val("EXAMPLES");
const STOP = [...vm.runInContext(`(${grab("STOP")})`, ctx)];
const out = {
  sinonimos: Object.entries(SYN).map(([term, a]) => ({ term, targets: a })),
  frases: PHR.map(([a, b]) => ({ term: a, target: b })),
  vacias: STOP,
  intenciones: INT.map(([key, frases, label, tipo]) => ({ key, frases, label: { es: label[0], en: label[1] }, tipo })),
  ejemplos: EX.map(([es, en]) => ({ es, en })),
};
fs.writeFileSync(salida, JSON.stringify(out, null, 1) + "\n");
console.log(`sinónimos: ${out.sinonimos.length} · frases: ${out.frases.length} · vacías: ${out.vacias.length} · intenciones: ${out.intenciones.length} · ejemplos: ${out.ejemplos.length}`);
