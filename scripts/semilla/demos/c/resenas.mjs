/* Reseñas y seguidores (comunes a las cuatro categorías): cada reseña sale de una operación terminada de su autor (verificada), una por persona. */
import { Rng } from "./base.mjs";
import { textoResena, textoReplica } from "./textos.mjs";

const ESTRELLAS = [[5, 0.58], [4, 0.26], [3, 0.08], [2, 0.05], [1, 0.03]];
const ok3 = (s) => (s >= 4 ? 1 : s === 3 ? 0 : -1), ok2 = (s) => (s >= 4 ? 1 : 0), okm = (s) => (s >= 4 ? 1 : -1);

/* filas: operaciones (de oficios o visitas); opts.terminada(f) dice si cuenta; opts.respuestas(f, stars, r) y opts.hechos(f) arman answers y facts. */
export function armarResenas(rubro, B, filas, opts) {
  const r = new Rng(B.seed + ":res");
  const hechas = filas.filter((f) => opts.terminada(f));
  const vistos = new Set(), unicos = [];
  for (const f of hechas) { if (vistos.has(f.ph)) continue; vistos.add(f.ph); unicos.push(f); }
  const objetivo = Math.min(unicos.length, Math.max(20, Math.min(75, Math.round(hechas.length * r.pick([0.2, 0.24, 0.28, 0.32])))));
  const elegidas = r.some(unicos, objetivo).sort((a, b) => a.d - b.d);
  const out = [];
  for (const f of elegidas) {
    let stars = r.weighted(ESTRELLAS);
    if (f._late > 0 && stars > 3 && r.chance(0.7)) stars = 3;
    const lang = f._c?.lang === "en" || r.chance(0.1) ? "en" : "es";
    const owner = B.owner.nombre;
    const v = { s: (f._it?.es ?? f._cosa ?? "").toLowerCase(), d: owner, c: f._veh ?? "", b: B.name };
    if (lang === "en") v.s = (f._it?.en ?? f._cosaEn ?? "").toLowerCase();
    const body = textoResena(rubro, stars, lang, v, r);
    const delay = r.int(0, 6), cd = Math.min(-1, f.d + delay), cm = r.int(9, 21) * 60 + r.int(0, 59);
    const reply = r.chance(stars <= 3 ? 0.93 : stars === 4 ? 0.5 : 0.4);
    const rlang = lang;
    const row = {
      biz: B.id, city: B.city, ph: f.ph, op: f.num, src: opts.src, stars, body, lang, answers: opts.respuestas(f, stars, r), facts: opts.hechos(f), cd, cm,
      ...(reply ? { reply: textoReplica(stars, rlang, f._c?.nombre ?? "", r), rd: Math.min(-1, cd + r.int(0, 3)), rm: r.int(8, 20) * 60 + r.int(0, 59), rlang } : {}),
    };
    out.push(row);
  }
  return out;
}
export { ok3, ok2, okm };

/* Seguidores: entre ~10 y ~70, más los de más edad; fechas desde la apertura. */
export function armarSeguidores(B, clientes, r0) {
  const r = new Rng(B.seed + ":seg"), n = Math.max(10, Math.min(70, Math.round((12 + (2026 - B.founded) * 3.2) * B.size * (0.7 + r.next() * 0.6))));
  const pool = r.shuffle([...new Set(clientes.map((c) => c.tel))]);
  const extra = r.shuffle(r0.map((x) => x.tel));
  const lista = [...pool, ...extra].filter((x, i, a) => a.indexOf(x) === i).slice(0, n);
  return lista.map((ph) => ({ ph, d: -r.int(3, Math.max(10, (2026 - B.founded) * 330)) }));
}
