/* Doctores y Profesionales · lo que comparten servidor y panel (4h-2, fase4-salud-pro.md §6). Sin acceso a la base.
   Tipo de profesional (neg-pro-kind.js kind): sale de la primera subcategoría. Los legales llevan licencias, «lo que no
   haces» y EL TOTAL, POR ESCRITO; los demás, días de entrega, garantía, presupuesto antes o las compañías con que trabajan. */
export type Bi = { es: string; en: string };
export type ProKind = "inm" | "doc" | "tax" | "injury" | "penal" | "fam" | "law" | "fin" | "seg" | "repair" | "print" | "money" | "biz" | "digital" | "ofic" | "build" | "svc";
const PK: [number, number, ProKind][] = [[1, 2, "inm"], [3, 3, "doc"], [4, 4, "law"], [5, 6, "fam"], [7, 8, "penal"], [9, 10, "injury"], [11, 12, "law"], [13, 13, "fam"], [14, 14, "penal"],
  [15, 18, "doc"], [19, 24, "tax"], [25, 26, "biz"], [27, 30, "seg"], [31, 33, "money"], [34, 37, "fin"], [38, 38, "digital"], [39, 41, "print"], [42, 45, "digital"], [46, 48, "repair"],
  [49, 50, "biz"], [51, 53, "svc"], [54, 55, "biz"], [56, 59, "build"], [60, 60, "ofic"]];
export function proKind(subs: string[]): ProKind {
  for (const s of subs ?? []) { const m = /^NEG-PRO-(\d{2})$/.exec(s); if (!m) continue; const n = Number(m[1]), r = PK.find((x) => n >= x[0] && n <= x[1]); if (r) return r[2]; }
  return "law";
}
export const PRO_LEGAL: ProKind[] = ["inm", "doc", "tax", "injury", "penal", "fam", "law", "fin"];
/* Valores de partida por tipo (neg-pro-kind.js DEF); los demás tipos: 2 días, sin garantía, presupuesto antes. */
export const PRO_DEF: Partial<Record<ProKind, { days: number; warr: number; est: boolean }>> = {
  repair: { days: 1, warr: 90, est: true }, print: { days: 2, warr: 0, est: true }, digital: { days: 14, warr: 30, est: true }, build: { days: 21, warr: 0, est: true }, biz: { days: 7, warr: 0, est: true },
};
export const LANGS_SALUD: [string, string][] = [["es", "Español"], ["en", "English"], ["pt", "Português"], ["ht", "Kreyòl"]];

export type Aseguradora = { key: string; kind: "pub" | "priv"; name: Bi };
export type HerrSalud = {
  rubro: "salud"; ins: string[]; sin: boolean; cash: number; langs: string[]; tele: boolean; nuevos: boolean; walk: boolean; wait: number; escala: boolean; sinid: boolean; interp: boolean; cat: Aseguradora[];
};
export type GovLinea = { id: string; name: Bi; cents: number; gov: number };
export type HerrPro = { rubro: "pro"; kind: ProKind; legal: boolean; days: number; warr: number; est: boolean; cos: number; cmp: boolean; plan: boolean; urgente: boolean; gov: GovLinea[] };
export type HerrSP = HerrSalud | HerrPro;

/* El resumen de la fila de Lo que vendes y del Super Admin (dash2-cat.js summary). */
export function resumenSP(h: HerrSP, es: boolean, lic?: { ok: number; rev: number }): string {
  const E2 = (a: string, b: string) => (es ? a : b);
  if (h.rubro === "salud") {
    return `${h.ins.length}${E2(" seguros", " insurers")}${h.sin ? E2(` · sin seguro $${h.cash / 100}`, ` · uninsured $${h.cash / 100}`) : ""}${h.walk ? E2(` · espera ~${h.wait} min`, ` · wait ~${h.wait} min`) : ""}`
      + `${h.escala ? E2(" · según ingresos", " · income-based") : ""}${h.sinid ? E2(" · sin papeles", " · no papers") : ""}${h.nuevos ? "" : E2(" · sin pacientes nuevos", " · no new patients")} · ${h.langs.map((l) => l.toUpperCase()).join(" · ")}`;
  }
  const ok = lic?.ok ?? 0, rv = lic?.rev ?? 0;
  if (!h.legal) {
    const base = h.kind === "seg" ? `${h.cos}${E2(" compañías", " insurers")}${h.cmp ? E2(" · compara precios", " · compares prices") : ""}`
      : `${h.days <= 1 ? E2("Listo el mismo día", "Ready the same day") : E2(`Listo en ${h.days} días`, `Ready in ${h.days} days`)}${h.warr ? E2(` · garantía ${h.warr} días`, ` · ${h.warr}-day warranty`) : ""}${h.est ? E2(" · presupuesto antes", " · estimate first") : ""}`;
    return `${base}${ok ? E2(` · ${ok} licencia${ok === 1 ? "" : "s"}`, ` · ${ok} license${ok === 1 ? "" : "s"}`) : ""}`;
  }
  return `${ok}${ok === 1 ? E2(" licencia verificada", " verified license") : E2(" licencias verificadas", " verified licenses")}${rv ? E2(` · ${rv} en revisión`, ` · ${rv} in review`) : ""}`;
}

/* «Acepta Medicaid, Medicare, CHIP y 4 más» (la nota de Tu herramienta y la tarjeta de Buscar). */
export function aceptaTexto(h: HerrSalud, es: boolean): string {
  const nm = (k: string) => { const x = h.cat.find((c) => c.key === k); return x ? (es ? x.name.es : x.name.en) : k; };
  const L = h.ins.slice(0, 3).map(nm).join(", "), m = h.ins.length - 3;
  return es ? `Acepta ${L}${m > 0 ? ` y ${m} más` : ""}` : `Takes ${L}${m > 0 ? ` and ${m} more` : ""}`;
}
