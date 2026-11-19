"use client";
/* USR-PEDIDOS (diseño «To'Latino Mi cuenta» · ordersV): filtro (Todos, En curso, Entregados, Cancelados), los pedidos
   agrupados por mes con el negocio, el estado, número, pickup o delivery, la fecha, lo que pediste y el total. «Volver a
   pedir» en los entregados. Cada uno abre la página del pedido (recibo, estado en vivo y acciones). */
import { useRouter } from "next/navigation";
import type { EstPed, FiltroPed, MiPedido, MisPedidos } from "@/lib/mi-cuenta";
import { Marco, useCuentaUi, type Bloque, type Fila, type Yo } from "../Marco";
import { diaCorto, horaDe, mesLargo } from "../fechas";
import { dosIdiomas } from "@/lib/dos-idiomas";
import type { ApartadoCuenta } from "@/lib/apartados";
import { abrirComoLlegar } from "@/lib/como-llegar";

const money = (c: number) => `$${(c / 100).toFixed(2)}`;
export const tagPed = (st: EstPed, mode: string, es: boolean): [string, string] => {
  const E2 = (a: string, b: string) => dosIdiomas(es, a, b);
  return st === "curso" ? [E2("EN CURSO", "IN PROGRESS"), "action"] : st === "camino" ? [E2("EN CAMINO", "ON THE WAY"), "action"] : st === "hecho" ? (mode === "delivery" ? [E2("ENTREGADO", "DELIVERED"), "signal"] : [E2("RECOGIDO", "PICKED UP"), "signal"])
    : st === "no" ? [E2("NO LO ACEPTARON", "NOT ACCEPTED"), "neutral"] : st === "exp" ? [E2("SIN RESPUESTA", "NO REPLY"), "neutral"] : [E2("CANCELADO", "CANCELED"), "neutral"];
};

