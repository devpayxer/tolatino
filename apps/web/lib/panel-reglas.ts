/* Reglas puras del panel del negocio (Panel v2): fuerza del perfil, fases de la prueba Pro y conversión del horario.
   Sin base ni red: las usa el servidor para calcular y las pruebas para comprobar. */
import { FOTOS_FREE } from "./plan";

type Bi = [string, string];

/* ── Fuerza del perfil (prototipo strength(), L989) ───────────────────────────────────────────────────────────────
   11 reglas, 70 puntos; puntaje = 30 + puntos obtenidos (30 a 100). Las tareas salen en el orden de la tabla. */
export type EntradaFuerza = {
  items: number; itemsW: Bi; galeria: number; about: boolean; logo: boolean; sello: boolean; correo: boolean;
  faqs: number; resenasSinResponder: number; equipo: number; aDomicilio: boolean; diasAbiertos: number; amenidades: number; pro: boolean;
};
export type Tarea = { p: number; part: string; t: Bi; g: Bi };
export function fuerza(x: EntradaFuerza): { sc: number; tasks: Tarea[] } {
  const T: [boolean, number, string, Bi, Bi][] = [
    [x.items >= 3, 12, "mod", [`Agrega 3 o más ${x.itemsW[0]}`, `Add 3 or more ${x.itemsW[1]}`], ["Con 3 o más, la gente compara y se decide.", "With 3 or more, people compare and decide."]],
    [x.galeria >= 5, 10, "fotos", ["Sube 5 fotos de tu trabajo", "Upload 5 photos of your work"], ["Con 5+ fotos recibes 3× más contactos.", "5+ photos get 3× more contacts."]],
    [x.about, 8, "about", ["Cuenta quiénes son", "Say who you are"], ["La gente elige a quien conoce.", "People choose who they know."]],
    [x.logo, 4, "fotos", ["Pon tu logo", "Add your logo"], ["Así te reconocen en la lista.", "So people recognize you in the list."]],
    [x.sello, 6, "ver", ["Pide el sello Verificado", "Request the Verified badge"], ["El check azul junto a tu nombre.", "The blue check next to your name."]],
    [x.correo, 4, "ver", ["Verifica tu correo", "Verify your email"], ["Para recibos y recuperar tu cuenta.", "For receipts and account recovery."]],
    [x.faqs > 0 || !x.pro, 4, "faq", ["Responde 2 preguntas frecuentes", "Answer 2 FAQs"], ["Ahorras llamadas que preguntan lo mismo.", "Fewer calls asking the same thing."]],
    [x.resenasSinResponder === 0 || !x.pro, 6, "resenas", ["Responde tus reseñas críticas", "Reply to critical reviews"], ["La respuesta se ve tanto como la reseña.", "The reply shows as much as the review."]],
    [x.equipo > 0 || x.aDomicilio, 4, "equipo", ["Agrega a tu equipo", "Add your team"], ["Cada persona con su perfil.", "Each person with a profile."]],
    [x.diasAbiertos > 0, 8, "hor", ["Pon tu horario", "Set your hours"], ["", ""]],
    [x.about && x.amenidades > 0, 4, "about", ["Marca lo que hay en tu negocio", "Mark what your place offers"], ["Estacionamiento, tarjeta, para niños…", "Parking, cards, kid friendly…"]],
  ];
  const base = 30, got = T.reduce((a, t) => a + (t[0] ? t[1] : 0), 0), max = T.reduce((a, t) => a + t[1], 0);
  return { sc: Math.round(base + ((100 - base) * got) / max), tasks: T.filter((t) => !t[0]).map((t) => ({ p: t[1], part: t[2], t: t[3], g: t[4] })) };
}

/* ── Prueba Pro (pro-trial.js TLTrial.of) ─────────────────────────────────────────────────────────────────────────
   build (días 0–19) → d20 (día ≥ 20) → d25 (quedan ≤ 5) → last (queda ≤ 1). */
const D = 86_400_000;
export type Prueba = { on: boolean; day: number; left: number; start: string; end: string; phase: "build" | "d20" | "d25" | "last" | "ended" };
export function prueba(until: string | null | undefined, dias: number | null | undefined, ahora = Date.now()): Prueba | null {
  if (!until) return null;
  const end = Date.parse(until);
  if (!Number.isFinite(end)) return null;
  const len = dias && dias > 0 ? dias : 30, start = end - len * D;
  const day = Math.max(0, Math.floor((ahora - start) / D)), left = Math.max(0, Math.ceil((end - ahora) / D));
  const on = ahora < end;
  const phase = !on ? "ended" : left <= 1 ? "last" : left <= 5 ? "d25" : day >= 20 ? "d20" : "build";
  return { on, day, left, start: new Date(start).toISOString(), end: new Date(end).toISOString(), phase };
}

/* Lo que se duerme el día 30 (TLTrial.inv … short), con los números reales del negocio. */
export function seDuerme(x: { galeria: number; equipo: number; items: number; itemsW: Bi; itemsFree: number }, es: boolean) {
  const sh: string[] = [];
  if (x.items > x.itemsFree) { const n = x.items - x.itemsFree; sh.push(es ? `${n} de tus ${x.items} ${x.itemsW[0]}` : `${n} of your ${x.items} ${x.itemsW[1]}`); }
  if (x.galeria > FOTOS_FREE) sh.push(es ? `${x.galeria - FOTOS_FREE} fotos` : `${x.galeria - FOTOS_FREE} photos`);
  if (x.equipo > 0) sh.push(es ? "tu equipo" : "your team");
  if (!sh.length) sh.push(es ? "tus pestañas y novedades" : "your tabs and updates");
  return nombres(sh, es);
}
export const nombres = (l: string[], es: boolean) => (l.length < 2 ? l[0] ?? "" : `${l.slice(0, -1).join(", ")}${es ? " y " : " and "}${l[l.length - 1]}`);

