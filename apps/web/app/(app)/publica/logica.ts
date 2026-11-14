/* Lógica de «Publica tu negocio v2», llevada del diseño (To'Latino Publica tu negocio v2.dc.html) sin cambiar las reglas.
   Pura: la usan la pantalla y el servidor al publicar. Las reglas de cada categoría vienen de lib/onb/datos.ts (prototipo).
   Lo que el prototipo fijaba (hoy = jueves 12:30) aquí es la hora real de la ciudad. */
import { TLOnbFlow as Fl, TLOnbNeg as X } from "@/lib/onb/datos";

export const SEQ = ["B1", "C1", "D1", "E1", "F1"] as const;
export type Paso = "A1" | (typeof SEQ)[number] | "H1";
export type Dia = { on: boolean; a: number; b: number; two: boolean; a2: number; b2: number };
export type Cust = { n: string; p: number | string; u: string; dur: number };
export type Borrador = {
  semilla?: string | null; // «Reclámalo gratis» desde una semilla (negocio que recomendó un vecino)
  v: 2; last: string; reach: number; started: boolean; t0: number; name: string; cat: string | null; subs: string[];
  own: Record<string, unknown>; sel: Record<string, { on?: boolean; p?: number | string; flag?: boolean; alt?: number | null }>; cust: Cust[];
  via: string; op: string | null; addr: string; ref: string; zone: number; join: string | null; joinName: string; days: Dia[] | null;
  tpl: string | null; cita: boolean; cover: string | null; gallery: string[]; promo: string; promoOk: boolean; promoDias?: number;
};
export const D0 = (): Borrador => ({ v: 2, last: "B1", reach: 0, started: false, t0: 0, name: "", cat: null, subs: [], own: {}, sel: {}, cust: [], via: "list", op: null, addr: "", ref: "", zone: 10, join: null, joinName: "", days: null, tpl: null, cita: false, cover: null, gallery: [], promo: "", promoOk: false });
export const DAYS = [["Lun", "Mon", "Lunes", "Monday"], ["Mar", "Tue", "Martes", "Tuesday"], ["Mié", "Wed", "Miércoles", "Wednesday"], ["Jue", "Thu", "Jueves", "Thursday"], ["Vie", "Fri", "Viernes", "Friday"], ["Sáb", "Sat", "Sábado", "Saturday"], ["Dom", "Sun", "Domingo", "Sunday"]] as const;
export const TILES = [["NEG-FOOD", "Comida", "Food", "restaurant"], ["NEG-BELL", "Belleza", "Beauty", "scissors"], ["NEG-AUTO", "Auto", "Auto", "car"], ["NEG-HOGAR", "Hogar", "Home", "wrench"], ["NEG-MERC", "Mercados", "Markets", "cart"], ["NEG-TIENDA", "Tiendas", "Shops", "bag"], ["NEG-FIESTA", "Fiestas", "Parties", "party"]] as const;
export const ZERO: Record<string, [string, string]> = { cover: ["Gratis", "Free"], fee: ["Gratis", "Free"], min: ["Sin mínimo", "None"], dep: ["Sin depósito", "None"], day: ["No vendes", "None"], mesas: ["No", "No"] };
export const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
export const dig = (v: unknown) => String(v ?? "").replace(/\D/g, "");
export const fmtPh = (v: string) => { const d = dig(v).slice(0, 10); return d.length < 4 ? d : d.length < 7 ? `(${d.slice(0, 3)}) ${d.slice(3)}` : `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`; };

/* Hoy (lunes = 0) y la hora con fracción en la zona de la ciudad. */
export function ahora(tz = "America/New_York") {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", hour: "numeric", minute: "numeric", hour12: false }).formatToParts(new Date());
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "0";
  const wd = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(g("weekday"));
  return { hoy: wd < 0 ? 0 : wd, hora: (Number(g("hour")) % 24) + Number(g("minute")) / 60 };
}

