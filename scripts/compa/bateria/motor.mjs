/* Batería de El Compa · El motor. Carga el código REAL de apps/web/lib/compa/ (tapar, reglas fijas, verificador de salida, las implementaciones del
   modelo, los sistemas fijos y la validación de acciones) con el transpilador de pruebas/lib/ts-servidor.cjs y elige el motor de la corrida
   (reglas · simulador · claude) con su tope de llamadas. El CAMINO de cada uso (conversacion.ts: turno, turnoPanel, respuestaAuto,
   borradorCopiloto) ya no se reproduce aquí: lo llama camino.mjs por servidor.mjs, contra la base de pruebas y con la búsqueda de ayuda de
   Postgres. Lo que no está en la corrida: los límites por persona y el tope de gasto del mes SÍ corren (son los del servidor); el tope de
   llamadas al modelo real es de la batería (--max-llamadas). */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, posix } from "node:path";

const require = createRequire(import.meta.url);
const TS = require("../../../pruebas/lib/ts-servidor.cjs");
export const RAIZ = TS.RAIZ;
const LIB = "apps/web/lib/compa";

/* Todo lo que el archivo importa y no es del núcleo de El Compa (la base, la sesión, los módulos de cobros…) se cambia por un objeto mudo: estos
   archivos solo lo usan DENTRO de funciones que la batería no llama. Si un archivo del núcleo se importa a sí mismo mal, falla fuerte (no mudo). */
const mudo = () => new Proxy(function () {}, { get: (_t, k) => (k === "__esModule" ? false : mudo()), apply: () => mudo() });
const delEntorno = (n) => (process.env[n] ?? "").trim() || null;
const DOBLE_LLAVES = { llaveYa: delEntorno, llave: async (n) => delEntorno(n) };
function cargarReal(rel, reales = []) {
  const src = readFileSync(join(RAIZ, rel), "utf8"), stubs = {};
  for (const m of src.matchAll(/from "(\.{1,2}\/[^"]+)"/g)) {
    const base = posix.join(posix.dirname(rel), m[1]);
    if (reales.some((r) => base === `${LIB}/${r}`)) continue;
    // El lector de llaves de la app (lib/llaves-proveedores.ts) lee el entorno y, si no, el llavero de la base. La batería corre sin base: su doble lee
    // SOLO el entorno (un doble mudo diría que hay llave siempre y el corredor llamaría al modelo real sin ella).
    if (base === "apps/web/lib/llaves-proveedores") { stubs[`${base}.ts`] = DOBLE_LLAVES; continue; }
    // 23 nov · LA regla de las direcciones de simulador (lib/origen-pruebas.ts, sin importaciones) va REAL: un doble mudo diría que hay dirección siempre.
    if (base === "apps/web/lib/origen-pruebas") continue;
    stubs[`${base}.ts`] = mudo(); stubs[`${base}.tsx`] = mudo();
  }
  return TS.cargarApp(rel, stubs);
}
const NUCLEO = ["modelo", "modelo-reglas", "reglas", "tapar", "verificar", "modelo-claude", "modelo-simulador"];
const real = (n) => cargarReal(`${LIB}/${n}.ts`, NUCLEO);

let _M = null;
export function modulos() {
  if (_M) return _M;
  const m = real("modelo"), r = real("reglas"), t = real("tapar"), v = real("verificar"), mr = real("modelo-reglas"), mc = real("modelo-claude");
  const conv = cargarReal(`${LIB}/conversacion.ts`, NUCLEO);
  const acc = cargarReal(`${LIB}/acciones.ts`, NUCLEO), cp = cargarReal(`${LIB}/contexto-panel.ts`, NUCLEO);
  let simulador = null;
  try { simulador = real("modelo-simulador").simulador; } catch (e) { simulador = { error: String(e?.message ?? e) }; }   // en producción el archivo se niega a cargar
  _M = { m, r, t, v, mr, mc, conv, acc, cp, simulador, claude: mc.claude, hayClave: mc.hayClave };
  return _M;
}

/* ── El modelo elegido ── (la llamada al proveedor, su cuenta y su tope viven en servidor.mjs: son el envoltorio del modelo que conversacion.ts usa) */
export class TopeDeLlamadas extends Error {}
export function crearMotor(nombre, { max = 0, esperaMs = 20000, ids = {} } = {}) {
  const M = modulos(), o = { nombre, llamadas: 0, max, esperaMs, ids, tokens: { entrada: 0, salida: 0 } };
  if (nombre === "reglas") return o;
  const base = nombre === "claude" ? M.claude : M.simulador;
  if (!base || base.error) throw new Error(`el motor «${nombre}» no está disponible${base?.error ? `: ${base.error}` : ""}`);
  return o;
}
