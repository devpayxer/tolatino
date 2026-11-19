import "server-only";
import { encaja, resaltar, type Entendido } from "@/lib/buscar";
import type { Plato, Razon } from "@/lib/buscar-platos";
import { dosIdiomas } from "@/lib/dos-idiomas";

/* 9t · Buscar › «Platos y servicios»: un plato o servicio hallado como lo pinta la pantalla (prototipo itRow / pvVals): el nombre con lo que
   encajó resaltado, el negocio, «SECCIÓN · 0.8 MI · ABIERTO», el precio (o «Precio en la ficha») y la foto. Abre la ficha del negocio en su
   Menú o en Servicios (en Pro, su pestaña; en Free, la página única donde se listan). */
export type FilaPlato = {
  id: string; plato: boolean; cat: string; parts: [string, string, string]; nombre: string; desc: string; biz: string; bname: string; sec: string;
  meta: string; abierto: boolean; precio: string; img: string | null; href: string; dist: string;
};

const money = (c: number) => `$${(c / 100).toFixed(c % 100 ? 2 : 0)}`;
const sufijo = (unit: string, es: boolean) => { const E2 = (a: string, b: string) => dosIdiomas(es, a, b); return unit === "lb" ? "/lb" : unit === "hora" ? "/h" : unit === "mes" ? E2("/mes", "/mo") : ""; };
export function filaPlato(x: Plato, E: Entendido, es: boolean): FilaPlato {
  const E2 = (a: string, b: string) => dosIdiomas(es, a, b);
  const nombre = (es ? x.name.es : x.name.en || x.name.es) || x.name.es;
  const sec = x.sec ? (es ? x.sec.es : x.sec.en || x.sec.es) || "" : "";
  const dist = x.mi != null ? `${x.mi} MI` : x.zona ? `${E2("A DOMICILIO · ", "COMES TO YOU · ")}${x.zona} MI` : "";
  const precio = x.cents == null ? E2("Precio en la ficha", "Price on listing") : x.cents === 0 ? E2("Gratis", "Free") : `${money(x.cents)}${sufijo(x.unit, es)}`;
  return {
    id: x.id, plato: x.plato, cat: x.cat, parts: resaltar(nombre, E.grupos), nombre, desc: (es ? x.desc.es : x.desc.en || x.desc.es) || "", biz: x.biz, bname: x.bname, sec,
    meta: [sec, dist, x.open ? E2("ABIERTO", "OPEN") : E2("CERRADO", "CLOSED")].filter(Boolean).join(" · ").toUpperCase(),
    abierto: x.open, precio, img: x.foto, href: hrefPlato(x), dist,
  };
}

/* 9t-2 · Abrir lo hallado: un plato abre su hoja en la ficha (prototipo «plato de Sabor → abre el plato en Menú»: ?plato=<id>, que la ficha
   lee al hidratar; en Pro, sobre la pestaña Menú). Un servicio abre la pestaña Servicios en Pro (en Free, la página única donde se listan). */
export function hrefPlato(x: Pick<Plato, "biz" | "pro" | "plato" | "id">) {
  if (x.plato) return `/n/${x.biz}?${x.pro ? "tab=menu&" : ""}plato=${encodeURIComponent(x.id)}`;
  return `/n/${x.biz}${x.pro ? "?tab=svc" : ""}`;
}

/* 9t-2 · La razón de la fila de un negocio que encajó por lo que vende (prototipo bizRow / card: «Tiene Mofongo de chicharrón · $12»). Solo
   cuando su nombre no explica el resultado (el nombre gana, como en el prototipo); el precio, el de la ficha (un servicio no lleva número). */
export function textoRazon(nombreNegocio: string, r: Razon | undefined, E: Entendido, es: boolean, o: { sinPrecio?: boolean; vivo?: boolean } = {}): string | null {
  if (!r || E.grupos.every((g) => encaja(g, nombreNegocio, o.vivo))) return null;
  const E2 = (a: string, b: string) => dosIdiomas(es, a, b);
  const nombre = (es ? r.name.es : r.name.en || r.name.es) || r.name.es;
  return `${E2("Tiene ", "Has ")}${nombre}${!o.sinPrecio && r.cents ? ` · ${money(r.cents)}${sufijo(r.unit, es)}` : ""}`;
}
