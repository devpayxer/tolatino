/* Lo que ve el cliente de un servicio de Auto u Hogar: precio y detalle (diseño TLASvc.priceL / metaL y TLHogarBook.priceL /
   metaOf). Lo usan el panel («Así lo ve el cliente»), la ficha y el Booking. Sin server-only: sirve en los dos lados. */
import type { Attrs } from "./oficios";
type S = { k: string; cents: number; dur: number | null; a: Attrs };
const money = (c: number) => { const d = (Number(c) || 0) / 100; return `$${d % 1 ? d.toFixed(2) : Math.round(d).toLocaleString("en-US")}`; };
const UNIT: Record<string, [string, string]> = { pie2: ["pie²", "sq ft"], cuarto: ["cuarto", "room"], salida: ["salida", "vent"] };
const WL: Record<string, [string, string]> = { espera: ["Esperas", "You wait"], deja: ["Lo dejas", "Drop off"], ambos: ["Esperas o lo dejas", "Wait or drop off"], dom: ["A domicilio", "Mobile"], call: ["Llamas", "You call"] };
export function precioL(s: Pick<S, "k" | "cents" | "a">, es: boolean) {
  const E2 = (x: string, y: string) => (es ? x : y), a = s.a ?? {};
  if (s.k === "cotiza") return E2("Se cotiza", "Quoted");
  if (s.k === "lav" && a.sz) return `${E2("Desde ", "From ")}${money(a.sz[0])}`;
  if (s.k === "hora") return `${money(s.cents)}/h`;
  if (s.k === "area") return `${money(s.cents)}/${UNIT[a.u ?? "pie2"]![es ? 0 : 1]}`;
  if (s.k === "plan") return `${money(s.cents)}${a.fr === "temp" ? E2("/temporada", "/season") : E2("/mes", "/mo")}`;
  if (!s.cents) return E2("Gratis", "Free");
  return `${s.k === "desde" ? E2("Desde ", "From ") : ""}${money(s.cents)}`;
}
export const cuandoL = (s: Pick<S, "dur" | "a">, es: boolean) => { const d = s.a?.days, E2 = (x: string, y: string) => (es ? x : y); if (d) return d[0] === d[1] ? `${d[0]}${d[0] === 1 ? E2(" día", " day") : E2(" días", " days")}` : `${d[0]}–${d[1]}${E2(" días", " days")}`; const m = s.dur ?? 0; return m ? (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}`) : ""; };
export function detalleL(r: "auto" | "hogar", s: S, es: boolean) {
  const E2 = (x: string, y: string) => (es ? x : y), a = s.a ?? {}, L: string[] = [];
  if (r === "auto") {
    L.push(cuandoL(s, es), a.walk ? E2("Sin cita", "Walk-in") : WL[a.w ?? "espera"]![es ? 0 : 1]);
    if (a.per) L.push({ eje: E2("por eje", "per axle"), goma: E2("por goma", "per tire"), sensor: E2("por sensor", "per sensor") }[a.per]);
    if (s.k === "desde") L.push(E2("final en el estimado", "final in the estimate"));
    if (s.k === "cotiza" && a.rng) L.push(`${E2("suele ser ", "usually ")}${money(a.rng[0])}–${money(a.rng[1])}`);
    if (s.k === "diag" && a.cred) L.push(E2("se descuenta si lo arreglas aquí", "credited if fixed here"));
    if (s.k === "diag" && !s.cents && a.alt) L.push(`${E2("gratis con el arreglo · si no, ", "free with the repair · otherwise ")}${money(a.alt)}`);
  } else {
    if (s.k === "visita") L.push(a.free ? `${E2("gratis si lo arreglan · si no, ", "free with the repair · otherwise ")}${money(s.cents)}` : `${E2("visita", "visit")}${a.cred ? E2(" · se descuenta si lo arreglan", " · credited if they fix it") : ""}`);
    if (s.k === "fijo") L.push(cuandoL(s, es), E2("precio cerrado", "fixed price"));
    if (s.k === "hora") L.push(`${E2("mínimo ", "minimum ")}${a.mh ?? 1} h`, E2("materiales aparte", "materials extra"));
    if (s.k === "area") L.push(cuandoL(s, es), `${E2("mínimo ", "minimum ")}${money(a.min ?? s.cents)}`);
    if (s.k === "pres") L.push(E2("presupuesto en tu casa", "estimate at your home"), a.rng ? `${E2("suele ser ", "usually ")}${money(a.rng[0])}–${money(a.rng[1])}` : "", cuandoL(s, es));
    if (s.k === "emer") L.push("24/7", a.sur ? E2(`incluye recargo de ${money(a.sur)}`, `includes ${money(a.sur)} surcharge`) : "");
    if (s.k === "plan") L.push(a.fr === "temp" ? E2("por temporada", "per season") : E2("cada mes", "monthly"), E2("cancelas cuando quieras", "cancel any time"));
  }
  return L.filter(Boolean).join(" · ");
}

