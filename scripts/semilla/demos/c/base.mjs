/* Grupo C (Hogar, Auto, Dealer, Inmueble) · utilidades comunes del generador de negocios demo. SOLO SANDBOX.
   Todo es determinista: la misma entrada da el mismo SQL. Nada de aquí toca la base; solo arma texto. */
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const AQUI = path.dirname(fileURLToPath(import.meta.url));

/* ── Azar con semilla ── */
export const hash = (s) => { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
export class Rng {
  constructor(seed) { this.s = typeof seed === "string" ? hash(seed) : seed >>> 0; }
  next() { this.s = (this.s + 0x6d2b79f5) >>> 0; let t = this.s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  int(a, b) { return a + Math.floor(this.next() * (b - a + 1)); }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  chance(p) { return this.next() < p; }
  shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(this.next() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  some(arr, n) { return this.shuffle(arr).slice(0, n); }
  weighted(pairs) { let t = 0; for (const [, w] of pairs) t += w; let x = this.next() * t; for (const [v, w] of pairs) { x -= w; if (x <= 0) return v; } return pairs[pairs.length - 1][0]; }
}

/* ── SQL ── */
export const q = (s) => (s == null ? "null" : `'${String(s).replace(/'/g, "''")}'`);
export const J = (o) => (o == null ? "null" : `${q(JSON.stringify(o))}::jsonb`);
export const TA = (a) => (a && a.length ? `array[${a.map(q).join(",")}]::text[]` : "'{}'::text[]");
export const BI = (es, en) => ({ es, en: en ?? es });
export const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, " y ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
export const money = (c) => `$${Math.round(c / 100).toLocaleString("en-US")}`;
export const redondea = (c, paso = 100) => Math.max(paso, Math.round(c / paso) * paso);

/* ── Ciudades: calles reales de cada una con tramo aproximado (lat, lng de cada punta) y numeración ── */
export const CIUDADES = {
  hzl: { nombre: "Hazleton", area: "570", zips: ["18201", "18202"], tz: "America/New_York", calles: [
    ["N Wyoming St", [40.9565, -75.9768], [40.9690, -75.9755], 10, 700, "18201"], ["S Wyoming St", [40.9550, -75.9770], [40.9440, -75.9745], 10, 500, "18201"],
    ["N Church St", [40.9570, -75.9815], [40.9700, -75.9800], 10, 700, "18201"], ["W Broad St", [40.9575, -75.9795], [40.9578, -76.0010], 10, 600, "18201"],
    ["E Broad St", [40.9575, -75.9760], [40.9570, -75.9560], 10, 500, "18201"], ["W Diamond Ave", [40.9560, -75.9800], [40.9500, -76.0010], 10, 600, "18201"],
    ["Alter St", [40.9440, -75.9640], [40.9525, -75.9530], 100, 700, "18201"], ["N Laurel St", [40.9575, -75.9700], [40.9690, -75.9690], 10, 700, "18201"],
    ["N Vine St", [40.9575, -75.9740], [40.9690, -75.9725], 10, 600, "18201"], ["N Pine St", [40.9575, -75.9720], [40.9690, -75.9708], 10, 600, "18201"],
    ["E Oak St", [40.9610, -75.9760], [40.9605, -75.9570], 10, 500, "18201"], ["Memorial Hwy", [40.9480, -75.9900], [40.9380, -75.9980], 100, 800, "18202"]] },
  alw: { nombre: "Allentown", area: "610", zips: ["18101", "18102", "18103", "18104"], tz: "America/New_York", calles: [
    ["W Hamilton St", [40.6024, -75.4745], [40.6027, -75.4950], 10, 900, "18102"], ["E Hamilton St", [40.6024, -75.4690], [40.6028, -75.4400], 10, 900, "18109"],
    ["N 7th St", [40.6050, -75.4680], [40.6200, -75.4660], 10, 900, "18102"], ["S 4th St", [40.5990, -75.4720], [40.5880, -75.4700], 10, 700, "18102"],
    ["Linden St", [40.6010, -75.4740], [40.6010, -75.4500], 10, 800, "18101"], ["Tilghman St", [40.5960, -75.4760], [40.5990, -75.4400], 10, 1200, "18104"],
    ["Liberty St", [40.6040, -75.4760], [40.6050, -75.4450], 10, 800, "18102"], ["Union St", [40.5990, -75.4820], [40.5990, -75.4500], 10, 800, "18101"],
    ["Walnut St", [40.5985, -75.4760], [40.5985, -75.4520], 10, 700, "18102"], ["Turner St", [40.6070, -75.4760], [40.6070, -75.4540], 10, 800, "18102"],
    ["N 10th St", [40.6040, -75.4800], [40.6150, -75.4790], 10, 800, "18102"], ["Lehigh St", [40.5930, -75.4800], [40.5930, -75.4500], 10, 900, "18103"]] },
  wbr: { nombre: "Wilkes-Barre", area: "570", zips: ["18701", "18702", "18705"], tz: "America/New_York", calles: [
    ["S Main St", [41.2459, -75.8813], [41.2310, -75.8870], 10, 600, "18701"], ["N Main St", [41.2465, -75.8808], [41.2600, -75.8780], 10, 700, "18702"],
    ["Market St", [41.2480, -75.8810], [41.2480, -75.8700], 10, 400, "18702"], ["Northampton St", [41.2430, -75.8830], [41.2430, -75.8650], 10, 500, "18701"],
    ["Hazle Ave", [41.2440, -75.8800], [41.2420, -75.8550], 10, 800, "18702"], ["S Franklin St", [41.2450, -75.8870], [41.2300, -75.8930], 10, 600, "18702"],
    ["Carey Ave", [41.2380, -75.8860], [41.2540, -75.8840], 10, 600, "18702"], ["River St", [41.2470, -75.8870], [41.2570, -75.8960], 10, 600, "18702"],
    ["Pennsylvania Ave", [41.2420, -75.8800], [41.2560, -75.8720], 10, 700, "18702"], ["Wyoming Ave", [41.2480, -75.8890], [41.2520, -75.9020], 10, 800, "18705"],
    ["E Northampton St", [41.2425, -75.8650], [41.2400, -75.8450], 10, 700, "18705"], ["Kidder St", [41.2400, -75.8700], [41.2330, -75.8560], 10, 500, "18702"]] },
  scr: { nombre: "Scranton", area: "570", zips: ["18503", "18504", "18505", "18508", "18509", "18510"], tz: "America/New_York", calles: [
    ["Wyoming Ave", [41.4075, -75.6590], [41.4240, -75.6610], 10, 900, "18503"], ["Lackawanna Ave", [41.4085, -75.6640], [41.4070, -75.6540], 10, 600, "18503"],
    ["N Washington Ave", [41.4110, -75.6610], [41.4250, -75.6640], 10, 900, "18509"], ["Adams Ave", [41.4090, -75.6650], [41.4200, -75.6570], 10, 900, "18503"],
    ["Cedar Ave", [41.3990, -75.6620], [41.3880, -75.6500], 10, 900, "18505"], ["N Main Ave", [41.4110, -75.6720], [41.4260, -75.6680], 10, 1200, "18504"],
    ["S Main Ave", [41.4040, -75.6730], [41.3900, -75.6700], 10, 900, "18504"], ["Mulberry St", [41.4090, -75.6600], [41.4150, -75.6500], 10, 700, "18503"],
    ["Luzerne St", [41.4030, -75.6520], [41.4030, -75.6310], 10, 1100, "18504"], ["Pittston Ave", [41.3990, -75.6540], [41.3890, -75.6420], 10, 900, "18505"],
    ["Prospect Ave", [41.4150, -75.6620], [41.4290, -75.6590], 10, 900, "18505"], ["Linden St", [41.4050, -75.6580], [41.4050, -75.6700], 10, 500, "18503"]] },
  rdg: { nombre: "Reading", area: "610", zips: ["19601", "19602", "19604", "19606", "19607", "19611"], tz: "America/New_York", calles: [
    ["Penn St", [40.3356, -75.9269], [40.3380, -75.9020], 10, 900, "19602"], ["W Penn Ave", [40.3345, -75.9340], [40.3330, -75.9560], 10, 800, "19611"],
    ["N 5th St", [40.3395, -75.9230], [40.3540, -75.9210], 10, 900, "19601"], ["S 5th St", [40.3330, -75.9220], [40.3170, -75.9180], 10, 900, "19602"],
    ["N 9th St", [40.3390, -75.9170], [40.3510, -75.9150], 10, 900, "19604"], ["Perkiomen Ave", [40.3370, -75.9150], [40.3290, -75.8960], 10, 1100, "19606"],
    ["Bingaman St", [40.3300, -75.9300], [40.3160, -75.9270], 10, 800, "19602"], ["Washington St", [40.3390, -75.9290], [40.3400, -75.9050], 10, 800, "19601"],
    ["Centre Ave", [40.3420, -75.9330], [40.3560, -75.9370], 10, 900, "19605"], ["Moss St", [40.3340, -75.9360], [40.3200, -75.9400], 10, 800, "19611"],
    ["Schuylkill Ave", [40.3330, -75.9420], [40.3470, -75.9440], 10, 900, "19601"], ["N 11th St", [40.3400, -75.9120], [40.3530, -75.9100], 10, 900, "19604"]] },
};
export const ORDEN_CIUDADES = ["hzl", "alw", "wbr", "scr", "rdg"];

/* Dirección y punto de un negocio: una calle de su ciudad, un número dentro del tramo y el punto interpolado. */
export function lugar(ciudad, r) {
  const C = CIUDADES[ciudad], c = r.pick(C.calles), n = c[3] + Math.floor(r.next() * ((c[4] - c[3]) / 2)) * 2 + (r.chance(0.5) ? 0 : 0);
  const t = (n - c[3]) / (c[4] - c[3]), lat = c[1][0] + (c[2][0] - c[1][0]) * t + (r.next() - 0.5) * 0.0004, lng = c[1][1] + (c[2][1] - c[1][1]) * t + (r.next() - 0.5) * 0.0004;
  return { calle: c[0], num: n, zip: c[5], addr: `${n} ${c[0]}, ${C.nombre} PA`, lat: +lat.toFixed(6), lng: +lng.toFixed(6) };
}

/* ── Gente de ficción ── */
export const NOMBRES_H = ["Rafael", "José", "Luis", "Carlos", "Miguel", "Ramón", "Wilfredo", "Héctor", "Pedro", "Manuel", "Julio", "Freddy", "Edwin", "Jorge", "Víctor", "Ángel", "Nelson", "Orlando", "Félix", "Domingo", "Alberto", "Francisco", "Eduardo", "Rubén", "Samuel", "Gabriel", "Darío", "Efraín", "Santiago", "Ismael"];
export const NOMBRES_M = ["María", "Rosa", "Carmen", "Yokasta", "Mariela", "Daisy", "Ana", "Luz", "Katherine", "Rosanna", "Altagracia", "Yanira", "Noelia", "Milagros", "Esperanza", "Idalia", "Lourdes", "Marisol", "Sonia", "Griselda", "Yaritza", "Dilcia", "Brenda", "Carolina", "Evelyn", "Wendy", "Ivelisse", "Nancy", "Sandra", "Paola"];
export const APELLIDOS = ["Rodríguez", "Martínez", "García", "Díaz", "Pérez", "Santana", "Jiménez", "Almonte", "Peña", "Reyes", "Cabrera", "Núñez", "Vargas", "Féliz", "Batista", "Tavárez", "Méndez", "Ortiz", "Rosario", "Mejía", "Castillo", "Ramírez", "Torres", "Soto", "Colón", "Rivera", "Ayala", "Valdez", "Montero", "Guzmán", "Polanco", "Medina", "Lantigua", "Brito", "Cruz", "Morel", "Paulino", "Heredia", "Zapata", "Acosta"];

/* Dueños: +1 570 555 9500–9749 (se saltan los ocupados por pruebas); clientes: 8500–8749. */
const OCUPADOS_D = new Set([9635, 9644, 9701, 9702]), OCUPADOS_C = new Set([8519, 8534, 8579, 8593, 8619, 8625, 8642]);
export const telDueno = (i) => { let n = 9500, k = 0; while (true) { if (!OCUPADOS_D.has(n)) { if (k === i) return `+1570555${n}`; k++; } n++; if (n > 9749) throw new Error("sin teléfonos de dueño"); } };
export const CLIENTES_TEL = (() => { const a = []; for (let n = 8500; n <= 8749; n++) if (!OCUPADOS_C.has(n)) a.push(`+1570555${n}`); return a; })();
export function clientes() {
  const r = new Rng("clientes-c"), out = [];
  CLIENTES_TEL.forEach((tel, i) => {
    const mujer = r.chance(0.5), nombre = mujer ? r.pick(NOMBRES_M) : r.pick(NOMBRES_H), ap = r.pick(APELLIDOS);
    out.push({ tel, nombre, ap, ciudad: ORDEN_CIUDADES[i % 5], lang: r.chance(0.18) ? "en" : "es", mujer });
  });
  return out;
}

/* ── Fotos (solo URLs de Pexels que ya usan las semillas del repo; sin salida a internet no se pueden verificar otras) ── */
const FOTOS = JSON.parse(fs.readFileSync(path.join(AQUI, "fotos.json"), "utf8"));
export const px = (id, w = 600) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&h=${w}`;
export const fotosDeSubs = (subs, cat) => { const s = new Set(); for (const x of subs) for (const p of FOTOS.sub[x] ?? []) s.add(p); if (s.size < 6) for (const p of FOTOS.cat[cat] ?? []) s.add(p); return [...s]; };
export const fotoItem = (nombre) => FOTOS.items.find((i) => i[1] === nombre)?.[2] ?? null;
export const FOTOS_ITEMS = FOTOS.items;
/* Retratos del equipo: los 15 que ya usa la semilla de comunidad (w=160). */
export const RETRATOS = ["11579595", "20045343", "29881401", "1681010", "13430313", "13430312", "6102841", "7665704", "20454135", "16160952", "29889352", "14566062", "16160871", "9159678", "13975904"]
  .map((id) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=160`);

/* ── Logo: monograma en SVG (data:), con el color de la marca; nada de marcas reales ── */
const PALETA = [["#0B3D5C", "#FFFFFF"], ["#7A1F2B", "#FFFFFF"], ["#1E5C3A", "#FFFFFF"], ["#B45309", "#FFFFFF"], ["#3B2A6B", "#FFFFFF"], ["#0F4C5C", "#F6E7B0"], ["#22313F", "#F4B942"], ["#8B2E16", "#FFFFFF"]];
export function logoSvg(nombre, seed) {
  const [bg, fg] = PALETA[hash(seed) % PALETA.length];
  const ini = nombre.split(/\s+/).filter((w) => w.length > 2 && !/^(del|los|las|y|de|la|el|and)$/i.test(w)).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || nombre.slice(0, 2).toUpperCase();
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'><rect width='120' height='120' rx='26' fill='${bg}'/><text x='60' y='76' font-family='Arial,Helvetica,sans-serif' font-size='${ini.length > 1 ? 46 : 56}' font-weight='700' fill='${fg}' text-anchor='middle'>${ini}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/* ── Horas ── */
export const RANGOS = (...r) => r; // [[a,b],...]
export function horarioSQL(id, semana) { // semana: 7 entradas (0 = domingo) de null o [[a,b],...]
  return semana.map((r, d) => `insert into business_hours (business_id, weekday, open, ranges) values (${q(id)}, ${d}, ${r ? "true" : "false"}, ${q(JSON.stringify(r ?? []))}::jsonb);`).join("\n");
}

/* ── Fechas relativas: el SQL calcula todo contra «hoy» de la ciudad; aquí solo se manejan días atrás y minutos del día ── */
export const HOY = new Date(Date.UTC(2026, 10, 17)); // 17 nov 2026: ancla del generador (el SQL usa now() del sandbox)
export const diasEntre = (y, m, d) => Math.round((Date.UTC(y, m - 1, d) - HOY.getTime()) / 86400000);

/* Un día aleatorio de la vida del negocio (más reciente = más operaciones): offset negativo respecto a hoy. */
export function diaDeVida(r, fundado, pasoRec = 0.33) {
  const anios = []; for (let y = fundado; y <= 2026; y++) anios.push([y, 1 + (y - fundado) * pasoRec * 1.6 + (y >= 2024 ? 1.4 : 0)]);
  const y = r.weighted(anios);
  const ini = y === fundado ? diasEntre(y, r.int(3, 10), 1) : diasEntre(y, 1, 1), fin = y === 2026 ? -1 : diasEntre(y, 12, 31);
  return r.int(ini, Math.max(ini, fin));
}

/* ── Tienda de nombres ── */
export const dedupe = (usados, id) => { let x = id, n = 2; while (usados.has(x)) x = `${id}-${n++}`; usados.add(x); return x; };

/* ── VIN con dígito verificador (misma cuenta que vin_valido / vinValido) ── */
const VIN_PESOS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2], VIN_LETRAS = "ABCDEFGHJKLMNPRSTUVWXYZ", VIN_VALORES = "12345678123457923456789";
export function vinValido(v) { if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(v)) return false; let s = 0; for (let i = 0; i < 17; i++) { const ch = v[i]; const n = /[0-9]/.test(ch) ? Number(ch) : Number(VIN_VALORES[VIN_LETRAS.indexOf(ch)]); s += n * VIN_PESOS[i]; } const rr = s % 11; return v[8] === (rr === 10 ? "X" : String(rr)); }
const VIN_ANIO = "ABCDEFGHJKLMNPRSTVWXY123456789";
export const letraAnio = (y) => VIN_ANIO[(((y - 1980) % 30) + 30) % 30];
export function crearVin(wmi, vds5, year, planta, serie) {
  const base = `${wmi}${vds5}0${letraAnio(year)}${planta}${String(serie).padStart(6, "0")}`;
  let s = 0; for (let i = 0; i < 17; i++) { if (i === 8) continue; const ch = base[i]; const n = /[0-9]/.test(ch) ? Number(ch) : Number(VIN_VALORES[VIN_LETRAS.indexOf(ch)]); s += n * VIN_PESOS[i]; }
  const rr = s % 11, v = base.slice(0, 8) + (rr === 10 ? "X" : String(rr)) + base.slice(9);
  if (!vinValido(v)) throw new Error("VIN inválido " + v);
  return v;
}

/* ── Vivienda justa: las mismas frases que frena la app, para revisar nuestro propio texto ── */
const FRASES = [...new Set(fs.readFileSync(path.join(AQUI, "frases-vivienda.txt"), "utf8").split("\n").filter(Boolean))];
const norm = (s) => ` ${s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
export function frenada(...textos) { const T = norm(textos.filter(Boolean).join(" · ")); return FRASES.find((f) => norm(f).trim().length >= 3 && T.includes(norm(f))) ?? null; }
export const PROT = /\b(familias?|ni[nñ]os?|kids|children|famil(y|ies)|religi[oó]n|religion|cristian[oa]s?|cat[oó]lic[oa]s?|raza|race|sexo|g[eé]nero|gender|nacionalidad|inmigrantes?|immigrants?|hispan[oa]s?|latin[oa]s?|discapacidad|disability|parejas?|couples?|solter[oa]s?|singles?|adultos|adults|edad)\b/i;
