"use client";
/* USR-DIRECCIONES (diseño Mi cuenta · addrsV): la lista con la predeterminada, «Usar por defecto» y Agregar. */
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { Direccion } from "@/lib/direcciones";
import { dirPredeterminada } from "../acciones";
import { Marco, useCuentaUi, type Bloque, type Yo } from "../Marco";

export const LB = { casa: [["Casa", "Home"], "home"], trabajo: [["Trabajo", "Work"], "brief"], otra: [["Otra", "Other"], "pin"] } as const;
export const lineaDir = (a: Pick<Direccion, "street" | "apt" | "zip" | "ciudad">) => `${a.street}${a.apt ? `, ${a.apt}` : ""} · ${a.ciudad ? `${a.ciudad.nombre} ` : ""}${a.zip}`.toUpperCase();

export function Direcciones({ es, yo, dirs, zona }: { es: boolean; yo: Yo; dirs: Direccion[]; zona: { name: string; zips: string[]; ciudadDe: Record<string, string> } | null }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter(), ui = useCuentaUi(), [, start] = useTransition();
  const nueva = () => router.push("/cuenta/direcciones/nueva");
  const blocks: Bloque[] = [
    dirs.length ? { type: "rows", rows: dirs.map((a) => {
      const L = LB[a.label] ?? LB.otra;
      return {
        key: a.id, ic: L[1], al: "flex-start" as const, t: es ? L[0][0] : L[0][1], tag: a.isDefault ? [E2("PREDETERMINADA", "DEFAULT"), "action"] as [string, string] : null,
        s: lineaDir(a), x: [a.instructions ? `${E2("Para el repartidor: ", "For the driver: ")}${a.instructions}` : "", !a.ubicada ? E2("No la encontramos en el mapa: sirve para recoger; para delivery, revisa la calle y el número.", "We couldn't find it on the map: fine for pickup; for delivery, check the street and number.") : !a.ciudad ? E2("Fuera de la zona de entrega: puedes recoger, pero no te llevan el pedido.", "Outside the delivery area: you can pick up, but they won't deliver there.") : ""].filter(Boolean).join(" · "),
        chev: true, on: () => router.push(`/cuenta/direcciones/${a.id}`),
        acts: a.isDefault ? undefined : [[E2("Usar por defecto", "Make default"), "secondary", () => start(async () => { const r = await dirPredeterminada(a.id); if (r.ok) { ui.toast(E2("Ahora es tu dirección predeterminada.", "Now your default address.")); router.refresh(); } })]] as [string, string, () => void][],
      };
    }) } : { type: "empty", ic: "home", t: E2("Sin direcciones", "No addresses"), s: E2("Guarda tu casa o tu trabajo y pide sin escribirla cada vez.", "Save home or work and order without typing it each time.") },
    { type: "acts", btns: [[E2("Agregar dirección", "Add address"), "primary", "plus", nueva]], cols: "minmax(0,260px)" },
  ];
  return (
    <Marco es={es} code="USR-DIRECCIONES" back="/cuenta" t={E2("Direcciones", "Addresses")} s={`${dirs.length}${E2(" GUARDADAS · PARA TUS PEDIDOS", " SAVED · FOR YOUR ORDERS")}`}
      act={{ ic: "plus", l: E2("Agregar", "Add"), on: nueva }} blocks={blocks} yo={yo} ui={ui}
      rcards={zona ? [{ label: "Direcciones · zona", k: E2("ZONA DE ENTREGA", "DELIVERY AREA"), t: `${zona.name} · ${zona.zips.join(" · ")}`, s: E2("Si guardas una dirección fuera de la zona, puedes recoger, pero no te llevan el pedido.", "If you save an address outside the area you can pick up, but they will not deliver there.") }] : []} />
  );
}
