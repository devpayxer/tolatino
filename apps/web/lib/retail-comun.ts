/* Tu herramienta de Mercados («Balanza y pedidos») y Tiendas («Tallas y apartados"). Tipos y textos que comparten el
   servidor, el panel y el Super Admin (sin acceso a la base). Plan: docs/diseno/plan/fase4-mercados-tiendas.md §6. */
type Bi = { es: string; en: string };
export type ProdHerr = { id: string; name: Bi; price: number; peso: boolean; ago: boolean };
export type HerrMerc = {
  rubro: "merc"; pk: boolean; env: boolean; fee: number; min: number; ebt: boolean; cash: boolean; pesa: boolean;
  sub: "call" | "similar" | "no"; cap: number; prods: ProdHerr[]; cambiado: boolean;
};
export type TallaHerr = { id: string; label: string; stock: number };
export type HerrTienda = {
  rubro: "tienda"; hold: 24 | 48 | 72; lay: boolean; down: number; pagos: number; cada: 7 | 14 | 30; cargo: number; dev: number; cash: boolean;
  inv: { id: string; name: Bi; label: Bi; tallas: TallaHerr[] }[]; cambiado: boolean;
};
export type HerrRetail = HerrMerc | HerrTienda;

const usd = (c: number) => `$${(c / 100).toFixed(2)}`;
/* La línea de Lo que vendes y del 360 del Super Admin (dash2-cat.js summary). */
export function resumenRetail(h: HerrRetail, es: boolean): string {
  const E2 = (a: string, b: string) => (es ? a : b);
  if (h.rubro === "merc") {
    const a = h.prods.filter((p) => p.ago).length;
    return [h.pk ? "Pickup" : "", h.env ? `${E2("envío ", "delivery ")}${h.fee ? usd(h.fee) : E2("gratis", "free")}${h.min ? `${E2(" · mínimo ", " · min ")}${usd(h.min)}` : ""}` : "", h.ebt ? "EBT" : "", h.cash ? E2("efectivo", "cash") : ""]
      .filter(Boolean).join(" · ") + (a ? E2(` · ${a} agotados hoy`, ` · ${a} sold out today`) : "");
  }
  const z = h.inv.reduce((n, it) => n + it.tallas.filter((t) => t.stock === 0).length, 0);
  return `${E2("Aparta ", "Holds ")}${h.hold} h${h.lay ? " · layaway" : ""}${h.dev ? `${E2(" · cambios ", " · returns ")}${h.dev}${E2(" días", " days")}` : E2(" · sin cambios", " · no returns")}${h.cash ? E2(" · efectivo", " · cash") : ""}${z ? E2(` · ${z} tallas agotadas`, ` · ${z} sizes out`) : ""}`;
}
