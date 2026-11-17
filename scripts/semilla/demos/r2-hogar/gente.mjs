/* Ronda 2 · Hogar · gente de ficción y especificaciones de los negocios (10 por subcategoría, 2 por ciudad).
   Teléfonos de ficción (555), solo sandbox: dueños +1 484 555 4800–5399, clientes +1 717 555 2400–2699. */
import { Rng, slug, CIUDADES, ORDEN_CIUDADES, lugar, NOMBRES_H, NOMBRES_M, APELLIDOS, dedupe } from "../c/base.mjs";

export const DUENO_DESDE = 4800, DUENO_HASTA = 5399, CLI_DESDE = 2400, CLI_HASTA = 2699;
export const telDueno = (k) => { const n = DUENO_DESDE + k; if (n > DUENO_HASTA) throw new Error("sin teléfonos de dueño en el rango reservado"); return `+1484555${n}`; };

/* 300 clientes de ficción; el índice i fija la ciudad (i % 5), igual que la lista de la ronda 1, para poder cambiar uno por otro sin mover a nadie de ciudad. */
export const CLIENTES2 = (() => {
  const r = new Rng("clientes-r2-hogar"), out = [];
  for (let n = CLI_DESDE, i = 0; n <= CLI_HASTA; n++, i++) {
    const mujer = r.chance(0.5);
    out.push({ tel: `+1717555${n}`, nombre: mujer ? r.pick(NOMBRES_M) : r.pick(NOMBRES_H), ap: r.pick(APELLIDOS), ciudad: ORDEN_CIUDADES[i % 5], lang: r.chance(0.18) ? "en" : "es", mujer });
  }
  return out;
})();

const PALABRAS_CIUDAD = { hzl: ["Hazleton", "Hazle Valley", "Valle de Hazle"], alw: ["Allentown", "Lehigh", "Valle del Lehigh"], wbr: ["Wilkes-Barre", "Wyoming Valley", "Luzerne"], scr: ["Scranton", "Lackawanna", "Electric City"], rdg: ["Reading", "Berks", "Schuylkill"] };
const GENERICAS = ["Los Primos", "El Vecino", "La Esquina", "Latino", "Express", "Pro", "Los Compadres", "Confianza", "Santa Rosa", "Buen Precio", "Familiar", "El Maestro"];
const NOMBRES_DUENO_H = ["Rafael", "José", "Luis", "Carlos", "Miguel", "Ramón", "Wilfredo", "Héctor", "Pedro", "Manuel", "Julio", "Freddy", "Edwin", "Víctor", "Nelson", "Orlando", "Domingo", "Francisco", "Chelo", "Beto", "Tito", "Papo", "Yeyo"];
const NOMBRES_DUENO_M = ["María", "Rosa", "Carmen", "Yokasta", "Mariela", "Altagracia", "Noelia", "Milagros", "Marisol", "Griselda", "Yaritza", "Dilcia"];

/* Un negocio por (subcategoría, j): j = 0..9, ciudad = j % 5. El nombre sale de la subcategoría y del dueño, nunca de una marca real. */
export function especificar2(subs, existentes, idxBase = 0) {
  const usadosId = new Set(existentes), usadosNombre = new Set(), out = [];
  let k = 0;
  for (const S of subs) {
    for (let j = 0; j < 10; j++) {
      const r = new Rng(`r2h:${S.id}:${j}`);
      const ciudad = ORDEN_CIUDADES[j % 5], L = lugar(ciudad, r);
      const mujer = r.chance(0.28), nombre = mujer ? r.pick(NOMBRES_DUENO_M) : r.pick(NOMBRES_DUENO_H);
      const ap = r.pick(APELLIDOS), pc = PALABRAS_CIUDAD[ciudad];
      const patrones = [(s) => `${s} ${ap} e Hijos`, (s) => `${s} Hermanos ${ap}`, (s) => `${s} ${mujer ? "Doña" : "Don"} ${nombre}`, (s) => `${s} ${r.pick(pc)}`, (s) => `${s} ${r.pick(GENERICAS)}`, (s) => `${s} ${ap}`, (s) => `${s} ${r.pick(pc)}`];
      let name = "", intentos = 0;
      do { name = r.pick(patrones)(r.pick(S.stems)); } while (usadosNombre.has(name) && ++intentos < 60);
      if (usadosNombre.has(name)) name = `${name} ${j + 1}`;
      usadosNombre.add(name);
      const id = dedupe(usadosId, `${slug(name)}-${ciudad}`);
      out.push({
        cat: "NEG-HOGAR", sub: S.id, j, idx: idxBase + k, id, name, city: ciudad, ...L, founded: r.int(2006, 2022),
        owner: { tel: telDueno(k), nombre, ap, mujer }, phone: `+1${CIUDADES[ciudad].area}55501${String(r.int(0, 99)).padStart(2, "0")}`,
        size: r.pick([0.6, 0.7, 0.85, 1, 1, 0.75]), wa: r.chance(0.6), seed: `NEG-HOGAR:${id}`, extra: null,
      });
      k++;
    }
  }
  return out;
}