export const F = (d: Borrador) => (d.cat ? Fl.of(d.cat) : null);
export const own = (d: Borrador): Record<string, unknown> => (d.cat ? Fl.answers(d.cat, d.own, d) : d.own || {});
export const subL = (cat: string | null, sub: string, es: boolean) => { const s = cat ? Fl.subsOf(cat).find((x: string[]) => x[2] === sub) : null; return s ? (es ? s[0] : s[1]) : sub; };
export function opOf(d: Borrador): string {
  const f = F(d); if (!f) return d.op || "local";
  const o = Fl.opFrom(d.cat, d.own); if (o) return o;
  if (d.op === "rento" && (!f.ops || f.ops.some((x: { v: string }) => x.v === "rento") || d.cat === "NEG-BELL")) return "rento";
  if (!f.ops) return "local";
  if (d.op && f.ops.some((x: { v: string }) => x.v === d.op)) return d.op;
  return f.opDef || f.ops[0].v;
}
export const needZone = (op: string) => op === "casa" || op === "ambos";
export function zoneOf(d: Borrador) { const f = F(d); if (f && f.zoneFrom) { const z = Number(own(d)[f.zoneFrom]); if (z) return z; } return Number(d.zone) || 10; }
export const daysOf = (d: Borrador): Dia[] => d.days || (d.cat ? Fl.hours(d.cat, d.own) : [0, 1, 2, 3, 4, 5, 6].map((i) => ({ on: i < 5, a: 9, b: 18, two: false, a2: 17, b2: 21 })));
export function fmt(h: number) { const H = ((h % 24) + 24) % 24, hh = Math.floor(H), m = Math.round((H - hh) * 60); return `${hh % 12 || 12}${m ? ":" + String(m).padStart(2, "0") : ""} ${hh < 12 ? "AM" : "PM"}`; }

export function status(d: Borrador, es: boolean, days = daysOf(d), t = ahora()) {
  const E2 = (a: string, b: string) => (es ? a : b), TODAY = t.hoy, NOW = t.hora;
  if (!days.some((x) => x.on)) return { k: "none", l: E2("Horario", "Hours"), n: E2("POR DEFINIR", "NOT SET"), s: E2("Horario por definir", "Hours not set"), c: "rgba(11,14,18,.55)", dot: "rgba(11,14,18,.25)" };
  if (d.cita) return { k: "cita", l: E2("Por cita", "By appt."), n: E2("SOLO CITA", "APPOINTMENT ONLY"), s: E2("Solo con cita", "By appointment only"), c: "var(--tl-ink)", dot: "var(--tl-action)" };
  const x = days[TODAY]!, y = days[(TODAY + 6) % 7]!;
  const open = (cl: number) => ({ k: "open", l: E2("Abierto", "Open"), n: E2("CIERRA ", "CLOSES ") + fmt(cl), s: E2("Abierto · cierra ", "Open · closes ") + fmt(cl), c: "var(--tl-open-text)", dot: "var(--tl-open)" });
  if (y.on && y.b > 24 && NOW < y.b - 24) return open(y.b);
  if (x.on && NOW >= x.a && NOW < x.b) return open(x.b);
  let nx: string | null = null; if (x.on && NOW < x.a) nx = E2("hoy ", "today ") + fmt(x.a);
  for (let i = 1; !nx && i <= 7; i++) { const j = (TODAY + i) % 7; if (days[j]!.on) nx = (i === 1 ? E2("mañana ", "tomorrow ") : (es ? DAYS[j]![2].toLowerCase() : DAYS[j]![3]) + " ") + fmt(days[j]!.a); }
  return { k: "closed", l: E2("Cerrado", "Closed"), n: (E2("ABRE ", "OPENS ") + nx).toUpperCase(), s: E2("Cerrado · abre ", "Closed · opens ") + nx, c: "var(--tl-danger)", dot: "var(--tl-danger)" };
}