/* ── Horario ───────────────────────────────────────────────────────────────────────────────────────────────────────
   En la base: weekday 0 = domingo, ranges [["09:00","18:00"], …] (fin ≤ inicio = pasa de medianoche).
   En el panel (prototipo): índice 0 = lunes, horas en decimal (21.5 = 9:30 PM; hasta 26 = 2 AM del día siguiente). */
export type DiaPanel = { on: boolean; a: number; b: number; two: boolean; a2: number; b2: number };
const dec = (hm: string) => { const [h = 0, m = 0] = hm.split(":").map(Number); return h + m / 60; };
const hm = (x: number) => { const t = Math.round(x * 2) / 2, H = Math.floor(t) % 24, M = t % 1 ? 30 : 0; return `${String(H).padStart(2, "0")}:${M ? "30" : "00"}`; };
export function aPanel(filas: { weekday: number; open: boolean; ranges: [string, string][] }[]): DiaPanel[] {
  return [1, 2, 3, 4, 5, 6, 0].map((wd) => {
    const f = filas.find((x) => x.weekday === wd), r = (f?.ranges ?? []).map(([a, b]) => { const A = dec(a); let B = dec(b); if (B <= A) B += 24; return [A, B] as const; });
    const [r1, r2] = r;
    return { on: !!f?.open && r.length > 0, a: r1?.[0] ?? 9, b: r1?.[1] ?? 18, two: !!r2, a2: r2?.[0] ?? 17, b2: r2?.[1] ?? 21 };
  });
}
export function aBase(dias: DiaPanel[]): { weekday: number; open: boolean; ranges: [string, string][] }[] {
  return dias.map((d, i) => ({ weekday: (i + 1) % 7, open: d.on, ranges: d.on ? ([[hm(d.a), hm(d.b)]] as [string, string][]).concat(d.two ? [[hm(d.a2), hm(d.b2)]] : []) : [] }));
}
/* Un día es válido si: abre entre 5 AM y 26 (2 AM), cierra al menos 30 min después; el 2.º tramo empieza después del 1.º. */
export function diaValido(d: DiaPanel) {
  const ok = (a: number, b: number) => Number.isFinite(a) && Number.isFinite(b) && a >= 0 && b <= 26 && b - a >= 0.5 && (a * 2) % 1 === 0 && (b * 2) % 1 === 0;
  return !d.on || (ok(d.a, d.b) && (!d.two || (ok(d.a2, d.b2) && d.a2 >= d.b && d.b2 - d.a <= 24)));
}
export function fmtHora(h: number) {
  const H = ((h % 24) + 24) % 24, hh = Math.floor(H), m = Math.round((H - hh) * 60), ap = hh < 12 ? "AM" : "PM", h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}${m ? `:${String(m).padStart(2, "0")}` : ""} ${ap}`;
}

/* ── Equipo (dash2-stf.js) ─────────────────────────────────────────────────────────────────────────────────────────
   Horario de una persona: 7 entradas por día de la semana JS (0 = domingo), [entra, sale] en horas decimales o null. */
export type Semana = ([number, number] | null)[];
/* El horario del negocio en ese formato (hoursWk): del primer tramo al último. */
export function semanaNegocio(dias: DiaPanel[]): Semana {
  return [0, 1, 2, 3, 4, 5, 6].map((js) => { const h = dias[(js + 6) % 7]; return h && h.on ? [h.a, h.two ? h.b2 : h.b] : null; });
}
/* Hoy, como lo ve el cliente (TLStf.today): k 0 = en turno, 1 = entra hoy, 2 = no trabaja hoy. */
export function hoyPersona(wk: Semana | null, dow: number, ahora: number, es: boolean): { k: number; l: string } {
  const E2 = (a: string, b: string) => (es ? a : b), DL = es ? ["el domingo", "el lunes", "el martes", "el miércoles", "el jueves", "el viernes", "el sábado"] : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const t = (wk ?? [])[dow];
  if (t && ahora >= t[0] && ahora < t[1]) return { k: 0, l: E2("En turno · hasta ", "On shift · until ") + fmtHora(t[1]) };
  if (t && ahora < t[0]) return { k: 1, l: E2("Hoy entra a las ", "Starts today at ") + fmtHora(t[0]) };
  let k = 1;
  while (k < 8 && !(wk ?? [])[(dow + k) % 7]) k++;
  if (k >= 8) return { k: 2, l: E2("Sin horario", "No schedule") };
  const nx = wk![(dow + k) % 7]!;
  return { k: 2, l: `${t ? E2("Ya salió", "Done for today") : E2("Hoy no trabaja", "Off today")} · ${E2("vuelve ", "back ")}${k === 1 ? E2("mañana", "tomorrow") : DL[(dow + k) % 7]} ${fmtHora(nx[0])}` };
}
export function semanaValida(wk: unknown): wk is Semana {
  return Array.isArray(wk) && wk.length === 7 && wk.every((x) => x === null || (Array.isArray(x) && x.length === 2 && x.every((n) => typeof n === "number" && (n * 2) % 1 === 0) && x[0] >= 5 && x[1] <= 24 && x[1] - x[0] >= 0.5));
}