export function Pedidos({ d, f, es, yo, pagina, apartados = [] }: { d: MisPedidos; f: FiltroPed; es: boolean; yo: Yo; pagina: boolean; apartados?: ApartadoCuenta[] }) {
  const E2 = (a: string, b: string) => dosIdiomas(es, a, b);
  const router = useRouter(), ui = useCuentaUi();
  const ir = (q: string) => router.push("/cuenta/pedidos" + q);
  const B: Bloque[] = [];
  B.push({ type: "chips", items: ([["todo", E2("Todos", "All")], ["curso", E2("En curso", "In progress")], ["hechos", E2("Entregados", "Completed")], ["cx", E2("Cancelados", "Canceled")]] as [FiltroPed, string][])
    .map(([k, l]) => ({ l: k === "todo" ? `${l} · ${d.n.todo}` : l, on: f === k, onClick: () => ir(k === "todo" ? "" : `?f=${k}`) })) });
  // 9t · Apartados (diseño ordersV: «LO RECOGES Y PAGAS EN EL LOCAL»): los que siguen vivos, cada uno con su página, cómo llegar y el negocio.
  if (f === "todo" && apartados.length) {
    B.push({ type: "sec", t: E2("Apartados", "On hold"), s: E2("LO RECOGES Y PAGAS EN EL LOCAL", "PICK UP AND PAY IN STORE"), mt: "4px" });
    B.push({ type: "rows", rows: apartados.map((a): Fila => {
      const tag: [string, string] = a.plan ? [E2("EN PLAN", "ON LAYAWAY"), "action"] : a.st === "confirmed" ? (a.ship ? [E2("CONFIRMADO", "CONFIRMED"), "signal"] : [E2("LISTO", "READY"), "signal"])
        : a.st === "change_proposed" ? [E2("FALTA ALGO", "SOMETHING IS OUT"), "action"] : [E2("ESPERANDO", "WAITING"), "action"];
      const cuando = a.hasta && !a.plan && !a.ship ? `${E2(" · VENCE ", " · EXPIRES ")}${diaCorto(a.hasta, a.tz, es)} ${horaDe(a.hasta, a.tz, es)}` : a.st === "pending" ? E2(" · ESPERANDO QUE CONFIRMEN", " · WAITING FOR THEM TO CONFIRM") : "";
      return {
        key: a.numero, ph: a.foto, ini: a.bname.slice(0, 1), t: a.items.length ? `${a.items.slice(0, 2).join(", ")}${a.items.length > 2 ? E2(` y ${a.items.length - 2} más`, ` and ${a.items.length - 2} more`) : ""}` : a.bname, tag,
        s: `${a.bname}${cuando}`.toUpperCase(), v: money(a.tot), vs: a.plan ? E2("EN PLAN DE PAGOS", "ON LAYAWAY") : a.ship ? E2("SE COBRA CUANDO LO ENVÍAN", "CHARGED WHEN THEY SHIP IT") : E2("AL RECOGER", "AT PICKUP"),
        chev: true, on: () => router.push(`/apartado/${a.numero}`),
        acts: [...(!a.ship && (a.lat != null || a.dir) ? [[E2("Cómo llegar", "Directions"), "secondary", () => abrirComoLlegar({ lat: a.lat, lng: a.lng, dir: a.dir, nombre: a.bname })] as [string, string, () => void]] : []),
          [E2("Ver el negocio", "See business"), "secondary", () => router.push(`/n/${a.biz}`)]],
      };
    }) });
  }
  if (!d.filas.length) B.push({ type: "empty", ic: "bag", t: f === "todo" ? E2("Todavía no tienes pedidos", "No orders yet") : E2("Nada por aquí", "Nothing here"),
    s: E2("Pide a los negocios de tu ciudad y aquí ves cada pedido con su recibo.", "Order from businesses in your city and every order shows here with its receipt."), cta: E2("Pedir comida", "Order food"), onCta: () => router.push("/negocios") });
  // Por mes; los que van en curso, arriba.
  const grupos = new Map<string, MiPedido[]>();
  for (const o of d.filas) { const k = o.st === "curso" || o.st === "camino" ? "curso" : o.mes; grupos.set(k, [...(grupos.get(k) ?? []), o]); }
  for (const [k, L] of grupos) {
    B.push({ type: "sec", t: k === "curso" ? E2("En curso", "In progress") : mesLargo(L[0]!.at, L[0]!.tz, es), fs: "15px", mt: "6px" });
    B.push({ type: "rows", rows: L.map((o): Fila => {
      const vivo = o.st === "curso" || o.st === "camino", cx = o.st === "cx" || o.st === "no" || o.st === "exp", items = o.items;
      return {
        key: o.num, ph: o.foto, ini: o.bname.slice(0, 1), t: o.bname, tag: tagPed(o.st, o.mode, es),
        s: `#${o.num} · ${o.mode === "delivery" ? "DELIVERY" : "PICKUP"} · ${diaCorto(o.at, o.tz, es)}`.toUpperCase(),
        x: items.length ? `${items.slice(0, 2).join(", ")}${items.length > 2 ? E2(` y ${items.length - 2} más`, ` and ${items.length - 2} more`) : ""}` : "",
        v: money(o.total), vs: cx ? E2("NO SE COBRÓ", "NOT CHARGED") : vivo ? (o.merc ? E2("ESTIMADO · SE COBRA LO QUE PESE", "ESTIMATE · YOU PAY WHAT IT WEIGHS") : E2("PAGAS AL RECIBIR", "PAY WHEN YOU GET IT")) : undefined, chev: true, on: () => router.push(o.merc ? `/mercado/${o.num}` : `/pedido/${o.num}`),
        acts: o.st === "hecho" ? [[E2("Volver a pedir", "Order again"), "secondary", () => router.push(`/n/${o.biz}?tab=menu`)], ...(!o.rev ? [[E2("Escribir reseña", "Write review"), "primary", () => router.push(`/n/${o.biz}/resena?pedido=${o.num}`)] as [string, string, () => void]] : [])] : undefined,
      };
    }) });
  }
  if (d.sig) B.push({ type: "more", l: E2("Ver más pedidos", "See more orders"), on: () => ir(`?${new URLSearchParams({ ...(f !== "todo" ? { f } : {}), antes: d.sig! })}`) });
  if (pagina) B.push({ type: "more", l: E2("Volver a los más recientes", "Back to the latest"), on: () => ir(f === "todo" ? "" : `?f=${f}`) });
  return <Marco es={es} code="USR-PEDIDOS" t={E2("Pedidos", "Orders")} s={`${d.n.todo}${E2(" PEDIDOS · RECIBOS Y ESTADO", " ORDERS · RECEIPTS AND STATUS")}`} blocks={B} yo={yo} ui={ui} />;
}
