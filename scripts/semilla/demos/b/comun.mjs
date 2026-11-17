/* Piezas comunes del grupo B (Belleza, Salud, Profesionales, Deporte): generador pseudoaleatorio con semilla, ciudades y calles reales,
   nombres de pila y apellidos, el padrón de clientes ficticios y utilidades de fechas y textos. Todo determinista (la misma salida cada vez).
   Teléfonos ficticios (solo sandbox): dueños +1 570 555 9250–9499, clientes +1 570 555 8250–8499. */
import { readFileSync } from "node:fs";

export const HOY = "2026-11-17"; // fecha de referencia del generador (la historia es absoluta; lo «próximo» sale relativo a now() en el SQL)
export const FOTOS = JSON.parse(readFileSync(new URL("./fotos.json", import.meta.url), "utf8"));

/* ── PRNG ── */
export function hash(s) { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
export function rngDe(sem) {
  let a = hash(String(sem)) || 1;
  const f = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  f.int = (lo, hi) => lo + Math.floor(f() * (hi - lo + 1));
  f.pick = (a) => a[Math.floor(f() * a.length)];
  f.chance = (p) => f() < p;
  f.shuffle = (a) => { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(f() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
  f.weighted = (pairs) => { const t = pairs.reduce((s, p) => s + p[1], 0); let x = f() * t; for (const [v, w] of pairs) { if ((x -= w) < 0) return v; } return pairs[pairs.length - 1][0]; };
  return f;
}

/* ── Ciudades: 5 ciudades, calles reales y un punto de la calle (lat, lng). Los números de puerta son de ejemplo. ── */
export const CIUDADES = ["hzl", "alw", "wbr", "scr", "rdg"];
export const CIUDAD = {
  hzl: { n: "Hazleton", area: "570", st: "PA", calles: [["N Wyoming St", 40.9590, -75.9740], ["W Broad St", 40.9566, -75.9790], ["E Broad St", 40.9575, -75.9660], ["N Church St", 40.9598, -75.9722], ["Alter St", 40.9560, -75.9735], ["W Diamond Ave", 40.9568, -75.9830], ["N Laurel St", 40.9610, -75.9760], ["Vine St", 40.9545, -75.9705], ["Pine St", 40.9538, -75.9770], ["W Chestnut St", 40.9579, -75.9805]] },
  alw: { n: "Allentown", area: "610", st: "PA", calles: [["Hamilton St", 40.6029, -75.4709], ["N 7th St", 40.6050, -75.4730], ["Linden St", 40.6008, -75.4695], ["Liberty St", 40.6065, -75.4740], ["Tilghman St", 40.5958, -75.4660], ["Union St", 40.5995, -75.4790], ["W Turner St", 40.6035, -75.4780], ["Gordon St", 40.6120, -75.4850], ["E Chew St", 40.6085, -75.4560], ["S 4th St", 40.5990, -75.4750]] },
  wbr: { n: "Wilkes-Barre", area: "570", st: "PA", calles: [["S Main St", 41.2420, -75.8810], ["N Main St", 41.2475, -75.8830], ["Northampton St", 41.2445, -75.8790], ["S Franklin St", 41.2425, -75.8860], ["E Market St", 41.2465, -75.8750], ["Hazle Ave", 41.2530, -75.8650], ["Carey Ave", 41.2390, -75.8960], ["Kidder St", 41.2350, -75.8700], ["W Northampton St", 41.2455, -75.8890], ["S Washington St", 41.2410, -75.8795]] },
  scr: { n: "Scranton", area: "570", st: "PA", calles: [["Lackawanna Ave", 41.4085, -75.6650], ["Wyoming Ave", 41.4105, -75.6625], ["N Main Ave", 41.4220, -75.6670], ["Adams Ave", 41.4060, -75.6630], ["Mulberry St", 41.4098, -75.6600], ["Linden St", 41.4075, -75.6615], ["Spruce St", 41.4093, -75.6635], ["Penn Ave", 41.4040, -75.6640], ["Cedar Ave", 41.3950, -75.6600], ["Pittston Ave", 41.3980, -75.6500]] },
  rdg: { n: "Reading", area: "610", st: "PA", calles: [["Penn St", 40.3358, -75.9272], ["N 5th St", 40.3400, -75.9260], ["N 9th St", 40.3430, -75.9210], ["Perkiomen Ave", 40.3380, -75.9140], ["Washington St", 40.3330, -75.9250], ["Franklin St", 40.3345, -75.9300], ["Bingaman St", 40.3310, -75.9285], ["S 6th St", 40.3290, -75.9255], ["Spring St", 40.3345, -75.9345], ["Windsor St", 40.3395, -75.9170]] },
};
export const CIUDAD_ES = { hzl: "Hazleton", alw: "Allentown", wbr: "Wilkes-Barre", scr: "Scranton", rdg: "Reading" };

/* ── Nombres ── */
export const NOMBRES_M = ["Luis", "Carlos", "José", "Miguel", "Rafael", "Juan", "Pedro", "Ramón", "Héctor", "Fernando", "Andrés", "Wilson", "Julio", "Manuel", "Víctor", "Ángel", "Eduardo", "Samuel", "Franklin", "Yunior", "Starlin", "Domingo", "Ricardo", "Gabriel", "Alberto", "Omar", "Jorge", "Esteban", "Raúl", "Nelson"];
export const NOMBRES_F = ["María", "Carmen", "Rosa", "Yolanda", "Altagracia", "Marisol", "Daisy", "Leidy", "Yesenia", "Milagros", "Ingrid", "Karina", "Paola", "Sandra", "Beatriz", "Lourdes", "Mayra", "Natalia", "Jazmín", "Greisy", "Rocío", "Dayana", "Elena", "Idalia", "Mercedes", "Yajaira", "Teresa", "Verónica", "Luz", "Aracelis"];
export const APELLIDOS = ["Peña", "Almonte", "Rosario", "Féliz", "Mejía", "Santana", "Cabrera", "Ortega", "Valdez", "Guzmán", "Núñez", "Batista", "Rodríguez", "Martínez", "Hernández", "Colón", "Rivera", "Vargas", "Castillo", "Medina", "Reyes", "Soto", "Torres", "Domínguez", "Báez", "Acosta", "Paulino", "Tavárez", "Jiménez", "Ramírez", "Cruz", "Morales", "Ortiz", "Delgado", "Lantigua", "Polanco", "Beltré", "Encarnación", "Luna", "Sosa", "Vásquez", "Guerrero", "Maldonado", "Figueroa", "Pagán", "Quiñones", "Salcedo", "Duarte", "Collado", "Matos"];
export const sinTildes = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
export const slug = (s) => sinTildes(s).toLowerCase().replace(/&/g, " y ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
export const q = (s) => (s == null ? "null" : `'${String(s).replace(/'/g, "''")}'`);

/* Padrón de 250 clientes (+1 570 555 8250–8499): nombre y apellido sin repetir pareja; cada uno con su ciudad. */
export function clientes() {
  const r = rngDe("clientes-b"), usados = new Set(), L = [];
  for (let i = 0; i < 250; i++) {
    let fn, ln, k;
    do { const f = r() < 0.5; fn = r.pick(f ? NOMBRES_F : NOMBRES_M); ln = r.pick(APELLIDOS); k = fn + ln; } while (usados.has(k));
    usados.add(k);
    L.push({ phone: `+1570555${8250 + i}`, fn, ln, city: CIUDADES[i % 5], lang: i % 9 === 0 ? "en" : "es", i });
  }
  return L;
}
export const CLIENTES = clientes();

/* ── Fechas ── */
const dias = (ymd) => Math.round(Date.UTC(+ymd.slice(0, 4), +ymd.slice(5, 7) - 1, +ymd.slice(8, 10)) / 86400000);
export const diaN = dias;
export const desdeDia = (n) => new Date(n * 86400000).toISOString().slice(0, 10);
export const dow = (ymd) => new Date(ymd + "T12:00:00Z").getUTCDay(); // 0 = domingo (como business_hours.weekday)
export const hhmm = (min) => `${String(Math.floor(min / 60) % 24).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
export const sumaDias = (ymd, n) => desdeDia(dias(ymd) + n);

/* Un día al azar entre dos fechas, con más peso a lo reciente (el negocio crece: pesa p = fracción^g). */
export function diaPesado(r, ini, fin, g = 1.7) {
  const a = dias(ini), b = dias(fin);
  return desdeDia(a + Math.floor(Math.pow(r(), 1 / g) * (b - a + 1)));
}

/* ── Textos ── */
export const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
export const usd = (c, es = true) => `$${(c / 100).toLocaleString(es ? "es-US" : "en-US", { minimumFractionDigits: c % 100 ? 2 : 0 })}`;
export const redondeo = (c, paso = 500) => Math.max(paso, Math.round(c / paso) * paso);

/* Fotos del grupo: la de la subcategoría primero, luego el resto de la categoría (sin repetir dentro de un negocio). */
export function fotosDe(cat, sub, r, n) {
  const A = FOTOS[cat].sub[sub] ?? [], T = FOTOS[cat].all;
  const base = r.shuffle(A.length >= 3 ? A : [...A, ...r.shuffle(T)]);
  const out = [];
  for (const u of [...base, ...r.shuffle(T)]) { if (!out.includes(u)) out.push(u); if (out.length >= n) break; }
  return out;
}
export const FOTO_SUFIJO = "?auto=compress&cs=tinysrgb&h=600";
export const conTam = (u) => (u.includes("?") ? u : u + FOTO_SUFIJO);

/* Horarios: [[abre, cierra] | null] x 7 (índice 0 = domingo), a filas de business_hours. */
export function horasFilas(sem) {
  return sem.map((h, wd) => ({ weekday: wd, open: !!h, ranges: h ? (Array.isArray(h[0]) ? h.map((x) => [hhmm(x[0]), hhmm(x[1])]) : [[hhmm(h[0]), hhmm(h[1])]]) : [] }));
}