export type Fila = { key: string; n: [string, string]; u: string; dur: number; lo: number; hi: number; p: number; on: boolean; m?: [string, string]; praw?: string | null; flag?: boolean; alt?: number | null; cust?: 1 };
export function rows(d: Borrador): Fila[] {
  if (!d.cat) return [];
  const S = d.sel || {};
  return Fl.list(d.cat, d.subs, d.own).map((it: Fila) => { const s = S[it.key]; return { ...it, on: s && s.on != null ? !!s.on : it.on, p: s && s.p != null ? Number(s.p) || 0 : it.p, praw: s && typeof s.p === "string" ? s.p : null, flag: !!(s && s.flag), alt: s && s.alt }; });
}
export const items = (d: Borrador): Fila[] => rows(d).filter((r) => r.on).concat((d.cust || []).map((c, i) => ({ key: "c:" + i, n: [c.n, c.n] as [string, string], u: c.u || "fijo", dur: Number(c.dur) || 0, p: Number(c.p) || 0, lo: 0, hi: 0, on: true, cust: 1 as const })));
export const money = (p: number | string) => { const n = Number(p) || 0; return "$" + (n % 1 ? n.toFixed(2) : n.toLocaleString("en-US")); };
export function priceL(it: Fila, es: boolean) {
  const E2 = (a: string, b: string) => (es ? a : b), p = money(it.p);
  return ({ gratis: E2("Gratis", "Free"), desde: E2("Desde ", "From ") + p, lb: p + "/lb", hora: p + E2("/hora", "/hr"), visita: E2("Visita ", "Visit ") + p, mes: p + E2("/mes", "/mo"), semana: p + E2("/semana", "/wk"), dia: p + E2("/día", "/day"), clase: p + E2("/clase", "/class"), asiento: p + E2("/asiento", "/seat"), don: E2("Donativo ", "Donation ") + p } as Record<string, string>)[it.u] || p;
}
export const durL = (m: number) => { if (!m) return ""; if (m < 60) return m + " MIN"; const h = Math.floor(m / 60), r = m % 60; return h + " H" + (r ? " " + r : ""); };
export function uL(u: string, es: boolean) {
  const E2 = (a: string, b: string) => (es ? a : b);
  return ({ desde: E2("DESDE", "FROM"), lb: E2("POR LIBRA", "PER POUND"), hora: E2("POR HORA", "PER HOUR"), visita: E2("POR VISITA", "PER VISIT"), mes: E2("AL MES", "MONTHLY"), semana: E2("POR SEMANA", "WEEKLY"), dia: E2("POR DÍA", "PER DAY"), clase: E2("POR CLASE", "PER CLASS"), asiento: E2("POR ASIENTO", "PER SEAT"), viaje: E2("POR VIAJE", "PER TRIP"), curso: E2("EL CURSO", "PER COURSE"), venta: E2("PRECIO", "PRICE"), don: E2("DONATIVO", "DONATION") } as Record<string, string>)[u] || "";
}
export function metaOf(it: Fila, typ: boolean, es: boolean) {
  const m = it.m ? it.m[es ? 0 : 1] : durL(it.dur), u = it.u === "gratis" ? "" : uL(it.u, es);
  const tp = typ && it.hi > 0 ? (es ? "TÍPICO " : "TYPICAL ") + money(it.lo) + "–" + money(it.hi).slice(1) : "";
  return [m, u, tp].filter(Boolean).join(" · ");
}
export function stepOf(p: number | string, it?: Fila) { if (it && (Number(it.lo) % 1 || Number(it.hi) % 1 || Number(it.p) % 1)) return 0.1; const n = Number(p) || 0; return n < 20 ? 1 : n < 100 ? 5 : n < 500 ? 10 : n < 2000 ? 50 : n < 10000 ? 100 : 500; }
export function descEs(it: Fila) {
  const m = it.m ? cap(it.m[0].toLowerCase()) : it.dur ? it.dur + " min" : "";
  const U: Record<string, string> = { desde: "El precio final depende del trabajo", lb: "Por libra", hora: "Por hora", visita: "Por visita", mes: "Al mes", semana: "Por semana", dia: "Por día", clase: "Por clase", asiento: "Por asiento", viaje: "Por viaje", curso: "Precio del curso completo", gratis: "Gratis", don: "Donativo sugerido" };
  return [m, U[it.u] || ""].filter(Boolean).join(" · ");
}
export function locOk(d: Borrador) {
  const op = opOf(d); if (op === "casa") return true;
  if (op === "rento") return !!(d.join || (d.joinName || "").trim().length >= 2) && (d.addr || "").trim().length >= 4;
  return (d.addr || "").trim().length >= 4;
}
/* ¿Se puede seguir? (mismas reglas del prototipo; el servidor las vuelve a pasar al publicar). */
export function ok(st: string, d: Borrador, dupPendiente = false) {
  if (st === "B1") return !!d.cat && (d.subs || []).length > 0 && (d.name || "").trim().length >= 2 && !dupPendiente;
  if (st === "C1") return Fl.valid(d.cat, d.own, d);
  if (st === "D1") return items(d).length > 0;
  if (st === "E1") return locOk(d) && daysOf(d).some((x) => x.on);
  if (st === "F1") return !!d.cover;
  return true;
}
export const derive = (d: Borrador) => (d.cat ? Fl.derive({ ...d, op: opOf(d) }) : { mods: {}, amen: [], tags: [], cx: {}, tool: {} });
export { Fl, X };
