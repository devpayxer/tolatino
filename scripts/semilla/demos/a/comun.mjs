/* Grupo A · piezas comunes de los generadores de negocios demo (FOOD, MERC, TIENDA, NOCHE). SOLO SANDBOX.
   Todo es determinista: la misma entrada da el mismo SQL. Nada aquí toca la base. */

// ── PRNG con semilla ──
export function hash(s) { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
export function rng(seed) {
  let a = typeof seed === "string" ? hash(seed) : seed >>> 0;
  const r = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  r.int = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
  r.pick = (a) => a[Math.floor(r() * a.length)];
  r.chance = (p) => r() < p;
  r.shuffle = (a) => { const x = a.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };
  r.weighted = (pairs) => { const t = pairs.reduce((s, p) => s + p[1], 0); let u = r() * t; for (const p of pairs) { u -= p[1]; if (u <= 0) return p[0]; } return pairs[pairs.length - 1][0]; };
  return r;
}

// ── SQL ──
export const q = (s) => (s == null ? "null" : `'${String(s).replace(/'/g, "''")}'`);
export const j = (o) => `${q(JSON.stringify(o))}::jsonb`;
export const arr = (a) => `array[${(a || []).map(q).join(",")}]::text[]`;
export const bi = (es, en) => ({ es, en: en ?? es });
export const photoUrl = (id, h = 600) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&h=${h}`;
export const logoUrl = (id) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&h=300&w=300&fit=crop`;
export const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, " y ").replace(/['’·]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
export const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// ── Gente (ficticia) ──
export const FIRST_F = "Yolanda Altagracia Carmen Miriam Rosa Luz Marisol Dayana Yesenia Lucía Ana Daniela Griselda Francisca Josefina Maribel Nelly Ramona Sonia Teresa Wendy Yajaira Zoila Beatriz Cándida Dolores Elena Fátima Gladys Inés Jacqueline Katherine Leticia Mercedes Noemí Olga Patricia Rocío Silvia Tania Vanessa Xiomara Yadira Karina Paola Isabel Esmeralda Brenda Cristina Diana".split(" ");
export const FIRST_M = "José Luis Carlos Juan Miguel Ramón Pedro Héctor Wilfredo Freddy Rafael Manuel Jesús Ángel Víctor Edwin Franklin Julio Raúl Samuel Tomás Ulises Gerardo Hugo Iván Jorge Kelvin Leonardo Mario Nelson Oscar Pablo Roberto Santiago Esteban Félix Gilberto Adrián Bernardo Cristian Darío Efraín Fabián Gustavo Henry Ismael Joel Lorenzo Marcos Néstor".split(" ");
export const SURN = "Almonte Batista Cabrera Durán Féliz García Hernández Jiménez López Méndez Núñez Ortiz Peña Quezada Reyes Santos Tavárez Ureña Vásquez Zapata Rivera Morales Castillo Mejía Rosario Pérez Martínez Gómez Ramírez Torres Flores Acosta Medina Guzmán Soto Rojas Mendoza Aguilar Cruz Delgado Espinal Fernández Guerrero Henríquez Ibarra Lara Maldonado Navarro Ochoa Paredes Quiñones Ramos Salazar Trinidad Valdez Vargas Villa Zambrano Colón Rodríguez".split(" ");

/* Clientes y reseñistas: 250 teléfonos 570-555-8000…8249 menos los 3 que la base ya trae con otro nombre (8172, 8220, 8239). */
export const CLIENTES_SALTAR = new Set([8172, 8220, 8239]);
export const CLIENTES = (() => {
  const out = [], seen = new Set();
  for (let n = 8000, i = 0; n <= 8249; n++) {
    if (CLIENTES_SALTAR.has(n)) continue;
    const fem = i % 2 === 0, F = fem ? FIRST_F : FIRST_M;
    let a = (i * 7 + (fem ? 0 : 3)) % F.length, b = (i * 11 + Math.floor(i / 59)) % SURN.length, k = 0;
    while (seen.has(F[a] + SURN[b])) { b = (b + 1) % SURN.length; if (++k > 70) { a = (a + 1) % F.length; k = 0; } }
    seen.add(F[a] + SURN[b]);
    out.push({ idx: i, phone: `+1570555${n}`, first: F[a], last: SURN[b], city: ["hzl", "alw", "wbr", "scr", "rdg"][(i * 3 + 1) % 5], lang: i % 6 === 5 ? "en" : "es" });
    i++;
  }
  return out;
})();

/* Dueños: un usuario por negocio. Los teléfonos +1570555 9001…9245 ya son de los votantes de prueba de la semilla 0032 (245 usuarios is_test), así que
   los dueños usan +1610555 9000…9199 (también ficción 555): ningún usuario existente cambia. */
export function dueno(n, fem) {
  const F = fem ? FIRST_F : FIRST_M;
  return { phone: `+1610555${9000 + n}`, first: F[(n * 13 + 5) % F.length], last: SURN[(n * 17 + 2) % SURN.length], last2: SURN[(n * 5 + 9) % SURN.length] };
}

// ── Ciudades y calles reales (coordenadas aproximadas sobre la calle) ──
export const CIUDADES = {
  hzl: { name: "Hazleton", area: "570", zips: ["18201", "18202"], streets: [
    { n: "N Wyoming St", a: [40.9468, -75.9781], b: [40.97, -75.9776], lo: 100, hi: 1000 }, { n: "N Church St", a: [40.957, -75.9722], b: [40.972, -75.9715], lo: 100, hi: 1000 },
    { n: "W Broad St", a: [40.956, -75.98], b: [40.9575, -75.993], lo: 100, hi: 900 }, { n: "E Broad St", a: [40.9553, -75.977], b: [40.957, -75.961], lo: 100, hi: 900 },
    { n: "Alter St", a: [40.9468, -75.985], b: [40.949, -75.965], lo: 100, hi: 900 }, { n: "N Pine St", a: [40.956, -75.9752], b: [40.97, -75.9745], lo: 100, hi: 900 },
    { n: "N Vine St", a: [40.956, -75.981], b: [40.968, -75.9805], lo: 100, hi: 800 }, { n: "W 15th St", a: [40.941, -75.983], b: [40.942, -75.969], lo: 100, hi: 700 } ] },
  alw: { name: "Allentown", area: "610", zips: ["18101", "18102", "18103", "18104"], streets: [
    { n: "W Hamilton St", a: [40.6022, -75.472], b: [40.604, -75.495], lo: 100, hi: 1100 }, { n: "E Hamilton St", a: [40.6021, -75.47], b: [40.6, -75.456], lo: 100, hi: 900 },
    { n: "N 7th St", a: [40.602, -75.4705], b: [40.62, -75.469], lo: 100, hi: 1200 }, { n: "S 4th St", a: [40.6, -75.465], b: [40.588, -75.4625], lo: 100, hi: 900 },
    { n: "Linden St", a: [40.6095, -75.488], b: [40.6098, -75.463], lo: 100, hi: 1000 }, { n: "Tilghman St", a: [40.614, -75.49], b: [40.6145, -75.462], lo: 100, hi: 1000 },
    { n: "Union St", a: [40.5985, -75.485], b: [40.5992, -75.46], lo: 100, hi: 900 } ] },
  wbr: { name: "Wilkes-Barre", area: "570", zips: ["18701", "18702", "18705"], streets: [
    { n: "N Main St", a: [41.2465, -75.8832], b: [41.26, -75.8825], lo: 100, hi: 900 }, { n: "S Main St", a: [41.245, -75.8835], b: [41.23, -75.8845], lo: 100, hi: 900 },
    { n: "Market St", a: [41.2453, -75.89], b: [41.2447, -75.879], lo: 100, hi: 700 }, { n: "Northampton St", a: [41.2485, -75.892], b: [41.2478, -75.877], lo: 100, hi: 700 },
    { n: "Kidder St", a: [41.24, -75.878], b: [41.238, -75.865], lo: 100, hi: 800 }, { n: "S Washington St", a: [41.2445, -75.88], b: [41.236, -75.8805], lo: 100, hi: 600 } ] },
  scr: { name: "Scranton", area: "570", zips: ["18503", "18504", "18505", "18509"], streets: [
    { n: "Wyoming Ave", a: [41.409, -75.664], b: [41.426, -75.658], lo: 100, hi: 1100 }, { n: "Lackawanna Ave", a: [41.4075, -75.67], b: [41.4072, -75.66], lo: 100, hi: 700 },
    { n: "N Washington Ave", a: [41.41, -75.6628], b: [41.426, -75.6615], lo: 100, hi: 1100 }, { n: "Penn Ave", a: [41.4075, -75.664], b: [41.395, -75.66], lo: 100, hi: 1000 },
    { n: "Spruce St", a: [41.4115, -75.67], b: [41.4112, -75.658], lo: 100, hi: 600 }, { n: "Adams Ave", a: [41.409, -75.6605], b: [41.42, -75.6595], lo: 100, hi: 900 } ] },
  rdg: { name: "Reading", area: "610", zips: ["19601", "19602", "19604", "19605"], streets: [
    { n: "Penn St", a: [40.335, -75.944], b: [40.3365, -75.912], lo: 100, hi: 1100 }, { n: "N 5th St", a: [40.335, -75.9262], b: [40.35, -75.9245], lo: 100, hi: 1000 },
    { n: "N 9th St", a: [40.337, -75.919], b: [40.352, -75.917], lo: 100, hi: 1000 }, { n: "Washington St", a: [40.341, -75.94], b: [40.3415, -75.91], lo: 100, hi: 1000 },
    { n: "Perkiomen Ave", a: [40.333, -75.915], b: [40.324, -75.9], lo: 100, hi: 900 }, { n: "Centre Ave", a: [40.335, -75.936], b: [40.36, -75.933], lo: 100, hi: 1100 } ] },
};
export const CIUDAD_IDS = ["hzl", "alw", "wbr", "scr", "rdg"];

/* Dirección con número y punto en la calle (interpolado + un salto de ~25 m para que no caigan en fila). */
export function direccion(r, ciudad, streetIdx) {
  const C = CIUDADES[ciudad], S = C.streets[streetIdx != null ? streetIdx % C.streets.length : r.int(0, C.streets.length - 1)];
  const num = r.int(S.lo / 2, S.hi / 2) * 2, t = (num - S.lo) / (S.hi - S.lo);
  const lat = S.a[0] + (S.b[0] - S.a[0]) * t + (r() - 0.5) * 0.0004, lng = S.a[1] + (S.b[1] - S.a[1]) * t + (r() - 0.5) * 0.0004;
  return { text: `${num} ${S.n}, ${C.name} PA`, street: `${num} ${S.n}`, lat: +lat.toFixed(6), lng: +lng.toFixed(6), zip: r.pick(C.zips), num };
}
export const telefonoNegocio = (r, ciudad) => `+1${CIUDADES[ciudad].area}55501${String(r.int(0, 99)).padStart(2, "0")}`;

// ── Horarios (weekday 0 = domingo) ──
export function horario(patron) {
  const dias = Array.from({ length: 7 }, (_, d) => patron[d] ?? null);
  return dias.map((x, d) => ({ weekday: d, open: !!x, ranges: x ? x : [] }));
}
export const rango = (a, b) => [[a, b]];

// ── Texto ──
export const MES_ES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export const money = (c) => `$${(c / 100).toFixed(c % 100 === 0 ? 0 : 2)}`;
export const redondeo5 = (c) => Math.round(c / 5) * 5;

/* Tarjeta de la ficha (category_attrs.tarjeta). */
export const tarjeta = (eta, fee, offer) => {
  const t = {};
  if (eta) t.eta = eta;
  if (fee) t.fee = fee;
  if (offer) t.offer = offer;
  return t;
};

/* Un reparto sencillo y repetible de «hace cuántos días» con más peso a lo reciente: ~10 años (3650 días). */
export function diasAtras(r, desdeFundado) {
  const max = Math.max(60, Math.min(3650, desdeFundado));
  // 38 % último año, 27 % año 2, 35 % resto: más reciente = más volumen.
  const u = r();
  if (u < 0.38) return r.int(0, Math.min(364, max));
  if (u < 0.65) return r.int(365, Math.min(729, max));
  return r.int(Math.min(730, max), max);
}
