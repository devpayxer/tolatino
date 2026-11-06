/* ¿Aceptan tu seguro y cuánto pagas? (neg-salud-listing.js compat / priceFor · plan fase4-salud-pro.md §4i). Sin acceso a la
   base: la usa el servidor (ficha, tarjeta de Buscar, Booking) y el cliente para un seguro «solo esta visita» de quien no
   entró. Nunca bloquea: si no lo aceptan, dice el precio sin seguro. To'Latino no da consejo médico. */
export type Bi = { es: string; en: string };
export type SeguroRef = { kind: "medicaid" | "medicare" | "chip" | "priv" | "none"; insurer: string | null; plan: string | null };
export type CatSeguro = { key: string; kind: "pub" | "priv"; name: Bi; plans: { key: string; name: Bi }[] };
export type Clinica = { ins: string[]; sin: boolean; cash: number; escala: boolean };
export type SvcSalud = { k: string; cents: number; esc: boolean };

export function nombreSeguro(x: SeguroRef, cat: CatSeguro[], es: boolean): string {
  if (x.kind === "none") return es ? "Sin seguro" : "No insurance";
  const c = cat.find((z) => z.key === x.insurer), n = c ? (es ? c.name.es : c.name.en) : x.insurer ?? "";
  if (x.kind === "priv") return n;
  const p = c?.plans.find((z) => z.key === x.plan);
  return p && x.kind !== "chip" ? `${n.replace(/ \(.*\)$/, "")} · ${es ? p.name.es : p.name.en}` : n.replace(/ \(.*\)$/, "");
}
export const aceptan = (c: Clinica, x: SeguroRef) => x.kind !== "none" && (x.kind === "priv" ? !!x.insurer && c.ins.includes(x.insurer) : c.ins.includes(x.kind));
const usd = (c: number) => `$${(c / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

export type Compat = { ok: boolean; sinSeguro: boolean; t: string };
export function compat(c: Clinica, x: SeguroRef | null, cat: CatSeguro[], es: boolean): Compat | null {
  if (!x) return null;
  const E2 = (a: string, b: string) => (es ? a : b), esc = c.escala ? E2(" · o según tus ingresos", " · or income-based") : "";
  const cash = c.sin ? usd(c.cash) : null;
  if (x.kind === "none") return { ok: true, sinSeguro: true, t: (cash ? E2(`Sin seguro: consulta ${cash}`, `No insurance: visit ${cash}`) : E2("Sin seguro: pregunta el precio", "No insurance: ask the price")) + esc };
  const n = nombreSeguro(x, cat, es);
  if (aceptan(c, x)) return { ok: true, sinSeguro: false, t: `${E2("Aceptan tu ", "They take your ")}${n}${x.kind === "medicaid" || x.kind === "chip" ? E2(" · no pagas la consulta", " · no visit charge") : E2(" · pagas tu copago", " · you pay your copay")}` };
  return { ok: false, sinSeguro: false, t: `${E2("No aceptan ", "They do not take ")}${n}${cash ? E2(` · sin seguro ${cash}`, ` · uninsured ${cash}`) : ""}${esc}` };
}

/* El precio de un servicio con el seguro de la persona (o sin él). */
export function precioSalud(it: SvcSalud, c: Clinica, x: SeguroRef | null, es: boolean): { l: string; s: string } {
  const E2 = (a: string, b: string) => (es ? a : b);
  if (it.k === "walk" && !it.cents) return { l: E2("Gratis", "Free"), s: "" };
  const acc = !!x && aceptan(c, x), pub = !!x && (x.kind === "medicaid" || x.kind === "chip");
  if (acc) return it.k === "free" || pub ? { l: "$0", s: E2("CON TU SEGURO", "WITH YOUR INSURANCE") } : { l: E2("Copago", "Copay"), s: E2("SEGÚN TU PLAN", "PER YOUR PLAN") };
  if (it.esc) return { l: `${E2("Desde ", "From ")}${usd(it.cents)}`, s: E2("SEGÚN TUS INGRESOS", "INCOME-BASED") };
  // «Gratis con tu seguro» sin un seguro que lo cubra: se paga la consulta sin seguro.
  const cents = it.k === "free" ? (c.sin ? c.cash : 0) : it.cents;
  return { l: cents ? usd(cents) : E2("Gratis", "Free"), s: x ? E2("SIN SEGURO", "UNINSURED") : E2("SIN SEGURO · CON EL TUYO PUEDE SER MENOS", "UNINSURED · LESS WITH YOURS") };
}
